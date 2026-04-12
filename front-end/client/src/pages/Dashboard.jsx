import { useState, useEffect, useContext } from 'react';
import api from "../axiosConfig";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import "../styles/profile/Profile.css";

const RISK_COLORS = {
  very_low: '#28a745',
  low: '#8bc34a',
  medium: '#ffc107',
  high: '#ff7043',
  very_high: '#dc3545'
};

const StatCard = ({ title, value, subtitle }) => (
  <div style={{
    background: 'white', borderRadius: '12px', padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: '160px', flex: '1'
  }}>
    <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
    <div style={{ fontSize: '2rem', fontWeight: '800', color: '#222', margin: '6px 0 2px' }}>{value}</div>
    {subtitle && <div style={{ fontSize: '0.8rem', color: '#666' }}>{subtitle}</div>}
  </div>
);

const BarChart = ({ data, colorFn, labelKey, valueKey }) => {
  if (!data?.length) return <p style={{ color: '#888', fontSize: '0.9rem' }}>No data available.</p>;
  const max = Math.max(...data.map(d => d[valueKey]));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {data.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ minWidth: '100px', fontSize: '0.85rem', color: '#444', textTransform: 'capitalize' }}>
            {String(item[labelKey]).replace('_', ' ')}
          </span>
          <div style={{ flex: 1, background: '#eee', borderRadius: '4px', height: '20px', overflow: 'hidden' }}>
            <div style={{
              width: `${(item[valueKey] / max) * 100}%`,
              height: '100%',
              background: colorFn ? colorFn(item[labelKey]) : '#4a90d9',
              borderRadius: '4px',
              transition: 'width 0.4s ease'
            }} />
          </div>
          <span style={{ minWidth: '30px', fontSize: '0.85rem', fontWeight: '600', color: '#222' }}>
            {item[valueKey]}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { logoutAction } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [historyData, setHistoryData] = useState([]);
  const [buildingsList, setBuildingsList] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/adminStats/charts');
        setData(res.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/unauthorized');
        } else {
          setError('Failed to load dashboard data.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchBuildingHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await api.get('/adminStats/buildingHistory');
        setBuildingsList(res.data.buildings || []);
        setHistoryData(res.data.history || []);

        if (res.data.buildings && res.data.buildings.length > 0) {
          setSelectedBuildingId(res.data.buildings[0].building_id);
        }

        setHistoryError(null);
      } catch (err) {
        console.error('Error fetching building history:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/unauthorized');
        } else {
          setHistoryError('Failed to load building history data.');
        }
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchBuildingHistory();
  }, [navigate]);

  const totalBuildings = data?.byType?.reduce((sum, t) => sum + Number(t.count), 0) || 0;
  const avgRisk = data?.byFloodZone?.length
    ? (data.byFloodZone.reduce((sum, z) => sum + Number(z.avg_risk_score) * Number(z.count), 0) /
       data.byFloodZone.reduce((sum, z) => sum + Number(z.count), 0)).toFixed(1)
    : '—';
  const highRiskCount = data?.byRiskCategory?.find(r => r.risk_category === 'high' || r.risk_category === 'very_high')
    ? data.byRiskCategory.filter(r => r.risk_category === 'high' || r.risk_category === 'very_high')
        .reduce((sum, r) => sum + Number(r.count), 0)
    : 0;

  const selectedBuilding = buildingsList.find(b => b.building_id === selectedBuildingId);
  const selectedHistory = historyData
    .filter(entry => entry.building_id === selectedBuildingId)
    .sort((a, b) => a.record_year - b.record_year)
    .map(entry => ({
      year: entry.record_year,
      premium: Number(entry.annual_premium_euro || 0),
      riskScore: Number(entry.risk_score || 0),
      temperature: Number(entry.nasa_avg_temp_c || 0),
      lossOccurred: entry.loss_occurred
    }));

  return (
    <div className="profile-container">
      <header className="profile-header">
        <div className="header-left">
          <h1>EarthRisk Dashboard</h1>
          <p className="subtitle">Building Risk Analytics</p>
        </div>
        <div className="header-right">
          <button className="btn-map" onClick={() => navigate("/map")}>Map View</button>
          <button className="btn-logout" onClick={() => { logoutAction(); navigate("/map"); }}>Logout</button>
        </div>
      </header>

      {loading && <div className="loading-screen">Loading dashboard...</div>}
      {error && <div className="error-screen">{error}</div>}

      {!loading && !error && data && (
        <div className="tab-content" style={{ padding: '24px' }}>

          {/* Summary cards */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
            <StatCard title="Total Buildings" value={totalBuildings} />
            <StatCard title="Portfolio Avg Risk" value={avgRisk} subtitle="out of 100" />
            <StatCard title="High / Very High Risk" value={highRiskCount} subtitle="buildings" />
            <div style={{ minWidth: '160px', flex: '1' }}>
              <button
                onClick={() => navigate('/stats/high-risk')}
                style={{
                  width: '100%', height: '100%', padding: '20px', borderRadius: '12px', border: '1px solid #4a90d9',
                  background: '#ffffff', color: '#f14848', fontWeight: '800', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
              >
                Open High Risk Report
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>

          

            {/* Buildings by risk category */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#333' }}>Risk Category Distribution</h3>
              <BarChart
                data={data.byRiskCategory}
                labelKey="risk_category"
                valueKey="count"
                colorFn={(cat) => RISK_COLORS[cat] || '#aaa'}
              />
            </div>

      

            {/* Avg risk by earthquake zone */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#333' }}>Avg Risk Score by Seismic Zone</h3>
              <BarChart
                data={data.byEarthquakeZone}
                labelKey="earthquake_zone"
                valueKey="avg_risk_score"
                colorFn={() => '#e67e22'}
              />
            </div>

          </div>

          {/* Building history overview */}
          <div style={{ marginTop: '32px', background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#333' }}>Building History (Premium + Risk Trends)</h3>

            {historyLoading && <p>Loading building history...</p>}
            {historyError && <p style={{ color: 'red' }}>{historyError}</p>}

            {!historyLoading && !historyError && (
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: '280px', flex: '1 1 280px' }}>
                  <h4>Buildings</h4>
                  <ul style={{ listStyle: 'none', padding: 0, maxHeight: '360px', overflowY: 'auto' }}>
                    {buildingsList.map((building) => (
                      <li key={building.building_id} style={{ marginBottom: '8px' }}>
                        <button
  style={{
    width: '100%', 
    border: selectedBuildingId === building.building_id ? '2px solid #4a90d9' : '1px solid #0e0c0c',
    background: selectedBuildingId === building.building_id ? '#8db9e0' : 'white',
    borderRadius: '6px', 
    padding: '10px', 
    textAlign: 'left', 
    cursor: 'pointer',
    color: 'black' /* <-- Προσθέτεις το χρώμα εδώ */
  }}
  onClick={() => setSelectedBuildingId(building.building_id)}
>
  {building.building_name || building.address}
</button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ flex: '3 1 640px', minWidth: '350px' }}>
                  {selectedBuilding ? (
                    <>
                      <strong style={{ color: '#502186' }}>{selectedBuilding.building_name || selectedBuilding.address}</strong>
                      {selectedHistory.length === 0 ? (
                        <p>No history records found for this building.</p>
                      ) : (
                        <div style={{ width: '100%', height: '360px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={selectedHistory}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="year" />
                              <YAxis yAxisId="left" label={{ value: 'Premium / Value', angle: -90, position: 'insideLeft' }} />
                              <YAxis yAxisId="right" orientation="right" label={{ value: 'Risk Score / Temp', angle: 90, position: 'insideRight' }} />
                              <Tooltip formatter={(value) => Number(value).toFixed(2)} />
                              <Legend />
                              <Line yAxisId="left" type="monotone" dataKey="premium" stroke="#8884d8" name="Premium (€)" strokeWidth={2} />
                              <Line yAxisId="right" type="monotone" dataKey="riskScore" stroke="#ff7300" name="Risk Score" strokeWidth={2} />
                              <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#413ea0" name="Avg Temp (C)" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </>
                  ) : (
                    <p>Select a building to view history trends.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
