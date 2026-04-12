import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import api from "../axiosConfig";
import "../styles/BuildingPage.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const RISK_COLORS = {
  very_low: '#28a745',
  low: '#8bc34a',
  medium: '#ffc107',
  high: '#ff7043',
  very_high: '#dc3545',
};

function RiskMeter({ score }) {
  const pct = Math.min(Math.max(Number(score) || 0, 0), 100);
  let color = '#28a745';
  if (pct >= 80) color = '#dc3545';
  else if (pct >= 60) color = '#ff7043';
  else if (pct >= 40) color = '#ffc107';
  else if (pct >= 20) color = '#8bc34a';
  const isHighRisk = pct > 85;
  
  return (
    <div className="bp-risk-meter">
      <div className="bp-risk-meter-top">
        <span className="bp-risk-label">Risk Score</span>
        <div className="bp-risk-value-container">
          <span className="bp-risk-value" style={{ color }}>{pct.toFixed(1)}</span>
          {isHighRisk && <span className="bp-risk-flame">🔥</span>}
        </div>
      </div>
      <div className="bp-risk-track">
        <div className="bp-risk-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function SecurityIcon({ label, active }) {
  return (
    <div className={`bp-security-item ${active ? 'active' : 'inactive'}`}>
      <span className="bp-security-dot" style={{ background: active ? '#28a745' : '#64748b' }} />
      {label}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="bp-info-row">
      <span className="bp-info-label">{label}</span>
      <span className="bp-info-value">{value ?? '—'}</span>
    </div>
  );
}

function ZonePill({ label, level }) {
  const colors = { none: '#64748b', low: '#8bc34a', medium: '#ffc107', high: '#dc3545' };
  return (
    <div className="bp-zone-pill">
      <span className="bp-zone-label">{label}</span>
      <span className="bp-zone-level" style={{ color: colors[level] || '#64748b' }}>
        {level ? level.charAt(0).toUpperCase() + level.slice(1) : '—'}
      </span>
    </div>
  );
}

function MapboxView({ building }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!building || !containerRef.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [building.longitude, building.latitude],
      zoom: 19,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    mapRef.current.on("load", () => {
      mapRef.current.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 14,
        paint: {
          "fill-extrusion-color": "#b0b8c8",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.75,
        },
      });

      new mapboxgl.Marker({ color: "#00c2ff" })
        .setLngLat([building.longitude, building.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<strong>${building.building_name || building.address}</strong>`
          )
        )
        .addTo(mapRef.current);
    });

    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, [building]);

  return <div ref={containerRef} className="bp-mapbox" />;
}

function MLPredictions({ buildingId }) {
  const [pred, setPred] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const predictEndpoint = /^BLD_/.test(buildingId)
      ? `/ml-buildings/${buildingId}/predict`
      : `/buildings/${buildingId}/predict`;
    api.get(predictEndpoint)
      .then(res => { setPred(res.data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [buildingId]);

  if (loading) return (
    <div className="bp-section bp-ml-section">
      <div className="bp-section-title">AI Risk Predictions</div>
      <div className="bp-ml-loading">Running AI models…</div>
    </div>
  );

  if (error || !pred) return (
    <div className="bp-section bp-ml-section">
      <div className="bp-section-title">AI Risk Predictions</div>
      <div className="bp-ml-error">ML service offline — start <code>predict_api.py</code></div>
    </div>
  );

  const claims = [
    { label: 'Fire', prob: pred.fire_claim_probability, amount: pred.fire_expected_claim_eur, color: '#ff7043' },
    { label: 'Flood', prob: pred.flood_claim_probability, amount: pred.flood_expected_claim_eur, color: '#2196f3' },
    { label: 'Earthquake', prob: pred.earthquake_claim_probability, amount: pred.earthquake_expected_claim_eur, color: '#9c27b0' },
  ];

  return (
    <div className="bp-section bp-ml-section">
      <div className="bp-section-title">AI Risk Predictions <span className="bp-ml-badge">7-Model Ensemble</span></div>

      <div className="bp-ml-premium">
        <span className="bp-ml-premium-label">AI-Predicted Annual Premium</span>
        <span className="bp-ml-premium-val">€{pred.predicted_premium_eur.toLocaleString('el-GR', { minimumFractionDigits: 2 })}</span>
      </div>

      <div className="bp-ml-claims">
        {claims.map(({ label, prob, amount, color }) => (
          <div key={label} className="bp-ml-claim-row">
            <div className="bp-ml-claim-header">
              <span className="bp-ml-claim-label" style={{ color }}>{label} Claim</span>
              <span className="bp-ml-claim-pct" style={{ color }}>{(prob * 100).toFixed(1)}%</span>
            </div>
            <div className="bp-ml-bar-track">
              <div className="bp-ml-bar-fill" style={{ width: `${Math.min(prob * 100, 100)}%`, background: color }} />
            </div>
            <div className="bp-ml-claim-amount">
              Expected: €{amount.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        ))}
      </div>

      {pred.shap_top_factors?.length > 0 && (
        <div className="bp-ml-shap">
          <div className="bp-ml-shap-title">Top Premium Drivers (SHAP)</div>
          {pred.shap_top_factors.map((f, i) => (
            <div key={i} className="bp-ml-shap-row">
              <span className="bp-ml-shap-feature">{f.feature}</span>
              <span className={`bp-ml-shap-dir ${f.direction === 'increases' ? 'up' : 'down'}`}>
                {f.direction === 'increases' ? '▲' : '▼'} {f.direction} premium
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BuildingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = /^BLD_/.test(id) ? `/ml-buildings/${id}` : `/buildings/${id}`;
    api.get(endpoint)
      .then(res => { setBuilding(res.data); setLoading(false); })
      .catch(() => navigate("/map", { replace: true }));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="bp-loading">
        <span>Loading building data...</span>
      </div>
    );
  }

  const riskColor = RISK_COLORS[building.risk_category] || '#64748b';
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : null;

  return (
    <div className="bp-page">
      {/* Header */}
      <header className="bp-header">
        <button className="bp-back-btn" onClick={() => navigate("/map")}>
          ← Back to Map
        </button>
        <div className="bp-header-center">
          <h1 className="bp-title">{building.building_name || building.address}</h1>
          {building.building_name && <p className="bp-subtitle">{building.address}</p>}
        </div>
        <span className="bp-badge" style={{ background: riskColor }}>
          {building.risk_category?.replace('_', ' ').toUpperCase()}
        </span>
      </header>

      {/* Body */}
      <div className="bp-body">
        {/* Left: 3D Map */}
        <div className="bp-map-col">
          <div className="bp-map-card">
            <div className="bp-card-label">3D Satellite View</div>
            <MapboxView building={building} />
          </div>
        </div>

        {/* Right: Analytics */}
        <div className="bp-analytics-col">
          <RiskMeter score={building.risk_score} />

          <div className="bp-section">
            <div className="bp-section-title">Property Details</div>
            <InfoRow label="Type" value={cap(building.building_type)} />
            <InfoRow label="Year Built" value={building.year_built} />
            <InfoRow label="Area" value={building.area_sqm ? `${building.area_sqm} m²` : null} />
            <InfoRow label="Construction" value={cap(building.construction_material)} />
            <InfoRow label="Postal Code" value={building.postal_code} />
          </div>

          <div className="bp-section">
            <div className="bp-section-title">Hazard Zones</div>
            <div className="bp-zone-grid">
             
              <ZonePill label="Seismic" level={building.earthquake_zone} />
              <ZonePill label="Fire" level={building.fire_risk} />
            </div>
          </div>

          {(building.proximity_to_water || building.elevation_m) && (
            <div className="bp-section">
              <div className="bp-section-title">Location Data</div>
              {building.proximity_to_water && <InfoRow label="Water Proximity" value={`${building.proximity_to_water} m`} />}
              {building.elevation_m && <InfoRow label="Elevation" value={`${building.elevation_m} m`} />}
            </div>
          )}


<div className="bp-section">
  <div className="bp-section-title">Insurance & Financials</div>
  <div className="bp-price-grid">
    <div className="bp-price-item">
      <span className="bp-price-label">Annual Premium</span>
      <span className="bp-price-value">€{building.annual_premium_euro?.toLocaleString()}</span>
    </div>
    <div className="bp-price-item">
      <span className="bp-price-label">Declared Value</span>
      <span className="bp-price-value">€{building.declared_value_euro?.toLocaleString()}</span>
    </div>
  </div>
</div>

<div className="bp-section">
  <div className="bp-section-title">Security Features</div>
  <div className="bp-security-grid">
    <SecurityIcon label="Alarm System" active={building.has_alarm} />
    <SecurityIcon label="CCTV Cameras" active={building.has_cameras} />
    <SecurityIcon label="Security Door" active={building.has_security_door} />
  </div>
  <InfoRow label="Crime Rate" value={cap(building.crime_rate)} />
</div>

<MLPredictions buildingId={id} />

<div className="bp-section climate-card">
  <div className="bp-section-title">EarthRisk™ Climate Data</div>
  <div className="bp-climate-info">
    <div className="bp-temp-box">
        <span className="bp-temp-val">{building.nasa_avg_temp_c}°C</span>
        <span className="bp-temp-label">NASA Avg Temp</span>
    </div>
    <div className="bp-climate-details">
        <InfoRow label="Flood Zone" value={cap(building.flood_zone)} />
        <InfoRow label="Near Nature" value={building.near_nature ? 'Yes' : 'No'} />
    </div>
  </div>
</div>

{building.risk_score > 85 && (
  <div className="bp-critical-alert">
    <div className="bp-alert-icon">🔥</div>
    <div className="bp-alert-text">
      <strong>CRITICAL RISK DETECTED</strong>
      <p>This property exceeds safety thresholds. Insurance premium may be affected by extreme environmental factors.</p>
    </div>
  </div>
)}
          {building.google_maps_link && (
            <a
              href={building.google_maps_link}
              target="_blank"
              rel="noopener noreferrer"
              className="bp-gmaps-btn"
            >
              View on Google Maps
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
