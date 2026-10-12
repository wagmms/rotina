"""
Ultra Rotina · Testador Master: Gerador de Mídias Clínicas Sintéticas
Gera dinamicamente notas de voz (TTS) e imagens de exames médicos (Pillow)
para testes end-to-end multimodais (Gemini Vision e Audio).
"""

from pathlib import Path
from typing import Tuple, Dict, Any, Optional
import random

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
MEDIA_DIR = ROOT_DIR / "data" / "test_media"


class MultimodalGenerator:
    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or MEDIA_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def gerar_audio_clinico(self, tipo: str = "aleatorio") -> Dict[str, Any]:
        """Gera arquivo de áudio de voz com relato clínico realista."""
        casos = {
            "leito_enfermaria": {
                "texto": "Leito 4, 72 anos, DPOC descompensado, afebril, em VNI, saturação 92%. Pendência: colher gasometria arterial e checar potássio.",
                "caption": "Evolução rápida de leito de enfermaria",
                "titulo": "Evolução Leito 4 (DPOC em VNI)"
            },
            "iam_sala_vermelha": {
                "texto": "Paciente 74 anos, admitido na sala vermelha com dor torácica opressiva irradiada para mandíbula há duas horas. ECG com supra de ST em parede inferior, D2, D3 e aVF. Pressão arterial 90 por 60.",
                "caption": "Passagem de plantão Sala Vermelha (IAM com Supra)",
                "titulo": "Passagem Sala Vermelha (IAM c/ Supra)"
            },
            "round_preceptor": {
                "texto": "Discussão de caso: Paciente feminina, 28 anos, gestante de 32 semanas, admitida com cefaleia intensa, escotomas cintilantes e PA 160 por 110. Suspeita de pré-eclâmpsia grave com critérios de gravidade.",
                "caption": "Caso clínico para discussão com Preceptor",
                "titulo": "Discussão Preceptor (Pré-Eclâmpsia)"
            },
            "sepse_choque": {
                "texto": "Admissão emergência: Paciente 63 anos, febril há 3 dias, sonolento, hipotenso com PA 70 por 40, lactato aumentado, má perfusão periférica. Iniciado ressuscitação volêmica e solicitado noradrenalina.",
                "caption": "Choque séptico beira-leito",
                "titulo": "Choque Séptico em Sala Vermelha"
            }
        }

        if tipo == "aleatorio" or tipo not in casos:
            tipo = random.choice(list(casos.keys()))

        caso = casos[tipo]
        arquivo_audio = self.output_dir / f"audio_{tipo}.mp3"

        try:
            from gtts import gTTS
            tts = gTTS(text=caso["texto"], lang="pt")
            tts.save(str(arquivo_audio))
        except (ImportError, Exception):
            # Fallback nativo: sintetiza áudio PCM WAV com biblioteca padrão do Python
            arquivo_audio = self.output_dir / f"audio_{tipo}.wav"
            import wave, struct, math
            with wave.open(str(arquivo_audio), "w") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(16000)
                duracao_seg = 0.5
                num_amostras = int(16000 * duracao_seg)
                for i in range(num_amostras):
                    valor = int(32767.0 * 0.4 * math.sin(2.0 * math.pi * 440.0 * (i / 16000)))
                    wav_file.writeframes(struct.pack("<h", valor))

        return {
            "tipo": tipo,
            "caminho": arquivo_audio,
            "texto_falado": caso["texto"],
            "caption": caso["caption"],
            "titulo": caso["titulo"]
        }

    def gerar_imagem_clinica(self, tipo: str = "aleatorio") -> Dict[str, Any]:
        """Gera imagem sintética de laudo laboratorial ou ECG com Pillow."""
        from PIL import Image, ImageDraw

        tipos_disponiveis = ["hemograma_leucocitose", "gasometria_cti", "ecg_supra_st"]
        if tipo == "aleatorio" or tipo not in tipos_disponiveis:
            tipo = random.choice(tipos_disponiveis)

        arquivo_imagem = self.output_dir / f"imagem_{tipo}.jpg"

        if tipo == "hemograma_leucocitose":
            img = Image.new("RGB", (700, 240), color=(255, 255, 255))
            d = ImageDraw.Draw(img)
            d.rectangle([(0, 0), (700, 36)], fill=(30, 41, 59))
            d.text((20, 10), "HOSPITAL DAS CLÍNICAS FMRP-USP · LAUDO LABORATORIAL", fill=(255, 255, 255))
            
            d.text((25, 55), "HEMOGRAMA COMPLETO COM PLAQUETAS:", fill=(0, 0, 0))
            d.text((25, 90), "• Leucócitos Totais: 21.400 /mm³ (VR: 4.000 - 10.000)  [CRÍTICO]", fill=(180, 0, 0))
            d.text((25, 120), "• Bastões: 16% (Desvio à esquerda escalonado)", fill=(180, 0, 0))
            d.text((25, 150), "• Segmentados: 74% | Linfócitos: 8%", fill=(70, 70, 70))
            d.text((25, 180), "• Proteína C Reativa (PCR): 194 mg/L (VR: < 5.0)", fill=(180, 0, 0))
            d.text((25, 210), "• Plaquetas: 142.000 /mm³ (VR: 150.000 - 450.000)", fill=(70, 70, 70))
            caption = "Paciente com febre e tosse produtiva. Avaliar urgência de antibiótico."
            titulo = "Laudo de Hemograma (Leucocitose + PCR 194)"

        elif tipo == "gasometria_cti":
            img = Image.new("RGB", (650, 260), color=(250, 250, 250))
            d = ImageDraw.Draw(img)
            d.rectangle([(0, 0), (650, 34)], fill=(15, 23, 42))
            d.text((20, 8), "UNIDADE DE TERAPIA INTENSIVA · GASOMETRIA ARTERIAL", fill=(255, 255, 255))

            d.text((25, 50), "ANÁLISE DE GASOMETRIA ARTERIAL EM BIC:", fill=(0, 0, 0))
            d.text((25, 80), "• pH: 7.21 (VR: 7.35 - 7.45) — [ACIDOSE GRAVE]", fill=(180, 0, 0))
            d.text((25, 110), "• pCO2: 28 mmHg (VR: 35 - 45)", fill=(70, 70, 70))
            d.text((25, 140), "• HCO3: 11 mEq/L (VR: 22 - 26) — [CONSUMO GRAVE]", fill=(180, 0, 0))
            d.text((25, 170), "• Na: 140 mEq/L | Cl: 102 mEq/L", fill=(70, 70, 70))
            d.text((25, 200), "• Lactato Arterial: 4.8 mmol/L (VR: < 2.0)", fill=(180, 0, 0))
            d.text((25, 230), "• Ânion Gap Calculado: 27 mEq/L (VR: 8 - 12)", fill=(180, 0, 0))
            caption = "Gasometria colhida agora no CTI. Avaliar compensação e conduta."
            titulo = "Fita de Gasometria Arterial (pH 7.21 / AG 27)"

        else:  # ecg_supra_st
            img = Image.new("RGB", (700, 220), color=(255, 255, 255))
            d = ImageDraw.Draw(img)
            d.rectangle([(0, 0), (700, 34)], fill=(185, 28, 28))
            d.text((20, 8), "SALA VERMELHA · ELETROCARDIOGRAMA DE 12 DERIVAÇÕES", fill=(255, 255, 255))

            # Desenha linha de base e onda ECG esquemática
            d.line([(25, 80), (100, 80), (110, 60), (120, 110), (135, 40), (150, 70), (220, 70), (230, 80), (350, 80)], fill=(200, 0, 0), width=2)
            
            d.text((25, 110), "LAUDO AUTOMATIZADO BEIRA-LEITO:", fill=(0, 0, 0))
            d.text((25, 140), "• Ritmo: Sinusal regular | FC: 108 bpm", fill=(70, 70, 70))
            d.text((25, 170), "• Segmento ST: Supradesnivelamento de 3mm em D2, D3 e aVF", fill=(180, 0, 0))
            d.text((25, 195), "• Conclusão: PROVÁVEL IAM COM SUPRA DE ST DE PAREDE INFERIOR", fill=(180, 0, 0))
            caption = "ECG de entrada de paciente com dor no peito há 40 minutos."
            titulo = "Traçado de ECG (Supra de ST Inferior)"

        img.save(str(arquivo_imagem), format="JPEG")

        return {
            "tipo": tipo,
            "caminho": arquivo_imagem,
            "caption": caption,
            "titulo": titulo
        }
