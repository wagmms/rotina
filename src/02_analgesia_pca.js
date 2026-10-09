/**
 * Módulo Avançado de Analgesia Controlada pelo Paciente (PCA)
 * Motor determinístico para cálculos de bolus, dose basal, intervalo de bloqueio (lockout) 
 * e limite de 4 horas para Morfina e Fentanil em bombas de PCA.
 */

var AnalgesiaPcaService = (function() {
    'use strict';

    function calcularPca(params) {
        var farmaco = params.farmaco ? params.farmaco.toLowerCase() : '';
        var idade = params.idade || 40;
        var pesoKg = params.pesoKg || 70;
        var isIdoso = idade >= 65;
        var opioideTolerante = params.opioideTolerante || false;

        if (farmaco !== 'morfina' && farmaco !== 'fentanil') {
            return { erro: "Fármaco não suportado para PCA neste motor. Utilize 'Morfina' ou 'Fentanil'." };
        }

        var prescricao = {};
        
        if (farmaco === 'morfina') {
            // Protocolo Morfina IV
            prescricao.farmaco = 'Morfina';
            prescricao.concentracaoSugerida = '1 mg/mL';
            
            // Doses basais frequentemente evitadas em pacientes naive
            prescricao.doseBasalSugerida = opioideTolerante ? (isIdoso ? '0.5 mg/h' : '1 a 2 mg/h') : '0 mg/h (Não recomendada para pacientes opioid-naive)';
            
            // Bolus
            var bolusMin = isIdoso ? 0.5 : 1.0;
            var bolusMax = isIdoso ? 1.0 : 2.0;
            if (opioideTolerante) {
                bolusMin += 0.5;
                bolusMax += 1.0;
            }
            prescricao.bolusSugerido = bolusMin + ' a ' + bolusMax + ' mg';
            
            // Lockout
            prescricao.lockoutSugerido = isIdoso ? '8 a 10 minutos' : '6 a 8 minutos';
            
            // Limite de 4 horas
            var limite4h = (bolusMax * (60 / 6) * 4) * 0.5; // Estimativa segura (~50% do total teórico)
            if (limite4h > 30 && !opioideTolerante) limite4h = 30; // Teto segurança naive
            prescricao.limite4hSugerido = limite4h + ' mg';

        } else if (farmaco === 'fentanil') {
            // Protocolo Fentanil IV
            prescricao.farmaco = 'Fentanil';
            prescricao.concentracaoSugerida = '10 a 20 mcg/mL';
            
            prescricao.doseBasalSugerida = opioideTolerante ? (isIdoso ? '10 mcg/h' : '20 mcg/h') : '0 mcg/h (Não recomendada para pacientes opioid-naive)';
            
            var bolusFentMin = isIdoso ? 10 : 20;
            var bolusFentMax = isIdoso ? 20 : 40;
            if (opioideTolerante) {
                bolusFentMin += 10;
                bolusFentMax += 20;
            }
            prescricao.bolusSugerido = bolusFentMin + ' a ' + bolusFentMax + ' mcg';
            
            prescricao.lockoutSugerido = isIdoso ? '6 a 8 minutos' : '5 a 6 minutos';
            
            // Limite de 4 horas
            var limite4hFent = (bolusFentMax * (60 / 5) * 4) * 0.5;
            if (limite4hFent > 300 && !opioideTolerante) limite4hFent = 300;
            prescricao.limite4hSugerido = limite4hFent + ' mcg';
        }

        // Alertas de segurança
        prescricao.alertasSeguranca = [
            "Monitoramento contínuo de oximetria de pulso (SpO2) e frequência respiratória mandatórios.",
            "Manter Naloxona (0.4 mg/mL) disponível beira-leito para emergências respiratórias.",
            "Desencorajada a prescrição simultânea de sedativos ou hipnóticos (ex: Benzodiazepínicos)."
        ];
        if (!opioideTolerante) {
            prescricao.alertasSeguranca.push("Paciente opioid-naïve: O uso de dose basal por infusão contínua aumenta significativamente o risco de depressão respiratória grave sem melhorar substancialmente a analgesia, sendo fortemente desaconselhado.");
        }

        return prescricao;
    }

    return {
        calcularPca: calcularPca
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalgesiaPcaService;
}
