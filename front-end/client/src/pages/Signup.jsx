import { useState, useContext } from "react";
import api from "../axiosConfig";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
// 1. Reuse the same CSS file to match the design instantly
import "../styles/Login.css"; 

const Signup = () => {
  // Inputs state
  const [input, setInput] = useState({ username: "", email: "", password: "" });
  
  // State for password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Bring in the Global tools
  const { loginAction } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Send data to backend
      const res = await api.post("/auth/signup", input);

      // 2. Get the token and user from the response
      const { token, user } = res.data;
      
      // 3. Save them in the Global Brain
      loginAction(user, token);
      
      // 4. Redirect to Onboarding
      navigate("/map");

    } catch (err) {
      alert(err.response?.data?.message || "Error registering");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInput((prev) => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      
      {/* Back Button (Navigates to Login) */}
      <button className="back-btn" onClick={() => navigate('/map')}>
        <span>Back to Map</span>
      </button>

      <div className="glass-card">
        <h2>Create Account</h2>
        
        <form onSubmit={handleSubmit}>
          
          {/* Username Field */}
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input 
              type="text" 
              name="username" 
              id="username"
              value={input.username}
              onChange={handleChange} 
              required 
              placeholder="John Doe"
            />
          </div>

          {/* Email Field */}
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              name="email" 
              id="email"
              value={input.email}
              onChange={handleChange} 
              required 
              placeholder="name@company.com"
            />
          </div>

          {/* Password Field with Eye Icon */}
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                id="password"
                value={input.password}
                onChange={handleChange} 
                required 
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={togglePasswordVisibility}
                className="toggle-password-btn"
              >
                {showPassword ? (
                  /* Eye Off Icon */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  /* Eye On Icon */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="login-btn">
            Sign Up
          </button>
        </form>

        {/* Footer Link */}
        <div className="form-footer">
          <p>
            Already have an account? 
            <span className="signup-link" onClick={() => navigate('/login')}>
              Login
            </span>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Signup;
