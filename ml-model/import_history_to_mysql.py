"""
EarthRisk — Building History Generator → MySQL
Generates yearly snapshots (2000-2026) for all 1000 buildings
and inserts them into the BuildingHistory table.

Usage:
    python import_history_to_mysql.py
"""

import os
import sys
import numpy as np
import pymysql

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

def _db_config():
    if os.environ.get('DB_HOST'):
        return {
            'host':     os.environ['DB_HOST'],
            'user':     os.environ.get('DB_USER', 'root'),
            'password': os.environ.get('DB_PASSWORD', ''),
            'database': os.environ.get('DB_NAME', 'earthrisk'),
            'charset':  'utf8mb4',
        }
    env = {}
    env_file = os.path.join(MODEL_DIR, '..', 'back-end', 'server', '.env')
    try:
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip()
    except FileNotFoundError:
        pass
    return {
        'host':     env.get('DB_HOST', 'localhost'),
        'user':     env.get('DB_USER', 'root'),
        'password': env.get('DB_PASSWORD', ''),
        'database': env.get('DB_NAME', 'earthrisk'),
        'charset':  'utf8mb4',
    }

DB_CONFIG = _db_config()

# ---------------------------------------------------------------------------
# Connect and fetch all buildings already in MySQL
# ---------------------------------------------------------------------------
print("Connecting to MySQL...")
try:
    conn = pymysql.connect(**DB_CONFIG)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)

cursor = conn.cursor(pymysql.cursors.DictCursor)

# Skip if already populated (safe to re-run)
cursor.execute("SELECT COUNT(*) as cnt FROM BuildingHistory")
if cursor.fetchone()['cnt'] > 0:
    print("BuildingHistory table already populated — skipping.")
    cursor.close()
    conn.close()
    sys.exit(0)

cursor.execute("SELECT building_id, external_id, year_built, risk_score, annual_premium_euro, actual_value_euro, nasa_avg_temp_c FROM Building")
buildings = cursor.fetchall()
print(f"Found {len(buildings)} buildings in MySQL.")

# ---------------------------------------------------------------------------
# Generate and insert history rows
# ---------------------------------------------------------------------------
years = list(range(2000, 2027))

INSERT_SQL = """
INSERT INTO BuildingHistory
    (building_id, record_year, risk_score, annual_premium_euro, actual_value_euro, nasa_avg_temp_c, building_age)
VALUES
    (%s, %s, %s, %s, %s, %s, %s)
"""

np.random.seed(42)
inserted = 0

print("Generating history rows (2000–2026) for each building...")

for b in buildings:
    building_id        = b['building_id']
    year_built         = int(b['year_built']) if b['year_built'] else 1980
    base_risk          = float(b['risk_score'] or 40.0)
    base_premium       = float(b['annual_premium_euro'] or 300.0)
    actual_value       = float(b['actual_value_euro'] or 150000.0)
    base_temp          = float(b['nasa_avg_temp_c'] or 28.0)

    # Spread base_premium back to year-2000 equivalent
    base_premium_2000 = base_premium / (1.02 ** 26)

    for year in years:
        building_age = year - year_built

        # Climate penalty kicks in after 2010 (mirrors generate_trends.py)
        climate_penalty = 0.0 if year < 2010 else (year - 2010) * 1.5

        # Premium grows with inflation + age + climate
        premium = base_premium_2000 * (1.02 ** (year - 2000)) + (building_age * 0.5) + climate_penalty
        premium = round(max(premium, 50.0) + np.random.uniform(-10, 10), 2)

        # Risk score drifts slightly each year; climate adds pressure post-2010
        climate_risk_drift = 0.0 if year < 2010 else (year - 2010) * 0.3
        risk = base_risk + climate_risk_drift + np.random.uniform(-2, 2)
        risk = round(float(min(max(risk, 0.0), 100.0)), 2)

        # Temperature rises slightly over years (climate change)
        temp = base_temp + (year - 2000) * 0.05 + np.random.uniform(-0.3, 0.3)
        temp = round(float(temp), 2)

        cursor.execute(INSERT_SQL, (
            building_id,
            year,
            risk,
            premium,
            actual_value,
            temp,
            building_age,
        ))
        inserted += 1

conn.commit()
cursor.close()
conn.close()

print(f"\nDone. {inserted} history rows inserted ({len(buildings)} buildings x {len(years)} years).")
