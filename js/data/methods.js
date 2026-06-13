// ==========================================
// METHOD REGISTRY — Single Source of Truth
// Values MUST match js/brew-engine.js
// adjustForMethod() / generateBrewSteps() / generateBrewNotes()
// ==========================================

export const METHODS = {
    aeropress: {
        key: 'aeropress',
        label: 'AeroPress',
        pickerDetail: 'Immersion · inverted · 1:15',
        stepHeaderLabel: 'AeroPress Brew Steps',
        timerLabel: 'AeroPress',
        adjust: {
            grindComandante: -3,
            grindFellow: -0.75,
            ratioClamp: { op: 'min', value: 15 },
            tempDelta: -1,
            targetTime: '1:15-2:00',
        },
        note: 'AeroPress inverted - full immersion, concentrated, finer grind',
        buildSteps(amount, ratio, waterAmount) {
            const bloom = Math.round(amount * 3);
            return [
                { time: '0:00', action: `Add ${bloom}g water, stir to saturate` },
                { time: '0:30', action: `Fill to ${waterAmount}g, gentle stir` },
                { time: '0:50', action: `Insert plunger, steep` },
                { time: '1:20', action: `Press slowly (~25-30 sec)` },
            ];
        },
    },

    chemex: {
        key: 'chemex',
        label: 'Chemex',
        pickerDetail: 'Pour-over · thick filter · 1:16.5',
        stepHeaderLabel: 'Chemex Pour-Over Steps',
        timerLabel: 'Chemex',
        adjust: {
            grindComandante: +5,
            grindFellow: +1.15,
            ratioClamp: { op: 'max', value: 16.5 },
            tempDelta: +1,
            targetTime: '3:30-4:30',
        },
        note: 'Chemex - thick paper filter, clean cup, coarser grind',
        buildSteps(amount, ratio, waterAmount) {
            const bloom = Math.round(amount * 3);
            return [
                { time: '0:00', action: `Bloom: ${bloom}g water, gentle stir, wait 45 sec` },
                { time: '0:45', action: `Pour slowly to ${Math.round(waterAmount * 0.4)}g. Center pour` },
                { time: '1:30', action: `Pour to ${Math.round(waterAmount * 0.7)}g. Wide circles` },
                { time: '2:30', action: `Pour to ${waterAmount}g. Let drain completely` },
            ];
        },
    },

    v60: {
        key: 'v60',
        label: 'Hario V60',
        pickerDetail: 'Pour-over · cone · 1:16',
        stepHeaderLabel: 'V60 Pour-Over Steps',
        timerLabel: 'V60',
        adjust: {
            grindComandante: 0,
            grindFellow: 0,
            ratioClamp: { op: 'none', value: null },
            tempDelta: 0,
            targetTime: '2:30-3:00',
        },
        note: null, // v60 uses category-based notes from getProcessingBaseParams
        buildSteps(amount, ratio, waterAmount) {
            const bloom = Math.round(amount * 3);
            return [
                { time: '0:00', action: `Bloom: ${bloom}g water, 45 sec` },
                { time: '0:45', action: `To ${Math.round(waterAmount * 0.50)}g: Pour evenly` },
                { time: '1:20', action: `To ${Math.round(waterAmount * 0.83)}g: Concentric circles` },
                { time: '1:50', action: `To ${waterAmount}g: Final pour` },
            ];
        },
    },
};
