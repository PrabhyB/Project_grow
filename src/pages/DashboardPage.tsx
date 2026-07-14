import { useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";
import { logoutUser } from "../services/authService";
import "./DashboardPage.css";

export default function DashboardPage() {
  const navigate = useNavigate();

  const userName =
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split("@")[0] ||
    "Gardener";

  async function handleLogout() {
    await logoutUser();
    navigate("/login");
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <span className="brand-leaf">🌿</span>
          <span>GrowHub</span>
        </div>

        <div className="header-actions">
          <button
            className="notification-button"
            type="button"
            aria-label="Notifications"
          >
            🔔
            <span className="notification-count">2</span>
          </button>

          <button className="profile-button" type="button">
            <span className="profile-avatar">
              {userName.charAt(0).toUpperCase()}
            </span>
            <span>{userName}</span>
          </button>

          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="welcome-section">
          <div>
            <p className="eyebrow">Your garden today</p>

            <h1>Good morning, {userName} 🌱</h1>

            <p className="daily-summary">
              You have <strong>3 tasks</strong> waiting today.
            </p>

            <p className="garden-highlight">
              Your tomatoes are nearly ready to harvest. 🍅
            </p>
          </div>

          <button className="current-weather-card" type="button">
            <span className="current-weather-icon">🌤️</span>

            <span className="current-weather-details">
              <strong>18°C</strong>
              <span>Partly cloudy</span>
              <small>London, UK</small>
            </span>

            <span className="weather-range">
              <span>↑ 20°</span>
              <span>↓ 12°</span>
            </span>
          </button>
        </section>

        <section className="dashboard-placeholder">
          <div className="placeholder-icon">🌱</div>

          <div>
            <h2>Your GrowHub dashboard is taking shape</h2>
            <p>
              Next we’ll add plants needing attention, your weather outlook
              and the interactive property map.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
