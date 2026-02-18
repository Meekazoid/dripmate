# Grinder Conversion & Calibration Matrix v1.1 (BrewBuddy)

## Purpose
This overview documents how BrewBuddy converts the internal grind reference to each supported grinder scale and how user feedback offsets are applied.

## Internal reference model
- BrewBuddy computes a method/process-adjusted base grind in a **Comandante-equivalent** scale (`grindBase.comandante`).
- For Fellow, an additional `grindBase.fellow` base is used where available.
- User feedback changes are applied via a grinder-neutral `grindOffset` and mapped with grinder-specific sensitivity.

## Conversion matrix (v1)

| Grinder | Output Unit | Base Mapping | Offset Mapping | Clamp |
|---|---|---|---|---|
| Comandante MK3/MK4 | clicks | `round(base * 1.0)` | `+ offset * 1.0` | min 1 |
| Fellow Ode Gen 2 | dial value | `grindBase.fellow` | `+ offset * 0.1` | min 0.1 |
| Fellow Ode Gen 1 | dial value | `(grindBase.fellow - 1.5)` | `+ offset * 0.1` | min 0.1 |
| Timemore S3 | clicks | `round(base * 2.0)` | `+ offset * 2.0` | min 1 |
| Timemore C2 | clicks | `round(base * 0.82)` | `+ offset * 0.82` | min 1 |
| 1Zpresso JX | rotations | `base * (1.1/30)` | `+ offset * (1.1/30)` | min 0.1 rot |
| Baratza Encore | stepped number | `round(base * 0.8)` | `+ offset * 0.8` | 1..40 |

## Calibration matrix (v1.1)

The v1.1 layer adds a practical calibration overview for operations and QA.

| Grinder | Recommended Pour-Over Start Band* | Offset Sensitivity | Confidence Band | Suggested Cap per Brew |
|---|---|---|---|---|
| Comandante MK3/MK4 | 21–25 clicks | 1 offset = 1 click | High | ±3 clicks |
| Fellow Ode Gen 2 | 3.0–5.0 | 1 offset = 0.1 dial | Medium-High | ±0.3 |
| Fellow Ode Gen 1 | 2.0–4.0 (Gen2-equivalent shifted) | 1 offset = 0.1 dial | Medium | ±0.3 |
| Timemore S3 | 45–70 clicks | 1 offset ≈ 2 clicks | Medium | ±6 clicks |
| Timemore C2 | 14–22 clicks | 1 offset ≈ 0.82 clicks | Medium-Low | ±4 clicks |
| 1Zpresso JX | 0.7–1.2 rotations | 1 offset ≈ 0.04 rot | Medium | ±0.15 rot |
| Baratza Encore | 12–20 | 1 offset ≈ 0.8 steps | Medium-Low | ±4 steps |

\*Start band means first recommendation window for filter/pour-over style brews and should be interpreted alongside processing/method/water adjustments.

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
