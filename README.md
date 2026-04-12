# EarthRisk

**EarthRisk** is an insurance risk prediction platform for properties in Greece. It combines interactive map visualisations, a machine-learning risk scoring engine, and a multi-agent AI assistant powered by IBM WatsonX Orchestrate to help insurers assess geographic and climate-based risk for buildings.

---

## Features

- **Interactive risk map** — Mapbox GL heatmap overlaid with per-building markers; filter by risk category, zone, building type, and more
- **ML risk scoring** — Random Forest model trained on seismic, volcanic, fire-access, climate, age, and claims data; outputs risk score (0–100), expected claim amounts per peril, and SHAP explanations
- **AI agent chat** — four specialised WatsonX Orchestrate agents (risk explanation, alerting, data interpretation, decision support) answer natural-language questions about the portfolio
- **Admin dashboard** — charts and KPIs on portfolio exposure, premium gaps, and historical trends
- **JWT authentication** — role-based access (admin / standard user)

---

## Tech Stack

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router_v7-CA4245?style=for-the-badge&logo=react-router&logoColor=white)
![Mapbox](https://img.shields.io/badge/Mapbox_GL-000000?style=for-the-badge&logo=mapbox&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-22B5BF?style=for-the-badge&logo=recharts&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL_8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.10-3776AB?style=for-the-badge&logo=python&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![IBM Watson](https://img.shields.io/badge/IBM_WatsonX-BE95FF?style=for-the-badge&logo=ibm&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router v7, Mapbox GL, Leaflet + heatmap, Recharts, Axios |
| Backend | Node.js, Express 5, MySQL 8, JWT, bcrypt, multer |
| ML pipeline | Python 3.10, scikit-learn, SHAP, pandas, Flask (inference sidecar) |
| AI agents | IBM WatsonX Orchestrate, Zilliz (Milvus cloud) vector DB |
| Infrastructure | Docker, Docker Compose |
| Testing | Jest + Supertest |

---

## Team

Stavrvoula Tsoutsoura
Anna Eirini Anagnostopoulou 
Thodoris Tsoutsouras

---

## Demo video



https://github.com/user-attachments/assets/3e6dd31e-295a-46c3-98cf-b82fa6218c85



![image](https://github.com/user-attachments/assets/81ebbfed-4c87-40f3-ac11-49098a95fdcd)
![image](https://github.com/user-attachments/assets/256eef10-15a7-4d39-8f1a-9799ff0a2805)

https://prezi.com/view/uXLQ9FWz0H1dhooSLXAr/?referral_token=_rbKrnlnB3FN 


---

## Running with Docker

This is the recommended way to run EarthRisk locally. Docker Compose starts all services — MySQL, the Express backend, the React frontend, the ML inference API, and a one-off database seeder — with a single command.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)


### 1. Clone the repo

```bash
git clone https://github.com/your-org/earthrisk.git
cd earthrisk
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

```env
# MySQL root password — choose any password
DB_PASSWORD=your_password_here

# JWT signing secret — any random string
JWT_SECRET=any_long_random_string

# Mapbox public token — get one free at https://account.mapbox.com
VITE_MAPBOX_TOKEN=pk.eyJ1...

# IBM WatsonX Orchestrate — required only for the AI agent chat feature
WO_INSTANCE=https://api.eu-central-1.dl.watson-orchestrate.ibm.com/instances/YOUR_INSTANCE_ID
WO_API_KEY=your_watsonx_api_key
```

> The AI agent chat will not work without valid WatsonX credentials, but all other features (map, dashboard, building search) work without them.

### 3. Start everything

```bash
docker compose up --build
```

On first run this will:
1. Start MySQL and wait until it is healthy
2. Run the database seeder (imports the building dataset)
3. Start the ML inference API (Flask, port 5001)
4. Start the Express backend (port 9876)
5. Build and serve the React frontend (port 5173)

### 4. Open the app

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:9876 |
| ML inference API | http://localhost:5001 |

### 5. Stop

```bash
docker compose down
```

To also delete the database volume:

```bash
docker compose down -v
```

---

## Running the ML training pipeline (optional)

The training pipeline re-trains the Random Forest model from scratch. It is disabled by default and requires IBM Cloud Object Storage credentials in `ml-model/.env` (see `ml-model/.env.example`).

```bash
docker compose --profile training up ml-training
```

---

## Running the AI agents (optional)

The AI agents run on IBM WatsonX Orchestrate cloud. To deploy or update them you need the `orchestrate` CLI and an active WatsonX account.

See [insurance-risk-agents/SETUP-LESSONS-LEARNED.md](insurance-risk-agents/SETUP-LESSONS-LEARNED.md) for the full setup guide.

---

## Project structure

```
earthrisk/
├── front-end/client/          # React 19 + Vite SPA
├── back-end/server/           # Express 5 REST API
├── insurance-risk-agents/     # WatsonX Orchestrate agents + tools
│   ├── agents/                # YAML agent definitions
│   ├── knowledge-bases/       # Per-agent knowledge base text files
│   └── src/                   # Python tools (fetch_tools.py and others)
├── ml-model/                  # Training pipeline + Flask inference API
├── back-end/database/         # SQL schema files
├── data-analysis/             # Exploratory notebooks and scripts
├── docker-compose.yml
└── .env.example               # Environment variable template
```

---

## License

This project was developed as part of a  hackathon  .Won first place in IBM category and second place overall. All rights reserved by the team.
