import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { Link, Navigate, useParams } from "react-router-dom";


import RecordWateringForm from "../components/RecordWateringForm";

import {
  addPlantObservation,
  getGardenPlant,
  subscribeToPlantObservations,
  subscribeToWateringHistory,
  type GardenPlant,
  type NewPlantObservation,
  type PlantObservation,
  type PlantObservationCategory,
  type WateringRecord,
} from "../services/plantService";

import "./PlantPage.css";

import PlantHealthCard from "../components/PlantHealthCard";
import { assessPlantCare } from "../services/careEngine";
import { useWeather } from "../hooks/useWeather";

function getTodayDate() {
  const now = new Date();

  const localDate = new Date(
    now.getTime() -
      now.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().split("T")[0];
}

function getObservationIcon(
  category: PlantObservationCategory,
) {
  switch (category) {
    case "Growth":
      return "🌱";
    case "Pest":
      return "🐛";
    case "Disease":
      return "🦠";
    case "Feeding":
      return "🧪";
    case "Pruning":
      return "✂️";
    case "Harvest":
      return "🧺";
    default:
      return "📝";
  }
}

export default function PlantPage() {
  const { gardenId, plantId } = useParams();
  const { forecast } = useWeather();
  const [plant, setPlant] = useState<GardenPlant | null>(null);
  const [wateringHistory, setWateringHistory] = useState<WateringRecord[]>([]);
  const [observations, setObservations] =
  useState<PlantObservation[]>([]);

const [isAddingObservation, setIsAddingObservation] =
  useState(false);

const [isSavingObservation, setIsSavingObservation] =
  useState(false);

const [observationError, setObservationError] =
  useState("");

const [newObservation, setNewObservation] =
  useState<NewPlantObservation>({
    observedAt: getTodayDate(),
    category: "General",
    note: "",
  });
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

  useEffect(() => {
  if (!gardenId || !plantId) {
    return;
  }

  const unsubscribe =
    subscribeToPlantObservations(
      gardenId,
      plantId,
      setObservations,
      (observationError) => {
        console.error(
          "Plant observation error:",
          observationError,
        );
      },
    );

  return unsubscribe;
}, [gardenId, plantId]);

async function handleObservationSubmit(
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  if (!gardenId || !plantId) {
    return;
  }

  setIsSavingObservation(true);
  setObservationError("");

  try {
    await addPlantObservation(
      gardenId,
      plantId,
      newObservation,
    );

    setNewObservation({
      observedAt: getTodayDate(),
      category: "General",
      note: "",
    });

    setIsAddingObservation(false);
  } catch (caughtError) {
    setObservationError(
      caughtError instanceof Error
        ? caughtError.message
        : "The observation could not be saved.",
    );
  } finally {
    setIsSavingObservation(false);
  }
}

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

  const todayWeather = forecast?.daily[0];
const tomorrowWeather = forecast?.daily[1];

const expectedRainMm =
  (todayWeather?.precipitationMm ?? 0) +
  (tomorrowWeather?.precipitationMm ?? 0);

const careAssessment = assessPlantCare(plant, {
  sunlightHours:
    todayWeather?.sunshineDurationSeconds !== undefined
      ? todayWeather.sunshineDurationSeconds / 3600
      : 6,

  temperatureC:
    forecast?.current.temperatureC ?? 20,

  expectedRainMm,

  daysSinceWatering:
    wateringHistory.length > 0
      ? Math.max(
          0,
          Math.floor(
            (Date.now() -
              new Date(
                wateringHistory[0].wateredAt,
              ).getTime()) /
              86_400_000,
          ),
        )
      : 7,
});

const primaryConcern = [
  {
    label: "Watering",
    icon: "💧",
    score: careAssessment.water.score,
    message: careAssessment.water.message,
  },
  {
    label: "Sunlight",
    icon: "☀️",
    score: careAssessment.sunlight.score,
    message: careAssessment.sunlight.message,
  },
  {
    label: "Temperature",
    icon: "🌡️",
    score: careAssessment.temperature.score,
    message: careAssessment.temperature.message,
  },
  {
    label: "Plant health",
    icon: "🌱",
    score: careAssessment.growth.score,
    message: careAssessment.growth.message,
  },
].sort((a, b) => a.score - b.score)[0];

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
            {plant.scientificName && (
                <p className="plant-scientific-name">
                    <em>{plant.scientificName}</em>
                      </p>
                      
            )}
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

        <PlantHealthCard assessment={careAssessment} />

        <section className="plant-care-card">
  <div>
    <h2>
      {primaryConcern.icon} {primaryConcern.label} recommendation
    </h2>

    <p>
      <strong>{careAssessment.nextAction}</strong>
    </p>

    <p>{primaryConcern.message}</p>
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
    <div>
      <h2>Notes and observations</h2>
      <small>
        {observations.length}{" "}
        {observations.length === 1
          ? "entry"
          : "entries"}
      </small>
    </div>

    <button
      type="button"
      onClick={() =>
        setIsAddingObservation(
          (current) => !current,
        )
      }
    >
      {isAddingObservation
        ? "Cancel"
        : "＋ Add observation"}
    </button>
  </div>

  {isAddingObservation && (
    <form
      className="observation-form"
      onSubmit={handleObservationSubmit}
    >
      <div className="observation-form-row">
        <label>
          Date
          <input
            required
            type="date"
            value={newObservation.observedAt}
            onChange={(event) =>
              setNewObservation((current) => ({
                ...current,
                observedAt: event.target.value,
              }))
            }
          />
        </label>

        <label>
          Observation type
          <select
            value={newObservation.category}
            onChange={(event) =>
              setNewObservation((current) => ({
                ...current,
                category:
                  event.target
                    .value as PlantObservationCategory,
              }))
            }
          >
            <option value="General">
              General note
            </option>
            <option value="Growth">Growth</option>
            <option value="Pest">Pest</option>
            <option value="Disease">
              Disease
            </option>
            <option value="Feeding">
              Feeding
            </option>
            <option value="Pruning">
              Pruning
            </option>
            <option value="Harvest">
              Harvest
            </option>
          </select>
        </label>
      </div>

      <label>
        What did you notice?
        <textarea
          required
          rows={4}
          value={newObservation.note}
          placeholder="For example: First flowers appeared today."
          onChange={(event) =>
            setNewObservation((current) => ({
              ...current,
              note: event.target.value,
            }))
          }
        />
      </label>

      {observationError && (
        <p className="observation-error">
          {observationError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSavingObservation}
      >
        {isSavingObservation
          ? "Saving…"
          : "Save observation"}
      </button>
    </form>
  )}

  {observations.length === 0 ? (
    <p>
      No notes or observations have been recorded
      for this plant yet.
    </p>
  ) : (
    <ul className="observation-list">
      {observations.map((observation) => (
        <li
          className="observation-item"
          key={observation.id}
        >
          <span className="observation-icon">
            {getObservationIcon(
              observation.category,
            )}
          </span>

          <div>
            <div className="observation-heading">
              <strong>
                {observation.category}
              </strong>
              <span>
                {observation.observedAt}
              </span>
            </div>

            <p>{observation.note}</p>
          </div>
        </li>
      ))}
    </ul>
  )}
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