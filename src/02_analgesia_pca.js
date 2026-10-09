/**
 * Módulo Avançado de Analgesia Controlada pelo Paciente (PCA)
 * Motor determinístico para cálculos de bolus, dose basal, intervalo de bloqueio (lockout) 
 * e limite de 4 horas para Morfina e Fentanil em bombas de PCA.
 */

var AnalgesiaPcaService = (function() {
    'use strict';

    function calcularPca(params) {
        var farmaco = params.farmaco ? params.farmaco.toLowerCase() : '';
        var idadeNum = parseFloat(params.idade) || 40;
        var pesoNum = parseFloat(params.pesoKg) || 70;
        var isIdoso = idadeNum >= 65;
        var isMuitoIdoso = idadeNum >= 90;
        var opioideTolerante = params.opioideTolerante || false;

        if (farmaco !== 'morfina' && farmaco !== 'fentanil') {
            return { erro: "Fármaco não suportado para PCA neste motor. Utilize 'Morfina' ou 'Fentanil'." };
        }

        var prescricao = {};
        
        if (farmaco === 'morfina') {
            // Protocolo Morfina IV
            prescricao.farmaco = 'Morfina';
            prescricao.concentracaoSugerida = '1 mg/mL';
            
            // Doses basais frequentemente evitadas em pacientes naive e nonagenários
            if (isMuitoIdoso) {
                prescricao.doseBasalSugerida = '0 mg/h (CONTRAINDICADA em ≥ 90 anos pelo alto risco de acúmulo e apneia)';
            } else {
                prescricao.doseBasalSugerida = opioideTolerante ? (isIdoso ? '0.5 mg/h' : '1 a 2 mg/h') : '0 mg/h (Não recomendada para pacientes opioid-naive)';
            }
            
            // Bolus
            var bolusMin = isMuitoIdoso ? 0.5 : (isIdoso ? 0.5 : 1.0);
            var bolusMax = isMuitoIdoso ? 0.5 : (isIdoso ? 1.0 : 2.0);
            if (opioideTolerante && !isMuitoIdoso) {
                bolusMin += 0.5;
                bolusMax += 1.0;
            }
            prescricao.bolusSugerido = bolusMin + ' a ' + bolusMax + ' mg';
            
            // Lockout
            prescricao.lockoutSugerido = isMuitoIdoso ? '10 a 15 minutos' : (isIdoso ? '8 a 10 minutos' : '6 a 8 minutos');
            
            // Limite de 4 horas
            var limite4h = (bolusMax * (60 / 6) * 4) * 0.5; // Estimativa segura (~50% do total teórico)
            if (isMuitoIdoso && limite4h > 15) limite4h = 15;
            else if (limite4h > 30 && !opioideTolerante) limite4h = 30; // Teto segurança naive
            prescricao.limite4hSugerido = limite4h + ' mg';

        } else if (farmaco === 'fentanil') {
            // Protocolo Fentanil IV
            prescricao.farmaco = 'Fentanil';
            prescricao.concentracaoSugerida = '10 a 20 mcg/mL';
            
            if (isMuitoIdoso) {
                prescricao.doseBasalSugerida = '0 mcg/h (CONTRAINDICADA em ≥ 90 anos)';
            } else {
                prescricao.doseBasalSugerida = opioideTolerante ? (isIdoso ? '10 mcg/h' : '20 mcg/h') : '0 mcg/h (Não recomendada para pacientes opioid-naive)';
            }
            
            var bolusFentMin = isMuitoIdoso ? 10 : (isIdoso ? 10 : 20);
            var bolusFentMax = isMuitoIdoso ? 15 : (isIdoso ? 20 : 40);
            if (opioideTolerante && !isMuitoIdoso) {
                bolusFentMin += 10;
                bolusFentMax += 20;
            }
            prescricao.bolusSugerido = bolusFentMin + ' a ' + bolusFentMax + ' mcg';
            
            prescricao.lockoutSugerido = isMuitoIdoso ? '8 a 10 minutos' : (isIdoso ? '6 a 8 minutos' : '5 a 6 minutos');
            
            // Limite de 4 horas
            var limite4hFent = (bolusFentMax * (60 / 5) * 4) * 0.5;
            if (isMuitoIdoso && limite4hFent > 150) limite4hFent = 150;
            else if (limite4hFent > 300 && !opioideTolerante) limite4hFent = 300;
            prescricao.limite4hSugerido = limite4hFent + ' mcg';
        }

        // Alertas de segurança
        prescricao.alertasSeguranca = [
            "Monitoramento contínuo de oximetria de pulso (SpO2) e frequência respiratória mandatórios.",
            "Manter Naloxona (0.4 mg/mL) disponível beira-leito para emergências respiratórias.",
            "Desencorajada a prescrição simultânea de sedativos ou hipnóticos (ex: Benzodiazepínicos)."
        ];
        if (isMuitoIdoso) {
            prescricao.alertasSeguranca.unshift("⚠️ PACIENTE MUITO IDOSO (≥ 90 ANOS): Risco altíssimo de depressão respiratória central e sedação excessiva por depuração renal/hepática reduzida. Na escolha entre opioides, Fentanil é preferível à Morfina para evitar acúmulo de metabólitos neurotóxicos (M6G/M3G). Titulação em doses mínimas com oximetria e FR contínuas.");
        }
        if (pesoNum > 150) {
            prescricao.alertasSeguranca.unshift(`⚠️ OBESIDADE SEVERA/EXTREMA (${pesoNum} kg): Alto risco de apneia obstrutiva do sono e hipoventilação induzida por opioides. O Fentanil (lipofílico) apresenta volume de distribuição ampliado e meia-vida terminal prolongada; doses basais devem ser evitadas e capnografia beira-leito é fortemente recomendada.`);
        } else if (pesoNum < 40) {
            prescricao.alertasSeguranca.unshift(`⚠️ BAIXO PESO CORPORAL / CAQUEXIA (${pesoNum} kg): Risco aumentado de superdosagem relativa; preconiza-se iniciar no menor bolus da faixa posológica e estender intervalos de bloqueio (lockout).`);
        }
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
