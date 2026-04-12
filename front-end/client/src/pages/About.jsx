import { Link } from "react-router-dom";
import "../styles/About.css";

export default function About() {
  return (
    <div className="about-container">

      <Link to="/map" className="back-btn">
        <span>Back to Map</span>
      </Link>

      <div className="about-card">
        <h1 className="about-title">About EarthRisk</h1>
        <p className="about-intro">
          This is a comprehensive software engineering project developed for the Techbiz Hackathon 2026.
        </p>

        <div className="about-content-section">
          <h2>Overview</h2>
          <p>
            The project showcases modern full-stack web development practices, combining frontend and backend technologies to create a functional, scalable risk prediction and management platform. The application allows users to explore building risk data, view interactive maps, and access detailed analytics through an admin dashboard. It also features user authentication and profile management, demonstrating a complete end-to-end solution.
          </p>
        </div>

        <div className="about-content-section">
          <h2>Key Features</h2>
          <ul className="features-list">
            <li>Machine Learning Models for Risk Prediction based on Climate Change Data</li>
            <li>Interactive Building Map</li>
            <li>Admin Dashboard</li>
            <li>User Profile Management</li>
          </ul>
        </div>

      </div>
      </div>
  );
}
