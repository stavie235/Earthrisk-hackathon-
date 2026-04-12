import { useState, useEffect, useRef } from "react";
import api from "../../axiosConfig";
import "../../styles/profile/ProfileSettings.css";

const ProfileSettings = ({ profile, onProfileUpdate }) => {
    const [formData, setFormData] = useState({
        username: profile.username || "",
        email: profile.email || "",
        newPassword: "",
        confirmPassword: ""
    });

    const [status, setStatus] = useState({ type: "", message: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const feedbackRef = useRef(null);

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (profile) {
            setFormData({
                username: profile.username || "",
                email: profile.email || "",
                newPassword: "",
                confirmPassword: ""
            });
        }
    }, [profile]);

    useEffect(() => {
        if (status.message && feedbackRef.current) {
            feedbackRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [status.message]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: "", message: "" });

        const hasChanges =
            formData.username !== (profile.username || "") ||
            formData.email !== (profile.email || "") ||
            formData.newPassword !== "";

        if (!hasChanges) {
            setStatus({ type: "info", message: "No changes were made." });
            return;
        }

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            setStatus({ type: "error", message: "Passwords do not match" });
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                username: formData.username,
                email: formData.email
            };
            if (formData.newPassword) payload.password = formData.newPassword;

            await api.put("/users/profile", payload);
            setStatus({ type: "success", message: "Profile updated successfully!" });

            if (onProfileUpdate) await onProfileUpdate();

            setFormData(prev => ({ ...prev, newPassword: "", confirmPassword: "" }));
            setShowNewPassword(false);
            setShowConfirmPassword(false);
        } catch (err) {
            console.error("Error updating profile", err);
            const errorMsg = err.response?.data?.message || "Failed to update profile. Please try again.";
            setStatus({ type: "error", message: errorMsg });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="settings-container">
            <form onSubmit={handleSubmit}>
                <div className="settings-section">
                    <h3>Personal Information</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="settings-section">
                    <h3>Security</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="newPassword">New Password <small>(Leave blank to keep)</small></label>
                            <div className="password-wrapper">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    id="newPassword"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="toggle-password-btn"
                                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                                >
                                    {showNewPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm New Password</label>
                            <div className="password-wrapper">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required={!!formData.newPassword}
                                    disabled={!formData.newPassword}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="toggle-password-btn"
                                    disabled={!formData.newPassword}
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <button type="submit" className="btn-save" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                </button>

                {status.message && (
                    <div ref={feedbackRef} className={`feedback-msg ${status.type}`}>
                        {status.message}
                    </div>
                )}
            </form>
        </div>
    );
};

export default ProfileSettings;
