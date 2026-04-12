
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";

import api from "../axiosConfig"; 
import { AuthContext } from "../context/AuthContext";
import ProfileOverview from "../components/profile/ProfileOverview";
import ProfileSettings from "../components/profile/ProfileSettings";
import InsuranceAndClimateTimeline from "../components/profile/InsuranceAndClimateTimeline";
import EcologicalUpgrades from "../components/profile/EcologicalUpgrades";
import "../styles/profile/Profile.css";


const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const { logoutAction, syncUser } = useContext(AuthContext);

  const handleLogout = () => {
    logoutAction();
    navigate("/map");   
  };

  const fetchProfile = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get("/users/profile");
      setProfile(res.data);
      syncUser(res.data); // Keep context in sync
    } catch (err) {
      console.error("Error fetching profile", err);
      if (err.response && err.response.status === 401) {
          logoutAction();
          navigate("/login");
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile(true);
  }, []);


  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }

  if (!profile) {
    return <div className="error-screen">Could not load profile data. Please try logging in again.</div>;
  }

  return (
    <div className="profile-container">
	
	{/*header - global to the page */}
	<header className="profile-header">
	  <div className="header-left">
	    <h1>Hello, {profile.username}</h1>
	    <p className="subtitle">Profile</p>
	  </div>
	  <div className="header-right">
	    {profile.role === 'admin' && (
		<button className="btn-map" onClick={() => navigate("/stats")}>Business Analytics</button>
	    )}
	    <button className="btn-map" onClick={() => navigate("/map")}>Map</button>
	    <button className="btn-logout" onClick={handleLogout}>Logout</button>
	  </div>
	</header>


	{/* Tab Buttons*/}
	<div className="tab-wrapper">
	  <button 
	  	className={`btn-tab ${activeTab === "Overview" ? "active" : "" }`}
	  	onClick={() => setActiveTab("Overview")}>Overview</button>
	  <button
	  	className={`btn-tab ${activeTab === "Insurance" ? "active" : "" }`}
	  	onClick={() => setActiveTab("Insurance")}>Insurance & Climate</button>
	  <button
	  	className={`btn-tab ${activeTab === "Upgrades" ? "active" : "" }`}
	  	onClick={() => setActiveTab("Upgrades")}>Ecological Upgrades</button>
	  <button
	  	className={`btn-tab ${activeTab === "Settings" ? "active" : "" }`}
	  	onClick={() => setActiveTab("Settings")}>Settings</button>
	</div>

	{/* Actual Content */}
	<div className="tab-content">
	  {activeTab === "Overview" && <ProfileOverview profile={profile} />}
	  {activeTab === "Insurance" && <InsuranceAndClimateTimeline />}
	  {activeTab === "Upgrades" && <EcologicalUpgrades profile={profile} />}
	  {activeTab === "Settings" && <ProfileSettings profile={profile} onProfileUpdate={() => fetchProfile(false)} />}
	</div>

     </div>
  );
};

export default Profile;
