# EarthRisk — Setup Guide for New Developers

## Prerequisites
- Node.js 18+
- Python 3.10+
- MySQL 8.0+
- Git

---

## Step 1 — Clone the repo
```bash
git clone <repo-url>
cd Dualboots-1
```

---

## Step 2 — Backend (.env)
```bash
cd back-end/server
cp example.env .env
```
Edit `.env` and fill in:
- `DB_PASSWORD` — your MySQL root password
- `JWT_SECRET` — any random string (e.g. `mysecretkey123`)
- `PYTHON_PATH` — path to your Python executable (see below)

### Finding your Python path
**Windows:**
```bash
where python
# e.g. C:\Users\yourname\AppData\Local\Programs\Python\Python312\python.exe
```
**Mac/Linux:**
```bash
which python3
# e.g. /usr/bin/python3
```
Paste that path into `PYTHON_PATH=` in your `.env`.

---

## Step 3 — Install Node dependencies
```bash
# Backend
cd back-end/server
npm install

# Frontend
cd ../../front-end/client
npm install
```

---

## Step 4 — Install Python dependencies
```bash
cd ml-model
pip install -r requirements.txt
```

---

## Step 5 — Set up MySQL
1. Open MySQL Workbench (or any MySQL client)
2. Run the schema file: `back-end/database/earthrisk_schema.sql`
   - This creates the `earthrisk` database and all tables

---

## Step 6 — Seed the database
```bash
cd ml-model

# Import 1000 buildings
python import_to_mysql.py

# Import 27000 history rows (2000–2026)
python import_history_to_mysql.py
```

---

## Step 7 — Create an admin user
```bash
cd back-end/server
node -e "
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
(async () => {
  const hash = await bcrypt.hash('admin123', 10);
  const conn = await mysql.createConnection({
    host:'localhost', user:'root',
    password: require('fs').readFileSync('.env','utf8').match(/DB_PASSWORD=(.+)/)[1].trim(),
    database:'earthrisk'
  });
  await conn.execute(
    'INSERT INTO Users (username, email, safe_password, role) VALUES (?,?,?,?)',
    ['admin', 'admin@earthrisk.gr', hash, 'admin']
  );
  console.log('Admin created. Login: admin / admin123');
  await conn.end();
})();
"
```

---

## Step 8 — Run the app
```bash
# Terminal 1 — Backend
cd back-end/server
npm start

# Terminal 2 — Frontend
cd front-end/client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

Log in with: `admin` / `admin123`

---

## Common Errors

| Error | Fix |
|---|---|
| `Map shows no buildings` | Check that `PYTHON_PATH` in `.env` points to a valid Python with pandas/pyarrow installed |
| `Invalid credentials` | Make sure you ran Step 7 to create the admin user |
| `User is not an admin` | You registered a normal user account — use the admin account from Step 7 |
| `Cannot connect to MySQL` | Make sure MySQL is running and `DB_PASSWORD` in `.env` is correct |
| `No analytics data` | Make sure you ran both import scripts in Step 6 |
