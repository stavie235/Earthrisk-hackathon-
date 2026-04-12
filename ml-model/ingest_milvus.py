"""
EarthRisk — Zilliz/Milvus Ingest Script
Reads all 1000 buildings from parquet, runs ML predictions via app.py,
generates embeddings, and inserts everything into Zilliz Cloud.

Prerequisites:
  1. app.py must be running:  python app.py
  2. ZILLIZ_URI and ZILLIZ_TOKEN set in insurance-risk-agents/.env
  3. pip install pymilvus sentence-transformers python-dotenv

Run: python ingest_milvus.py
"""

import os
import sys
import json
import subprocess
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
from pymilvus import MilvusClient, DataType
from sentence_transformers import SentenceTransformer

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
AGENTS_DIR  = os.path.join(SCRIPT_DIR, '..', 'insurance-risk-agents')
KB_DIR      = os.path.join(AGENTS_DIR, 'knowledge-bases')
READ_SCRIPT = os.path.join(SCRIPT_DIR, 'read_buildings.py')
FLASK_URL   = 'http://localhost:5001/predict'

load_dotenv(os.path.join(AGENTS_DIR, '.env'))

ZILLIZ_URI   = os.environ.get('ZILLIZ_URI')
ZILLIZ_TOKEN = os.environ.get('ZILLIZ_TOKEN')

BUILDINGS_COLL = 'earthrisk_buildings'
KB_COLL        = 'earthrisk_kb'
EMBED_DIM      = 384   # all-MiniLM-L6-v2

KB_AGENT_MAP = {
    'kb_risk_explanation.txt': 'risk_explanation',
    'kb_alerting.txt':         'alerting',
    'kb_data_interpreter.txt': 'data_interpreter',
    'kb_decision_support.txt': 'decision_support',
}

# ── Embedding model (downloaded once, cached) ──────────────────────────────────
print('Loading embedding model...')
EMBED_MODEL = SentenceTransformer('all-MiniLM-L6-v2')


# ── Helpers ────────────────────────────────────────────────────────────────────

def check_flask():
    try:
        with urllib.request.urlopen('http://localhost:5001/health', timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


def predict_building(building):
    """Call app.py /predict for one building. Returns prediction dict or zeros."""
    body = json.dumps(building).encode()
    req  = urllib.request.Request(
        FLASK_URL, data=body,
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except Exception:
        return {
            'predicted_premium_eur':        0.0,
            'fire_claim_probability':        0.0,
            'fire_expected_claim_eur':       0.0,
            'flood_claim_probability':       0.0,
            'flood_expected_claim_eur':      0.0,
            'earthquake_claim_probability':  0.0,
            'earthquake_expected_claim_eur': 0.0,
            'shap_top_factors':              [],
        }


def build_description(b, pred):
    """Generate a natural-language description of a building for embedding."""
    parts = [
        f"Building at {b.get('address', '?')}, {b.get('prefecture', '?')}.",
        f"Built {b.get('year_built', '?')}, {b.get('area_sqm', 0):.0f}m²",
        f"{b.get('building_type', '?')} with {b.get('construction_material', '?')} construction.",
        f"Risk score {b.get('risk_score', 0):.1f} ({b.get('risk_category', '?')}).",
        f"Seismic zone {b.get('earthquake_zone', '?')},",
        f"flood risk {b.get('flood_zone', '?')},",
        f"fire risk {b.get('fire_risk', '?')}.",
    ]
    if b.get('near_nature'):
        parts.append('Near wildland.')
    parts += [
        f"Elevation {b.get('elevation_m', 0):.0f}m.",
        f"Avg summer temperature {b.get('nasa_avg_temp_c', 0):.1f}°C.",
        f"Annual rainfall {b.get('annual_rainfall_mm', 0):.0f}mm.",
        f"Distance to fire station {b.get('dist_to_fire_station_km', 0):.1f}km.",
        f"Historical earthquakes nearby: {b.get('historical_earthquakes_50km', 0):.0f}.",
        f"Property value €{b.get('actual_value_euro', 0):.0f}.",
        f"Historical annual premium €{b.get('annual_premium_euro', 0):.2f}.",
        f"AI predicted premium €{pred.get('predicted_premium_eur', 0):.2f}.",
        f"Fire claim probability {pred.get('fire_claim_probability', 0)*100:.1f}%.",
        f"Flood claim probability {pred.get('flood_claim_probability', 0)*100:.1f}%.",
        f"Earthquake claim probability {pred.get('earthquake_claim_probability', 0)*100:.1f}%.",
    ]
    shap = pred.get('shap_top_factors') or []
    if shap:
        drivers = ', '.join(
            f"{f['feature']} ({f['direction']} premium)"
            for f in shap[:3]
        )
        parts.append(f"Top risk drivers: {drivers}.")
    return ' '.join(parts)


def chunk_text(text, chunk_size=250):
    """Split text into chunks of ~chunk_size words."""
    words = text.split()
    return [' '.join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]


# ── Collection setup ───────────────────────────────────────────────────────────

def create_buildings_collection(client):
    if client.has_collection(BUILDINGS_COLL):
        print(f'  Dropping existing {BUILDINGS_COLL}...')
        client.drop_collection(BUILDINGS_COLL)

    schema = MilvusClient.create_schema(auto_id=False, enable_dynamic_field=False)
    schema.add_field('id',                        DataType.INT64,         is_primary=True)
    schema.add_field('embedding',                 DataType.FLOAT_VECTOR,  dim=EMBED_DIM)
    # Identity
    schema.add_field('building_id',               DataType.VARCHAR,        max_length=32)
    schema.add_field('address',                   DataType.VARCHAR,        max_length=256)
    schema.add_field('prefecture',                DataType.VARCHAR,        max_length=64)
    schema.add_field('latitude',                  DataType.FLOAT)
    schema.add_field('longitude',                 DataType.FLOAT)
    # Risk
    schema.add_field('risk_score',                DataType.FLOAT)
    schema.add_field('risk_category',             DataType.VARCHAR,        max_length=16)
    schema.add_field('earthquake_zone',           DataType.VARCHAR,        max_length=16)
    schema.add_field('flood_zone',                DataType.VARCHAR,        max_length=16)
    schema.add_field('fire_risk',                 DataType.VARCHAR,        max_length=16)
    # Property
    schema.add_field('building_type',             DataType.VARCHAR,        max_length=64)
    schema.add_field('year_built',                DataType.INT32)
    schema.add_field('area_sqm',                  DataType.FLOAT)
    schema.add_field('construction_material',     DataType.VARCHAR,        max_length=64)
    schema.add_field('near_nature',               DataType.BOOL)
    # Climate / location
    schema.add_field('elevation_m',               DataType.FLOAT)
    schema.add_field('nasa_avg_temp_c',           DataType.FLOAT)
    schema.add_field('annual_rainfall_mm',        DataType.FLOAT)
    schema.add_field('dist_to_fire_station_km',   DataType.FLOAT)
    schema.add_field('historical_earthquakes_50km', DataType.FLOAT)
    # Financials
    schema.add_field('actual_value_euro',         DataType.FLOAT)
    schema.add_field('annual_premium_euro',       DataType.FLOAT)
    # ML predictions
    schema.add_field('predicted_premium_eur',     DataType.FLOAT)
    schema.add_field('premium_gap_eur',           DataType.FLOAT)
    schema.add_field('fire_claim_probability',    DataType.FLOAT)
    schema.add_field('fire_expected_claim_eur',   DataType.FLOAT)
    schema.add_field('flood_claim_probability',   DataType.FLOAT)
    schema.add_field('flood_expected_claim_eur',  DataType.FLOAT)
    schema.add_field('earthquake_claim_probability',  DataType.FLOAT)
    schema.add_field('earthquake_expected_claim_eur', DataType.FLOAT)
    schema.add_field('shap_summary',              DataType.VARCHAR,        max_length=1024)

    index_params = MilvusClient.prepare_index_params()
    index_params.add_index('embedding', metric_type='COSINE', index_type='AUTOINDEX')

    client.create_collection(BUILDINGS_COLL, schema=schema, index_params=index_params)
    print(f'  Created: {BUILDINGS_COLL}')


def create_kb_collection(client):
    if client.has_collection(KB_COLL):
        print(f'  Dropping existing {KB_COLL}...')
        client.drop_collection(KB_COLL)

    schema = MilvusClient.create_schema(auto_id=True, enable_dynamic_field=False)
    schema.add_field('id',         DataType.INT64,        is_primary=True, auto_id=True)
    schema.add_field('embedding',  DataType.FLOAT_VECTOR, dim=EMBED_DIM)
    schema.add_field('agent_name', DataType.VARCHAR,       max_length=64)
    schema.add_field('source_file',DataType.VARCHAR,       max_length=128)
    schema.add_field('chunk_text', DataType.VARCHAR,       max_length=4096)

    index_params = MilvusClient.prepare_index_params()
    index_params.add_index('embedding', metric_type='COSINE', index_type='AUTOINDEX')

    client.create_collection(KB_COLL, schema=schema, index_params=index_params)
    print(f'  Created: {KB_COLL}')


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    if not ZILLIZ_URI or not ZILLIZ_TOKEN:
        print('ERROR: ZILLIZ_URI and ZILLIZ_TOKEN must be set in insurance-risk-agents/.env')
        sys.exit(1)

    if not check_flask():
        print('ERROR: app.py is not running. Start it first:')
        print('  cd ml-model && python app.py')
        sys.exit(1)

    # Zilliz Cloud Serverless uses gRPC on port 443, not the default 19530
    zilliz_uri = ZILLIZ_URI.rstrip('/')
    if ':443' not in zilliz_uri and not zilliz_uri.endswith(':19530'):
        zilliz_uri += ':443'

    print('\nConnecting to Zilliz...')
    client = MilvusClient(uri=zilliz_uri, token=ZILLIZ_TOKEN)
    print('  Connected.')

    print('\nCreating collections...')
    create_buildings_collection(client)
    create_kb_collection(client)

    # ── Step 1: Load buildings ─────────────────────────────────────────────────
    print('\nLoading buildings from parquet...')
    raw       = subprocess.check_output([sys.executable, READ_SCRIPT])
    buildings = json.loads(raw)
    print(f'  Loaded {len(buildings)} buildings.')

    # ── Step 2: Run ML predictions in parallel (10 concurrent calls to app.py) ─
    print('\nRunning ML predictions via app.py...')
    predictions = {}
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(predict_building, b): b['building_id'] for b in buildings}
        done = 0
        for future in as_completed(futures):
            bid = futures[future]
            predictions[bid] = future.result()
            done += 1
            if done % 100 == 0:
                print(f'  {done}/{len(buildings)} predicted...')
    print(f'  All {len(buildings)} predictions done.')

    # ── Step 3: Generate embeddings ────────────────────────────────────────────
    print('\nGenerating embeddings...')
    descriptions = [
        build_description(b, predictions.get(b['building_id'], {}))
        for b in buildings
    ]
    embeddings = EMBED_MODEL.encode(
        descriptions, batch_size=64, show_progress_bar=True
    ).tolist()

    # ── Step 4: Insert buildings ───────────────────────────────────────────────
    print('\nInserting buildings into Milvus...')
    rows = []
    for i, (b, emb) in enumerate(zip(buildings, embeddings)):
        pred           = predictions.get(b['building_id'], {})
        actual_premium = float(b.get('annual_premium_euro') or 0)
        pred_premium   = float(pred.get('predicted_premium_eur') or 0)

        rows.append({
            'id':                             i,
            'embedding':                      emb,
            'building_id':                    str(b.get('building_id') or '')[:32],
            'address':                        str(b.get('address') or '')[:256],
            'prefecture':                     str(b.get('prefecture') or '')[:64],
            'latitude':                       float(b.get('latitude') or 0),
            'longitude':                      float(b.get('longitude') or 0),
            'risk_score':                     float(b.get('risk_score') or 0),
            'risk_category':                  str(b.get('risk_category') or 'unknown')[:16],
            'earthquake_zone':                str(b.get('earthquake_zone') or 'low')[:16],
            'flood_zone':                     str(b.get('flood_zone') or 'low')[:16],
            'fire_risk':                      str(b.get('fire_risk') or 'low')[:16],
            'building_type':                  str(b.get('building_type') or '')[:64],
            'year_built':                     int(b.get('year_built') or 1985),
            'area_sqm':                       float(b.get('area_sqm') or 0),
            'construction_material':          str(b.get('construction_material') or '')[:64],
            'near_nature':                    bool(b.get('near_nature') or False),
            'elevation_m':                    float(b.get('elevation_m') or 0),
            'nasa_avg_temp_c':                float(b.get('nasa_avg_temp_c') or 0),
            'annual_rainfall_mm':             float(b.get('annual_rainfall_mm') or 0),
            'dist_to_fire_station_km':        float(b.get('dist_to_fire_station_km') or 0),
            'historical_earthquakes_50km':    float(b.get('historical_earthquakes_50km') or 0),
            'actual_value_euro':              float(b.get('actual_value_euro') or 0),
            'annual_premium_euro':            actual_premium,
            'predicted_premium_eur':          pred_premium,
            'premium_gap_eur':                pred_premium - actual_premium,
            'fire_claim_probability':         float(pred.get('fire_claim_probability') or 0),
            'fire_expected_claim_eur':        float(pred.get('fire_expected_claim_eur') or 0),
            'flood_claim_probability':        float(pred.get('flood_claim_probability') or 0),
            'flood_expected_claim_eur':       float(pred.get('flood_expected_claim_eur') or 0),
            'earthquake_claim_probability':   float(pred.get('earthquake_claim_probability') or 0),
            'earthquake_expected_claim_eur':  float(pred.get('earthquake_expected_claim_eur') or 0),
            'shap_summary':                   json.dumps(pred.get('shap_top_factors') or [])[:1024],
        })

    BATCH = 100
    for i in range(0, len(rows), BATCH):
        client.insert(BUILDINGS_COLL, rows[i:i + BATCH])
        print(f'  Inserted {min(i + BATCH, len(rows))}/{len(rows)}...')

    # ── Step 5: Ingest KB files ────────────────────────────────────────────────
    print('\nIngesting knowledge base files...')
    kb_rows = []
    for filename, agent_name in KB_AGENT_MAP.items():
        kb_path = os.path.join(KB_DIR, filename)
        if not os.path.exists(kb_path):
            print(f'  Skipping {filename} — not found')
            continue
        with open(kb_path, 'r', encoding='utf-8') as f:
            text = f.read()
        chunks         = chunk_text(text, chunk_size=250)
        chunk_embeddings = EMBED_MODEL.encode(chunks).tolist()
        for chunk, emb in zip(chunks, chunk_embeddings):
            # Milvus VARCHAR max_length counts UTF-8 bytes; truncate safely
            encoded = chunk.encode('utf-8')
            safe_chunk = encoded[:4000].decode('utf-8', errors='ignore') if len(encoded) > 4000 else chunk
            kb_rows.append({
                'embedding':   emb,
                'agent_name':  agent_name,
                'source_file': filename,
                'chunk_text':  safe_chunk,
            })
        print(f'  {filename}: {len(chunks)} chunks')

    client.insert(KB_COLL, kb_rows)

    print('\n✓ Ingest complete.')
    print(f'  {BUILDINGS_COLL}: {len(rows)} buildings')
    print(f'  {KB_COLL}:        {len(kb_rows)} KB chunks')


if __name__ == '__main__':
    main()
