import { useEffect, useState } from "react";
import api from "../../axiosConfig";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import "../../styles/profile/PremiumHistory.css";

const PremiumHistory = () => {
  const [premiumData, setPremiumData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    fetchInsuranceHistory();
  }, []);

  const fetchInsuranceHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users/insurance-history");
      
      if (res.data && res.data.length > 0) {
        // Group by building
        const buildingMap = {};
        res.data.forEach(record => {
          if (!buildingMap[record.building_id]) {
            buildingMap[record.building_id] = {
              building_id: record.building_id,
              building_name: record.building_name,
              address: record.address,
              records: []
            };
          }
          buildingMap[record.building_id].records.push(record);
        });

        const buildingsList = Object.values(buildingMap);
        setBuildings(buildingsList);

        // Set first building as default
        if (buildingsList.length > 0) {
          setSelectedBuilding(buildingsList[0].building_id);
          formatDataForChart(buildingsList[0].records);
        }
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching insurance history:", err);
      setError("Failed to load premium history");
    } finally {
      setLoading(false);
    }
  };

  const formatDataForChart = (records) => {
    // Sort by year
    const sorted = [...records].sort((a, b) => a.policy_year - b.policy_year);
    const data = sorted.map(record => ({
      year: record.policy_year,
      premium: Number(record.premium_amount) || 0,
      riskScore: Number(record.risk_score_then) || 0,
      status: record.status
    }));
    setPremiumData(data);
  };

  const handleBuildingChange = (buildingId) => {
    setSelectedBuilding(buildingId);
    const building = buildings.find(b => b.building_id === buildingId);
    if (building) {
      formatDataForChart(building.records);
    }
  };

  const selectedBuildingData = buildings.find(b => b.building_id === selectedBuilding);
  const totalPremium = premiumData.reduce((sum, item) => sum + item.premium, 0);
  const averagePremium = premiumData.length > 0 ? (totalPremium / premiumData.length).toFixed(2) : 0;

  if (loading) {
    return <div className="premium-history-loading">Loading premium history...</div>;
  }

  if (error) {
    return <div className="premium-history-error">{error}</div>;
  }

  if (buildings.length === 0) {
    return <div className="premium-history-empty">No insurance history available</div>;
  }

  return (
    <div className="premium-history-container">
      <h3>Insurance Premium History</h3>

      {/* Building Selector */}
      <div className="premium-building-selector">
        <label>Select Building: </label>
        <select
          value={selectedBuilding || ""}
          onChange={(e) => handleBuildingChange(Number(e.target.value))}
        >
          {buildings.map(building => (
            <option key={building.building_id} value={building.building_id}>
              {building.building_name || building.address}
            </option>
          ))}
        </select>
      </div>

      {/* Building Info */}
      {selectedBuildingData && (
        <div className="premium-building-info">
          <h4>{selectedBuildingData.building_name}</h4>
          <p className="premium-address">{selectedBuildingData.address}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="premium-stats">
        <div className="stat-item">
          <span className="stat-label">Total Paid</span>
          <span className="stat-value">${totalPremium.toFixed(2)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Average Premium</span>
          <span className="stat-value">${averagePremium}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Records</span>
          <span className="stat-value">{premiumData.length}</span>
        </div>
      </div>

      {/* Charts */}
      {premiumData.length > 0 && (
        <div className="premium-charts">
          {/* Premium Trend Chart */}
          <div className="chart-wrapper">
            <h4>Premium Trend Over Time</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={premiumData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis yAxisId="left" label={{ value: 'Premium ($)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Risk Score', angle: 90, position: 'insideRight' }} />
                <Tooltip formatter={(value) => value.toFixed(2)} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="premium"
                  stroke="#8884d8"
                  name="Premium ($)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="riskScore"
                  stroke="#82ca9d"
                  name="Risk Score"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Premium by Year */}
          <div className="chart-wrapper">
            <h4>Premium by Year</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={premiumData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Premium ($)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Bar dataKey="premium" fill="#8884d8" name="Premium" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Premium Records Table */}
      {premiumData.length > 0 && (
        <div className="premium-records-table">
          <h4>Detailed Records</h4>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Premium</th>
                <th>Risk Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {premiumData.sort((a, b) => b.year - a.year).map((record, idx) => (
                <tr key={idx}>
                  <td>{record.year}</td>
                  <td>${record.premium.toFixed(2)}</td>
                  <td>{record.riskScore.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge status-${record.status}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PremiumHistory;
