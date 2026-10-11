from pathlib import Path
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[3]


def test_batch_build_idempotent_and_invalid_module_keeps_last_artifact(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "scripts").mkdir()
    shutil.copy2(ROOT / "build_master.py", tmp_path / "build_master.py")
    shutil.copy2(ROOT / "scripts/check_syntax.cjs", tmp_path / "scripts/check_syntax.cjs")
    (tmp_path / "src/01_fixture.js").write_text("function fixture() { return 1; }\n")
    def build():
        return subprocess.run(["python3", "build_master.py"], cwd=tmp_path, capture_output=True, text=True)
    assert build().returncode == 0
    artifact = tmp_path / "ultra_rotina_master.js"
    original = (artifact.read_bytes(), artifact.stat().st_mtime_ns)
    assert build().returncode == 0
    assert (artifact.read_bytes(), artifact.stat().st_mtime_ns) == original
    # Somados, os fragmentos poderiam formar JS válido; separadamente são inválidos.
    (tmp_path / "src/02_invalid.js").write_text("function broken() {")
    (tmp_path / "src/03_invalid.js").write_text("return 1; }")
    assert build().returncode != 0
    assert (artifact.read_bytes(), artifact.stat().st_mtime_ns) == original


def test_build_incremental_fast_path_com_checksum(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "scripts").mkdir()
    shutil.copy2(ROOT / "build_master.py", tmp_path / "build_master.py")
    shutil.copy2(ROOT / "scripts/check_syntax.cjs", tmp_path / "scripts/check_syntax.cjs")
    (tmp_path / "src/01_mod.js").write_text("function f1() { return 1; }\n")
    (tmp_path / "src/02_mod.js").write_text("function f2() { return 2; }\n")

    # 1. Primeiro build (frio)
    res1 = subprocess.run(["python3", "build_master.py"], cwd=tmp_path, capture_output=True, text=True)
    assert res1.returncode == 0
    assert "ultra_rotina_master.js gerado" in res1.stdout
    cache_file = tmp_path / ".build_master_cache.json"
    assert cache_file.exists()
    cache_data = json.loads(cache_file.read_text())
    assert "source_checksum" in cache_data
    assert "artifact_checksum" in cache_data
    assert len(cache_data["modules"]) == 2

    # 2. Segundo build (incremental fast-path / 0ms)
    res2 = subprocess.run(["python3", "build_master.py"], cwd=tmp_path, capture_output=True, text=True)
    assert res2.returncode == 0
    assert "Build Incremental: 2 módulos inalterados" in res2.stdout
    assert "100% íntegro e sincronizado" in res2.stdout

    # 3. Modifica apenas 1 módulo
    (tmp_path / "src/02_mod.js").write_text("function f2() { return 42; }\n")
    res3 = subprocess.run(["python3", "build_master.py"], cwd=tmp_path, capture_output=True, text=True)
    assert res3.returncode == 0
    # Deve validar sintaxe de apenas 1/2 módulos
    assert "Validando sintaxe de 1/2 módulos" in res3.stdout

    # 4. Forçar rebuild via --force
    res4 = subprocess.run(["python3", "build_master.py", "--force"], cwd=tmp_path, capture_output=True, text=True)
    assert res4.returncode == 0
    assert "Validando sintaxe de 2/2 módulos" in res4.stdout

    # 5. Se o artefato for removido externamente, reconstrói automaticamente
    (tmp_path / "ultra_rotina_master.js").unlink()
    res5 = subprocess.run(["python3", "build_master.py"], cwd=tmp_path, capture_output=True, text=True)
    assert res5.returncode == 0
    assert (tmp_path / "ultra_rotina_master.js").exists()
