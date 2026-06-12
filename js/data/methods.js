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
            targetTime: '1:30-2:30',
            brewStyle: 'inherit',
        },
        note: 'AeroPress inverted - full immersion, concentrated, finer grind',
        buildSteps(amount, ratio, brewStyle, waterAmount) {
            const bloom = Math.round(amount * 2);
            return [
                { time: '0:00', action: `Invert AeroPress. Add ${amount}g coffee, pour ${bloom}g water. Stir 3×` },
                { time: '0:15', action: `Pour to ${waterAmount}g total. Place cap + filter` },
                { time: '0:30', action: `Let steep. Don't disturb` },
                { time: '1:15', action: `Flip onto cup. Press slowly (30 sec). Stop before hiss` },
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
            grindComandante: +3,
            grindFellow: +0.75,
            ratioClamp: { op: 'max', value: 16.5 },
            tempDelta: +1,
            targetTime: '3:30-4:30',
            brewStyle: 'inherit',
        },
        note: 'Chemex - thick paper filter, clean cup, coarser grind',
        buildSteps(amount, ratio, brewStyle, waterAmount) {
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
            targetTime: null,
            brewStyle: 'inherit',
        },
        note: null, // v60 uses category-based notes from getProcessingBaseParams
        buildSteps(amount, ratio, brewStyle, waterAmount) {
            const bloom = Math.round(amount * (brewStyle === 'slow' ? 3.5 : 3));

            if (brewStyle === 'slow') {
                return [
                    { time: '0:00', action: `Bloom: ${bloom}g water, wait 45 sec` },
                    { time: '0:45', action: `To ${Math.round(waterAmount * 0.45)}g: Very slow circular pour` },
                    { time: '1:30', action: `To ${Math.round(waterAmount * 0.75)}g: Continue slowly` },
                    { time: '2:15', action: `To ${waterAmount}g: Final pour` },
                ];
            }
            if (brewStyle === 'fruity') {
                return [
                    { time: '0:00', action: `Bloom: ${bloom}g, create crater, 45 sec` },
                    { time: '0:45', action: `To ${Math.round(waterAmount * 0.52)}g: Pour slowly` },
                    { time: '1:20', action: `To ${Math.round(waterAmount * 0.84)}g: Concentric circles` },
                    { time: '1:50', action: `To ${waterAmount}g: Final pour` },
                ];
            }
            return [
                { time: '0:00', action: `Bloom: ${bloom}g water, 35 sec` },
                { time: '0:35', action: `To ${Math.round(waterAmount * 0.5)}g: Pour evenly` },
                { time: '1:15', action: `To ${Math.round(waterAmount * 0.83)}g: Concentric circles` },
                { time: '1:45', action: `To ${waterAmount}g: Final pour` },
            ];
        },
    },
};
