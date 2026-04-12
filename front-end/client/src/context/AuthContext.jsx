import { createContext, useState, useEffect } from "react";
import api from "../axiosConfig"


// 1. Create the Context (The empty box)
export const AuthContext = createContext();

// 2. Create the Provider (The component that holds the data)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(true);

  // Action: Login (Save data)
  const loginAction = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem("token", userToken); // Save to browser storage
  };

  // Action: Update user data
  const updateUser = async () => {
    try {
      const res = await api.get("/users/profile");
      setUser(res.data);
    } catch (err) {
      console.error("Failed to update user", err);
    }
  };

  // Action: Logout (Clear data)
  const logoutAction = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("token");
  };

  const syncUser = (userData) => {
    setUser(userData);
  }

  // restore user data on refresh
  useEffect(() => {
	  const verifyUser = async () => {
		  if(!token) {
			  setLoading(false);
			  return;
		  }

		  try {
			  const res = await api.get("/users/profile");
			  setUser(res.data);
		  } catch (err) {
			  console.error("Invalid or Expired Token");
			  logoutAction();
		  } finally {
			  setLoading(false);
		  }
	  };

	  verifyUser();
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, loading, loginAction, logoutAction, updateUser, syncUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
