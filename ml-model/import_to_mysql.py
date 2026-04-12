"""
EarthRisk — Parquet → MySQL Importer
Reads historical_insurance_data_lake.parquet, computes risk scores,
and inserts all buildings into the MySQL Building table.

Usage:
    python import_to_mysql.py

Requires: pandas, pyarrow, pymysql
    pip install pandas pyarrow pymysql
"""

import os
import sys
import pandas as pd
import pymysql

# ---------------------------------------------------------------------------
# Config — reads from back-end/.env automatically
# ---------------------------------------------------------------------------
MODEL_DIR  = os.path.dirname(os.path.abspath(__file__))
PARQUET    = os.path.join(MODEL_DIR, 'historical_insurance_data_lake.parquet')

def _db_config():
    # Docker passes credentials as env vars; fall back to .env file for local dev
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
# Risk score helpers (same logic as read_buildings.py)
# ---------------------------------------------------------------------------
def compute_risk(row):
    seismic = (int(row['seismic_zone']) / 3) * 30

    fire = (
        int(bool(row['near_forest'])) * 10 +
        (8 if str(row['construction_material']) == '\u039e\u03cd\u03bb\u03b9\u03bd\u03bf' else 0) +
        min(float(row['dist_to_fire_station_km']) / 30.0, 1.0) * 12
    ) * (20.0 / 30.0)

    climate = min(max((float(row['avg_summer_temp_C']) - 20.0) / 20.0, 0.0), 1.0) * 20.0

    age = max(0, 2026 - int(row['build_year']))
    age_pts = min(age / 80.0, 1.0) * 10.0

    has_claim = int(
        float(row['historical_fire_claim_euro']) > 0 or
        float(row['historical_flood_claim_euro']) > 0 or
        float(row['historical_earthquake_claim_euro']) > 0
    )
    claims = has_claim * 20.0

    total = seismic + fire + climate + age_pts + claims
    return round(float(min(max(total, 0.0), 100.0)), 2)


def to_eq_zone(seismic_zone):
    return {1: 'low', 2: 'medium', 3: 'high'}.get(int(seismic_zone), 'low')


def to_flood_zone(elev):
    e = float(elev)
    if e < 15:  return 'high'
    if e < 50:  return 'medium'
    return 'low'


def to_fire_risk(near_forest, dist_km):
    if bool(near_forest) and float(dist_km) > 10:
        return 'high'
    if bool(near_forest):
        return 'medium'
    return 'low'


def to_building_type(raw):
    mapping = {
        'Μονοκατοικία':  'residential',
        'Διαμέρισμα':    'residential',
        'Βίλα':          'residential',
        'Εμπορικό':      'commercial',
        'Βιομηχανικό':   'industrial',
        'Μικτό':         'mixed',
    }
    return mapping.get(str(raw), 'other')


def to_material(raw):
    mapping = {
        'Μπετόν/Τούβλο': 'concrete',
        'Τούβλο':        'brick',
        'Ξύλινο':        'wood',
        'Ατσάλι':        'steel',
        'Μικτό':         'mixed',
    }
    return mapping.get(str(raw), 'concrete')


# ---------------------------------------------------------------------------
# Load parquet
# ---------------------------------------------------------------------------
print(f"Reading parquet: {PARQUET}")
df = pd.read_parquet(PARQUET)

df.columns = [
    'building_id', 'prefecture', 'address',
    'latitude', 'longitude',
    'sq_meters', 'build_year', 'property_type', 'construction_material',
    'has_basement', 'roof_type',
    'elevation_meters', 'annual_rainfall_mm', 'avg_summer_temp_C',
    'historical_earthquakes_50km', 'seismic_zone',
    'near_forest', 'dist_to_fire_station_km', 'near_hazardous_poi',
    'has_exterior_sprinklers', 'has_ember_vents', 'has_flood_barriers',
    'has_sump_pump', 'has_seismic_retrofit', 'has_gas_valve',
    'actual_value_euro',
    'historical_fire_claim_euro', 'historical_flood_claim_euro',
    'historical_earthquake_claim_euro', 'historical_annual_premium',
]

df['near_forest']                      = df['near_forest'].fillna(False)
df['avg_summer_temp_C']                = df['avg_summer_temp_C'].fillna(28.0)
df['dist_to_fire_station_km']          = df['dist_to_fire_station_km'].fillna(5.0)
df['elevation_meters']                 = df['elevation_meters'].fillna(50.0)
df['historical_fire_claim_euro']       = df['historical_fire_claim_euro'].fillna(0)
df['historical_flood_claim_euro']      = df['historical_flood_claim_euro'].fillna(0)
df['historical_earthquake_claim_euro'] = df['historical_earthquake_claim_euro'].fillna(0)
df['historical_annual_premium']        = df['historical_annual_premium'].fillna(0)

print(f"Loaded {len(df)} buildings from parquet.")

# ---------------------------------------------------------------------------
# Connect to MySQL
# ---------------------------------------------------------------------------
print(f"Connecting to MySQL at {DB_CONFIG['host']} / {DB_CONFIG['database']} ...")
try:
    conn = pymysql.connect(**DB_CONFIG)
except Exception as e:
    print(f"ERROR: Could not connect to MySQL: {e}")
    sys.exit(1)

cursor = conn.cursor()

# Skip if already populated (safe to re-run)
cursor.execute("SELECT COUNT(*) FROM Building")
if cursor.fetchone()[0] > 0:
    print("Building table already populated — skipping import.")
    cursor.close()
    conn.close()
    sys.exit(0)

# ---------------------------------------------------------------------------
# Insert
# ---------------------------------------------------------------------------
INSERT_SQL = """
INSERT INTO Building (
    external_id, building_name, address,
    latitude, longitude,
    building_type, year_built, area_sqm, construction_material,
    flood_zone, earthquake_zone, fire_risk,
    elevation_m, nasa_avg_temp_c,
    near_nature, annual_premium_euro, actual_value_euro,
    prefecture, risk_score
) VALUES (
    %s, %s, %s,
    %s, %s,
    %s, %s, %s, %s,
    %s, %s, %s,
    %s, %s,
    %s, %s, %s,
    %s, %s
)
"""

inserted = 0
skipped  = 0

for _, row in df.iterrows():
    score = compute_risk(row)
    try:
        cursor.execute(INSERT_SQL, (
            str(row['building_id']),                          # external_id
            None,                                             # building_name
            str(row['address']),                              # address
            round(float(row['latitude']), 6),                 # latitude
            round(float(row['longitude']), 6),                # longitude
            to_building_type(row['property_type']),           # building_type
            int(row['build_year']),                           # year_built
            round(float(row['sq_meters']), 2),                # area_sqm
            to_material(row['construction_material']),        # construction_material
            to_flood_zone(row['elevation_meters']),           # flood_zone
            to_eq_zone(row['seismic_zone']),                  # earthquake_zone
            to_fire_risk(row['near_forest'], row['dist_to_fire_station_km']),  # fire_risk
            round(float(row['elevation_meters']), 1),         # elevation_m
            round(float(row['avg_summer_temp_C']), 1),        # nasa_avg_temp_c
            int(bool(row['near_forest'])),                    # near_nature
            round(float(row['historical_annual_premium']), 2),# annual_premium_euro
            round(float(row['actual_value_euro']), 2),        # actual_value_euro
            str(row['prefecture']),                           # prefecture
            score,                                            # risk_score
        ))
        inserted += 1
    except Exception as e:
        print(f"  SKIP {row['building_id']}: {e}")
        skipped += 1

conn.commit()
cursor.close()
conn.close()

print(f"\nDone. {inserted} inserted, {skipped} skipped.")
print("Analytics should now show data in the admin panel.")
