# Grinder Conversion & Calibration Matrix v1.1 (dripmate)

> **Hinweis:** Die Tabellen in diesem Dokument werden aus `js/data/grinders.js` generiert — nicht von Hand editieren.

## Purpose
This overview documents how dripmate converts the internal grind reference to each supported grinder scale and how user feedback offsets are applied.

## Internal reference model
- dripmate computes a method/process-adjusted base grind in a **Comandante-equivalent** scale (`grindBase.comandante`).
- For Fellow, an additional `grindBase.fellow` base is used where available.
- User feedback changes are applied via a grinder-neutral `grindOffset` and mapped with grinder-specific sensitivity.

<!-- AUTOGEN:START -->
## Conversion matrix (v1)

| Grinder | Output Unit | Base Mapping | Offset Mapping | Clamp |
|---|---|---|---|---|
| Comandante MK3/MK4 | clicks | `round(base * 1.0)` | `+ offset * 1.0` | min 1 |
| Fellow Ode Gen 2 | dial value | `grindBase.fellow` | `+ offset * 0.1` | min 0.1 |
| Fellow Ode Gen 1 | dial value | `(grindBase.fellow - 1.5)` | `+ offset * 0.1` | min 0.1 |
| DF64 Gen 2 | dial 0–90 | `round(base * 2.5)` | `+ offset * 2.5` | 0..90 |
| Timemore S3 | clicks | `round(base * 2.5)` | `+ offset * 2.5` | min 1 |
| Timemore C2 | clicks | `round(base * 0.82)` | `+ offset * 0.82` | min 1 |
| 1Zpresso JX | rotations | `base * (3.5/30)` | `+ offset * (3.5/30)` | min 0.1 rot |
| Baratza Encore | stepped number | `round(base * 0.9)` | `+ offset * 0.9` | 1..40 |

## Calibration matrix (v1.1)

The v1.1 layer adds a practical calibration overview for operations and QA.

| Grinder | Recommended Pour-Over Start Band* | Offset Sensitivity | Confidence Band | Suggested Cap per Brew |
|---|---|---|---|---|
| Comandante MK3/MK4 | 21–25 clicks | 1 offset = 1 click | High | ±3 clicks |
| Fellow Ode Gen 2 | 3.0–5.0 | 1 offset = 0.1 dial | Medium-High | ±0.3 |
| Fellow Ode Gen 1 | 2.0–4.0 (Gen2-equivalent shifted) | 1 offset = 0.1 dial | Medium | ±0.3 |
| DF64 Gen 2 | 52–58 | 1 offset ≈ 2.5 dial units | Medium | ±6 |
| Timemore S3 | 45–70 clicks | 1 offset ≈ 2.5 clicks | Medium | ±6 clicks |
| Timemore C2 | 14–22 clicks | 1 offset ≈ 0.82 clicks | Medium-Low | ±4 clicks |
| 1Zpresso JX | 2.3–3.0 rot | 1 offset ≈ 0.12 rot | Medium | ±0.15 rot |
| Baratza Encore | 12–20 | 1 offset ≈ 0.9 steps | Medium-Low | ±4 steps |

\*Start band means first recommendation window for filter/pour-over style brews and should be interpreted alongside processing/method/water adjustments.
<!-- AUTOGEN:END -->

### v1.1 interpretation rules
1. Keep the existing conversion formula as the primary output.
2. If output is outside the start band by >20%, show a "low confidence" hint in future UI iterations.
3. Apply step caps first, then re-taste and iterate (single-variable changes preferred when signals conflict).
4. Treat v1.1 bands as calibration guardrails, not hard limits.

## Why this structure
- One centralized profile table avoids hidden per-case drift.
- Offset sensitivity is explicit and tunable per grinder.
- Legacy keys remain compatible (`fellow`, `timemore`, `comandante`).

## Recommendations for future calibration
1. Add optional per-device calibration saved per user/grinder profile.
2. Introduce confidence bands (e.g., "18–20 clicks") where model uncertainty is higher.
3. Collect anonymized brew outcome deltas to continuously tune factors.

## Rule pipeline context
Final grind recommendation is still produced after this chain:

`processing -> altitude -> cultivar -> origin -> water hardness -> roast age -> brew method -> grinder conversion`
