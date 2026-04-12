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
  ComposedChart,
  Bar
} from "recharts";
import "../../styles/profile/InsuranceAndClimateTimeline.css";

const InsuranceAndClimateTimeline = () => {
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [yearRange, setYearRange] = useState({ min: 2024, max: 2026 });

  useEffect(() => {
    fetchTimelineData();
  }, []);

  const fetchTimelineData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users/insurance-climate-timeline");
      
      if (res.data) {
        const { insurance, climate } = res.data;
        const combined = createMergedTimeline(insurance, climate);
        setTimelineData(combined);

        if (combined.length > 0) {
          const years = combined.map(d => d.year);
          const minYear = Math.min(...years);
          const maxYear = Math.max(...years);
          setYearRange({ min: minYear, max: maxYear });
        }
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching timeline data:", err);
      setError("Failed to load insurance and climate data");
    } finally {
      setLoading(false);
    }
  };

  const createMergedTimeline = (insurance, climate) => {
    const mergedByYear = {};

    // Add insurance data
    insurance.forEach(record => {
      if (!mergedByYear[record.policy_year]) {
        mergedByYear[record.policy_year] = {
          year: record.policy_year,
          premiums: [],
          premium: 0,
          riskScore: 0,
          avgTemp: null,
          extremeEvents: 0,
          co2Level: null,
          hasInsurance: false,
          hasClimate: false,
          details: []
        };
      }
      const premium = Number(record.premium_amount) || 0;
      mergedByYear[record.policy_year].premiums.push(premium);
      mergedByYear[record.policy_year].premium += premium;
      mergedByYear[record.policy_year].riskScore = Math.max(
        mergedByYear[record.policy_year].riskScore,
        Number(record.risk_score_then) || 0
      );
      mergedByYear[record.policy_year].hasInsurance = true;
      mergedByYear[record.policy_year].details.push({
        type: 'insurance',
        building: record.building_name,
        amount: premium,
        risk: Number(record.risk_score_then) || 0
      });
    });

    // Add climate data
    climate.forEach(log => {
      if (!mergedByYear[log.log_year]) {
        mergedByYear[log.log_year] = {
          year: log.log_year,
          premiums: [],
          premium: 0,
          riskScore: 0,
          avgTemp: null,
          extremeEvents: 0,
          co2Level: null,
          hasInsurance: false,
          hasClimate: false,
          details: []
        };
      }
      mergedByYear[log.log_year].avgTemp = Number(log.avg_temp) || null;
      mergedByYear[log.log_year].extremeEvents = Number(log.extreme_events) || 0;
      mergedByYear[log.log_year].co2Level = log.co2_level;
      mergedByYear[log.log_year].hasClimate = true;
      mergedByYear[log.log_year].details.push({
        type: 'climate',
        temp: Number(log.avg_temp) || null,
        events: Number(log.extreme_events) || 0,
        co2: log.co2_level
      });
    });

    return Object.values(mergedByYear).sort((a, b) => a.year - b.year);
  };

  const getYearDetails = (year) => {
    return timelineData.find(d => d.year === year);
  };

  const selectedYearData = selectedYear ? getYearDetails(selectedYear) : null;

  if (loading) {
    return <div className="timeline-loading">Loading insurance and climate data...</div>;
  }

  if (error) {
    return <div className="timeline-error">{error}</div>;
  }

  if (timelineData.length === 0) {
    return <div className="timeline-empty">No insurance or climate data available</div>;
  }

  return (
    <div className="insurance-climate-timeline-container">
      <h3>Insurance Premiums & Climate Impact Timeline</h3>
      <p className="timeline-subtitle">
        Visualize how climate patterns influence your insurance premiums over time
      </p>

      {/* Combined Chart */}
      <div className="chart-wrapper">
        <h4>Premium Changes & Climate Conditions</h4>
        <p className="chart-description">
          Hover over data points to see details. Higher bars indicate increasing premiums or more extreme weather events.
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={timelineData} onClick={(state) => {
            if (state.activeTooltipIndex !== undefined) {
              setSelectedYear(timelineData[state.activeTooltipIndex].year);
            }
          }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis yAxisId="left" label={{ value: 'Premium ($)', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Risk Score / Extreme Events', angle: 90, position: 'insideRight' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
              formatter={(value) => {
                if (typeof value === 'number') return value.toFixed(2);
                return value;
              }}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar yAxisId="left" dataKey="premium" fill="#8884d8" name="Total Premium ($)" />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="riskScore"
              stroke="#82ca9d"
              name="Risk Score"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="extremeEvents"
              stroke="#ffc658"
              name="Extreme Weather Events"
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Year Selector */}
      <div className="year-selector">
        <label>Select Year for Details:</label>
        <select
          value={selectedYear || ""}
          onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">-- All Years --</option>
          {timelineData.map(item => (
            <option key={item.year} value={item.year}>
              {item.year}
            </option>
          ))}
        </select>
      </div>

      {/* Year Details */}
      {selectedYearData && (
        <div className="year-details">
          <h4>Details for {selectedYearData.year}</h4>
          <div className="details-grid">
            {selectedYearData.hasInsurance && (
              <div className="detail-card insurance-card">
                <h5>💼 Insurance Premiums</h5>
                <div className="detail-content">
                  <div className="detail-item">
                    <span className="detail-label">Total Premium:</span>
                    <span className="detail-value">${selectedYearData.premium.toFixed(2)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Risk Score:</span>
                    <span className="detail-value">{selectedYearData.riskScore.toFixed(2)}</span>
                  </div>
                  {selectedYearData.details.filter(d => d.type === 'insurance').map((detail, idx) => (
                    <div key={idx} className="sub-detail">
                      <span className="sub-label">{detail.building}</span>
                      <span className="sub-value">${detail.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedYearData.hasClimate && (
              <div className="detail-card climate-card">
                <h5>🌍 Climate Data</h5>
                <div className="detail-content">
                  {selectedYearData.avgTemp !== null && (
                    <div className="detail-item">
                      <span className="detail-label">Avg Temperature:</span>
                      <span className="detail-value">{selectedYearData.avgTemp.toFixed(1)}°C</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Extreme Events:</span>
                    <span className={`detail-value ${selectedYearData.extremeEvents > 0 ? 'alert' : ''}`}>
                      {selectedYearData.extremeEvents}
                    </span>
                  </div>
                  {selectedYearData.co2Level && (
                    <div className="detail-item">
                      <span className="detail-label">CO₂ Level:</span>
                      <span className="detail-value">{selectedYearData.co2Level}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Correlation Insight */}
          {selectedYearData.hasInsurance && selectedYearData.hasClimate && (
            <div className="correlation-insight">
              <h5>📊 Correlation Analysis</h5>
              <p>
                {selectedYearData.extremeEvents > 0
                  ? `⚠️ ${selectedYearData.extremeEvents} extreme weather event(s) were recorded this year, which likely contributed to the risk score of ${selectedYearData.riskScore.toFixed(2)} and premium of $${selectedYearData.premium.toFixed(2)}.`
                  : `✓ No extreme weather events recorded this year. Premium maintained at $${selectedYearData.premium.toFixed(2)}.`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary Statistics */}
      <div className="summary-stats">
        <h4>Overall Summary</h4>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-title">Total Years of Data</span>
            <span className="stat-value">{timelineData.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-title">Total Premiums Paid</span>
            <span className="stat-value">
              ${timelineData.reduce((sum, item) => sum + item.premium, 0).toFixed(2)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-title">Average Annual Premium</span>
            <span className="stat-value">
              ${(timelineData.reduce((sum, item) => sum + item.premium, 0) / timelineData.length).toFixed(2)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-title">Total Extreme Events</span>
            <span className="stat-value">
              {timelineData.reduce((sum, item) => sum + item.extremeEvents, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="insights-section">
        <h4>💡 Key Insights</h4>
        <ul>
          <li>Premium increases often correlate with extreme weather events in your area</li>
          <li>Monitor climate trends to anticipate future insurance costs</li>
          <li>Implement ecological upgrades to reduce building risk and insurance premiums</li>
        </ul>
      </div>
    </div>
  );
};

export default InsuranceAndClimateTimeline;
