"""
Ultra Rotina · Testador Master: Personas Clínicas e Comportamentais
Define 5 personalidades de médicos com heurísticas e geradores dinâmicos de casos clínicos.
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import random


@dataclass
class Persona:
    id: str
    nome: str
    titulo: str
    avatar: str
    descricao: str
    tolerancia_latencia_ms: int
    prob_fuzzing: float
    comandos_favoritos: List[str]
    palavras_chave_botoes: List[str]
    mensagens_teste: List[Dict[str, Any]]

    def gerar_pensamento(self, acao_tipo: str, alvo: str) -> str:
        """Gera raciocínio clínico da persona antes de tomar uma decisão."""
        if acao_tipo == "comando":
            pensamentos = [
                f"Preciso verificar {alvo} imediatamente para guiar a conduta beira-leito.",
                f"Disparando {alvo} para validar a sintaxe e a resposta clínica.",
                f"Avaliando se o comando {alvo} traz informações rápidas sem poluição visual.",
                f"Testando {alvo} no cenário clínico atual ({self.titulo}).",
            ]
        elif acao_tipo == "clique":
            pensamentos = [
                f"Navegando pelo botão '{alvo}' para inspecionar o próximo nível do menu.",
                f"Como {self.titulo}, o botão '{alvo}' é a opção mais crítica agora.",
                f"Verificando se o botão '{alvo}' responde com agilidade em 1 toque.",
                f"Clicando em '{alvo}' para testar o callback e fluxo de dados.",
            ]
        elif acao_tipo == "fuzzing":
            pensamentos = [
                f"Vou testar uma entrada com erro ({alvo}) para checar se o bot trata sem crashar.",
                f"Digitando dados atípicos para auditar a resiliência defensiva do bot.",
                f"Simulando distração beira-leito com valor extremo ({alvo}).",
            ]
        elif acao_tipo == "backtrack":
            pensamentos = [
                f"Cheguei ao final deste fluxo. Voltando pelo botão '{alvo}' para explorar outros ramos.",
                f"Retornando ao menu principal para abrir uma nova linha de conduta.",
            ]
        else:
            pensamentos = [f"Analisando a tela atual e decidindo o próximo passo como {self.titulo}."]
        
        return random.choice(pensamentos)

    def gerar_comando_dinamico(self) -> Dict[str, Any]:
        """Gera combinações clínicas randômicas para testes exaustivos e variados."""
        if self.id == "emergencista":
            return self._gerar_emergencia()
        elif self.id == "r1_clinico":
            return self._gerar_clinica()
        elif self.id == "rotina_gestor":
            return self._gerar_rotina()
        elif self.id == "caotico_fuzzer":
            return self._gerar_fuzzing()
        elif self.id == "estudante_socratico":
            return self._gerar_estudo()
        
        escolhida = random.choice(self.mensagens_teste)
        return {"tipo": "comando", "texto": escolhida["texto"]}

    def _gerar_emergencia(self) -> Dict[str, Any]:
        peso = random.randint(45, 115)
        geradores = [
            lambda: f"/dva nora {peso}",
            lambda: f"/dva dobu {peso}",
            lambda: f"/dva vaso {peso}",
            lambda: f"/sri {peso} choque",
            lambda: f"/sri {peso} neuro",
            lambda: f"/sri {peso} broncoespasmo",
            lambda: f"/gaso {random.choice(['7.22', '7.28', '7.34', '7.48'])} {random.randint(22, 58)} {random.randint(10, 32)}",
            lambda: f"/winter {random.randint(8, 22)}",
            lambda: f"/choque {random.randint(70, 110)} {random.randint(40, 70)} {random.randint(90, 150)}",
            lambda: f"/choqueseptico {peso} {random.choice(['0.15', '0.25', '0.4'])}",
            lambda: f"/hic {peso}",
            lambda: "/pcr",
            lambda: "/acls"
        ]
        texto = random.choice(geradores)()
        return {"tipo": "comando", "texto": texto}

    def _gerar_clinica(self) -> Dict[str, Any]:
        idade = random.randint(25, 88)
        peso = random.randint(48, 95)
        cr = round(random.uniform(0.7, 4.2), 1)
        sexo = random.choice(["masc", "fem"])
        geradores = [
            lambda: f"/crcl {idade} {peso} {cr} {sexo}",
            lambda: f"/clcr {idade} {peso} {cr}",
            lambda: f"/atb {random.choice(['piperacilina', 'meropenem', 'ceftriaxona', 'vancomicina'])} {random.randint(15, 60)}",
            lambda: f"/dose {random.choice(['amoxicilina', 'azitromicina', 'ciprofloxacino', 'claritromicina', 'furosemida'])}",
            lambda: f"/interacao {random.choice(['amiodarona + azitromicina', 'varfarina + ciprofloxacino', 'espironolactona + losartana'])}",
            lambda: f"/dhe na {random.randint(115, 128)} peso {peso} {sexo[0]} {idade}",
            lambda: f"/dhe k {round(random.uniform(6.1, 7.8), 1)} ecg",
            lambda: f"/rx {random.choice(['amigdalite bacteriana', 'itu nao complicada', 'sinusite aguda', 'pneumonia comunitaria'])} adulto {peso}kg",
            lambda: f"/leito {random.randint(1, 12)} {idade}a {random.choice(['ICC descompensada', 'DPOC exacerbado', 'Pneumonia aspirativa'])}",
            lambda: "/enfermaria"
        ]
        texto = random.choice(geradores)()
        return {"tipo": "comando", "texto": texto}

    def _gerar_rotina(self) -> Dict[str, Any]:
        geradores = [
            lambda: "/rotina",
            lambda: "/agenda",
            lambda: "/minharotina",
            lambda: "/status",
            lambda: "/menu",
            lambda: "/novo",
            lambda: f"/ajuda {random.choice(['rotina', 'calculadoras', 'sala', 'enfermaria', 'farmaco'])}"
        ]
        texto = random.choice(geradores)()
        return {"tipo": "comando", "texto": texto}

    def _gerar_fuzzing(self) -> Dict[str, Any]:
        geradores = [
            lambda: f"/dva nora {random.choice(['abc', '-50', '99999', 'zero', '10.5.5'])}",
            lambda: f"/sri {random.choice(['-1', '0', '999999', 'perfil_inexistente'])}",
            lambda: f"/gaso {random.choice(['pH 7', 'invalido', '7.0 0 0', '- - -'])}",
            lambda: f"/crcl {random.choice(['idade peso', '-20 0 0 masc', 'cem anos 80kg cr 2'])}",
            lambda: f"/comando_inexistente_{random.randint(100, 999)}",
            lambda: "/cancelar",
            lambda: random.choice(["????", "!@#$%", "SELECT * FROM users", "   ", "help", "oi bot"]),
            lambda: f"/dhe na {random.choice(['-10', '500', 'abc'])} peso {random.choice(['0', '-5'])}"
        ]
        texto = random.choice(geradores)()
        return {"tipo": "fuzzing", "texto": texto}

    def _gerar_estudo(self) -> Dict[str, Any]:
        peso_ped = random.randint(6, 35)
        geradores = [
            lambda: f"/round Paciente {random.randint(55, 82)}a, {random.choice(['DPOC exacerbado', 'ICC perfil B', 'Sepse foco urinario', 'Cetoacidose diabetica'])}",
            lambda: f"/ped {random.choice(['amoxicilina', 'dipirona', 'prednisolona', 'azitromicina'])} {peso_ped}",
            lambda: f"/conduta_ped {random.choice(['bronquiolite', 'laringite', 'asma', 'crise febril'])}",
            lambda: f"/pals {peso_ped}",
            lambda: f"/prenatal {random.randint(1, 28):02d}/{random.randint(1, 12):02d}/2026",
            lambda: "/mgso4 zuspan",
            lambda: "/go",
            lambda: "/parto 6cm, plano 0"
        ]
        texto = random.choice(geradores)()
        return {"tipo": "comando", "texto": texto}


def obter_catalogo_personas() -> Dict[str, Persona]:
    """Retorna o catálogo completo com as 5 personas de teste."""
    return {
        "emergencista": Persona(
            id="emergencista",
            nome="Dr. Gabriel Mendes",
            titulo="Plantonista de Sala Vermelha (Apressado)",
            avatar="🚨",
            descricao="Focado em velocidade máxima, PCR, drogas vasoativas, intubação rápida e choque. Não tolera menus lentos ou prolixos.",
            tolerancia_latencia_ms=1200,
            prob_fuzzing=0.06,
            comandos_favoritos=["/pcr", "/acls", "/dva", "/sri", "/gaso", "/winter", "/choque", "/choqueseptico", "/sca", "/hic"],
            palavras_chave_botoes=["sala vermelha", "pcr", "dva", "chocável", "adrenalina", "noradrenalina", "dobutamina", "intubação", "choque", "sri", "gaso"],
            mensagens_teste=[{"tipo": "comando", "texto": "/dva nora 70"}]
        ),
        "r1_clinico": Persona(
            id="r1_clinico",
            nome="Dra. Beatriz Toledo",
            titulo="R1 de Clínica Médica (Metódica & Exaustiva)",
            avatar="🩺",
            descricao="Passa visita na enfermaria, checa interações, clearance, guias HSL e PedBook, receitas REMUME e eletrólitos.",
            tolerancia_latencia_ms=2500,
            prob_fuzzing=0.04,
            comandos_favoritos=["/soap", "/rx", "/rxh", "/leito", "/enfermaria", "/crcl", "/atb", "/dose", "/interacao", "/dhe"],
            palavras_chave_botoes=["enfermaria", "ambulatório", "leito", "receita", "remume", "clearance", "antibiótico", "interação", "hsl", "dose", "dhe"],
            mensagens_teste=[{"tipo": "comando", "texto": "/enfermaria"}]
        ),
        "rotina_gestor": Persona(
            id="rotina_gestor",
            nome="Dr. Thiago Campos",
            titulo="Médico Gestor de Rotina & Hábitos",
            avatar="📅",
            descricao="Focado em organização pessoal, Google Calendar, blocos de plantão, time-blocking, hábitos e check-ins.",
            tolerancia_latencia_ms=1800,
            prob_fuzzing=0.03,
            comandos_favoritos=["/rotina", "/agenda", "/minharotina", "/menu", "/status", "/novo", "/ajuda"],
            palavras_chave_botoes=["rotina", "agenda", "timeline", "tarefas", "briefing", "checkin", "semana", "plantão", "concluir", "adiar"],
            mensagens_teste=[{"tipo": "comando", "texto": "/rotina"}]
        ),
        "caotico_fuzzer": Persona(
            id="caotico_fuzzer",
            nome="Dr. Lucas Antunes",
            titulo="Testador Caótico / Dedo Nervoso (Fuzzer)",
            avatar="👾",
            descricao="Digita errado, envia valores absurdos, caracteres estranhos, cancelamentos repentinos e testa robustez extrema.",
            tolerancia_latencia_ms=1500,
            prob_fuzzing=0.65,
            comandos_favoritos=["/dva", "/sri", "/gaso", "/cancelar", "/menu", "/crcl"],
            palavras_chave_botoes=["cancelar", "voltar", "início", "fechar", "novo", "encerrar"],
            mensagens_teste=[{"tipo": "fuzzing", "texto": "/cancelar"}]
        ),
        "estudante_socratico": Persona(
            id="estudante_socratico",
            nome="Dra. Camila Nogueira",
            titulo="Residente Estudante (Aprendizado Ativo)",
            avatar="🎓",
            descricao="Usa o bot para estudar, passa rounds com o preceptor socrático, escuta áudios e revisa condutas.",
            tolerancia_latencia_ms=3000,
            prob_fuzzing=0.05,
            comandos_favoritos=["/round", "/preceptor", "/ped", "/conduta_ped", "/pals", "/go", "/prenatal", "/mgso4"],
            palavras_chave_botoes=["preceptor", "round", "ouvir", "socrática", "soap", "pediatria", "ginecologia", "obstetrícia", "parto"],
            mensagens_teste=[{"tipo": "comando", "texto": "/go"}]
        )
    }
