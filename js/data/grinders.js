// ==========================================
// GRINDER REGISTRY — Single Source of Truth
// Values MUST match js/brew-engine.js profiles{}
// ==========================================

export const GRINDERS = {
    '1zpresso': {
        key: '1zpresso',
        label: '1Zpresso JX',
        chipLabel: '1Zpresso JX',
        pickerDetail: '48mm conical · 30 clicks/rot',
        profile: { type: 'rot', baseFactor: 3.5 / 30, offsetFactor: 3.5 / 30, min: 0.1 },
        calibration: { startBand: '2.3–3.0 rot', offsetSensitivity: '≈ 0.12 rot', confidence: 'Medium', capPerBrew: '±0.15 rot' },
        sources: ['48mm conical, 30 clicks/rotation, V60 range ~2.5-3.0 rot (baseFactor 3.5/30)'],
    },
    baratza: {
        key: 'baratza',
        label: 'Baratza Encore',
        chipLabel: 'Baratza',
        pickerDetail: '40mm conical · 40 steps',
        profile: { type: 'encore', baseFactor: 0.9, offsetFactor: 0.9, min: 1, max: 40 },
        calibration: { startBand: '12–20', offsetSensitivity: '≈ 0.9 steps', confidence: 'Medium-Low', capPerBrew: '±4 steps' },
        sources: ['40mm conical, 40 stepped settings, V60 range 18-22 (baseFactor 0.9)'],
    },
    comandante_mk3: {
        key: 'comandante_mk3',
        label: 'Comandante C40 MK3',
        chipLabel: 'Comandante MK3',
        pickerDetail: 'Nitro Blade · 25–30 clicks',
        profile: { type: 'clicks', baseFactor: 1.0, offsetFactor: 1.0, min: 1 },
        calibration: { startBand: '21–25 clicks', offsetSensitivity: '1 click', confidence: 'High', capPerBrew: '±3 clicks' },
        sources: ['~30µm/click, V60 range 21-25 clicks'],
    },
    comandante_mk4: {
        key: 'comandante_mk4',
        label: 'Comandante C40 MK4',
        chipLabel: 'Comandante MK4',
        pickerDetail: 'Nitro Blade · 40 clicks',
        profile: { type: 'clicks', baseFactor: 1.0, offsetFactor: 1.0, min: 1 },
        calibration: { startBand: '21–25 clicks', offsetSensitivity: '1 click', confidence: 'High', capPerBrew: '±3 clicks' },
        sources: ['~30µm/click, V60 range 21-25 clicks'],
    },
    fellow_gen1: {
        key: 'fellow_gen1',
        label: 'Fellow Ode Gen 1',
        chipLabel: 'Fellow Gen 1',
        pickerDetail: 'Original burrs · 64mm flat',
        profile: { type: 'ode', baseRef: 'fellow1', offsetFactor: 0.1, min: 0.1 },
        calibration: { startBand: '2.0–4.0', offsetSensitivity: '0.1 dial', confidence: 'Medium', capPerBrew: '±0.3' },
        sources: ['~50µm/step (original 64mm flat)'],
    },
    fellow_gen2: {
        key: 'fellow_gen2',
        label: 'Fellow Ode Gen 2',
        chipLabel: 'Fellow Gen 2',
        pickerDetail: 'SSP MP burrs · 64mm flat',
        profile: { type: 'ode', baseRef: 'fellow2', offsetFactor: 0.1, min: 0.1 },
        calibration: { startBand: '3.0–5.0', offsetSensitivity: '0.1 dial', confidence: 'Medium-High', capPerBrew: '±0.3' },
        sources: ['~25µm/step (SSP MP 64mm flat)'],
    },
    timemore_c2: {
        key: 'timemore_c2',
        label: 'Timemore Chestnut C2',
        chipLabel: 'Timemore C2',
        pickerDetail: '38mm conical · 80µm/click',
        profile: { type: 'clicks', baseFactor: 0.82, offsetFactor: 0.82, min: 1 },
        calibration: { startBand: '14–22 clicks', offsetSensitivity: '0.82 clicks', confidence: 'Medium-Low', capPerBrew: '±4 clicks' },
        sources: ['~80µm/click, 38mm conical, V60 range 15-20'],
    },
    timemore_s3: {
        key: 'timemore_s3',
        label: 'Timemore Chestnut S3',
        chipLabel: 'Timemore S3',
        pickerDetail: 'S2C890 · 42mm conical · 15µm/click',
        profile: { type: 'clicks', baseFactor: 2.5, offsetFactor: 2.5, min: 1 },
        calibration: { startBand: '45–70 clicks', offsetSensitivity: '2.5 clicks', confidence: 'Medium', capPerBrew: '±6 clicks' },
        sources: ['15µm/click, 42mm S2C890, V60 range 50-80'],
    },
};

// Legacy localStorage keys → canonical registry key
export const GRINDER_MIGRATION = {
    fellow:      'fellow_gen2',
    comandante:  'comandante_mk3',
    timemore:    'timemore_s3',
};
