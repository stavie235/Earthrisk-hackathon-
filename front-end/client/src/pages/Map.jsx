import { useState, useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../axiosConfig";
import FloatingSearch from "../components/layout/FloatingSearch";
import BrandingIsland from "../components/layout/BrandingIsland";
import UserIsland from "../components/layout/UserIsland";
import MapView from "../components/map/mapview";
import 'leaflet/dist/leaflet.css';
import '../styles/MapOverlay.css';

export default function Map() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const [filters, setFilters] = useState({
    q: "",
    building_type: [],
    risk_min: "",
    risk_max: "",
    flood_zone: [],
    earthquake_zone: []
  });

  useEffect(() => {
    api.get('/ml-buildings')
      .then(res => setBuildings(res.data))
      .catch(err => console.error("Error fetching buildings", err));
  }, []);

  // Keep selectedBuilding in sync with route param for map highlight
  useEffect(() => {
    if (!id) { setSelectedBuilding(null); return; }
    const found = buildings.find(b => String(b.building_id) === id);
    if (found) setSelectedBuilding(found);
  }, [id, buildings]);

  const handleSearch = async (updatedFilters) => {
    const newFilters = { ...filters, ...updatedFilters };
    const params = {};
    if (newFilters.q) params.q = newFilters.q;
    if (newFilters.building_type?.length) params.building_type = newFilters.building_type.join(',');
    if (newFilters.risk_min !== "") params.risk_min = newFilters.risk_min;
    if (newFilters.risk_max !== "") params.risk_max = newFilters.risk_max;
    if (newFilters.flood_zone?.length) params.flood_zone = newFilters.flood_zone.join(',');
    if (newFilters.earthquake_zone?.length) params.earthquake_zone = newFilters.earthquake_zone.join(',');
    setFilters(newFilters);
    try {
      const res = await api.get('/ml-buildings', { params });
      setBuildings(res.data);
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const handleViewBuilding = (id) => {
    navigate(`/map/building/${id}`);
  };

  return (
    <div style={{ position: "relative", height: "100vh", width: "100vw", overflow: "hidden" }}>
      <div className="map-overlay-wrapper">
        <BrandingIsland />
        <FloatingSearch onSearch={handleSearch} filters={filters} buildings={buildings} onBuildingClick={(b) => handleViewBuilding(b.building_id)} />
        <UserIsland />
      </div>

      <MapView
        buildings={buildings}
        onViewBuilding={handleViewBuilding}
        selectedBuilding={selectedBuilding}
      />

      {isAdmin && <button
        onClick={() => navigate('/stats/high-risk')}
        title="High Risk Buildings"
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '32px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff6b35 0%, #c0392b 100%)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(192, 57, 43, 0.5)',
          zIndex: 1000,
          fontSize: '26px',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(192, 57, 43, 0.7)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(192, 57, 43, 0.5)';
        }}
      >
        🔥
      </button>}

      {isAdmin && <button
        onClick={() => navigate('/chat')}
        title="AI Agents"
        style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00c2ff 0%, #0077ff 100%)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0, 194, 255, 0.45)',
          zIndex: 1000,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(0, 194, 255, 0.65)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 194, 255, 0.45)';
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="6" width="20" height="13" rx="3" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5"/>
          <circle cx="8.5" cy="12.5" r="1.5" fill="white"/>
          <circle cx="15.5" cy="12.5" r="1.5" fill="white"/>
          <path d="M9 16.5c.8.7 2 1 3 1s2.2-.3 3-1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M12 6V3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="12" cy="3" r="1" fill="white"/>
          <path d="M4.5 6.5V5a1 1 0 0 1 1-1h1" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M19.5 6.5V5a1 1 0 0 0-1-1h-1" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>}

    </div>
  );
}
