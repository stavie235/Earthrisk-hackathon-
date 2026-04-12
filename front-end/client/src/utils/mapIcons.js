import L from 'leaflet';

export const getMarkerIcon = (riskCategory, isSelected = false) => {
  let color;

  switch (riskCategory) {
    case 'very_low':  color = '#28a745'; break;
    case 'low':       color = '#8bc34a'; break;
    case 'medium':    color = '#ffc107'; break;
    case 'high':      color = '#ff7043'; break;
    case 'very_high': color = '#dc3545'; break;
    default:          color = '#007bff';
  }

  // Determine border style based on selection
  const borderStyle = isSelected ? "3px solid black" : "2px solid white";
  const scale = isSelected ? "scale(1.3)" : "scale(1)";

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: ${borderStyle};
      transform: ${scale};
      transition: transform 0.2s ease-in-out;
      box-shadow: 0 0 5px rgba(0,0,0,0.4);
      margin: 3px;
    "></div>`,
    iconSize: [24, 24], // Increased container size to accommodate the scale/border
    iconAnchor: [12, 12] 
  });
};