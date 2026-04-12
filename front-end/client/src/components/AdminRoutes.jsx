import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const AdminRoute = () => {
  const { user, token, loading } = useContext(AuthContext);
  const location = useLocation();

  // If there is NO token, kick them back to Login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // wait to retrieve user info
  if(loading) {
	  return <div>Loading... </div>;
  }
  
  // allow in only admins
  if(user?.role === 'admin') {
	  return <Outlet />;
  }

  // else send them to unauthorized
  else {
  	  return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }


};

export default AdminRoute;
