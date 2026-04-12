import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
// context
import { AuthProvider } from "./context/AuthContext";
// Routes
import PrivateRoute from "./components/PrivateRoutes";
import AdminRoute from "./components/AdminRoutes";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Map from "./pages/Map";
import BuildingPage from "./pages/BuildingPage";
import About from "./pages/About";
import Unauthorized from "./pages/Unauthorized";
import Dashboard from "./pages/Dashboard";
import HighRiskPage from "./pages/HighRiskPage";
import Chat from "./pages/Chat";

function App() {
	return (
		<Router>
			<AuthProvider>

				<Routes>
					{/* Default */}
					<Route path="/" element={<Navigate to="/map" replace />} />

					{/* Public */}
					<Route path="/map" element={<Map />} />
					<Route path="/chat" element={<Chat />} />
					<Route path="/map/building/:id" element={<BuildingPage />} />
					<Route path="/login" element={<Login />} />
					<Route path="/signup" element={<Signup />} />
					<Route path="/about" element={<About />} />
					<Route path="/unauthorized" element={<Unauthorized />} />

					{/* Private */}
					<Route element={<PrivateRoute />}>
						<Route path="/profile" element={<Profile />} />
					</Route>

					{/* Admin */}
					<Route element={<AdminRoute />}>
						<Route path="/stats" element={<Dashboard />} />
						<Route path="/stats/high-risk" element={<HighRiskPage />} />
					</Route>

				</Routes>

			</AuthProvider>
		</Router>
	);
}

export default App;
