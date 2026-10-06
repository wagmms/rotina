# -*- coding: utf-8 -*-
"""
Gerenciador de Processos Assíncronos com Streaming SSE e Histórico Persistido.
"""

import os
import sys
import json
import time
import signal
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, AsyncGenerator

from central_hub.config import BASE_DIR, DATA_DIR, CATALOGO_TAREFAS

HISTORICO_FILE = DATA_DIR / "execucoes.json"


class ExecutionRecord:
    def __init__(self, execution_id: str, task_id: str, task_name: str, command: List[str]):
        self.execution_id = execution_id
        self.task_id = task_id
        self.task_name = task_name
        self.command = command
        self.start_time = datetime.now().isoformat()
        self.end_time: Optional[str] = None
        self.duration_seconds: float = 0.0
        self.status = "running"  # running, success, error, cancelled
        self.exit_code: Optional[int] = None
        self.logs: List[str] = []
        self._listeners: List[asyncio.Queue] = []
        self.process: Optional[asyncio.subprocess.Process] = None

    def to_dict(self, include_logs: bool = True) -> Dict[str, Any]:
        data = {
            "execution_id": self.execution_id,
            "task_id": self.task_id,
            "task_name": self.task_name,
            "command": " ".join(self.command),
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration_seconds": round(self.duration_seconds, 2),
            "status": self.status,
            "exit_code": self.exit_code,
            "total_lines": len(self.logs)
        }
        if include_logs:
            data["logs"] = self.logs
        return data


class ProcessRunner:
    def __init__(self):
        self.active_executions: Dict[str, ExecutionRecord] = {}
        self.history: List[Dict[str, Any]] = self._load_history()
        self._lock = asyncio.Lock()

    def _load_history(self) -> List[Dict[str, Any]]:
        if HISTORICO_FILE.exists():
            try:
                with open(HISTORICO_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return []
        return []

    def _save_history(self):
        try:
            with open(HISTORICO_FILE, "w", encoding="utf-8") as f:
                # Salva os últimos 100 registros com logs limitados a 1000 linhas
                json.dump(self.history[:100], f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[ProcessRunner] Erro ao salvar histórico: {e}", file=sys.stderr)

    def get_active_execution(self) -> Optional[Dict[str, Any]]:
        for rec in self.active_executions.values():
            if rec.status == "running":
                return rec.to_dict(include_logs=False)
        return None

    def list_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self.history[:limit]

    def get_execution_details(self, execution_id: str) -> Optional[Dict[str, Any]]:
        if execution_id in self.active_executions:
            return self.active_executions[execution_id].to_dict(include_logs=True)
        for h in self.history:
            if h.get("execution_id") == execution_id:
                return h
        return None

    async def start_task(self, task_id: str, custom_args: Optional[List[str]] = None) -> ExecutionRecord:
        task_cfg = CATALOGO_TAREFAS.get(task_id)
        if not task_cfg:
            raise ValueError(f"Tarefa desconhecida: {task_id}")

        execution_id = f"exec_{int(time.time() * 1000)}"
        cmd = list(task_cfg["comando"])
        if custom_args:
            cmd.extend(custom_args)

        rec = ExecutionRecord(
            execution_id=execution_id,
            task_id=task_id,
            task_name=task_cfg["nome"],
            command=cmd
        )

        self.active_executions[execution_id] = rec
        asyncio.create_task(self._run_process(rec, task_cfg.get("cwd", str(BASE_DIR))))
        return rec

    async def _run_process(self, rec: ExecutionRecord, cwd: str):
        start_ts = time.time()
        try:
            proc = await asyncio.create_subprocess_exec(
                *rec.command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=cwd,
                env=dict(os.environ, PYTHONUNBUFFERED="1")
            )
            rec.process = proc

            rec.logs.append(f"🚀 [SISTEMA] Iniciando tarefa: {rec.task_name}")
            rec.logs.append(f"📂 [DIRETÓRIO]: {cwd}")
            rec.logs.append(f"⚡ [COMANDO]: {' '.join(rec.command)}\n")
            await self._broadcast_line(rec, rec.logs[-3])
            await self._broadcast_line(rec, rec.logs[-2])
            await self._broadcast_line(rec, rec.logs[-1])

            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                decoded = line.decode("utf-8", errors="replace").rstrip("\r\n")
                rec.logs.append(decoded)
                await self._broadcast_line(rec, decoded)

            await proc.wait()
            rec.exit_code = proc.returncode
            rec.duration_seconds = time.time() - start_ts
            rec.end_time = datetime.now().isoformat()

            if rec.status == "cancelled":
                rec.logs.append(f"\n🛑 [SISTEMA] Processo cancelado pelo usuário.")
            elif rec.exit_code == 0:
                rec.status = "success"
                rec.logs.append(f"\n✅ [SISTEMA] Processo finalizado com SUCESSO (código 0) em {rec.duration_seconds:.2f}s.")
            else:
                rec.status = "error"
                rec.logs.append(f"\n❌ [SISTEMA] Processo falhou com CÓDIGO {rec.exit_code} em {rec.duration_seconds:.2f}s.")

            await self._broadcast_line(rec, rec.logs[-1])
            await self._broadcast_event(rec, "complete", rec.to_dict(include_logs=False))

        except Exception as e:
            rec.duration_seconds = time.time() - start_ts
            rec.end_time = datetime.now().isoformat()
            rec.status = "error"
            rec.exit_code = -1
            err_msg = f"\n💥 [ERRO INTERNO]: {str(e)}"
            rec.logs.append(err_msg)
            await self._broadcast_line(rec, err_msg)
            await self._broadcast_event(rec, "complete", rec.to_dict(include_logs=False))

        finally:
            async with self._lock:
                # Adiciona ao topo do histórico
                self.history.insert(0, rec.to_dict(include_logs=True))
                self._save_history()

    async def _broadcast_line(self, rec: ExecutionRecord, line: str):
        for q in list(rec._listeners):
            try:
                await q.put({"type": "line", "data": line})
            except Exception:
                pass

    async def _broadcast_event(self, rec: ExecutionRecord, event_type: str, data: Any):
        for q in list(rec._listeners):
            try:
                await q.put({"type": event_type, "data": data})
            except Exception:
                pass

    async def cancel_task(self, execution_id: str) -> bool:
        rec = self.active_executions.get(execution_id)
        if not rec or not rec.process or rec.status != "running":
            return False

        rec.status = "cancelled"
        try:
            rec.process.send_signal(signal.SIGTERM)
            try:
                await asyncio.wait_for(rec.process.wait(), timeout=3.0)
            except asyncio.TimeoutError:
                rec.process.kill()
            return True
        except ProcessLookupError:
            return True
        except Exception as e:
            print(f"[ProcessRunner] Erro ao cancelar processo: {e}", file=sys.stderr)
            return False

    async def stream_logs(self, execution_id: str) -> AsyncGenerator[str, None]:
        rec = self.active_executions.get(execution_id)
        if not rec:
            yield f"event: error\ndata: {json.dumps({'error': 'Execução não encontrada'})}\n\n"
            return

        # Envia linhas anteriores já bufferizadas
        for line in rec.logs:
            yield f"event: line\ndata: {json.dumps(line)}\n\n"

        if rec.status != "running":
            yield f"event: complete\ndata: {json.dumps(rec.to_dict(include_logs=False))}\n\n"
            return

        queue: asyncio.Queue = asyncio.Queue()
        rec._listeners.append(queue)
        try:
            while True:
                msg = await queue.get()
                ev_type = msg.get("type", "line")
                data_json = json.dumps(msg.get("data", ""))
                yield f"event: {ev_type}\ndata: {data_json}\n\n"
                if ev_type == "complete":
                    break
        finally:
            if queue in rec._listeners:
                rec._listeners.remove(queue)


# Instância global do runner
runner_instance = ProcessRunner()
