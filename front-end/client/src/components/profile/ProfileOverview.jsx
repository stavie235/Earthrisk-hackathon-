import { useState, useEffect, useContext } from "react";
import api from "../../axiosConfig";
import { AuthContext } from "../../context/AuthContext";
import "../../styles/profile/ProfileOverview.css"

const ProfileOverview = ({ profile}) => {

	const { logoutAction } = useContext(AuthContext);
	const [loading, setLoading] = useState(true);

	const [insuranceStats, setInsuranceStats] = useState({
		totalBuildings: 0,
		currentPremium: 0,
		totalPremiumsPaid: 0,
		averageRiskScore: 0
	});

	useEffect(() => {
		const fetchInsuranceData = async () => {
			try {
				const res = await api.get("/users/insurance-history");
				
				if (res.data && res.data.length > 0) {
					// Get unique buildings
					const uniqueBuildings = [...new Set(res.data.map(r => r.building_id))];
					const totalBuildings = uniqueBuildings.length;

					// Calculate totals
					const totalPaid = res.data.reduce((sum, item) => sum + (Number(item.premium_amount) || 0), 0);
					const averageRisk = res.data.length > 0 
						? res.data.reduce((sum, item) => sum + (Number(item.risk_score_then) || 0), 0) / res.data.length
						: 0;

					// Get most recent premium (current or latest)
					const sortedByYear = [...res.data].sort((a, b) => b.policy_year - a.policy_year);
					const currentPremium = sortedByYear[0] ? Number(sortedByYear[0].premium_amount) || 0 : 0;

					setInsuranceStats({
						totalBuildings,
						currentPremium,
						totalPremiumsPaid: totalPaid,
						averageRiskScore: averageRisk
					});
				}
			} catch (err) {
				console.error("Error fetching insurance data", err);
				if (err.response && err.response.status === 401) {
					logoutAction();
				}
			} finally {
				setLoading(false);
			}
		};

		fetchInsuranceData();
	}, []);

	if (loading) {
		return <div>Loading overview...</div>
	}

	return (
		<div className="overview">
			{/* Building Count Card*/}	
			<div className="kpi-card">
				<h3>Buildings Insured</h3>
				<p className="kpi-value">{insuranceStats.totalBuildings}</p>
				<p className="kpi-subtitle">properties</p>
			</div>

			{/* Current Premium */}	
			<div className="kpi-card">
				<h3>Current Premium</h3>
				<p className="kpi-value">${insuranceStats.currentPremium.toFixed(2)}</p>
				<p className="kpi-subtitle">latest policy</p>
			</div>

			{/* Total Paid */}	
			<div className="kpi-card">
				<h3>Total Premiums Paid</h3>
				<p className="kpi-value">${insuranceStats.totalPremiumsPaid.toFixed(2)}</p>
				<p className="kpi-subtitle">lifetime</p>
			</div>

			{/* Average Risk Score */}	
			<div className="kpi-card">
				<h3>Average Risk Score</h3>
				<p className="kpi-value">{insuranceStats.averageRiskScore.toFixed(2)}</p>
				<p className="kpi-subtitle">across properties</p>
			</div>
		</div>
	);
};

export default ProfileOverview;

