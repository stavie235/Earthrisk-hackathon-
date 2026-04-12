import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../axiosConfig";
import BuildingDetails from "../components/map/BuildingDetails";
import MapboxPanel from "../components/map/MapboxPanel";

export default function BuildingView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [building, setBuilding] = useState(null);

  useEffect(() => {
    api.get(`/buildings/${id}`)
      .then(res => setBuilding(res.data))
      .catch(() => navigate("/map", { replace: true }));
  }, [id, navigate]);

  if (!building) return null;

  return (
    <>
      <BuildingDetails
        building={building}
        onClose={() => navigate("/map")}
      />
      <MapboxPanel building={building} />
    </>
  );
}
