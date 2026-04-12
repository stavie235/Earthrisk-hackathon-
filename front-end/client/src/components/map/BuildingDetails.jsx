import "./BuildingDetails.css";

const RISK_COLORS = {
  very_low: '#28a745',
  low: '#8bc34a',
  medium: '#ffc107',
  high: '#ff7043',
  very_high: '#dc3545'
};

const RiskBadge = ({ category }) => {
  const color = RISK_COLORS[category] || '#007bff';
  const label = category?.replace('_', ' ').toUpperCase() || 'UNKNOWN';
  return (
    <span className="risk-badge" style={{ backgroundColor: color }}>
      {label}
    </span>
  );
};

const RiskMeter = ({ score }) => {
  const pct = Math.min(Math.max(Number(score) || 0, 0), 100);
  let color = '#28a745';
  if (pct >= 80) color = '#dc3545';
  else if (pct >= 60) color = '#ff7043';
  else if (pct >= 40) color = '#ffc107';
  else if (pct >= 20) color = '#8bc34a';

  return (
    <div className="risk-meter">
      <div className="risk-meter-label">
        <span>Risk Score</span>
        <span className="risk-score-value" style={{ color }}>{pct.toFixed(1)}</span>
      </div>
      <div className="risk-meter-track">
        <div
          className="risk-meter-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="info-row">
    <span className="info-label">{label}</span>
    <span className="info-value">{value ?? '—'}</span>
  </div>
);

const ZonePill = ({ label, level }) => {
  const colors = { none: '#aaa', low: '#8bc34a', medium: '#ffc107', high: '#dc3545' };
  return (
    <div className="zone-pill">
      <span className="zone-label">{label}</span>
      <span className="zone-level" style={{ color: colors[level] || '#aaa' }}>
        {level ? level.charAt(0).toUpperCase() + level.slice(1) : '—'}
      </span>
    </div>
  );
};

export default function BuildingDetails({ building, onClose }) {
  if (!building) return null;

  return (
    <div className="station-drawer">
      <div className="station-ribbon" />
      <div className="station-content">
        <div className="drawer-header">
          <h2>{building.building_name || building.address}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {building.building_name && (
          <p className="building-address">{building.address}</p>
        )}

        <RiskMeter score={building.risk_score} />
        <div style={{ marginBottom: '12px' }}>
          <RiskBadge category={building.risk_category} />
        </div>

        <div className="section-title">Property Details</div>
        <div className="info-grid">
          <InfoRow label="Type" value={building.building_type ? building.building_type.charAt(0).toUpperCase() + building.building_type.slice(1) : null} />
          <InfoRow label="Year Built" value={building.year_built} />
          <InfoRow label="Area" value={building.area_sqm ? `${building.area_sqm} m²` : null} />
          <InfoRow label="Construction" value={building.construction_material ? building.construction_material.charAt(0).toUpperCase() + building.construction_material.slice(1) : null} />
          {building.prefecture && <InfoRow label="Prefecture" value={building.prefecture} />}
          {building.typos && <InfoRow label="Usage" value={building.typos.charAt(0).toUpperCase() + building.typos.slice(1)} />}
          <InfoRow label="Postal Code" value={building.postal_code} />
          <InfoRow label="Latitude" value={building.latitude} />
          <InfoRow label="Longitude" value={building.longitude} />
        </div>

        <div className="section-title">Hazard Zones</div>
        <div className="zone-grid">
          <ZonePill label="Seismic" level={building.earthquake_zone} />
          <ZonePill label="Fire" level={building.fire_risk} />
          {building.crime_rate && <ZonePill label="Crime" level={building.crime_rate} />}
        </div>

        {(building.annual_premium_euro || building.actual_value_euro) && (
          <>
            <div className="section-title">Insurance</div>
            <div className="info-grid">
              {building.annual_premium_euro && <InfoRow label="Annual Premium" value={`€${Number(building.annual_premium_euro).toLocaleString('el-GR', { minimumFractionDigits: 2 })}`} />}
              {building.actual_value_euro && <InfoRow label="Actual Value" value={`€${Number(building.actual_value_euro).toLocaleString('el-GR', { minimumFractionDigits: 0 })}`} />}
              {building.declared_value_euro && <InfoRow label="Declared Value" value={`€${Number(building.declared_value_euro).toLocaleString('el-GR', { minimumFractionDigits: 0 })}`} />}
              {building.coverage_scope && <InfoRow label="Coverage Scope" value={building.coverage_scope.charAt(0).toUpperCase() + building.coverage_scope.slice(1)} />}
              {building.coverage_level && <InfoRow label="Coverage Level" value={building.coverage_level.charAt(0).toUpperCase() + building.coverage_level.slice(1)} />}
              {building.deductible_euro != null && <InfoRow label="Deductible" value={`€${building.deductible_euro}`} />}
              {building.underinsured != null && <InfoRow label="Underinsured" value={building.underinsured ? 'Yes' : 'No'} />}
            </div>
          </>
        )}

        {(building.has_alarm != null || building.has_cameras != null || building.has_security_door != null || building.nasa_avg_temp_c != null) && (
          <>
            <div className="section-title">Security & Climate</div>
            <div className="info-grid">
              {building.has_alarm != null && <InfoRow label="Alarm System" value={building.has_alarm ? 'Yes' : 'No'} />}
              {building.has_cameras != null && <InfoRow label="Cameras" value={building.has_cameras ? 'Yes' : 'No'} />}
              {building.has_security_door != null && <InfoRow label="Security Door" value={building.has_security_door ? 'Yes' : 'No'} />}
              {building.near_nature != null && <InfoRow label="Near Wildland" value={building.near_nature ? 'Yes' : 'No'} />}
              {building.nasa_avg_temp_c != null && <InfoRow label="Avg Temp (NASA)" value={`${building.nasa_avg_temp_c} °C`} />}
            </div>
          </>
        )}

        {(building.proximity_to_water || building.elevation_m) && (
          <>
            <div className="section-title">Location Data</div>
            <div className="info-grid">
              {building.proximity_to_water && <InfoRow label="Water Proximity" value={`${building.proximity_to_water} m`} />}
              {building.elevation_m && <InfoRow label="Elevation" value={`${building.elevation_m} m`} />}
            </div>
          </>
        )}

        {building.google_maps_link && (
          <p className="google-maps-link">
            <a href={building.google_maps_link} target="_blank" rel="noopener noreferrer">
              View on Google Maps
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
