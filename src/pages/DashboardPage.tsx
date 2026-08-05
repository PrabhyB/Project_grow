import { useNavigate } from "react-router-dom";
import AttentionSection from "../components/AttentionSection";
//import type { AttentionItem } from "../components/AttentionSection";
import { auth } from "../lib/firebase";
import { logoutUser } from "../services/authService";
import "./DashboardPage.css";
import PropertyMap from "../components/property-map/PropertyMap";
import type { GardenZone } from "../components/property-map/PropertyMap";
import { useEffect, useState } from "react";
import GardenDetailsPanel from "../components/property-map/GardenDetailsPanel";
import { useWeather } from "../hooks/useWeather";
import WeatherSummaryCard from "../components/WeatherSummaryCard";
import WeatherForecastStrip from "../components/WeatherForecastStrip";
import {
  subscribeToGardenPlants,
  type GardenPlant,
} from "../services/plantService";
import {
  buildAttentionItems,
} from "../services/dashboardAttentionService";

type DashboardPlant = GardenPlant & {
  gardenId: string;
  gardenName: string;
};

const gardenZones: GardenZone[] = [
  {
    id: "front-garden",
    name: "Front Garden",
    plantCount: 8,
    x: 55,
    y: 150,
    width: 175,
    height: 145,
    type: "garden",
    alerts: 0,
  },
  {
    id: "back-garden",
    name: "Back Garden",
    plantCount: 24,
    x: 440,
    y: 255,
    width: 245,
    height: 210,
    type: "garden",
    alerts: 2,
  },
  {
    id: "vegetable-patch",
    name: "Vegetable Patch",
    plantCount: 16,
    x: 720,
    y: 170,
    width: 250,
    height: 275,
    type: "vegetable",
    alerts: 1,
  },
  {
    id: "herb-garden",
    name: "Herb Garden",
    plantCount: 9,
    x: 680,
    y: 450,
    width: 150,
    height: 125,
    type: "herb",
    alerts: 0,
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
  forecast,
  isLoading: isLoadingWeather,
  error: weatherError,
  reloadWeather,
} = useWeather();

  const [dashboardPlants, setDashboardPlants] = useState<
  DashboardPlant[]
>([]);

  const [selectedGarden, setSelectedGarden] =
  useState<GardenZone | null>(null);

  const userName =
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split("@")[0] ||
    "Gardener";

    const attentionItems = buildAttentionItems(
  dashboardPlants,
);
  async function handleLogout() {
    await logoutUser();
    navigate("/login");
  }

  useEffect(() => {
  const plantsByGarden: Record<string, GardenPlant[]> = {};

  const unsubscribes = gardenZones.map((garden) =>
    subscribeToGardenPlants(
      garden.id,
      (loadedPlants) => {
  console.log("Garden:", garden.name);
  console.log(loadedPlants);

  plantsByGarden[garden.id] = loadedPlants;

  const combinedPlants = gardenZones.flatMap(
    (gardenZone) =>
      (plantsByGarden[gardenZone.id] ?? []).map((plant) => ({
        ...plant,
        gardenId: gardenZone.id,
        gardenName: gardenZone.name,
      })),
  );

  console.log("Combined:", combinedPlants);

  setDashboardPlants(combinedPlants);
},
      (error) => {
        console.error(
          `Unable to load plants from ${garden.name}:`,
          error,
        );
      },
    ),
  );

  return () => {
    unsubscribes.forEach((unsubscribe) => {
      unsubscribe();
    });
  };
}, []);

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

          <WeatherSummaryCard
  forecast={forecast}
  isLoading={isLoadingWeather}
  error={weatherError}
  onRetry={reloadWeather}
/>
        </section>

        {forecast && (
  <WeatherForecastStrip days={forecast.daily} />
)}

<p>Plants loaded: {dashboardPlants.length}</p>

<pre
  style={{
    whiteSpace: "pre-wrap",
    fontSize: "12px",
    maxHeight: "300px",
    overflow: "auto",
    background: "#f5f5f5",
    padding: "10px",
  }}
>
  {JSON.stringify(dashboardPlants, null, 2)}
</pre>
        <AttentionSection
          items={attentionItems}
          onAction={(item) => {
            console.log("Selected attention item:", item);
          }}
          onViewAll={() => {
            console.log("View all attention items");
          }}
        />
        <PropertyMap
  zones={gardenZones}

  selectedZoneId={selectedGarden?.id}
  onSelectZone={(zone) => {
    setSelectedGarden(zone);
  }}
/>
      </main>
      {selectedGarden && (
  <GardenDetailsPanel
    zone={selectedGarden}
    onClose={() => setSelectedGarden(null)}
    onOpenGarden={(zone) => {
      navigate(`/garden/${zone.id}`);
    }}
  />
)}
    </div>
  );
}
