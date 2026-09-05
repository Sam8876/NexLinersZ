# Project Plan — Fog-Safe Haulage System (Detailed, Engineering Reference)

This is the full technical reference for the software build (`dashboard/` and
`alert-engine/`). `AGENTS.md` at the repo root is a condensed pointer to this
document — read this file for anything AGENTS.md doesn't fully specify.

## 1. Background

NMDC Limited's Bailadila iron ore mines (Kirandul & Bacheli complexes,
Chhattisgarh) experience dense monsoon fog (June–October) reducing visibility
to 3–5m on haul roads, forcing dumper fleets to slow or halt, causing
production loss and elevated collision risk. This project (SIH 2026) builds
an ADAS Level 2-style safety and fleet-tracking system to address this.

This repo covers the **software** layer only: the cloud-side Alert &
Monitoring Engine and the control-room Digital Twin Dashboard. Vehicle-side
firmware (ESP32, Raspberry Pi) is out of scope for this repo.

## 2. Full System Architecture (context)

### 2.1 Vehicle node (external to this repo — telemetry source only)
- **Fleet tracking:** ESP32 + Quectel EC200U (GPS + LTE), IP65 enclosure.
- **Dead-zone fallback:** LoRaWAN (433MHz+).
- **Precision positioning:** RTK GNSS — u-blox F9P-class base station (surveyed,
  fixed point) + rover receiver per vehicle. RTCM3 corrections relayed over a
  `painlessMesh` ESP32 ad-hoc mesh network (self-healing, hop-by-hop). Falls
  back to standard EC200U GPS if RTK "Fixed" status degrades.
- **ADAS compute:** Raspberry Pi 5 + AI HAT (26 TOPS), fusing:
  - Edge AI camera (vision-based detection)
  - Hi-Link HLK-LD2451 24GHz FMCW radar (front/rear or 4-side) — speed, distance,
    direction of nearby vehicles
  - 2D LiDAR — obstacle/edge-of-road detection
  - Target latency budget: capture (~30ms) → inference (~40ms) → fusion (~15ms)
    → decision (~5ms) → HMI dispatch (~10ms) = **~100ms total** (design target,
    to be validated on real hardware).
- **In-cab HMI:** display/HUD, audio-visual + haptic alerts, SOS push button.

### 2.2 Cloud backend (built in this repo: `alert-engine/`)
- **Ingestion:** AWS IoT Core, MQTT, per-device X.509 cert auth.
- **Storage:**
  - **InfluxDB** — time-series telemetry (position, speed, heading, RTK status,
    connectivity mode). History/replay source; never the live-view source.
  - **Supabase (Postgres)** — vehicle metadata, alert records + lifecycle, users/auth.
    Row Level Security enabled; dashboard should not have blanket table access.
- **Alert & Monitoring Engine** — always-on Node.js/TypeScript service holding
  in-memory fleet state, evaluating rules per incoming telemetry message, and
  writing alert records to Supabase. See Section 4 for full alert spec.

### 2.3 Control room (built in this repo: `dashboard/`)
- React + TypeScript + Vite, MapLibre GL JS digital twin map.
- **Two independent real-time channels** (do not merge these):
  1. **Live position** — direct MQTT-over-WSS subscription from AWS IoT Core,
     no cache layer, no DB round-trip. This is the "where is the vehicle right
     now" source of truth.
  2. **Alerts** — Supabase Realtime subscription to the `alerts` table
     (populated by `alert-engine/`), for the alerts panel and SOS overlay.
- Non-realtime data (vehicle roster, historical reports) via TanStack Query,
  `staleTime: 0`.
- State: Zustand, no persistence middleware.
- Styling: Tailwind + shadcn/ui.

## 3. Data Model

### 3.1 Supabase (Postgres) tables

**`vehicles`** (metadata, low-frequency updates)
| Column | Type | Notes |
|---|---|---|
| `id` | text (PK) | e.g. `DUMP-014` |
| `model` | text | HEMM/dumper model |
| `capacity_tonnes` | numeric | |
| `assigned_route_id` | text | FK-like reference to route definitions |
| `driver_name` | text | current shift operator |
| `last_maintenance_at` | timestamptz | |
| `status` | text | `active` / `maintenance` / `offline` |

**`alerts`** (lifecycle-managed, written by `alert-engine/`, read by `dashboard/`)
| Column | Type | Notes |
|---|---|---|
| `alert_id` | uuid (PK) | |
| `vehicle_id` | text | FK to `vehicles.id` |
| `type` | text | one of the six alert types (Section 4) |
| `severity` | text | `low` / `medium` / `high` / `critical` (SOS is always `critical`) |
| `status` | text | `raised` / `acknowledged` / `resolved` |
| `raised_at` | timestamptz | |
| `acknowledged_at` | timestamptz \| null | |
| `resolved_at` | timestamptz \| null | |
| `acknowledged_by` | text \| null | dispatcher user id |
| `details` | jsonb | type-specific payload, e.g. `{ "otherVehicleId": "...", "distance_m": 8.2 }` |

**`users`** — standard Supabase auth table, roles: `dispatcher`, `admin`.

### 3.2 InfluxDB

**Measurement: `vehicle_telemetry`**
- Tags: `vehicleId`, `positionSource` (`rtk_fixed` / `rtk_float` / `gps`), `connectivity` (`lte` / `lorawan` / `mesh`)
- Fields: `lat`, `lon`, `speed_kmph`, `heading_deg`
- Timestamp: telemetry receipt time

### 3.3 MQTT topics & payloads

- `mine/{siteId}/vehicle/{vehicleId}/telemetry` — vehicle → cloud, high frequency
- `mine/{siteId}/vehicle/{vehicleId}/alert` — alert-engine → vehicle HMI (control-room-initiated)
- `mine/{siteId}/vehicle/{vehicleId}/sos` — vehicle → cloud, SOS button press

Telemetry payload:
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

## 4. Alert & Monitoring Engine — Full Spec

Runtime: **Node.js + TypeScript** (see AGENTS.md Section 2 for rationale and
suggested folder structure). Each alert type is implemented as a pure rule
function: `(fleetState, newTelemetry) => AlertEvent[]`.

| Alert type | Trigger logic | Severity |
|---|---|---|
| **Overspeeding** | `speed_kmph` exceeds the route/segment's configured safe limit | medium–high, scales with how far over the limit |
| **SOS Push Button** | SOS topic message received from vehicle | always `critical` |
| **Collision Close** | Distance between two vehicles (from paired position+heading+speed) falls under a fog-adjusted safe-following threshold, with closing (not diverging) trajectory | high |
| **Unusual Stop/Halt** | Vehicle speed ~0 for longer than expected at a non-designated stop point | medium |
| **Route Deviation** | Vehicle position diverges beyond a tolerance band from its `assigned_route_id` path | medium |
| **Signal Lost** | No telemetry received from a vehicle for longer than a heartbeat timeout (both LTE and mesh paths silent) | high (could indicate a safety event, not just connectivity) |

Lifecycle: `raised` (rule fires, row inserted) → `acknowledged` (dispatcher
action in dashboard) → `resolved` (dispatcher action, or auto-resolved if the
triggering condition clears, depending on alert type — SOS and Collision
Close should require manual acknowledgment/resolution, not auto-clear).

## 5. Digital Twin Dashboard — Full Spec

- **Map view:** MapLibre GL, haul-road overlay, one marker per active vehicle.
  - Marker icon rotates to match `heading_deg` in real time.
  - Marker color reflects status: normal (green/blue), warning-level alert
    active (amber), critical alert active (red, pulsing).
- **Marker click → detail panel** (slide-over or modal), showing:
  - Live telemetry: speed, position, heading, RTK fix status, connectivity mode
  - Metadata: model, capacity, driver, assigned route, last maintenance
  - Recent alert history for that vehicle
- **Alerts panel:** live feed from Supabase Realtime, color-coded by type/severity,
  each with acknowledge/resolve actions.
- **SOS full-screen override:** when a `sos` alert is raised, it must take over
  the entire screen (not just a panel notification) — see `dashboard/` UI spec
  and the Stitch prompt in Section 6 for full visual treatment. This is
  deliberately a different interaction pattern from all other alert types.
- **AI analytics panel:** fog-density/visibility trend, predicted collision-risk
  hotspots (derived from historical Collision Close alert density by location),
  fleet utilization stats, anomaly callouts (e.g. a vehicle repeatedly
  triggering Route Deviation).

## 6. Non-Functional Requirements

- No caching on the live-position data path — flag in review if introduced.
- Secrets (AWS IoT certs, Supabase keys) via environment variables only.
- Supabase Row Level Security enabled on all tables.
- Alert engine must be resilient/always-on independent of dashboard uptime —
  alerts still raise and log with zero active dashboard viewers.
- Vehicle-side ADAS alerting (in-cab HMI) must function independently of cloud
  connectivity — collision avoidance cannot depend on a round-trip to this backend.

## 7. Environment Variables (both services)

```
AWS_IOT_ENDPOINT=
AWS_IOT_CERT_PATH=
AWS_IOT_KEY_PATH=
AWS_IOT_CA_PATH=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # alert-engine only, never exposed to dashboard
INFLUXDB_URL=
INFLUXDB_TOKEN=
INFLUXDB_ORG=
INFLUXDB_BUCKET=
```

## 8. Build Order (detailed)

1. **Mock data simulator** — a small script publishing synthetic telemetry to
   MQTT (or a local broker) matching the Section 3.3 schema, so both services
   can be built before real hardware exists.
2. **`dashboard/` skeleton** — Vite + React + TS scaffold, MapLibre map render,
   subscribe to simulated MQTT stream, render vehicle markers with heading rotation.
3. **`alert-engine/` skeleton** — MQTT subscription, in-memory fleet state store,
   implement Overspeeding rule end-to-end into Supabase `alerts` table.
4. **`dashboard/` alerts panel** — Supabase Realtime subscription, render alert
   feed, acknowledge/resolve actions writing back to Supabase.
5. **`dashboard/` marker click → detail panel** — telemetry + metadata view.
6. **`alert-engine/`** — implement remaining five alert types (SOS, Collision
   Close, Unusual Halt, Route Deviation, Signal Lost).
7. **`dashboard/` SOS full-screen override** — highest-priority UI state, built
   and tested last since it depends on the alerts channel being solid first.
8. **AI analytics panel** — built once enough alert history exists in Supabase
   to derive meaningful trends.
9. **Integration pass** against real vehicle telemetry format once hardware
   team confirms actual payload shape (should closely match Section 3.3, but
   verify before assuming).

## 9. Key Decisions Log (for context continuity)

- RTK positioning was initially descoped for cost, then reinstated once the
  mesh-based correction-delivery approach made it feasible — cost accepted as
  a trade-off for genuine cm-level accuracy (see AGENTS.md Section 2).
- MANET/mesh networking was clarified as a communication topology, not a
  source of positioning accuracy — RTK hardware is what provides accuracy;
  the mesh solves correction *delivery* across hilltop terrain.
- Alert engine is Node.js/TypeScript for stack consistency with the dashboard,
  not because of a raw performance requirement — this service is I/O-bound,
  not compute-heavy (AI inference lives on vehicle-side hardware).
- Live position data intentionally bypasses the database and any cache layer;
  freshness is prioritized over reducing read load, since stale position data
  is a safety issue in this context.
