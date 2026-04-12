import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const PrivateRoute = () => {
  const { token } = useContext(AuthContext);
  const location = useLocation();

  // If there is NO token, kick them back to Login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If there IS a token, let them see the child components (Outlet)
  return <Outlet />;
};

export default PrivateRoute;
