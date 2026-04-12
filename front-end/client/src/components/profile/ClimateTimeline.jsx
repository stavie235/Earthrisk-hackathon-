import { useEffect, useState } from "react";
import api from "../../axiosConfig";
import "../../styles/profile/ClimateTimeline.css";

const ClimateTimeline = () => {
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTimelineData();
  }, []);

  const fetchTimelineData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users/insurance-climate-timeline");
      
      if (res.data) {
        const { insurance, climate } = res.data;
        
        // Combine insurance and climate data into a unified timeline
        const combined = createTimeline(insurance, climate);
        setTimelineData(combined);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching timeline data:", err);
      setError("Failed to load climate timeline");
    } finally {
      setLoading(false);
    }
  };

  const createTimeline = (insurance, climate) => {
    const timeline = [];

    // Add insurance events
    insurance.forEach(record => {
      timeline.push({
        year: record.policy_year,
        type: 'insurance',
        premium: record.premium_amount,
        riskScore: record.risk_score_then,
        buildingName: record.building_name,
        address: record.address,
        postalCode: record.postal_code
      });
    });

    // Add climate events
    climate.forEach(log => {
      timeline.push({
        year: log.log_year,
        type: 'climate',
        avgTemp: log.avg_temp,
        extremeEvents: log.extreme_events,
        co2Level: log.co2_level,
        postalCode: log.postal_code
      });
    });

    // Sort by year descending
    timeline.sort((a, b) => b.year - a.year);

    // Group by year
    const grouped = {};
    timeline.forEach(item => {
      if (!grouped[item.year]) {
        grouped[item.year] = {
          year: item.year,
          events: []
        };
      }
      grouped[item.year].events.push(item);
    });

    return Object.values(grouped);
  };

  const getEventIcon = (type) => {
    if (type === 'insurance') {
      return '📋';
    } else {
      return '🌍';
    }
  };

  const getEventDescription = (event) => {
    if (event.type === 'insurance') {
      return `Insurance premium of $${event.premium.toFixed(2)} for ${event.buildingName} (Risk Score: ${event.riskScore.toFixed(2)})`;
    } else {
      let description = `Climate: Avg Temp: ${event.avgTemp}°C`;
      if (event.extremeEvents > 0) {
        description += `, Extreme Events: ${event.extremeEvents}`;
      }
      if (event.co2Level) {
        description += `, CO2: ${event.co2Level}`;
      }
      return description;
    }
  };

  if (loading) {
    return <div className="climate-timeline-loading">Loading climate timeline...</div>;
  }

  if (error) {
    return <div className="climate-timeline-error">{error}</div>;
  }

  if (timelineData.length === 0) {
    return <div className="climate-timeline-empty">No timeline data available</div>;
  }

  return (
    <div className="climate-timeline-container">
      <h3>Insurance & Climate Timeline</h3>
      <p className="timeline-description">
        Explore how climate changes affected your insurance premiums over time.
      </p>

      <div className="timeline">
        {timelineData.map((yearGroup, idx) => (
          <div key={idx} className="timeline-year-group">
            <div className="timeline-year-marker">
              <span className="year-label">{yearGroup.year}</span>
            </div>

            <div className="timeline-events">
              {yearGroup.events.map((event, eventIdx) => (
                <div
                  key={eventIdx}
                  className={`timeline-event event-${event.type}`}
                >
                  <div className="event-icon">{getEventIcon(event.type)}</div>
                  <div className="event-content">
                    <p className="event-type">
                      {event.type === 'insurance' ? 'Insurance Policy' : 'Climate Data'}
                    </p>
                    <p className="event-description">
                      {getEventDescription(event)}
                    </p>
                    {event.type === 'insurance' && (
                      <div className="event-details">
                        <span className="detail-item">{event.buildingName}</span>
                        <span className="detail-item">{event.address}</span>
                      </div>
                    )}
                    {event.type === 'climate' && event.extremeEvents > 0 && (
                      <div className="event-alert">
                        ⚠️ {event.extremeEvents} extreme weather event(s) recorded
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Section */}
      <div className="timeline-summary">
        <h4>Key Insights</h4>
        <ul>
          <li>Climate events and premium changes are shown in chronological order</li>
          <li>Extreme weather events may impact your insurance risk assessment</li>
          <li>Monitor climate trends to understand future insurance costs</li>
        </ul>
      </div>
    </div>
  );
};

export default ClimateTimeline;
