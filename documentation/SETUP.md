# EarthRisk — Setup Guide

Step-by-step instructions for cloning and running the full EarthRisk platform locally.

---

## What you're setting up

| Service | Tech | Port |
|---------|------|------|
| Backend API | Node.js / Express | 9876 |
| Frontend | React 19 / Vite | 5173 |
| ML inference server | Python / Flask | 5001 |
| Database | MySQL | 3306 |
| AI agents | IBM WatsonX Orchestrate | cloud |
| Vector DB | Zilliz Cloud (Milvus) | cloud |

You can run just the first four (web app only) without touching WatsonX or Zilliz.

---

## Prerequisites

Install these before starting:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18+ | https://nodejs.org |
| Python | 3.10+ | https://python.org |
| MySQL | 8.0+ | https://dev.mysql.com/downloads |
| Git | any | https://git-scm.com |

Verify everything is installed:

```bash
node --version      # v18.x.x or higher
python --version    # 3.10.x or higher
mysql --version
git --version
```

---

## 1. Clone the repo

```bash
git clone https://github.com/stavie235/Dualboots.git
cd Dualboots
```

---

## 2. Database setup

### Create the database

Open a MySQL shell (use your root password):

```bash
mysql -u root -p
```

Then run:

```sql
CREATE DATABASE earthrisk;
CREATE DATABASE earthrisk_test;
EXIT;
```

### Import the schema

The schema file is in `back-end/server/config/`. If there is a `schema.sql` file:

```bash
mysql -u root -p earthrisk < back-end/server/config/schema.sql
```

If not, the app will auto-create tables when it first starts (depending on your ORM/migrations setup).

---

## 3. Backend (Express API)

```bash
cd back-end/server
```

### Install dependencies

```bash
npm install
```

### Configure environment variables

```bash
cp example.env .env
```

Open `.env` and fill in your values:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=earthrisk
DB_TEST_NAME=earthrisk_test
JWT_SECRET=any_long_random_string_here
USE_HTTPS=false
PORT=9876
```

### Start the server

```bash
npm start
```

You should see:

```
[nodemon] starting `node index.js`
Server running on port 9876
```

Test it:

```bash
curl http://localhost:9876/api/buildings
```

---

## 4. Frontend (React)

Open a **new terminal**:

```bash
cd front-end/client
npm install
npm run dev
```

Vite will print:

```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> The frontend proxies API calls to `localhost:9876`. Make sure the backend is running first.

---

## 5. ML inference server (Flask)

The ML server is optional for the web app — it powers the AI-predicted premium and claim probability features. Without it those fields will not populate, but the rest of the app works fine.

Open a **new terminal**:

```bash
cd ml-model
```

### Create a Python virtual environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac / Linux
source .venv/bin/activate
```

### Install dependencies

```bash
pip install flask flask-cors joblib numpy pandas scikit-learn requests shap
```

### Start the server

```bash
python app.py
```

You should see:

```
Loading EarthRisk ML models...
All models loaded. Expecting N features.
 * Running on http://localhost:5001
```

Test it:

```bash
curl http://localhost:5001/health
# → {"status": "ok", "models_loaded": 7}
```

---

## 6. Running the full stack

You need **3 terminals** open simultaneously:

| Terminal | Directory | Command |
|----------|-----------|---------|
| 1 | `back-end/server` | `npm start` |
| 2 | `front-end/client` | `npm run dev` |
| 3 | `ml-model` | `python app.py` |

Then open [http://localhost:5173](http://localhost:5173).

---

## 7. AI Agents setup (optional)

This section is only needed if you want to use the IBM WatsonX chat agents. You need:
- A free [Zilliz Cloud](https://cloud.zilliz.com) account
- An IBM WatsonX Orchestrate account

See [documentation/AI_AGENTS_GUIDE.md](documentation/AI_AGENTS_GUIDE.md) for the full walkthrough. The short version:

### Install agent dependencies

```bash
cd insurance-risk-agents
python -m venv .venv

# Windows
.venv\Scripts\activate

pip install pymilvus sentence-transformers python-dotenv flask flask-cors \
            joblib numpy pandas scikit-learn requests ibm-watsonx-orchestrate
```

### Configure environment variables

Create `insurance-risk-agents/.env`:

```env
# Zilliz Cloud (get from cloud.zilliz.com)
ZILLIZ_URI=https://in03-xxx.serverless.gcp-us-west1.cloud.zilliz.com
ZILLIZ_TOKEN=your-zilliz-api-token

# IBM WatsonX Orchestrate
WO_DEVELOPER_EDITION_SOURCE=orchestrate
WO_INSTANCE=https://your-instance.ibm.com
WO_API_KEY=your-watsonx-api-key

# Optional — only needed for year-by-year building history in agents
EARTHRISK_BACKEND_URL=
```

### Run the one-time data ingest into Zilliz

```bash
# Terminal 1 — ML server must be running first
cd ml-model && python app.py

# Terminal 2 — run ingest
cd insurance-risk-agents
.venv\Scripts\python.exe ..\ml-model\ingest_milvus.py
```

Expected output:
```
✓ Ingest complete.
  earthrisk_buildings: 1000 buildings
  earthrisk_kb:        13 KB chunks
```

### Import tools and agents into WatsonX

```bash
cd insurance-risk-agents
.venv\Scripts\activate
orchestrate env activate <your-env-name>

cd src
orchestrate tools import -k python -f fetch_tools.py

cd ..
orchestrate agents import -f agents/risk_explanation_agent.yaml
orchestrate agents import -f agents/alerting_agent.yaml
orchestrate agents import -f agents/data_interpreter_agent.yaml
orchestrate agents import -f agents/decision_support_agent.yaml
```

Then open the WatsonX Orchestrate UI, click each agent, and press **Deploy**.

---

## Common issues

### `npm start` fails — "Cannot find module"
Run `npm install` first. If it still fails, delete `node_modules/` and run `npm install` again.

### MySQL connection error — "Access denied"
Double-check `DB_USER` and `DB_PASSWORD` in `back-end/server/.env`. Make sure MySQL is running (`mysql -u root -p` should work).

### Frontend shows blank page or API errors
Make sure the backend is running on port 9876 before starting the frontend.

### Flask `ModuleNotFoundError`
You're using the wrong Python. Activate the virtual environment first:
```bash
# Windows
ml-model\.venv\Scripts\activate

# Mac / Linux
source ml-model/.venv/bin/activate
```

### Port already in use
Kill the process using the port:
```bash
# Windows
netstat -ano | findstr :9876
taskkill /PID <pid> /F

# Mac / Linux
lsof -ti:9876 | xargs kill
```

### `.env` file not found
Never commit `.env` files — they are gitignored. Always copy from `example.env` and fill in your own values.
