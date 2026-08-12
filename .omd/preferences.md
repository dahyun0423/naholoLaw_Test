---
schema: omd.preferences/v1
design_md_hash_at_creation:
---

# Preference Log

## 2026-08-12T06:10:23.892Z — figma-defined-screens-match-exactly

```omd-meta
id: pref_mspox2qr_0a7e3967
timestamp: 2026-08-12T06:10:23.892Z
scope: visualTheme
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "src/pages/Landing.jsx"
```

Figma-defined screens must match the provided Figma design exactly; only screens absent from Figma may use an agent-created design.

## 2026-08-12T06:10:23.892Z — minimize-decorative-icons-use-figma-components

```omd-meta
id: pref_mspox2qs_781b18b2
timestamp: 2026-08-12T06:10:23.892Z
scope: visualTheme
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "src/components/AppLayout.jsx"
```

Minimize decorative icons, reuse the Figma component-page components and existing colors, and use a clean Toss-like fallback only when no Figma component exists.

## 2026-08-12T06:47:27.084Z — evidence-folders-grey-until-hover-or-selected

```omd-meta
id: pref_mspq8q5q_a55a04da
timestamp: 2026-08-12T06:47:27.084Z
scope: components.card
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "src/components/EvidenceExplorer.jsx"
```

Evidence folder cards use the 1440×1024 Figma composition, stay grey by default, and change to the existing blue treatment only on hover, focus, selection, or drop target.

## 2026-08-12T06:47:27.084Z — dashboard-keeps-schedule-help-and-faq

```omd-meta
id: pref_mspq8q5r_7eff6d20
timestamp: 2026-08-12T06:47:27.084Z
scope: layout
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "src/pages/Dashboard.jsx"
```

Dashboard simplification must preserve the upcoming schedule, help content, and frequently asked questions sections; compress secondary summary cards instead.

## 2026-08-12T06:48:35.650Z — dashboard-schedule-ui-stays-unchanged

```omd-meta
id: pref_mspqa72d_e71b9952
timestamp: 2026-08-12T06:48:35.650Z
scope: layout
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "src/pages/Dashboard.jsx"
```

When simplifying the dashboard, keep the existing upcoming-schedule UI unchanged, including its 300px card proportion, week strip, and deadline timeline.

## 2026-08-12T07:07:24.976Z — evidence-preview-must-show-real-review-context

```omd-meta
id: pref_mspqyegj_f4e6f4fa
timestamp: 2026-08-12T07:07:24.976Z
scope: components.dialog
signal: user-correction
confidence: explicit
status: pending
source_agent: codex
source_context: "src/components/EvidencePreview.jsx"
```

Evidence previews must be substantial review surfaces with document or image content, case metadata, timestamps, file facts, version and submission history, and realistic sample values instead of an empty placeholder.
