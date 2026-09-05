---
name: Autonomous Haulage & Pit Control Operations
colors:
  surface: '#0c1322'
  surface-dim: '#0c1322'
  surface-bright: '#323949'
  surface-container-lowest: '#070e1d'
  surface-container-low: '#141b2b'
  surface-container: '#191f2f'
  surface-container-high: '#232a3a'
  surface-container-highest: '#2e3545'
  on-surface: '#dce2f7'
  on-surface-variant: '#bac9cc'
  inverse-surface: '#dce2f7'
  inverse-on-surface: '#293040'
  outline: '#849396'
  outline-variant: '#3b494c'
  surface-tint: '#00daf3'
  primary: '#c3f5ff'
  on-primary: '#00363d'
  primary-container: '#00e5ff'
  on-primary-container: '#00626e'
  inverse-primary: '#006875'
  secondary: '#ffd795'
  on-secondary: '#422c00'
  secondary-container: '#fbb400'
  on-secondary-container: '#694900'
  tertiary: '#ffe7ed'
  on-tertiary: '#640039'
  tertiary-container: '#ffbfd6'
  on-tertiary-container: '#ac0768'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf0ff'
  primary-fixed-dim: '#00daf3'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#ffdea9'
  secondary-fixed-dim: '#ffba27'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4100'
  tertiary-fixed: '#ffd9e4'
  tertiary-fixed-dim: '#ffb0cd'
  on-tertiary-fixed: '#3e0022'
  on-tertiary-fixed-variant: '#8c0053'
  background: '#0c1322'
  on-background: '#dce2f7'
  surface-variant: '#2e3545'
typography:
  display-hud:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  mono-data-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  mono-data-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
  mono-data-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.08em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-xxs: 2px
  space-xs: 4px
  space-sm: 8px
  space-md: 12px
  space-lg: 16px
  space-xl: 24px
  space-xxl: 32px
  gutter-dense: 4px
  gutter-panel: 8px
  gutter-screen: 12px
---

## Brand & Style

This design system is engineered for mission-critical dispatch, telemetry monitoring, and autonomous haulage orchestration in surface mining environments. Operating inside multi-screen network operations centers (NOC) and mobile dispatch vans under varying low-light conditions, the interface balances extreme information density with instantaneous scannability. 

The aesthetic synthesizes modern tactical aerospace telemetry and industrial avionics. Visual hierarchy relies on razor-sharp architectural structures rather than decorative padding. Every element serves an operational purpose: reducing cognitive fatigue over 12-hour shifts, eliminating misinterpretation of critical warnings, and establishing distinct spatial zones for geospatial tracking, status monitoring, and mechanical diagnostics.

Key design tenants:
- **Zero Ambiguity:** Telemetry, equipment callsigns, and alert states must be legible from a distance of two meters across wall displays.
- **Instrument Precision:** High-contrast structural boundaries (1px crisp borders) construct a tactical cockpit environment without visual vibration.
- **Controlled Luminescence:** Accents glow selectively to signify alerts, deviations, and operational anomalies against a deep midnight field.

## Colors

The palette operates under a strict operational darkness hierarchy. The deep obsidian and midnight navy canvas eliminates eye strain, maximizes OLED/LCD contrast ratios, and preserves night-adapted vision.

### Palette Architecture
- **Canvas & Containers:** Deep Slate Obsidian (`#0B0F17`) acts as the absolute floor. Surfaces tier up through Midnight Navy (`#111827`) to Telemetry Deck (`#161F30`). Layer borders are drawn strictly with 1px structural strokes (`#1F2E47` and `#2D3F5E`).
- **Primary Accents:** Radar Cyan (`#00E5FF`) delivers precision feedback for telemetry pings, focus rings, selected tracks, and digital vector locks. Industrial Amber (`#FFB703` / `#F59E0B`) marks active mechanical processes, heavy machinery telemetry, and elevated situational awareness.
- **Mission Status Hierarchy:**
  - **Safe / Active Nominal:** Emerald (`#10B981`) and Ice Blue (`#06B6D4`) denote verified links, optimal payload, and autonomous adherence.
  - **Caution / Parameter Warning:** Hazard Orange (`#FB923C`) and Bright Amber (`#F59E0B`) indicate brake temperature spikes, speed deltas, and tire pressure drops.
  - **Critical Alert / Emergency Stop:** Pulsing Crimson Red (`#EF4444` / `#F43F5E`) overrides UI planes with deliberate visual dominance.
  - **Signal Severed / Lost Link:** Muted Slate (`#64748B`) and Ghost Violet (`#8B5CF6`) indicate dropped base stations, GPS jitter, and unmonitored units.
  - **Spatial / Vector Deviation:** Electric Magenta (`#EC4899`) flags path drift, geofence breaches, and collision avoidance vectors.

## Typography

The type system implements a dual-typeface strategy to distinguish operational control controls from live physical reality:

1. **System Interface (`Inter`):** Handles window frames, button triggers, filter selects, and qualitative descriptive logs. Set at compact optical sizing with crisp letterforms for rapid horizontal parsing.
2. **Machine Telemetry & IDs (`JetBrains Mono`):** Dedicated exclusively to dynamic, streamed data. Vehicle calls (e.g., `DUMP-088`, `EXCV-012`), UTM coordinates, payload tonnages, engine telemetry, ping timestamps, and radar bearings must always be rendered with tabular monospaced numbers to prevent tabular shifting during high-frequency screen repaints.

Labels use uppercase monospaced formatting with wide tracking (`0.08em`) to mimic aerospace cockpit annunciator panels.

## Layout & Spacing

A compact, edge-to-edge docking model designed for multi-monitor arrays (1440p / 4K) drives this system. Whitespace is strictly functional; gaps serve only to segregate disparate machinery quadrants, communication streams, and dispatch queues.

### Layout Philosophy
- **Modular Tile Engine:** Content conforms to a dynamic grid composed of interlocking operational tiles. Panes collapse, expand, or snap into 3-column or 4-column multi-monitor spans.
- **Data Density:** Gutters default to `8px` (`gutter-panel`) between primary operational windows and `4px` (`gutter-dense`) between telemetry sub-cells.
- **Reflow & Responsiveness:**
  - **Control Room Console (>1920px):** Permanent 4-tier split: Left-docked Fleet Navigator (280px), Center Geospatial Pit HUD (flexible), Right Telemetry Stream & Diagnostics (380px), Bottom Incident Ribbon (120px fixed height).
  - **Field Tablet / In-Cab Terminal (768px - 1024px):** Single primary focal view (Map or Telemetry) with an accessible bottom drawer and persistent top alert banner.

## Elevation & Depth

Visual hierarchy rejects standard drop shadows and blurs, which create visual haze across dark displays. Instead, depth is established through **tonal stratification**, **low-bleed luminescence**, and **crisp 1px boundary lines**.

- **Level 0 (Canvas Base - `#0B0F17`):** The spatial map viewport, underlying coordinate plane, and terrain meshes.
- **Level 1 (Docked Monitoring Shelves - `#111827`):** Fixed toolbars, telemetry side rails, and data grids bounded by a 1px border of `#1F2E47`.
- **Level 2 (Active Cards & Floating Widgets - `#161F30`):** Machine cards, inspection callouts, and hover details bounded by a 1px border of `#2D3F5E`.
- **Level 3 (Tactical Popovers & Critical Interrupters - `#1E293B`):** Emergency override modals and route deviation dialogs. Supported by a 1px border illuminated with the triggering alert tone (e.g., `#EF4444` for emergency stops; `#00E5FF` for active locks).
- **Luminescence / Glow:** Reserved purely for state changes. A subtle glow (`box-shadow: 0 0 8px rgba(0, 229, 255, 0.2)`) confirms an active cursor trace or an alert ping without blinding adjacent operational data.

## Shapes

The interface embraces a functional, industrial aesthetic with ultra-tight corners (`0.25rem` / `4px` base radius). This produces sharp, instrument-grade enclosures maximizing screen real estate.

- **Standard Containers & Cards:** `rounded` (4px) maintains a technical, durable visual language.
- **HUD Pill Badges & Telemetry Chips:** `rounded` (2px - 4px) to retain an angular terminal feel; circular or stadium pill badges are forbidden to avoid consumer-app connotations.
- **Input Fields & Button Cells:** `rounded` (4px) with hard structural boundaries.

## Components

### Buttons & Tactical Triggers
- **Primary Control:** Background `#00E5FF`, text `#0B0F17`, font `Inter` 12px/600 uppercase. Hover creates a radar bloom (`box-shadow: 0 0 12px rgba(0, 229, 255, 0.4)`).
- **Secondary / Telemetry Action:** Background `#161F30`, border `1px solid #2D3F5E`, text `#F8FAFC`. Active state shifts border to `#00E5FF`.
- **Emergency / Hazard Stop (E-STOP):** Background `#EF4444`, text `#F8FAFC`, with a recurring 1-second pulse keyframe glow (`rgba(239, 68, 68, 0.5)`).

### Telemetry Tags & Status Pills
- Compact badges with an inline 6px status beacon indicator.
- Structure: Monospace unit identifier, vertical stroke separator, status metric (e.g., `CAT-797F | 98.2%`).
- Signal Lost states swap text to `#64748B` with a dashed border of `#64748B`.
- Route Deviation badges use `#EC4899` text against an electric magenta tint (`rgba(236, 72, 153, 0.12)`) and `1px solid #EC4899`.

### Compact Telemetry Tables
- Header row height: 24px, background `#0B0F17`, label typography `label-caps` in `#94A3B8`.
- Telemetry row height: 28px, background alternating `#111827` and `#161F30`, bottom border `1px solid #1F2E47`.
- Numerical metrics right-aligned in `mono-data-md` for immediate decimal tracking. Hover state highlights the full row with an inset left border of `2px solid #00E5FF`.

### Input & Parameter Modifiers
- Tight height (28px) with inset dark base (`#0B0F17`) and `1px solid #1F2E47`.
- Direct manual input switches immediately to monospaced text on focus with a crisp `#00E5FF` border.

### Checkboxes & Segmented Toggles
- Custom square checkboxes (14x14px) with a 2px inner fill for active state.
- Segmented switches use solid block fill highlighting with radar cyan borders, rejecting smooth sliding consumer transitions in favor of instantaneous, deterministic state shifts.

### Mission Diagnostics Card
- Enclosure: Background `#111827`, border `1px solid #1F2E47`.
- Header: Integrated strip containing the equipment identifier (e.g., `DUMP-014`), status indicator beacon, and battery/fuel percentage.
- Body: Two-column key-value matrix showcasing payload tonnage, tire pressure (bar), engine temperature, and latency (ms) in `mono-data-sm`.