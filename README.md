# Fog-Safe Haulage System (NMDC Bailadila — SIH 2026)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-5.x-3969EC?logo=maplibre&logoColor=white)](https://maplibre.org/)
[![MQTT](https://img.shields.io/badge/MQTT-5.0-660066?logo=mqtt&logoColor=white)](https://mqtt.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

An **ADAS Level 2-style safety, anti-collision, and live digital-twin fleet tracking platform** engineered for open-cast iron ore mine dumpers operating under zero-visibility advection fog ($<5\text{ m}$ visibility) during the monsoon season at **NMDC Limited's Bailadila Complex** (Kirandul & Bacheli, Chhattisgarh).

---

## 📑 Table of Contents

1. [Operational Challenge & Objectives](#-operational-challenge--objectives)
2. [End-to-End System Architecture](#-end-to-end-system-architecture)
3. [Architecture Data Flowcharts](#-architecture-data-flowcharts)
   - [Live Telemetry & Digital Twin Pipeline](#1-live-telemetry--digital-twin-zero-cache-pipeline)
   - [Alert & Monitoring Engine Decision Pipeline](#2-alert--monitoring-engine-decision-pipeline)
   - [Vehicle 2D ↔ 3D Dynamic View Transition](#3-vehicle-marker-2d--3d-dynamic-view-transition)
   - [Emergency SOS Full-Screen Takeover Protocol](#4-emergency-sos-full-screen-takeover-protocol)
4. [Repository Structure](#-repository-structure)
5. [Key Components](#-key-components)
   - [Digital Twin Control Room Dashboard (`dashboard/`)](#1-digital-twin-control-room-dashboard-dashboard)
   - [Stateful Alert & Monitoring Engine (`alert-engine/`)](#2-stateful-alert--monitoring-engine-alert-engine)
   - [Haul Fleet Simulator & Embedded Broker (`simulator/`)](#3-haul-fleet-simulator--embedded-broker-simulator)
6. [Data Contracts & Telemetry Schema](#-data-contracts--telemetry-schema)
7. [Getting Started (Quick Start)](#-getting-started-quick-start)
   - [Prerequisites](#prerequisites)
   - [Option A: Local Development (Instant Mock Mode)](#option-a-local-development-zero-external-credentials)
   - [Option B: Docker Compose](#option-b-docker-compose-full-stack)
8. [Environment Configurations](#-environment-configurations)
9. [Verification & Automated Testing](#-verification--automated-testing)
10. [Bailadila Mine Geographical Reference](#-bailadila-mine-geographical-reference)

---

## 🏔 Operational Challenge & Objectives

During the South-West monsoon season (June–October), the Bailadila hill range (elevations reaching $>1,200\text{ m}$ MSL) experiences severe advection cloud cover and heavy fog, reducing visibility on steep haulage ramps to **3–5 meters**. 

Heavy Earth Moving Machinery (HEMM) such as **240–360 tonne ultra-class dump trucks** (CAT 797F, Komatsu 930E) operate along winding bench ramps and crusher arterials:
- Traditional visual navigation and conventional single-frequency GPS fail due to signal multipath and dense cloud moisture.
- Fleets are forced to halt or crawl at $<5\text{ km/h}$, causing severe production loss and hazardous blind-spot collision risks.

**This platform solves this challenge with:**
1. **Zero-Latency Fleet Tracking:** Live vehicle positioning delivered straight to the control room screen over MQTT-WebSockets with zero intermediate database caching.
2. **Precision GIS Digital Twin:** GPU-accelerated MapLibre GL digital twin with authentic pit coordinates for Bailadila Deposit 14 (Kirandul) and Deposit 11 (Bacheli), complete with **2D plan ↔ 3D isometric vehicle transitions**.
3. **Stateful Fleet Collision & Hazard Engine:** Pure functional safety rules checking overspeeding, road deviations, converging collision trajectories (via Haversine & OSRM road distance), unusual halts, heartbeats, and emergency SOS signals.

---

## 🏗 End-to-End System Architecture

```mermaid
graph TD
    subgraph Tier1 ["Tier 1: Vehicle Node (Hardware - External Context)"]
        V1["GNSS RTK Rover u-blox F9P"] -->|Precision Pos| Pi["Edge ADAS Compute<br/>Raspberry Pi 5 + AI HAT"]
        V2["24GHz FMCW Radar"] -->|Range & Velocity| Pi
        V3["2D Solid-State LiDAR"] -->|Obstacle Cloud| Pi
        V4["Edge AI Camera"] -->|Vision Inference| Pi
        V5["In-Cab SOS Button"] -->|Hardware Interrupt| Pi
        Pi -->|In-Cab HMI| HUD["Audio-Visual HUD & Haptics"]
        Pi -->|Telemetry / SOS| EC200U["Quectel EC200U LTE / LoRa / Mesh"]
    end

    subgraph Tier2 ["Tier 2: Cloud Backend & Alert Engine (Built in Repo)"]
        EC200U -->|MQTT / TLS| Broker["AWS IoT Core / Aedes Broker<br/>Port 1883 TCP"]
        Broker -->|mine/+/vehicle/+/telemetry| Engine["Alert & Monitoring Engine<br/>Node.js + TypeScript"]
        
        Engine -->|Stateful In-Memory Store| FleetState[("Fleet State Map")]
        Engine -->|Safety Rules Evaluation| Rules{"Alert Rules Matrix"}
        Rules -->|Overspeeding| R1["Speed Limit Check"]
        Rules -->|Collision Close| R2["OSRM / Haversine Distance"]
        Rules -->|Route Deviation| R3["GeoJSON Path Boundary"]
        Rules -->|Unusual Halt| R4["Stationary Timer"]
        Rules -->|Signal Lost| R5["Heartbeat Watchdog"]
        Rules -->|SOS Push| R6["Instant Critical Override"]
        
        Rules -->|Lifecycle: raised| Supa[("Supabase Postgres<br/>Alerts Table")]
        Engine -->|Time-Series Write| Influx[("InfluxDB v2<br/>vehicle_telemetry")]
        Engine -->|mine/+/vehicle/+/alert| Broker
    end

    subgraph Tier3 ["Tier 3: Control Room Digital Twin (Built in Repo)"]
        Broker -->|WSS Port 8083<br/>Zero Cache Stream| Dash["Digital Twin Dashboard<br/>React + MapLibre GL + Zustand"]
        Supa -->|Supabase Realtime WSS| AlertsFeed["Live Alerts Panel"]
        Dash -->|Camera Tilt > 20°| Model3D["3D Isometric Truck Models"]
        Dash -->|Camera Tilt <= 20°| Model2D["2D Top-Down Truck Models"]
        AlertsFeed -->|Critical SOS Raised| FullscreenSOS["Full-Screen Emergency Takeover Modal"]
    end
```

---

## 🔄 Architecture Data Flowcharts

### 1. Live Telemetry & Digital Twin (Zero-Cache Pipeline)

Live position data must **never** be served from a cached database record. The dashboard establishes a direct WebSockets connection to the MQTT message bus.

```mermaid
sequenceDiagram
    autonumber
    participant V as Haul Truck Node
    participant M as MQTT Broker (AWS IoT / Aedes)
    participant D as Dashboard (useLiveTelemetry)
    participant S as Ephemeral Fleet Store (Zustand)
    participant GL as MapLibre GIS Map

    V->>M: Publish telemetry (lat, lon, speed, heading, rtkStatus)
    M-->>D: Direct MQTT-over-WSS push [ws://localhost:8083]
    Note over D: Zero cache layer bypasses DB round-trip
    D->>S: updateTelemetry(payload)
    S->>GL: Marker.setLngLat([lon, lat]) & rotate(heading_deg)
    GL-->>GL: Smooth CSS Hardware Transform (60 FPS)
```

---

### 2. Alert & Monitoring Engine Decision Pipeline

The backend maintains an in-memory fleet state map to evaluate pairwise vehicle proximity and velocity convergence vectors.

```mermaid
flowchart TD
    A[Incoming Vehicle Telemetry] --> B[Parse MQTT Payload & Validate Timestamp]
    B --> C[Retrieve Prior State from Memory Map]
    C --> D[Update In-Memory Fleet State Entry]
    
    D --> E[Rule 1: Overspeeding]
    D --> F[Rule 2: Collision Close Matrix]
    D --> G[Rule 3: Route Deviation Band]
    D --> H[Rule 4: Unusual Halt Detector]
    
    E -->|speed > road segment limit| AlertGen[Generate Alert Event]
    F -->|distance < threshold & converging vector| AlertGen
    G -->|cross-track distance > tolerance| AlertGen
    H -->|speed ~ 0 for > max allowed halt| AlertGen
    
    AlertGen --> I{Alert Exists & Active?}
    I -->|No| J[Insert to Supabase alerts Table: status='raised']
    I -->|Yes| K[Update Distance / Severity Metric in Details JSON]
    
    J --> L[Supabase Realtime WebSocket Notification]
    L --> M[Control Room Alerts Panel Displays Red Card]
    L --> N[Optional MQTT HMI Feedback to In-Cab Unit]
```

---

### 3. Vehicle Marker 2D ↔ 3D Dynamic View Transition

To maximize browser responsiveness across standard operations consoles, the digital twin avoids heavy WebGL model pipelines and utilizes **hardware-accelerated 2D/3D SVG vector transforms**:

```mermaid
stateDiagram-v2
    [*] --> DetectPitch: Map Move / Rotate / Tilt Event
    
    state DetectPitch {
        CheckAngle: Get current map pitch angle
    }
    
    CheckAngle --> View2D: Pitch <= 20° (Top-Down View)
    CheckAngle --> View3D: Pitch > 20° (Perspective View)
    
    state View2D {
        Render2D: Render 2D Planar Chassis & Dump Bed
        Rotate2D: Rotate element to vehicle heading angle
    }
    
    state View3D {
        Render3D: Render 3D Isometric Haul Truck Model
        AddDetails: Display Canopy, Dump Cavity, Ribs, Dual Tires & Ground Shadow
        Transform3D: Apply CSS rotate(heading) + rotateX(pitch) with 600px perspective
    }
    
    View2D --> DetectPitch: User right-click tilts camera up
    View3D --> DetectPitch: User clicks '2D VIEW' preset button
```

---

### 4. Emergency SOS Full-Screen Takeover Protocol

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Dumper Operator
    participant Cab as In-Cab SOS Push Button
    participant MQTT as MQTT Broker
    participant Engine as Alert Engine
    participant Supa as Supabase Database
    participant Dash as Control Room Dashboard
    actor NOC as Shift Dispatcher

    Driver->>Cab: Press physical SOS red emergency mushroom button
    Cab->>MQTT: Publish to mine/{siteId}/vehicle/{vehicleId}/sos
    MQTT->>Engine: High-priority trigger
    Engine->>Supa: Insert alert (type: 'sos', severity: 'critical', status: 'raised')
    Supa-->>Dash: Supabase Realtime WebSocket broadcast
    Dash->>Dash: Trigger full-screen red pulsating takeover modal
    Note over Dash: Blocks standard map controls until acknowledged
    NOC->>Dash: Click 'DISPATCH RESCUE & ACKNOWLEDGE'
    Dash->>Supa: Update alert status: 'resolved'
    Dash->>Dash: Dismiss full-screen modal & restore map view
```

---

## 📁 Repository Structure

```
NexLinersZ/
├── alert-engine/                  # Node.js + TypeScript Stateful Alert Engine
│   ├── src/
│   │   ├── db/                    # Supabase (Postgres) & InfluxDB v2 clients
│   │   ├── mqtt/                  # AWS IoT Core & local MQTT connection manager
│   │   ├── rules/                 # Pure safety rule modules:
│   │   │   ├── collisionClose.ts  # Haversine + OSRM road distance proximity
│   │   │   ├── overspeeding.ts    # Segment & global speed limit enforcement
│   │   │   ├── routeDeviation.ts  # Cross-track GeoJSON deviation calculation
│   │   │   ├── signalLost.ts      # Heartbeat watchdog
│   │   │   ├── sos.ts             # Operator emergency handler
│   │   │   └── unusualHalt.ts     # Stationary vehicle monitor
│   │   ├── state/                 # In-memory fleet state store
│   │   ├── types/                 # Shared TypeScript data contracts
│   │   └── index.ts               # Service bootstrap & rule runner
│   ├── test/                      # Vitest test suite for safety rules
│   ├── Dockerfile                 # Multi-stage production container
│   └── package.json
│
├── dashboard/                     # React + Vite + MapLibre GL Control Room
│   ├── src/
│   │   ├── components/            # UI Panels, Drawer, Modals, and Maps:
│   │   │   ├── MapLibreView.tsx   # MapLibre GL digital twin (2D/3D trucks, roads)
│   │   │   ├── DigitalTwinMap.tsx # Tactical SVG HUD digital twin view
│   │   │   ├── Header.tsx         # Top NOC header with Sector Selector & clocks
│   │   │   ├── SectorNavigator.tsx# Left vehicle fleet roster sidebar
│   │   │   ├── TopToolbar.tsx     # 2D/3D, Normal/Dark map toggles, and filters
│   │   │   ├── AlertsPanel.tsx    # Live alerts feed with acknowledge/resolve
│   │   │   ├── VehicleDetailDrawer.tsx # Slide-over telemetry inspector
│   │   │   ├── OperationalSettingsModal.tsx # Dynamic speed limit governance
│   │   │   └── AiAnalyticsDrawer.tsx # Monsoon fog density & risk analytics
│   │   ├── hooks/                 # Real-time WebSocket subscriptions:
│   │   │   ├── useLiveTelemetry.ts# Direct MQTT-over-WSS (zero-cache)
│   │   │   └── useAlertsStream.ts # Supabase Realtime alerts subscription
│   │   ├── store/                 # Ephemeral state management:
│   │   │   └── fleetStore.ts      # Zustand store (strictly un-persisted)
│   │   ├── types/                 # TypeScript data contracts
│   │   ├── App.tsx                # Layout shell & SOS full-screen override
│   │   └── main.tsx               # DOM entrypoint
│   ├── Dockerfile                 # Nginx-based production distribution
│   └── package.json
│
├── simulator/                     # Standalone Telemetry Generator & Broker
│   ├── src/
│   │   ├── broker.ts              # Unified Aedes TCP (1883) + WSS (8083) Broker
│   │   ├── generator.ts           # Kinematic telemetry step generator
│   │   ├── routes.ts              # Authentic Bailadila Dep 14 haul waypoints
│   │   ├── vehicles.ts            # 5 test dumpers (normal, overspeed, halt, degraded)
│   │   └── index.ts               # Standalone telemetry publisher
│   ├── Dockerfile                 # Simulator container
│   └── package.json
│
├── docs/
│   └── PROJECT_PLAN.md            # Comprehensive engineering build specification
├── docker-compose.yml             # Orchestration for broker, engine, dashboard, influxdb
├── AGENTS.md                      # Agent rules, architecture guidelines, and constraints
└── README.md                      # Comprehensive documentation
```

---

## 🧩 Key Components

### 1. Digital Twin Control Room Dashboard (`dashboard/`)
- **Map Engine:** MapLibre GL JS utilizing CARTO Basemaps (`voyager` normal street/pit view and `dark_all` tactical night view).
- **Zero Cache Architecture:** Telemetry messages arriving over MQTT-WSS are fed directly into ephemeral Zustand memory, ensuring that vehicle coordinates on screen are the absolute ground truth.
- **Sector Switcher:** Instant camera fly-to and road alignment for:
  - `NMDC Bailadila - Dep 14 (Kirandul)`: `18.6320° N, 81.2585° E`
  - `NMDC Bailadila - Dep 11 (Bacheli)`: `18.6820° N, 81.2310° E`
  - `Pilbara Zone 4 - Sector North Pit`: `-22.3120° S, 119.5540° E`
- **Dynamic 2D ↔ 3D Vehicle Models:** Adapts seamlessly between a crisp 2D planar dumper cab and a full 3D isometric haul truck with payload cavity, dump body ribs, dual rear tires, and ground shadow.

### 2. Stateful Alert & Monitoring Engine (`alert-engine/`)
- **Runtime:** Node.js 20+ with TypeScript strict mode.
- **Pure Rule Modules:** Every rule is isolated as `(fleetState, newTelemetry) => AlertEvent[]`, allowing comprehensive testing via Vitest without needing an active network broker.
- **Dynamic Speed Limit Governance:** Subscribes to `mine/{siteId}/config/speedLimit` so dispatchers can raise or lower the speed cap during extreme fog pockets without service restarts.
- **Distance Calculation:** Employs Haversine formula and Open Source Routing Machine (OSRM) road routing to determine true driving distance along haulage corridors.

### 3. Haul Fleet Simulator & Embedded Broker (`simulator/`)
- **Built-in Aedes Broker:** Spawns a lightweight MQTT broker listening on port `1883` (TCP) and port `8083` (WebSocket stream).
- **Synthetic Vehicle Fleet:** Simulates 5 dump trucks traversing real Bailadila Deposit 14 terrain:
  - `DUMP-014` (Komatsu 930E): Standard cruising dumper on Ramp 1.
  - `DUMP-021` (CAT 797F): Trailing vehicle following `DUMP-014` for proximity checks.
  - `DUMP-007` (CAT 797F): Traversing Ramp 2 over ad-hoc mesh fallback.
  - `DUMP-019` (CAT 797F): Deliberate overspeeding scenario ($38.5\text{ km/h}$ against $20\text{ km/h}$ cap).
  - `DUMP-031` (Komatsu 830E): Degraded RTK float status operating over LoRaWAN.

---

## 📡 Data Contracts & Telemetry Schema

### MQTT Topics
| Topic | Direction | Frequency | Description |
|---|---|---|---|
| `mine/{siteId}/vehicle/{vehicleId}/telemetry` | Vehicle $\rightarrow$ Cloud | $1\text{ Hz}$ | High-frequency RTK position, velocity, heading |
| `mine/{siteId}/vehicle/{vehicleId}/sos` | Vehicle $\rightarrow$ Cloud | Event-driven | Manual operator in-cab emergency push button |
| `mine/{siteId}/vehicle/{vehicleId}/alert` | Engine $\rightarrow$ Vehicle | Event-driven | Alert dispatch to in-cab visual HUD / haptics |
| `mine/{siteId}/config/speedLimit` | Dashboard $\rightarrow$ Engine | On change | Live speed limit adjustments by dispatcher |

### Telemetry Payload Example
```json
{
  "vehicleId": "DUMP-014",
  "timestamp": "2026-09-06T12:00:00.000Z",
  "position": {
    "lat": 18.6320,
    "lon": 81.2585,
    "source": "rtk_fixed"
  },
  "speed_kmph": 22.4,
  "heading_deg": 45,
  "rtkStatus": "fixed",
  "connectivity": "lte"
}
```

### Supabase `alerts` Table Schema
```sql
CREATE TABLE IF NOT EXISTS public.alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id VARCHAR(64) NOT NULL,
    type VARCHAR(64) NOT NULL,       -- 'overspeeding' | 'collision_close' | 'sos' | etc.
    severity VARCHAR(32) NOT NULL,   -- 'low' | 'medium' | 'high' | 'critical'
    status VARCHAR(32) NOT NULL DEFAULT 'raised', -- 'raised' | 'acknowledged' | 'resolved'
    raised_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_alerts_vehicle_status ON public.alerts (vehicle_id, status);
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
```

---

## 🚀 Getting Started (Quick Start)

### Prerequisites
- [Node.js](https://nodejs.org/) v20+ and `npm`
- [Docker](https://www.docker.com/) & Docker Compose (optional for containerized run)

---

### Option A: Local Development (Zero External Credentials)

The system is engineered to run out of the box with zero external cloud accounts. The simulator hosts an embedded broker, and the alert engine defaults to in-memory tables if Supabase keys are omitted.

#### 1. Start the Simulator & MQTT Broker
```powershell
cd simulator
npm install
npm run dev
```
*Output: Spawns TCP broker on port `1883`, WebSocket broker on port `8083`, and starts publishing telemetry for 5 dumpers.*

#### 2. Start the Alert & Monitoring Engine
In a second terminal:
```powershell
cd alert-engine
npm install
npm run dev
```
*Output: Connects to `mqtt://localhost:1883`, evaluates rules against live telemetry, and flags alerts in memory.*

#### 3. Start the Digital Twin Control Room
In a third terminal:
```powershell
cd dashboard
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser to view the live digital twin.

---

### Option B: Docker Compose (Full Stack)

To build and run all services in unified production containers:

```powershell
# In the root repository directory:
docker compose up --build
```

Services exposed:
- **Control Room Dashboard:** `http://localhost:5173`
- **MQTT WebSocket Broker:** `ws://localhost:8083`
- **MQTT TCP Broker:** `tcp://localhost:1883`
- **InfluxDB Time-Series UI:** `http://localhost:8086`

---

## ⚙️ Environment Configurations

Each package contains an `.env.example` template:

### `dashboard/.env`
```env
# CARTO Basemaps API Key (optional - leave empty for standard tiles)
VITE_CARTO_API_KEY=

# Live position channel: direct MQTT over WebSocket to embedded simulator broker
VITE_MQTT_WS_URL=ws://localhost:8083

# Supabase (optional for local dev, required for cloud realtime alerts)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### `alert-engine/.env`
```env
# MQTT Broker Config (defaults to local broker)
MQTT_BROKER_URL=mqtt://localhost:1883
MINE_SITE_ID=bailadila

# AWS IoT Core Config (when deploying to AWS cloud)
AWS_IOT_ENDPOINT=
AWS_IOT_CERT_PATH=
AWS_IOT_KEY_PATH=
AWS_IOT_CA_PATH=

# Supabase Configuration
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# InfluxDB Telemetry Storage
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=
INFLUXDB_ORG=nmdc-bailadila
INFLUXDB_BUCKET=telemetry
```

---

## 🧪 Verification & Automated Testing

The Alert & Monitoring Engine includes a comprehensive test suite powered by [Vitest](https://vitest.dev/):

```powershell
cd alert-engine
npm test
```

### Automated Safety Test Coverage
- `overspeeding.test.ts`: Verifies speed thresholds, delta severity scaling, and dynamic speed cap updates.
- `collisionClose.test.ts`: Validates paired position tracking, closing trajectory vectors, and OSRM/Haversine distance triggers.
- `sos.test.ts`: Verifies emergency operator alerts always generate `critical` severity.
- `unusualHalt.test.ts`: Tests non-designated stop timeouts.
- `routeDeviation.test.ts`: Validates cross-track boundary tolerances against designated haul routes.
- `signalLost.test.ts`: Ensures dead-zone heartbeats trigger timely warnings when both LTE and mesh radio go silent.

---

## 📍 Bailadila Mine Geographical Reference

| Complex | Key Deposit | Center Coordinates (WGS84) | Elevation | Primary Haul Assets |
|---|---|---|---|---|
| **Kirandul Complex** | **Deposit 14 (Main Pit)** | `18.6320° N, 81.2585° E` | $1,210\text{ m}$ | CAT 797F, Komatsu 930E (240–360t) |
| **Bacheli Complex** | **Deposit 11A (North Ridge)**| `18.6820° N, 81.2310° E` | $1,180\text{ m}$ | CAT 785D, Komatsu 830E (150–240t) |
| **Test Sector** | **Pilbara Zone 4** | `-22.3120° S, 119.5540° E` | $450\text{ m}$ | Global benchmarking sector |

---

## 👥 Contributors & Acknowledgments

- **Team NexLinersZ** — Developed for the Smart India Hackathon (SIH 2026).
- **Industry Partner & Context:** NMDC Limited, Bailadila Iron Ore Mines (Kirandul & Bacheli Complex, Chhattisgarh).
- Built with MapLibre GL, React, Vite, Node.js, Aedes MQTT, Supabase, and Tailwind CSS.
