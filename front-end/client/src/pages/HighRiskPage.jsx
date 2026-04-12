import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../axiosConfig';

const RENOVATION_OPTIONS = [
  { key: 'flood_barrier', name: 'Flood barrier upgrade', description: 'Install high-performance flood barriers and elevated thresholds.', improvementPercent: 15 },
  { key: 'earthquake_bracing', name: 'Seismic bracing & anchors', description: 'Reinforce structural frames and foundations for quake resistance.', improvementPercent: 18 },
  { key: 'fireproof_coating', name: 'Fire-resistant coatings', description: 'Upgrade walls and roof to fire-resistant materials.', improvementPercent: 12 },
  { key: 'smart_alarm', name: 'Smart alarm + sensors', description: 'Install monitored fire/leak/alarm sensors with automatic alerts.', improvementPercent: 10 },
  { key: 'roof_rehab', name: 'Roof rehabilitation', description: 'Replace roof with high-durability, weatherproof membrane.', improvementPercent: 14 },
  { key: 'drainage_system', name: 'Improved drainage system', description: 'Add mechanical drainage and floodwater redirection systems.', improvementPercent: 16 }
];

const RENOVATION_COUNT = 2;

const normalizeRiskCategory = (riskCategory) => {
  if (!riskCategory) return '';
  return riskCategory.toString().trim().toLowerCase().replace(/\s+/g, '_');
};

const makeRenovations = (building) => {
  const seed = Number(building.building_id) || Math.floor(Math.random() * 1000);
  const chosen = [];
  const options = [...RENOVATION_OPTIONS];

  for (let i = 0; i < RENOVATION_COUNT && options.length > 0; i += 1) {
    const index = Math.floor((seed + i * 37) % options.length);
    chosen.push(options.splice(index, 1)[0]);
  }

  return chosen;
};

const formatPrice = (value) => {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(value);
};

export default function HighRiskPage() {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [renovationsByBuilding, setRenovationsByBuilding] = useState({});
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [filterRiskMin, setFilterRiskMin] = useState(0);
  const [filterRiskMax, setFilterRiskMax] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/buildings');
        const allBuildings = res.data || [];
        const filtered = allBuildings.filter((b) => {
          const cat = normalizeRiskCategory(b.risk_category);
          return cat === 'high' || cat === 'very_high';
        });

        const renovationsMap = {};
        filtered.forEach((b) => {
          renovationsMap[b.building_id] = makeRenovations(b);
        });

        const sorted = filtered.sort((a, b) => Number(b.risk_score || 0) - Number(a.risk_score || 0));
        const sliced = sorted;

        setBuildings(sliced);
        setRenovationsByBuilding(renovationsMap);
        setSelectedBuildingId(sliced.length > 0 ? sliced[0].building_id : null);
        setError(null);
      } catch (err) {
        console.error('Error fetching high-risk buildings', err);
        setError('Could not load high-risk buildings.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredBuildings = buildings.filter((b) => {
    const score = Number(b.risk_score || 0);
    return score >= Number(filterRiskMin) && score <= Number(filterRiskMax);
  });

  const selectedBuilding = filteredBuildings.find((b) => b.building_id === selectedBuildingId) || filteredBuildings[0] || null;

  useEffect(() => {
    if (!selectedBuilding && filteredBuildings.length > 0) {
      setSelectedBuildingId(filteredBuildings[0].building_id);
    }
  }, [filteredBuildings, selectedBuilding]);

  const handleEmail = (building) => {
    const message = `Report for building ${building.building_name || building.address} has been sent to the customer email (simulated).`;
    window.alert(message);
  };

  const handleExportPdf = (building, renovationSet) => {
    const basePremium = Number(building.annual_premium_euro || 0);
    const projectedPremium = renovationSet.reduce((acc, r) => acc * (1 - r.improvementPercent / 100), basePremium);
    const totalSaving = basePremium - projectedPremium;
    const reportDate = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

    const renovationRows = renovationSet.map((item, i) => {
      const newPremium = basePremium * (1 - item.improvementPercent / 100);
      return `
        <tr>
          <td>${i + 1}. ${item.name}</td>
          <td style="text-align:center">${item.improvementPercent}%</td>
          <td>${item.description}</td>
          <td style="text-align:right;color:#138d75;font-weight:700">${formatPrice(newPremium)}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>EarthRisk Insurance Report — ${building.building_name || building.address}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a2a3a; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1f3c72; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 22px; color: #1f3c72; }
    .header .meta { text-align: right; font-size: 12px; color: #5a7a9a; }
    .section-title { font-size: 15px; font-weight: 700; color: #2f3f5c; margin: 20px 0 10px; border-left: 4px solid #2e86de; padding-left: 8px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .card { background: #f4f7fb; border: 1px solid #d0dff0; border-radius: 8px; padding: 12px; }
    .card .label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
    .card .value { font-size: 18px; font-weight: 700; }
    .card.danger .value { color: #c0392b; }
    .card.success .value { color: #138d75; }
    .card.primary .value { color: #2a4d7b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #1f3c72; color: white; padding: 8px 10px; text-align: left; font-size: 12px; }
    td { padding: 8px 10px; border-bottom: 1px solid #e1ebf7; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafd; }
    .summary-box { background: linear-gradient(135deg, #e8f5e9, #f1f8e9); border: 1px solid #a5d6a7; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
    .summary-box p { margin: 4px 0; }
    .footer { margin-top: 30px; border-top: 1px solid #d0dff0; padding-top: 12px; font-size: 11px; color: #8a9bb0; text-align: center; }
    .badge { display: inline-block; background: #f2d7d5; color: #b03a2e; padding: 3px 8px; border-radius: 999px; font-weight: 700; font-size: 11px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>EarthRisk Insurance Report</h1>
      <p style="color:#5a7a9a;margin-top:4px">High Risk Mitigation &amp; Premium Adjustment</p>
    </div>
    <div class="meta">
      <p><strong>Report Date:</strong> ${reportDate}</p>
      <p><strong>Building ID:</strong> ${building.building_id || 'N/A'}</p>
      <p><strong>External ID:</strong> ${building.external_id || 'N/A'}</p>
    </div>
  </div>

  <div class="section-title">Building Information</div>
  <table>
    <tr><th style="width:30%">Field</th><th>Detail</th></tr>
    <tr><td>Building Name</td><td>${building.building_name || '—'}</td></tr>
    <tr><td>Address</td><td>${building.address || '—'}</td></tr>
    <tr><td>Building Type</td><td>${building.building_type || '—'}</td></tr>
    <tr><td>Postal Code</td><td>${building.postal_code || '—'}</td></tr>
    <tr><td>Risk Category</td><td><span class="badge">${(building.risk_category || 'HIGH').replace('_', ' ').toUpperCase()}</span></td></tr>
    <tr><td>Flood Zone</td><td>${building.flood_zone || '—'}</td></tr>
    <tr><td>Earthquake Zone</td><td>${building.earthquake_zone || '—'}</td></tr>
  </table>

  <div class="section-title">Premium Overview</div>
  <div class="grid">
    <div class="card primary"><div class="label">Current Annual Premium</div><div class="value">${formatPrice(basePremium)}</div></div>
    <div class="card danger"><div class="label">Current Risk Score</div><div class="value">${Number(building.risk_score || 0).toFixed(1)} / 100</div></div>
    <div class="card success"><div class="label">Projected Premium (post-upgrades)</div><div class="value">${formatPrice(projectedPremium)}</div></div>
  </div>

  <div class="summary-box">
    <p><strong>Estimated annual saving after recommended renovations:</strong> ${formatPrice(totalSaving)}</p>
    <p style="color:#5a7a9a;font-size:12px;margin-top:6px">This estimate is based on applying all recommended renovations below. Actual premiums are subject to underwriter review.</p>
  </div>

  <div class="section-title">Recommended Renovations &amp; Premium Impact</div>
  <table>
    <tr>
      <th>Renovation</th>
      <th style="text-align:center">Risk Reduction</th>
      <th>Description</th>
      <th style="text-align:right">New Premium (if applied)</th>
    </tr>
    ${renovationRows}
  </table>

  <div class="section-title">Disclaimer</div>
  <p style="font-size:12px;color:#5a7a9a;line-height:1.6">
    This report is generated automatically by EarthRisk and is intended for internal insurance underwriting purposes only.
    Risk scores and premium projections are estimates based on available data and may not reflect all environmental or structural factors.
    All final premium decisions must be reviewed and approved by a licensed underwriter.
  </p>

  <div class="footer">EarthRisk Platform &bull; Confidential Insurance Document &bull; ${reportDate}</div>

  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.documentElement.innerHTML = html;
  };

  return (
    <div className="profile-container" style={{ padding: '24px' }}>
      <header className="profile-header" style={{ marginBottom: '24px' }}>
        <div className="header-left">
          <h1>High / Very High Risk Buildings</h1>
          <p className="subtitle">Risk reduction recommendations and premium outlook</p>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn-map" onClick={() => navigate('/stats')} style={{ minWidth: '180px' }}>Back to analytics</button>
        </div>
      </header>

      {loading && <div className="loading-screen">Loading high-risk building list...</div>}
      {error && <div className="error-screen" style={{ color: '#c0392b' }}>{error}</div>}

      {!loading && !error && filteredBuildings.length === 0 && <div style={{ padding: '16px', background: '#f7f9fb', borderRadius: '10px' }}>No high-risk buildings found in this score range.</div>}

      <div style={{ marginBottom: '18px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ color: '#2f436d', fontWeight: '600' }}>
          Min risk score
          <input
            type="number"
            min="0"
            max="100"
            value={filterRiskMin}
            onChange={(e) => setFilterRiskMin(Number(e.target.value))}
            style={{ marginLeft: '8px', width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #ccd6e4' }}
          />
        </label>

        <label style={{ color: '#2f436d', fontWeight: '600' }}>
          Max risk score
          <input
            type="number"
            min="0"
            max="100"
            value={filterRiskMax}
            onChange={(e) => setFilterRiskMax(Number(e.target.value))}
            style={{ marginLeft: '8px', width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #ccd6e4' }}
          />
        </label>

        <div style={{ color: '#43506b', fontWeight: '500' }}>Ranked by highest risk score.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '18px' }}>
  <div 
    className="hide-scrollbar" /* <-- Add the class here */
    style={{ 
      background: 'white', 
      borderRadius: '12px', 
      border: '1px solid #e9918a', 
      boxShadow: '0 5px 18px rgba(33,68,113,0.08)', 
      padding: '12px', 
      maxHeight: 'calc(100vh - 250px)', 
      overflowY: 'auto' 
    }}
  >
    <h3 style={{ marginTop: 0, color: '#1d3565' }}>Choose building</h3>
    {filteredBuildings.map((building, index) => (
      <button
        key={building.building_id}
        onClick={() => setSelectedBuildingId(building.building_id)}
        style={{
          width: '100%', textAlign: 'left', marginBottom: '8px', padding: '10px', borderRadius: '8px',
          border: selectedBuildingId === building.building_id ? '2px solid #2e86de' : '1px solid #cad6e8',
          background: selectedBuildingId === building.building_id ? '#eef5ff' : '#ffffff', cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ minWidth: '22px', height: '22px', borderRadius: '50%', background: index === 0 ? '#c0392b' : index === 1 ? '#e67e22' : '#2e86de', color: 'white', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {index + 1}
          </span>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a385e' }}>{building.building_name || building.address}</div>
        </div>
        <div style={{ fontSize: '0.83rem', color: '#5d708c', marginTop: '4px', paddingLeft: '30px' }}>Risk {Number(building.risk_score || 0).toFixed(1)} | Premium {formatPrice(Number(building.annual_premium_euro || 0))}</div>
      </button>
    ))}
  </div>

        <div>
          {selectedBuilding ? (
            <div style={{ borderRadius: '14px', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafd 100%)', boxShadow: '0 5px 22px rgba(24,39,75,0.08)', padding: '20px', border: '1px solid #d9e6f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#1f3c72' }}>{selectedBuilding.building_name || selectedBuilding.address}</h2>
                  <p style={{ margin: '4px 0 8px', color: '#415b7a' }}>{selectedBuilding.address || 'Address unknown'}</p>
                </div>
                <span style={{ background: '#f2d7d5', color: '#b03a2e', padding: '6px 10px', borderRadius: '999px', fontWeight: '700', fontSize: '0.8rem' }}>
                  {selectedBuilding.risk_category?.replace('_', ' ').toUpperCase() || 'HIGH'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div style={{ background: '#ffffff', borderRadius: '10px', padding: '10px', border: '1px solid #e1ebf7' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Premium</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#2a4d7b' }}>{formatPrice(Number(selectedBuilding.annual_premium_euro || 0))}</div>
                </div>
                <div style={{ background: '#ffffff', borderRadius: '10px', padding: '10px', border: '1px solid #e1ebf7' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Risk Score</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#c0392b' }}>{Number(selectedBuilding.risk_score || 0).toFixed(1)}</div>
                </div>
                <div style={{ background: '#ffffff', borderRadius: '10px', padding: '10px', border: '1px solid #e1ebf7' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Projected Premium after upgrades</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#138d75' }}>
                    {formatPrice(filteredBuildings.length ? Number(renovationsByBuilding[selectedBuilding.building_id]?.reduce((prev, r) => prev * (1 - r.improvementPercent / 100), Number(selectedBuilding.annual_premium_euro || 0)) || 0) : 0)}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ margin: '0 0 10px', color: '#2f3f5c' }}>Suggested Renovations</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(renovationsByBuilding[selectedBuilding.building_id] || []).map((item) => {
                    const improvedPremium = Number(selectedBuilding.annual_premium_euro || 0) * (1 - item.improvementPercent / 100);
                    return (
                      <div key={item.key} style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #4587ce', padding: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: '#d9534f' }}>{item.name}</strong>
                          <span style={{ color: '#0f6b64', fontWeight: '700' }}>- {item.improvementPercent}%</span>
                        </div>
                        <p style={{ margin: '6px 0', color: '#51667d', fontSize: '0.9rem' }}>{item.description}</p>
                        <p style={{ margin: '0', fontSize: '0.85rem', color: '#375a7f' }}>Renewed premium: {formatPrice(improvedPremium)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <button onClick={() => handleEmail(selectedBuilding)} style={{ background: '#2e86de', border: 'none', color: 'white', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Email customer with report</button>
                <button onClick={() => handleExportPdf(selectedBuilding, renovationsByBuilding[selectedBuilding.building_id] || [])} style={{ background: '#27ae60', border: 'none', color: 'white', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Export as PDF</button>
              </div>
            </div>
          ) : (
            <div style={{ color: '#5f6672', padding: '14px', borderRadius: '10px', border: '1px solid #e5eaf0', background: '#fafcfe' }}>Select a building to inspect renovation recommendations.</div>
          )}
        </div>
      </div>
    </div>
  );
}
