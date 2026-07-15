import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { getGardenById } from "../data/garden";
import "./GardenPage.css";
import { useEffect, useState } from "react";
import AddPlantForm from "../components/AddPlantForm";
import {
  subscribeToGardenPlants,
  type GardenPlant,
} from "../services/plantService";

export default function GardenPage() {
  const { gardenId } = useParams();
  const garden = gardenId ? getGardenById(gardenId) : undefined;
  const [plants, setPlants] = useState<GardenPlant[]>([]);
const [isAddingPlant, setIsAddingPlant] = useState(false);
const [isLoadingPlants, setIsLoadingPlants] = useState(true);
const [plantError, setPlantError] = useState("");
const navigate = useNavigate();

  if (!garden) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
  if (!gardenId) {
    return;
  }

  setIsLoadingPlants(true);
  setPlantError("");

  const unsubscribe = subscribeToGardenPlants(
    gardenId,
    (updatedPlants) => {
      setPlants(updatedPlants);
      setIsLoadingPlants(false);
    },
    (error) => {
      setPlantError(error.message);
      setIsLoadingPlants(false);
    },
  );

  return unsubscribe;
}, [gardenId]);

  return (
    <div className="garden-page">
      <header className="garden-page-header">
        <Link to="/dashboard" className="back-link">
          ← Dashboard
        </Link>

        <div>
          <p className="garden-page-eyebrow">Garden area</p>
          <h1>{garden.name}</h1>
          <p>{garden.description}</p>
        </div>

        <button type="button" className="garden-settings-button">
          ⚙️ Edit garden
        </button>
      </header>

      <main className="garden-page-content">
        <section className="garden-stat-grid">
          <article>
            <span>🌱</span>
            <strong>{garden.plantCount}</strong>
            <small>Plants</small>
          </article>

          <article>
            <span>⚠️</span>
            <strong>{garden.alertCount}</strong>
            <small>Alerts</small>
          </article>

          <article>
            <span>☀️</span>
            <strong>{garden.sunlightHours}h</strong>
            <small>Sunlight today</small>
          </article>

          <article>
            <span>💧</span>
            <strong>{garden.moistureStatus}</strong>
            <small>Moisture</small>
          </article>

          <article>
            <span>🌡️</span>
            <strong>{garden.temperature}°C</strong>
            <small>Temperature</small>
          </article>
        </section>

        <section className="garden-plants-section">
          <div className="garden-plants-heading">
            <div>
              <h2>Plants in this garden</h2>
              <p>Select a plant to view its full care record.</p>
            </div>

            <button
    type="button"
    onClick={() => setIsAddingPlant(true)}
>
    ＋ Add plant
</button>
          </div>

          <div className="garden-plant-grid">
            {isLoadingPlants ? (
  <p>Loading plants…</p>
) : plantError ? (
  <p className="plant-load-error">{plantError}</p>
) : plants.length === 0 ? (
  <div className="empty-garden-message">
    <span>🌱</span>
    <h3>No plants added yet</h3>
    <p>Add the first plant to this garden.</p>
  </div>
) : (
  <div className="garden-plant-grid">
    {plants.map((plant) => (
      <button
        className={`garden-plant-card ${
          plant.status === "Healthy"
            ? ""
            : "plant-needs-attention"
        }`}
        type="button"
        onClick={() => {
  navigate(`/garden/${garden.id}/plant/${plant.id}`);
}}
        key={plant.id}
      >
        <span className="plant-card-icon">{plant.icon}</span>

        <span className="plant-card-content">
          <strong>{plant.name}</strong>

          {plant.variety && <small>{plant.variety}</small>}

          <span>{plant.stage}</span>

          <span
            className={
              plant.status === "Healthy"
                ? ""
                : "plant-status-warning"
            }
          >
            {plant.status}
          </span>
        </span>

        <span className="plant-card-arrow">›</span>
      </button>
    ))}
  </div>
)}
          </div>
        </section>

        <section className="garden-care-summary">
          <div>
            <span>💧</span>
            <div>
              <strong>Next watering recommendation</strong>
              <p>
                Review tomorrow morning after the overnight weather update.
              </p>
            </div>
          </div>

          <button type="button">View care schedule</button>
        </section>
      </main>
      {isAddingPlant && (
  <AddPlantForm
    gardenId={garden.id}
    gardenName={garden.name}
    onClose={() => setIsAddingPlant(false)}
  />
)}
    </div>
  );
}