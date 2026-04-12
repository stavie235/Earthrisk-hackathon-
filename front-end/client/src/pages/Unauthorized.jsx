import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>403 - Unauthorized</h1>
      <p>You do not have permission to view this page.</p>
      <button onClick={() => navigate(-1)}>Go Back</button>
    </div>
  );
};

export default Unauthorized;
