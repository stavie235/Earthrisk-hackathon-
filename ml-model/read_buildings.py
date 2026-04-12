"""
EarthRisk — Parquet Building Reader
Reads historical_insurance_data_lake.parquet, computes risk scores,
and outputs a JSON array of buildings the frontend can render on the map.

Usage: python read_buildings.py
"""
import sys
import json
import os

import pandas as pd
import numpy as np

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
PARQUET    = os.path.join(MODEL_DIR, 'historical_insurance_data_lake.parquet')

def compute_risk(row):
    # Seismic (30 pts)
    seismic = (int(row['seismic_zone']) / 3) * 30

    # Fire / wildland access (20 pts)
    fire = (
        int(bool(row['near_forest'])) * 10 +
        (8 if str(row['construction_material']) == '\u039e\u03cd\u03bb\u03b9\u03bd\u03bf' else 0) +
        min(float(row['dist_to_fire_station_km']) / 30.0, 1.0) * 12
    ) * (20.0 / 30.0)

    # Climate / heat (20 pts)
    climate = min(max((float(row['avg_summer_temp_C']) - 20.0) / 20.0, 0.0), 1.0) * 20.0

    # Building age (10 pts)
    age = max(0, 2026 - int(row['build_year']))
    age_pts = min(age / 80.0, 1.0) * 10.0

    # Historical claims (20 pts)
    has_claim = int(
        float(row['historical_fire_claim_euro']) > 0 or
        float(row['historical_flood_claim_euro']) > 0 or
        float(row['historical_earthquake_claim_euro']) > 0
    )
    claims = has_claim * 20.0

    total = seismic + fire + climate + age_pts + claims
    return round(float(min(max(total, 0.0), 100.0)), 1)


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


def risk_category(score):
    if score > 80: return 'very_high'
    if score > 65: return 'high'
    if score > 35: return 'medium'
    if score > 15: return 'low'
    return 'very_low'


def get_buildings():
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

    df['near_forest']                       = df['near_forest'].fillna(False)
    df['avg_summer_temp_C']                 = df['avg_summer_temp_C'].fillna(28.0)
    df['dist_to_fire_station_km']           = df['dist_to_fire_station_km'].fillna(5.0)
    df['elevation_meters']                  = df['elevation_meters'].fillna(50.0)
    df['historical_fire_claim_euro']        = df['historical_fire_claim_euro'].fillna(0)
    df['historical_flood_claim_euro']       = df['historical_flood_claim_euro'].fillna(0)
    df['historical_earthquake_claim_euro']  = df['historical_earthquake_claim_euro'].fillna(0)
    df['historical_annual_premium']         = df['historical_annual_premium'].fillna(0)

    buildings = []
    for _, row in df.iterrows():
        score = compute_risk(row)
        buildings.append({
            'building_id':          str(row['building_id']),
            'external_id':          str(row['building_id']),
            'building_name':        None,
            'address':              str(row['address']),
            'prefecture':           str(row['prefecture']),
            'latitude':             round(float(row['latitude']), 6),
            'longitude':            round(float(row['longitude']), 6),
            'building_type':        str(row['property_type']),
            'year_built':           int(row['build_year']),
            'area_sqm':             float(row['sq_meters']),
            'floors':               None,
            'construction_material': str(row['construction_material']),
            'earthquake_zone':      to_eq_zone(row['seismic_zone']),
            'flood_zone':           to_flood_zone(row['elevation_meters']),
            'fire_risk':            to_fire_risk(row['near_forest'], row['dist_to_fire_station_km']),
            'near_nature':          bool(row['near_forest']),
            'nasa_avg_temp_c':      round(float(row['avg_summer_temp_C']), 1),
            'elevation_m':          round(float(row['elevation_meters']), 1),
            'annual_rainfall_mm':   round(float(row['annual_rainfall_mm']), 1),
            'historical_earthquakes_50km': float(row['historical_earthquakes_50km']),
            'dist_to_fire_station_km': round(float(row['dist_to_fire_station_km']), 1),
            'annual_premium_euro':  round(float(row['historical_annual_premium']), 2),
            'actual_value_euro':    round(float(row['actual_value_euro']), 2),
            'declared_value_euro':  None,
            'has_alarm':            False,
            'has_cameras':          False,
            'has_security_door':    False,
            'crime_rate':           None,
            'proximity_to_water':   None,
            'postal_code':          None,
            'google_maps_link':     None,
            'typos':                None,
            'coverage_scope':       None,
            'coverage_level':       None,
            'deductible_euro':      None,
            'underinsured':         None,
            'risk_score':           score,
            'risk_category':        risk_category(score),
        })
    return buildings


if __name__ == '__main__':
    print(json.dumps(get_buildings()))
