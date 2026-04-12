import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./MapboxPanel.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapboxPanel({ building }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!building || !containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [building.longitude, building.latitude],
      zoom: 17,
      pitch: 55,
      bearing: -20,
      antialias: true,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    mapRef.current.on("load", () => {
      mapRef.current.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 14,
        paint: {
          "fill-extrusion-color": "#aaa",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.7,
        },
      });

      new mapboxgl.Marker({ color: "#00c2ff" })
        .setLngLat([building.longitude, building.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(building.building_name || building.address))
        .addTo(mapRef.current);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [building]);

  return (
    <div className="mapbox-panel">
      <div className="mapbox-panel-header">
        <span className="mapbox-panel-label">3D Satellite View</span>
        <span className="mapbox-panel-name">{building?.building_name || building?.address}</span>
      </div>
      <div ref={containerRef} className="mapbox-panel-map" />
    </div>
  );
}
