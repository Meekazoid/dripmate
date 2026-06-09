/**
 * gen-grinder-docs.mjs
 * Generates v1 + v1.1 calibration tables in GRINDER_CALIBRATION_OVERVIEW.md
 * between <!-- AUTOGEN:START --> / <!-- AUTOGEN:END --> markers from GRINDERS registry.
 *
 * Run: node scripts/gen-grinder-docs.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GRINDERS } from '../js/data/grinders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOC_PATH = path.join(__dirname, '..', 'docs', 'GRINDER_CALIBRATION_OVERVIEW.md');

// Doc-order: specifies which keys appear and in what order.
// Entries sharing a docLabel are merged into a single row (MK3/MK4).
const DOC_ORDER = [
    'comandante_mk3',
    'fellow_gen2',
    'fellow_gen1',
    'df64_gen2',
    'timemore_s3',
    'timemore_c2',
    '1zpresso',
    'baratza',
];

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatFactor(f) {
    if (f === undefined || f === null) return '';
    // Avoid floating-point noise: toPrecision(12) then strip trailing zeros
    const s = parseFloat(f.toPrecision(12)).toString();
    return s.includes('.') ? s : s + '.0';
}

function v1Mapping(profile) {
    const hint = profile.baseMappingHint;
    const f = hint || formatFactor(profile.baseFactor);

    switch (profile.type) {
        case 'ode':
            return {
                unit: 'dial value',
                baseMapping: profile.baseRef === 'fellow1' ? '(grindBase.fellow - 1.5)' : 'grindBase.fellow',
                offsetMapping: `+ offset * ${formatFactor(profile.offsetFactor)}`,
                clamp: `min ${profile.min}`,
            };
        case 'rot':
            return {
                unit: 'rotations',
                baseMapping: `base * (${f})`,
                offsetMapping: `+ offset * (${f})`,
                clamp: `min ${profile.min} rot`,
            };
        case 'encore':
            return {
                unit: 'stepped number',
                baseMapping: `round(base * ${f})`,
                offsetMapping: `+ offset * ${f}`,
                clamp: `${profile.min}..${profile.max}`,
            };
        case 'df64':
            return {
                unit: 'dial 0–90',
                baseMapping: `round(base * ${f})`,
                offsetMapping: `+ offset * ${f}`,
                clamp: `${profile.min}..${profile.max}`,
            };
        default: // clicks
            return {
                unit: 'clicks',
                baseMapping: `round(base * ${f})`,
                offsetMapping: `+ offset * ${f}`,
                clamp: `min ${profile.min}`,
            };
    }
}

// ── Table generation ──────────────────────────────────────────────────────────

function generateTables() {
    const rows = DOC_ORDER.map(key => GRINDERS[key]);

    // ── v1 table ──────────────────────────────────────────────────────────────
    const v1Header = [
        '| Grinder | Output Unit | Base Mapping | Offset Mapping | Clamp |',
        '|---|---|---|---|---|',
    ];
    const v1Rows = rows.map(g => {
        const m = v1Mapping(g.profile);
        return `| ${g.docLabel} | ${m.unit} | \`${m.baseMapping}\` | \`${m.offsetMapping}\` | ${m.clamp} |`;
    });

    // ── v1.1 table ────────────────────────────────────────────────────────────
    const v11Header = [
        '| Grinder | Recommended Pour-Over Start Band* | Offset Sensitivity | Confidence Band | Suggested Cap per Brew |',
        '|---|---|---|---|---|',
    ];
    const v11Rows = rows.map(g => {
        const c = g.calibration;
        return `| ${g.docLabel} | ${c.startBand} | 1 offset ${c.offsetSensitivity} | ${c.confidence} | ${c.capPerBrew} |`;
    });

    return [
        '## Conversion matrix (v1)',
        '',
        ...v1Header,
        ...v1Rows,
        '',
        '## Calibration matrix (v1.1)',
        '',
        'The v1.1 layer adds a practical calibration overview for operations and QA.',
        '',
        ...v11Header,
        ...v11Rows,
        '',
        '\\*Start band means first recommendation window for filter/pour-over style brews and should be interpreted alongside processing/method/water adjustments.',
    ].join('\n');
}

// ── Doc update ────────────────────────────────────────────────────────────────

const START_MARKER = '<!-- AUTOGEN:START -->';
const END_MARKER   = '<!-- AUTOGEN:END -->';

const doc = readFileSync(DOC_PATH, 'utf8');

const startIdx = doc.indexOf(START_MARKER);
const endIdx   = doc.indexOf(END_MARKER);

if (startIdx === -1 || endIdx === -1) {
    console.error('ERROR: AUTOGEN markers not found in', DOC_PATH);
    process.exit(1);
}

const before   = doc.slice(0, startIdx);
const after    = doc.slice(endIdx + END_MARKER.length);
const newBlock = `${START_MARKER}\n${generateTables()}\n${END_MARKER}`;

const updated = before + newBlock + after;
writeFileSync(DOC_PATH, updated, 'utf8');

console.log('✓ Generated grinder tables in', path.relative(process.cwd(), DOC_PATH));
