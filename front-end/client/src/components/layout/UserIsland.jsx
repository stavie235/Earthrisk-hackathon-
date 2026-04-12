// components/layout/UserIsland.jsx
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { Link } from "react-router-dom";

export default function UserIsland() {
  const { user } = useContext(AuthContext);
  return (
 <div className="user-island">
      {!user ? (
        <div className="auth-buttons">
          <Link to="/about" className="user-btn">About</Link>
          <Link to="/login" className="user-btn">Login</Link>
          <Link to="/signup" className="user-btn">Sign Up</Link>
        </div>
      ) : (
        <div className="auth-buttons">
          <Link to="/about" className="user-btn">About</Link>
          {user.role === 'admin' ? (
            <>
              {/* Profile looks like the 'Login' button (White) */}
              <Link to="/profile" className="user-btn">
                Profile
              </Link>
              {/* Analytics looks like the 'Sign Up' button (Yellow) */}
              <Link to="/stats" className="user-btn">
                Business Analytics
              </Link>
            </>
          ) : (
            /* Regular user just sees one button */
            <Link to="/profile" className="user-btn">
              Profile
            </Link>
          )} 
        </div>
      )}
    </div>
  );
}