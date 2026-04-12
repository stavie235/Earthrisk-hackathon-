# EarthRisk — Data Architecture

## How Building Points Are Loaded on the Map

The map does **not** use MySQL. Here's the full data flow:

```
ml-model/historical_insurance_data_lake.parquet
        ↓
  read_buildings.py  — Python script that reads the parquet + computes risk scores
        ↓
  mlBuildingsRoutes.js  — Node spawns Python, reads its JSON output
        ↓
  GET /api/ml-buildings  — returns the 1000 buildings
        ↓
  Map.jsx → MapView → Leaflet markers
```

The parquet file **is** the database for the map. MySQL is not involved.

---

## What Is MySQL Used For?

MySQL stores the user-facing / business layer only.

| Feature | Uses MySQL? | Uses Parquet? |
|---|---|---|
| Map with building points | No | Yes |
| Building risk data | No | Yes |
| AI agents | No | Yes |
| User login / registration | Yes | No |
| Admin panel | Yes | No |
| Insurance history / policies | Yes | No |
| Building CRUD (admin seed) | Yes | No |
| Stats / charts | Yes | No |

**MySQL stores:** `Users`, `InsuranceHistory`, `ClimateLogs` — the business/user layer.

**Parquet stores:** 1000 buildings with geographic and risk data — the core map data.

---

## Why Might the Map Be Empty?

The backend spawns Python at this path:

```
insurance-risk-agents/.venv/Scripts/python.exe
```

If that virtualenv doesn't exist, Python fails → map gets no data.

Other causes:
- Backend server not running (`npm start` in `back-end/server`)
- Frontend can't reach `localhost:9876`

---

## Practically Speaking

- **Map only** → MySQL not needed
- **Full app (login, admin, policies)** → MySQL required

If MySQL isn't running, the server will still serve the map, but any auth/admin request will fail.

---

## Running the App

```bash
# Backend
cd back-end/server
npm start        # runs on port 9876

# Frontend
cd front-end/client
npm run dev
```

The 1000 buildings are already in the parquet file — no database seeding needed for the map.

---

## Which SQL Schema to Use

Use the **second schema** (the one with `external_id VARCHAR(20)`).  
It is saved at `back-end/database/earthrisk_schema.sql`.

The `external_id` column stores `BLD_XXXX` identifiers used by the AI agents via the `/api/buildings/external/:id` route. Without it, the agents cannot look up buildings.

If you also want `loss_occurred` from the first schema, add it manually:

```sql
ALTER TABLE BuildingHistory ADD COLUMN loss_occurred TINYINT(1) DEFAULT 0;
```
