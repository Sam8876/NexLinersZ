# AGENTS.md — Fog-Safe Haulage System (NMDC Bailadila, SIH 2026)

This file is the shared context for all coding agents working in this repository.
Read this in full before generating code for either `dashboard/` or `alert-engine/`.

## 0. Full Reference Documentation

This file is a working summary. For complete technical detail — data schemas,
non-functional requirements, and the full engineering build plan — see
`docs/PROJECT_PLAN.md` in this repo. Read it before starting any non-trivial
feature; this file alone is not the full spec.

## 1. Project Summary

An ADAS Level 2-style safety and fleet-tracking system for open-cast iron ore mine
dumpers operating in dense fog (3–5m visibility) during the Bailadila monsoon season
(June–October). The system has three tiers:

1. **Vehicle node** — onboard hardware for tracking, precision positioning, and
   real-time collision-avoidance assistance.
2. **Cloud backend** — ingestion, storage, and a rules engine for fleet-wide alerts.
3. **Control room** — a live digital-twin dashboard for dispatch/monitoring.

This repo builds the **software** for tier 2 and tier 3: the `alert-engine/` backend
service and the `dashboard/` frontend. Vehicle-side firmware (ESP32/Pi) is a separate
repo/scope — this repo should treat vehicle telemetry as an external data source
arriving over MQTT.

## 2. Full Feature Summary (for reference — do not re-derive from scratch)

### Vehicle node (context only, not built in this repo)
- **Fleet tracking:** Custom ESP32 + Quectel EC200U (GPS + LTE), IP65 enclosure.
- **Dead-zone fallback:** LoRaWAN (433MHz+) for LTE coverage gaps.
- **Precision positioning:** RTK GNSS (u-blox F9P-class base + rover receivers),
  RTCM3 corrections relayed over a `painlessMesh` ESP32 ad-hoc mesh. Falls back to
  standard EC200U GPS if RTK "Fixed" status is lost.
- **ADAS compute:** Raspberry Pi 5 + AI HAT (26 TOPS) fusing edge AI camera +
  Hi-Link HLK-LD2451 24GHz FMCW radar + 2D LiDAR. Target latency budget:
  capture (~30ms) → inference (~40ms) → fusion (~15ms) → decision (~5ms) →
  HMI dispatch (~10ms) = **~100ms total**.
- **In-cab HMI:** display/HUD, audio-visual + haptic alerts, SOS push button.

### Cloud backend (built here: `alert-engine/`)
- **Ingestion:** AWS IoT Core (MQTT), device auth via certs.
- **Storage split:**
  - **InfluxDB** — time-series telemetry (GPS/RTK position, speed, radar/LiDAR readings).
  - **Supabase (Postgres)** — vehicle metadata, alert records/lifecycle, auth.
- **Alert & Monitoring Engine** — an always-on stateful service (not a stateless
  per-message function), because collision-risk checks require holding live
  fleet state (all vehicle positions/speeds) in memory to compare vehicles
  against each other, not just evaluate one message in isolation.

  **Runtime (confirmed): Node.js + TypeScript.** This service is I/O-bound
  (MQTT subscriptions + DB writes), not compute-heavy — all AI inference already
  happens on the vehicle's Pi 5 + AI HAT. Node is chosen for stack consistency
  with `dashboard/` (shared TypeScript types for the data contracts in Section 3)
  rather than for raw throughput; either Node or Python would perform adequately
  here, but sharing one language across both services reduces context-switching
  and lets alert-type/schema types be imported directly by the frontend.

  Suggested structure:
  ```
  alert-engine/
  ├── src/
  │   ├── mqtt/           # AWS IoT Core connection, topic subscriptions
  │   ├── state/          # in-memory fleet state store (Map<vehicleId, VehicleState>)
  │   ├── rules/           # one module per alert type (overspeeding.ts, sos.ts,
  │   │                     #   collisionClose.ts, unusualHalt.ts, routeDeviation.ts,
  │   │                     #   signalLost.ts)
  │   ├── db/              # Supabase client (alerts CRUD), InfluxDB client (writes)
  │   ├── types/           # shared TS types matching Section 3 data contracts
  │   └── index.ts         # service entrypoint, wires MQTT -> rules -> db
  ├── test/                # Vitest unit tests per rule module
  └── package.json
  ```
  Key libraries: `aws-iot-device-sdk-v2` (MQTT/IoT Core connection),
  `@supabase/supabase-js` (alerts CRUD + Realtime), `@influxdata/influxdb-client`
  (telemetry writes), `vitest` (testing). A lightweight HTTP framework (Fastify)
  is optional, only needed if the dashboard requires REST queries beyond what
  Supabase/InfluxDB clients provide directly.

  Each rule module in `rules/` should be a pure function taking current fleet
  state + new telemetry and returning zero or more alert events — this keeps
  rule logic independently testable without a live MQTT connection.

  Alert types to implement (all derived primarily from EC200U/RTK telemetry):
  | Alert | Trigger |
  |---|---|
  | **Overspeeding** | Vehicle speed exceeds route/segment safe limit |
  | **SOS Push Button** | Manual operator-triggered emergency signal from in-cab HMI |
  | **Collision Close** | Converging-vehicle proximity risk from paired position/speed/heading |
  | **Unusual Stop/Halt** | Vehicle stationary outside expected stoppage points/duration |
  | **Route Deviation** | Position diverges from assigned haul route |
  | **Signal Lost** | Vehicle heartbeat/telemetry stops arriving (LTE + mesh both unreachable) |

  Alert lifecycle: `raised` → `acknowledged` → `resolved`, stored in Supabase.
  The engine can also publish back to a vehicle's MQTT topic to trigger its HMI
  from a control-room-initiated action.

### Control room (built here: `dashboard/`)
- **Framework:** React + TypeScript + Vite.
- **Map/digital twin:** MapLibre GL JS (open-source, no licensing cost).
- **Live position channel:** direct MQTT-over-WSS subscription from AWS IoT Core
  — **no cache layer**. Live vehicle position must never be shown from a stale
  snapshot; InfluxDB is for history/replay only, not the live view.
- **Alerts channel:** Supabase Realtime subscription to the alerts table (populated
  by `alert-engine/`), shown in a dedicated alerts panel.
- **Non-realtime data:** TanStack Query with `staleTime: 0` (vehicle roster,
  shift/historical reports) — no push needed, but never cached stale.
- **State management:** Zustand, no persistence middleware (avoid fleet state
  leaking into browser storage across sessions).
- **Styling:** Tailwind + shadcn/ui.

### Explicitly out of scope (do not build)
- Fully autonomous/driverless vehicle control.
- Underground mining operations.
- Non-haulage vehicle support (Phase 2, not this build).

## 3. Data Contracts

Use these MQTT topic and payload conventions consistently across both `dashboard/`
and `alert-engine/` — do not invent alternate schemas per module.

**Topics:**
- `mine/{siteId}/vehicle/{vehicleId}/telemetry` — published by vehicle, high frequency
- `mine/{siteId}/vehicle/{vehicleId}/alert` — published by alert-engine to vehicle HMI
- `mine/{siteId}/vehicle/{vehicleId}/sos` — published by vehicle on SOS button press

**Telemetry payload (example):**
```json
{
  "vehicleId": "DUMP-014",
  "timestamp": "2026-09-05T10:15:30Z",
  "position": { "lat": 18.6521, "lon": 81.2634, "source": "rtk_fixed" },
  "speed_kmph": 22.4,
  "heading_deg": 134,
  "rtkStatus": "fixed",
  "connectivity": "lte"
}
```

**Alert record (Supabase `alerts` table, example row):**
```json
{
  "alert_id": "uuid",
  "vehicle_id": "DUMP-014",
  "type": "collision_close",
  "severity": "high",
  "status": "raised",
  "raised_at": "2026-09-05T10:15:31Z",
  "acknowledged_at": null,
  "resolved_at": null,
  "details": { "otherVehicleId": "DUMP-021", "distance_m": 8.2 }
}
```

Agents should propose additions to these schemas as comments/PRs rather than
silently diverging — both frontend and backend depend on this contract matching.

## 4. Conventions

- TypeScript strict mode across `dashboard/` and `alert-engine/` (if TS is used there).
- No caching on any live-position code path — flag it in review if you see one introduced.
- Secrets (AWS IoT certs, Supabase keys) via environment variables only, never committed.
- Supabase Row Level Security should be enabled — control room dashboard should not
  have blanket table access.
- Before implementing a feature, check this file's feature table above — do not
  re-derive alert logic or architecture decisions from first principles.

## 5. Suggested Build Order

1. Mock MQTT + Supabase/InfluxDB data simulator (no real hardware yet) — unblocks both agents.
2. `dashboard/`: map + live vehicle markers from simulated MQTT stream (no cache).
3. `alert-engine/`: fleet state store + one alert type (Overspeeding) end-to-end into Supabase.
4. `dashboard/`: alerts panel via Supabase Realtime.
5. `alert-engine/`: remaining five alert types.
6. Integration pass once real vehicle telemetry format is confirmed against hardware team.
