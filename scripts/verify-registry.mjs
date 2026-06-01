/**
 * verify-registry.mjs
 * Phase-4 verification of GRINDERS and METHODS registries.
 *
 * Checks:
 *  1. For every grinder: computed value at base=22 lies within startBand
 *  2. offsetFactor === baseFactor for all non-ode types
 *  3. baseMappingHint consistency (no eval — uses "Zähler/Nenner" format)
 *  4. Every key resolves label, profile/adjust, picker fields — no orphans
 *  5. GRINDER_MIGRATION targets exist in GRINDERS
 */

import { GRINDERS, GRINDER_MIGRATION } from '../js/data/grinders.js';
import { METHODS }                      from '../js/data/methods.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function ok(condition, msg) {
    if (condition) {
        console.log(`    ✓ ${msg}`);
        passed++;
    } else {
        console.error(`    ✗ FAIL: ${msg}`);
        failed++;
    }
}

function parseStartBand(startBand) {
    // Extracts first "X–Y" or "X-Y" numeric range, ignores trailing text
    const m = startBand.match(/^([\d.]+)[–\-]([\d.]+)/);
    if (!m) return null;
    return { min: parseFloat(m[1]), max: parseFloat(m[2]) };
}

// No eval — supports "Zähler/Nenner" format only (e.g. "3.5/30")
function hintToNumber(hint) {
    if (hint.includes('/')) {
        const [n, d] = hint.split('/').map(Number);
        return n / d;
    }
    return Number(hint);
}

// Reference grindBase for washed/V60/neutral (matches snapshot-brews fixed inputs)
const REF_BASE   = 22;   // comandante-equivalent for washed processing
const REF_FELLOW = 3.5;  // grindBase.fellow for washed/V60

// ─────────────────────────────────────────────────────────────────────────────
// GRINDER CHECKS
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n══ GRINDER CHECKS ══════════════════════════════════════════════\n');

for (const [key, g] of Object.entries(GRINDERS)) {
    console.log(`  [${key}]`);

    // ① Required fields — no orphans
    ok(typeof g.label === 'string' && g.label.length > 0,
        `label: "${g.label}"`);
    ok(typeof g.chipLabel === 'string' && g.chipLabel.length > 0,
        `chipLabel: "${g.chipLabel}"`);
    ok(typeof g.pickerDetail === 'string' && g.pickerDetail.length > 0,
        `pickerDetail present`);
    ok(typeof g.docLabel === 'string' && g.docLabel.length > 0,
        `docLabel: "${g.docLabel}"`);

    // profile
    const p = g.profile;
    ok(p && typeof p.type === 'string',
        `profile.type: "${p?.type}"`);
    ok(typeof p.offsetFactor === 'number',
        `profile.offsetFactor: ${p?.offsetFactor}`);
    ok(typeof p.min === 'number',
        `profile.min: ${p?.min}`);

    // calibration
    const c = g.calibration;
    ok(c && typeof c.startBand === 'string' && c.startBand.length > 0,
        `calibration.startBand: "${c?.startBand}"`);
    ok(typeof c.offsetSensitivity === 'string',
        `calibration.offsetSensitivity: "${c?.offsetSensitivity}"`);
    ok(typeof c.confidence === 'string',
        `calibration.confidence: "${c?.confidence}"`);
    ok(typeof c.capPerBrew === 'string',
        `calibration.capPerBrew: "${c?.capPerBrew}"`);

    // ② offsetFactor === baseFactor (non-ode only)
    if (p.type !== 'ode') {
        ok(Math.abs(p.offsetFactor - p.baseFactor) < 1e-12,
            `offsetFactor (${p.offsetFactor}) === baseFactor (${p.baseFactor})`);
    } else {
        console.log(`    — ode: baseFactor n/a, offset uses grindBase.fellow directly`);
    }

    // ③ baseMappingHint consistency (only if set)
    if (p.baseMappingHint !== undefined) {
        const hintVal = hintToNumber(p.baseMappingHint);
        const diff    = Math.abs(hintVal - p.baseFactor);
        ok(diff < 1e-9,
            `baseMappingHint "${p.baseMappingHint}" → ${hintVal} ≈ baseFactor ${p.baseFactor} (Δ = ${diff.toExponential(2)})`);
    }

    // ④ startBand: computed value at REF_BASE lies within [min, max]
    const band = parseStartBand(c.startBand);
    if (!band) {
        ok(false, `Could not parse startBand: "${c.startBand}"`);
    } else {
        let computed, desc;
        if (p.type === 'ode') {
            computed = p.baseRef === 'fellow1' ? REF_FELLOW - 1.5 : REF_FELLOW;
            desc = `grindBase.fellow${p.baseRef === 'fellow1' ? ' - 1.5' : ''} = ${computed}`;
        } else if (p.type === 'rot') {
            computed = REF_BASE * p.baseFactor;
            desc = `${REF_BASE} × baseFactor = ${computed.toFixed(3)} rot`;
        } else {
            computed = Math.round(REF_BASE * p.baseFactor);
            desc = `round(${REF_BASE} × ${p.baseFactor}) = ${computed}`;
        }
        ok(computed >= band.min && computed <= band.max,
            `${desc} ∈ [${band.min}, ${band.max}]  (startBand: "${c.startBand}")`);
    }

    console.log('');
}

// ── GRINDER_MIGRATION targets must exist ──────────────────────────────────────
console.log('  [GRINDER_MIGRATION]');
for (const [oldKey, newKey] of Object.entries(GRINDER_MIGRATION)) {
    ok(GRINDERS[newKey] !== undefined,
        `"${oldKey}" → "${newKey}" exists in GRINDERS`);
}
console.log('');

// ─────────────────────────────────────────────────────────────────────────────
// METHOD CHECKS
// ─────────────────────────────────────────────────────────────────────────────

console.log('══ METHOD CHECKS ════════════════════════════════════════════════\n');

for (const [key, m] of Object.entries(METHODS)) {
    console.log(`  [${key}]`);

    // Required fields — no orphans
    ok(typeof m.label === 'string' && m.label.length > 0,
        `label: "${m.label}"`);
    ok(typeof m.pickerDetail === 'string' && m.pickerDetail.length > 0,
        `pickerDetail present`);
    ok(typeof m.stepHeaderLabel === 'string' && m.stepHeaderLabel.length > 0,
        `stepHeaderLabel: "${m.stepHeaderLabel}"`);
    ok(typeof m.timerLabel === 'string' && m.timerLabel.length > 0,
        `timerLabel: "${m.timerLabel}"`);

    // adjust object
    const adj = m.adjust;
    ok(adj && typeof adj.grindComandante === 'number',
        `adjust.grindComandante: ${adj?.grindComandante}`);
    ok(typeof adj.grindFellow === 'number',
        `adjust.grindFellow: ${adj?.grindFellow}`);
    ok(typeof adj.tempDelta === 'number',
        `adjust.tempDelta: ${adj?.tempDelta}`);
    ok(adj.ratioClamp && ['max', 'min', 'none'].includes(adj.ratioClamp.op),
        `adjust.ratioClamp.op: "${adj?.ratioClamp?.op}"`);

    // buildSteps is callable and returns a non-empty array
    ok(typeof m.buildSteps === 'function',
        `buildSteps is a function`);
    try {
        const steps = m.buildSteps(18, 16, 'standard', 288);
        ok(Array.isArray(steps) && steps.length > 0,
            `buildSteps(18, 16, 'standard', 288) → ${steps.length} step(s)`);
        ok(steps.every(s => typeof s.time === 'string' && typeof s.action === 'string'),
            `all steps have {time, action}`);
    } catch (e) {
        ok(false, `buildSteps threw: ${e.message}`);
    }

    console.log('');
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

console.log('══ SUMMARY ══════════════════════════════════════════════════════\n');
console.log(`  Passed : ${passed}`);
console.log(`  Failed : ${failed}`);

if (failed > 0) {
    console.error('\n  ✗  VERIFICATION FAILED\n');
    process.exit(1);
} else {
    console.log('\n  ✓  ALL CHECKS PASSED\n');
}
