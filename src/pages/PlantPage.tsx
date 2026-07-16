import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import RecordWateringForm from "../components/RecordWateringForm";

import {
  getGardenPlant,
  subscribeToWateringHistory,
  type GardenPlant,
  type WateringRecord,
} from "../services/plantService";

import "./PlantPage.css";

export default function PlantPage() {
  const { gardenId, plantId } = useParams();

  const [plant, setPlant] = useState<GardenPlant | null>(null);
  const [wateringHistory, setWateringHistory] = useState<WateringRecord[]>([]);
  const [isRecordingWatering, setIsRecordingWatering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!gardenId || !plantId) {
      setIsLoading(false);
      return;
    }

    async function loadPlant() {
      try {
        const result = await getGardenPlant(gardenId!, plantId!);
        setPlant(result);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "The plant could not be loaded.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPlant();
  }, [gardenId, plantId]);

  useEffect(() => {
    if (!gardenId || !plantId) {
      return;
    }

    const unsubscribe = subscribeToWateringHistory(
      gardenId,
      plantId,
      setWateringHistory,
      (wateringError) => {
        console.error("Watering history error:", wateringError);
      },
    );

    return unsubscribe;
  }, [gardenId, plantId]);

  if (!gardenId || !plantId) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return <main className="plant-state-page">Loading plant…</main>;
  }

  if (error) {
    return <main className="plant-state-page">{error}</main>;
  }

  if (!plant) {
    return <Navigate to={`/garden/${gardenId}`} replace />;
  }

  return (
    <div className="plant-page">
      <header className="plant-page-header">
        <Link to={`/garden/${gardenId}`}>← Back to garden</Link>
        <button type="button">Edit plant</button>
      </header>

      <main className="plant-page-content">
        <section className="plant-hero">
          <span className="plant-hero-icon">{plant.icon}</span>

          <div>
            <p className="plant-eyebrow">Plant record</p>
            <h1>{plant.name}</h1>
            {plant.variety && <p>{plant.variety}</p>}
          </div>
        </section>

        <section className="plant-stat-grid">
          <article>
            <span>🌱</span>
            <strong>{plant.stage || "Not recorded"}</strong>
            <small>Growth stage</small>
          </article>

          <article>
            <span>💚</span>
            <strong>{plant.status || "Not recorded"}</strong>
            <small>Current status</small>
          </article>

          <article>
            <span>📅</span>
            <strong>{plant.plantedDate || "Not recorded"}</strong>
            <small>Date planted</small>
          </article>

          <article>
            <span>💧</span>
            <strong>
              {plant.lastWateredAt
                ? String(plant.lastWateredAt)
                : "Not recorded"}
            </strong>
            <small>Last watered</small>
          </article>
        </section>

        <section className="plant-care-card">
          <div>
            <h2>Care recommendation</h2>
            <p>
              Weather-aware watering advice will appear here once we connect
              the forecast and plant-care database.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsRecordingWatering(true)}
          >
            Record watering
          </button>
        </section>

        <section className="watering-history-card">
          <div className="watering-history-heading">
            <div>
              <h2>Watering history</h2>
              <p>Recent watering activity for this plant.</p>
            </div>

            <span>{wateringHistory.length} records</span>
          </div>

          {wateringHistory.length === 0 ? (
            <p className="watering-empty">
              No watering has been recorded yet.
            </p>
          ) : (
            <div className="watering-history-list">
              {wateringHistory.map((record) => (
                <article key={record.id}>
                  <span className="watering-drop">💧</span>

                  <div>
                    <strong>{record.wateredAt}</strong>
                    <span>{record.amount}</span>
                    {record.note && <small>{record.note}</small>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="plant-notes-card">
          <div>
            <h2>Notes and progress</h2>
            <button type="button">＋ Add note</button>
          </div>

          <p>No notes have been recorded for this plant yet.</p>
        </section>
      </main>

      {isRecordingWatering && (
        <RecordWateringForm
          gardenId={gardenId}
          plantId={plantId}
          plantName={plant.name}
          onClose={() => setIsRecordingWatering(false)}
        />
      )}
    </div>
  );
}