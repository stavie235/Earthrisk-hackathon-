import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { getMarkerIcon } from "../../utils/mapIcons";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";
import "./mapview.css";

function SetViewOnBuilding({ selectedBuilding }) {
  const map = useMap();

  useEffect(() => {
    if (selectedBuilding?.latitude && selectedBuilding?.longitude) {
      map.flyTo(
        [selectedBuilding.latitude, selectedBuilding.longitude],
        16,
        { animate: true, duration: 1.3 }
      );
    } else if (!selectedBuilding) {
      map.flyTo(
        [37.9838, 23.7275],
        13,
        { animate: true, duration: 1.3 }
      );
    }
  }, [selectedBuilding, map]);

  return null;
}

function RiskHeatmap({ buildings }) {
  const map = useMap();

  useEffect(() => {
    if (!buildings?.length) return;

    const points = buildings.map(b => [
      b.latitude,
      b.longitude,
      Math.min(Math.max(Number(b.risk_score) / 100, 0), 1)
    ]);

    const heat = L.heatLayer(points, {
      radius: 60,
      blur: 45,
      maxZoom: 18,
      max: 1.0,
      minOpacity: 0.5,
      // Gradient stops aligned with getRiskCategory thresholds (score / 100):
      // ≤0.15 → very_low green | ≤0.35 → low lime | ≤0.65 → medium yellow
      // ≤0.80 → high orange    | >0.80 → very_high red
      gradient: {
        0.00: '#28a745',
        0.15: '#8bc34a',
        0.35: '#ffc107',
        0.65: '#ff7043',
        0.80: '#dc3545',
        1.00: '#dc3545',
      },
    });

    heat.addTo(map);

    // Ensure heatmap canvas sits above tile layer
    const canvas = heat._canvas;
    if (canvas) {
      canvas.style.opacity = "0.75";
      canvas.style.zIndex = "300";
    }

    return () => heat.remove();
  }, [buildings, map]);

  return null;
}

const RISK_COLORS = {
  very_low: '#28a745',
  low: '#8bc34a',
  medium: '#ffc107',
  high: '#ff7043',
  very_high: '#dc3545',
};

const VALID_CATEGORIES = new Set(['very_low', 'low', 'medium', 'high', 'very_high']);

// Derive category from risk_score when DB value is missing/invalid
function getRiskCategory(building) {
  if (VALID_CATEGORIES.has(building.risk_category)) return building.risk_category;
  const score = Number(building.risk_score);
  if (score > 80) return 'very_high';
  if (score > 65) return 'high';
  if (score > 35) return 'medium';
  if (score > 15) return 'low';
  return 'very_low';
}

export default function MapView({ buildings, onViewBuilding, selectedBuilding }) {
  const markerRefs = useRef({});

  return (
    <MapContainer
      center={[37.9838, 23.7275]}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        maxZoom={19}
      />

      {buildings && buildings.map((building) => {
        const isSelected = selectedBuilding?.building_id === building.building_id;
        const category = getRiskCategory(building);
        const riskColor = RISK_COLORS[category];

        return (
          <Marker
            key={building.building_id}
            ref={(el) => (markerRefs.current[building.building_id] = el)}
            position={[building.latitude, building.longitude]}
            icon={getMarkerIcon(category, isSelected)}
          >
            <Popup
              className="building-popup"
              closeButton={true}
              autoPan={true}
              offset={[0, -10]}
            >
              <div className="building-popup-content">
                <div className="popup-name">{building.building_name || building.address}</div>
                {building.building_name && (
                  <div className="popup-address">{building.address}</div>
                )}
                <div className="popup-risk-row">
                  <span className="popup-risk-label">Risk Score</span>
                  <span className="popup-risk-score" style={{ color: riskColor }}>
                    {Number(building.risk_score).toFixed(1)}
                  </span>
                </div>
                <span className="popup-risk-badge" style={{ background: riskColor }}>
                  {category.replace('_', ' ').toUpperCase()}
                </span>
                <div className="popup-actions">
                  <button
                    className="popup-btn popup-btn-primary"
                    onClick={() => onViewBuilding(building.building_id)}
                  >
                    3D View &amp; Details
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
      <RiskHeatmap buildings={buildings} />
      <SetViewOnBuilding selectedBuilding={selectedBuilding} />
    </MapContainer>
  );
}
