"""
EarthRisk — WatsonX Orchestrate Tools (Zilliz REST API version)
Uses only Python standard library — no pymilvus, no sentence_transformers.
Works in IBM WatsonX cloud execution environment.

Environment variables (insurance-risk-agents/.env):
  ZILLIZ_URI    = https://in03-xxx.serverless.gcp-us-west1.cloud.zilliz.com
  ZILLIZ_TOKEN  = your-api-key
  EARTHRISK_BACKEND_URL = (only needed for fetch_building_history)
"""

import os
import json
import urllib.request
import urllib.parse

from dotenv import load_dotenv
from ibm_watsonx_orchestrate.agent_builder.tools import tool

# ── Config ─────────────────────────────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

ZILLIZ_URI   = os.environ.get('ZILLIZ_URI', '').rstrip('/')
ZILLIZ_TOKEN = os.environ.get('ZILLIZ_TOKEN', '')
BACKEND_URL  = os.environ.get('EARTHRISK_BACKEND_URL', '')

BUILDINGS_COLL = 'earthrisk_buildings'
KB_COLL        = 'earthrisk_kb'

ALL_BUILDING_FIELDS = [
    'building_id', 'address', 'prefecture', 'latitude', 'longitude',
    'risk_score', 'risk_category', 'earthquake_zone', 'flood_zone', 'fire_risk',
    'building_type', 'year_built', 'area_sqm', 'construction_material', 'near_nature',
    'elevation_m', 'nasa_avg_temp_c', 'annual_rainfall_mm',
    'dist_to_fire_station_km', 'historical_earthquakes_50km',
    'actual_value_euro', 'annual_premium_euro',
    'predicted_premium_eur', 'premium_gap_eur',
    'fire_claim_probability', 'fire_expected_claim_eur',
    'flood_claim_probability', 'flood_expected_claim_eur',
    'earthquake_claim_probability', 'earthquake_expected_claim_eur',
    'shap_summary',
]

# ── Zilliz REST helper ─────────────────────────────────────────────────────────

def _zilliz_post(path: str, payload: dict) -> dict:
    """POST to the Zilliz REST API and return the parsed JSON response."""
    url = f'{ZILLIZ_URI}/v2/vectordb/{path}'
    body = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            'Authorization': f'Bearer {ZILLIZ_TOKEN}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _query(collection: str, filter_expr: str, fields: list, limit: int = 100) -> list:
    """Scalar query — no embeddings required."""
    resp = _zilliz_post('entities/query', {
        'collectionName': collection,
        'filter': filter_expr,
        'outputFields': fields,
        'limit': limit,
    })
    return resp.get('data', [])


def _format_building(b: dict) -> dict:
    """Parse shap_summary from JSON string back to list."""
    out = dict(b)
    if isinstance(out.get('shap_summary'), str):
        try:
            out['shap_summary'] = json.loads(out['shap_summary'])
        except Exception:
            out['shap_summary'] = []
    return out


# ── Tools ──────────────────────────────────────────────────────────────────────

@tool
def search_buildings(
    query: str,
    prefecture: str = '',
    risk_min: float = 0.0,
    earthquake_zone: str = '',
    flood_zone: str = '',
    fire_risk: str = '',
    limit: int = 10,
) -> str:
    """Search buildings using optional structured filters.

    Use this tool for ANY question about multiple buildings, portfolio segments,
    or finding buildings that match a description or set of criteria.
    Examples:
      "high seismic risk buildings in Attica"
      "underpriced buildings where AI premium is much higher than actual"
      "old buildings in flood zones"

    Args:
        query (str): Natural language description (used as context — filtering is done via the other params).
        prefecture (str): Optional. Greek prefecture name, e.g. "Αττική". Leave empty for all.
        risk_min (float): Optional. Minimum risk_score (0–100). Default 0 (no filter).
        earthquake_zone (str): Optional. "low", "medium", or "high". Leave empty for all.
        flood_zone (str): Optional. "low", "medium", or "high". Leave empty for all.
        fire_risk (str): Optional. "low", "medium", or "high". Leave empty for all.
        limit (int): Number of results to return (default 10, max 50).

    Returns:
        str: JSON array of matching buildings with all fields including ML predictions.
    """
    try:
        filters = ['risk_score >= 0']
        if risk_min > 0:
            filters.append(f'risk_score >= {risk_min}')
        if prefecture:
            filters.append(f'prefecture == "{prefecture}"')
        if earthquake_zone:
            filters.append(f'earthquake_zone == "{earthquake_zone}"')
        if flood_zone:
            filters.append(f'flood_zone == "{flood_zone}"')
        if fire_risk:
            filters.append(f'fire_risk == "{fire_risk}"')

        expr = ' && '.join(filters)
        rows = _query(BUILDINGS_COLL, expr, ALL_BUILDING_FIELDS, limit=min(int(limit), 50))
        buildings = [_format_building(b) for b in rows]
        # Sort by risk_score descending
        buildings.sort(key=lambda b: float(b.get('risk_score') or 0), reverse=True)
        return json.dumps(buildings, ensure_ascii=False, indent=2)
    except Exception as e:
        return f'Error searching buildings: {e}'


@tool
def get_building(building_id: str) -> str:
    """Fetch the complete record for a single building by its ID (e.g. BLD_0387).

    Returns all fields: risk score, hazard zones, property details, financials,
    and the full ML predictions (fire/flood/earthquake probabilities and expected
    claim amounts, AI-predicted premium, SHAP top risk drivers).

    Args:
        building_id (str): Building identifier, e.g. BLD_0387

    Returns:
        str: JSON object with all building fields and ML predictions.
    """
    try:
        rows = _query(
            BUILDINGS_COLL,
            f'building_id == "{building_id.upper()}"',
            ALL_BUILDING_FIELDS,
            limit=1,
        )
        if not rows:
            return f'Building {building_id} not found. Check the ID.'
        return json.dumps(_format_building(rows[0]), ensure_ascii=False, indent=2)
    except Exception as e:
        return f'Error fetching building: {e}'


@tool
def query_knowledge_base(query: str, agent_name: str = '') -> str:
    """Retrieve relevant content from the EarthRisk knowledge base.

    Use this tool BEFORE answering any question about EarthRisk policies, risk
    formulas, underwriting guidelines, or escalation procedures. Always ground
    your answers in KB content when available.

    Args:
        query (str): The question or topic to look up, in natural language.
        agent_name (str): Optional. Restrict to a specific agent's KB:
                          "risk_explanation", "alerting",
                          "data_interpreter", "decision_support".
                          Leave empty to search all KBs.

    Returns:
        str: Relevant knowledge base passages to use as context for your answer.
    """
    try:
        filter_expr = f'agent_name == "{agent_name}"' if agent_name else 'agent_name != ""'
        rows = _query(
            KB_COLL,
            filter_expr,
            ['chunk_text', 'agent_name', 'source_file'],
            limit=20,
        )
        if not rows:
            return 'No knowledge base content found.'
        passages = []
        for r in rows:
            passages.append(f"[{r.get('source_file', '')} — {r.get('agent_name', '')}]\n{r.get('chunk_text', '')}")
        return '\n\n---\n\n'.join(passages)
    except Exception as e:
        return f'Error querying knowledge base: {e}'


@tool
def get_portfolio_summary() -> str:
    """Return aggregate statistics across the entire EarthRisk building portfolio.

    Use this tool when the user asks about overall portfolio health, total exposure,
    average risk, underpricing signals, or compares a specific building to the portfolio.

    Returns:
        str: JSON object with portfolio-wide aggregates including total buildings,
             insured value, average risk score, high-risk count, expected exposures
             by peril, underpriced count, and zone breakdowns.
    """
    try:
        fields = [
            'risk_score', 'risk_category',
            'actual_value_euro', 'annual_premium_euro',
            'predicted_premium_eur', 'premium_gap_eur',
            'fire_expected_claim_eur', 'flood_expected_claim_eur',
            'earthquake_expected_claim_eur',
            'earthquake_zone', 'flood_zone', 'fire_risk',
        ]
        all_b = _query(BUILDINGS_COLL, 'risk_score >= 0', fields, limit=2000)

        if not all_b:
            return 'No buildings found in Zilliz. Run ingest_milvus.py first.'

        n = len(all_b)

        def fsum(key):
            return sum(float(b.get(key) or 0) for b in all_b)

        def favg(key):
            return fsum(key) / n if n else 0

        cat_counts = {}
        for b in all_b:
            cat = b.get('risk_category', 'unknown')
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

        zone_breakdown = {'earthquake': {}, 'flood': {}, 'fire': {}}
        for b in all_b:
            for key, zone_key in [('earthquake', 'earthquake_zone'),
                                   ('flood', 'flood_zone'),
                                   ('fire', 'fire_risk')]:
                z = b.get(zone_key, 'unknown')
                zone_breakdown[key][z] = zone_breakdown[key].get(z, 0) + 1

        high_risk = sum(1 for b in all_b if b.get('risk_category') in ('high', 'very_high'))
        underpriced = sum(
            1 for b in all_b
            if float(b.get('premium_gap_eur') or 0) > float(b.get('annual_premium_euro') or 1) * 0.2
        )

        summary = {
            'total_buildings': n,
            'total_insured_value_eur': round(fsum('actual_value_euro'), 2),
            'total_annual_premium_eur': round(fsum('annual_premium_euro'), 2),
            'avg_risk_score': round(favg('risk_score'), 2),
            'high_risk_count': high_risk,
            'total_expected_fire_exposure_eur': round(fsum('fire_expected_claim_eur'), 2),
            'total_expected_flood_exposure_eur': round(fsum('flood_expected_claim_eur'), 2),
            'total_expected_earthquake_exposure_eur': round(fsum('earthquake_expected_claim_eur'), 2),
            'avg_premium_gap_eur': round(favg('premium_gap_eur'), 2),
            'underpriced_count': underpriced,
            'risk_category_breakdown': cat_counts,
            'zone_breakdown': zone_breakdown,
        }
        return json.dumps(summary, ensure_ascii=False, indent=2)
    except Exception as e:
        return f'Error computing portfolio summary: {e}'


@tool
def fetch_building_history(building_id: str) -> str:
    """Fetches the year-by-year risk and premium history for a building.

    NOTE: This tool requires the Express backend to be reachable via EARTHRISK_BACKEND_URL.
    Use it only when the user asks specifically about historical trends over time.

    First call get_building() to get the numeric database ID, then pass it here.

    Args:
        building_id (str): Numeric database building_id as a string, e.g. "49"

    Returns:
        str: JSON array of yearly history records, or an error message.
    """
    if not BACKEND_URL or BACKEND_URL in ('', 'PASTE_NGROK_URL_HERE'):
        return (
            'Building history is stored in the SQL database and requires the '
            'Express backend to be running and reachable. '
            'Set EARTHRISK_BACKEND_URL in the .env file.'
        )
    try:
        url = f'{BACKEND_URL}/api/buildings/{urllib.parse.quote(building_id)}/history'
        req = urllib.request.Request(url, headers={'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            history = json.loads(resp.read().decode())
        if not history:
            return f'No history records found for building_id {building_id}.'
        return json.dumps(history, ensure_ascii=False, indent=2)
    except urllib.error.HTTPError as e:
        return f'Backend error {e.code}: {e.reason}'
    except Exception as e:
        return f'Error fetching building history: {e}'
