import { useState, useContext } from "react";
import api from "../axiosConfig";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "../styles/Login.css";

const Login = () => {
  const [input, setInput] = useState({ identifier: "", password: "" });
  const { loginAction } = useContext(AuthContext);

  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // if we come from a page go there, else go to map
  const from = "/map";
	
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", input);
      const { token, user } = res.data;
      
      loginAction(user, token);
      navigate(from, {replace: true});
      
    } catch (err) {
      alert(err.response.data.message || "Error logging in");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInput((prev) => ({ ...prev, [name]: value }));
  };

  const handleBackClick = () => {
    navigate('/map');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
  <div className="login-container">
      
      {/* Back Button */}
      <button className="back-btn" onClick={handleBackClick}>
        <span>Back to Map</span>
      </button>

      <div className="glass-card">
        <h2>Log In</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email or Username</label>
            <input
              type="text"
              placeholder="name@company.com"
              value={input.identifier}
              name="identifier"
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            
            {/* 3. Wrap input and button in relative container */}
            <div className="password-wrapper">
              <input
                // 4. Dynamic type based on state
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={input.password}
                name="password"
                onChange={handleChange}
                required
              />

              {/* 5. The Toggle Button */}
              <button 
                type="button" // Important: prevents form submission
                onClick={togglePasswordVisibility}
                className="toggle-password-btn"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  /* Icon: Eye Off (Strikethrough) */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  /* Icon: Eye (Open) */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>

        <div className="form-footer">
          <p>
            Don't have an account? 
            {/* Switched to span/button for cleaner structure */}
            <span className="signup-link" onClick={() => navigate('/signup')}>
              Sign up
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
