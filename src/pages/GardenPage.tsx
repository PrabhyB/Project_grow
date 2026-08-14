import {
  Link,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useEffect, useState } from "react";

import {
  subscribeToGarden,
  type GardenArea,
} from "../services/gardenService";
import AddPlantForm from "../components/AddPlantForm";
import { useWeather } from "../hooks/useWeather";
import { assessPlantCare } from "../services/careEngine";
import { buildAttentionItems } from "../services/dashboardAttentionService";
import {
  subscribeToGardenPlants,
  type GardenPlant,
} from "../services/plantService";

import "./GardenPage.css";

function getDaysSinceWatering(
  lastWateredAt: unknown,
): number {
  if (!lastWateredAt) {
    return 7;
  }

  let wateredDate: Date | null = null;

  if (typeof lastWateredAt === "string") {
    wateredDate = new Date(
      `${lastWateredAt}T00:00:00`,
    );
  } else if (
    typeof lastWateredAt === "object" &&
    lastWateredAt !== null &&
    "toDate" in lastWateredAt &&
    typeof (lastWateredAt as { toDate?: unknown })
      .toDate === "function"
  ) {
    wateredDate = (
      lastWateredAt as { toDate: () => Date }
    ).toDate();
  }

  if (
    !wateredDate ||
    Number.isNaN(wateredDate.getTime())
  ) {
    return 7;
  }

  return Math.max(
    0,
    Math.floor(
      (Date.now() - wateredDate.getTime()) /
        86_400_000,
    ),
  );
}

export default function GardenPage() {
  const { gardenId } = useParams();
  const navigate = useNavigate();

  const { forecast } = useWeather();

 const [garden, setGarden] =
  useState<GardenArea | null>(null);

const [isLoadingGarden, setIsLoadingGarden] =
  useState(true);

const [gardenError, setGardenError] =
  useState("");

  const [plants, setPlants] = useState<GardenPlant[]>(
    [],
  );
  const [isAddingPlant, setIsAddingPlant] =
    useState(false);
  const [isLoadingPlants, setIsLoadingPlants] =
    useState(true);
  const [plantError, setPlantError] = useState("");

  useEffect(() => {
  if (!gardenId) {
    setIsLoadingGarden(false);
    return;
  }

  setIsLoadingGarden(true);
  setGardenError("");

  const unsubscribe = subscribeToGarden(
    gardenId,
    (updatedGarden) => {
      setGarden(updatedGarden);
      setIsLoadingGarden(false);
    },
    (error) => {
      setGardenError(error.message);
      setIsLoadingGarden(false);
    },
  );

  return unsubscribe;
}, [gardenId]);

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

  if (!gardenId) {
  return <Navigate to="/dashboard" replace />;
}

if (isLoadingGarden) {
  return (
    <div className="garden-page">
      <p>Loading garden…</p>
    </div>
  );
}

if (gardenError) {
  return (
    <div className="garden-page">
      <Link to="/dashboard">
        ← Dashboard
      </Link>

      <p>
        The garden could not be loaded:
        {" "}
        {gardenError}
      </p>
    </div>
  );
}

if (!garden) {
  return <Navigate to="/dashboard" replace />;
}

  const todayWeather = forecast?.daily[0];
  const tomorrowWeather = forecast?.daily[1];

  const sunlightHours =
    todayWeather?.sunshineDurationSeconds !== undefined
      ? todayWeather.sunshineDurationSeconds / 3600
      : undefined;

  const temperatureC =
    forecast?.current.temperatureC;

  const expectedRainMm = forecast
    ? (todayWeather?.precipitationMm ?? 0) +
      (tomorrowWeather?.precipitationMm ?? 0)
    : undefined;

  const attentionItems = buildAttentionItems(
    plants.map((plant) => ({
      ...plant,
      gardenId: garden.id,
      gardenName: garden.name,
    })),
    {
      sunlightHours,
      temperatureC,
      expectedRainMm,
    },
  );

  const alertCount = attentionItems.length;

  const careAssessments = plants.map((plant) =>
    assessPlantCare(plant, {
      sunlightHours,
      temperatureC,
      expectedRainMm,
      daysSinceWatering: getDaysSinceWatering(
        plant.lastWateredAt,
      ),
    }),
  );

  const plantCareSummaries = plants.map((plant, index) => {
  const assessment = careAssessments[index];

  const concerns = [
    {
      label: "Watering",
      icon: "💧",
      score: assessment.water.score,
      rating: assessment.water.rating,
      message: assessment.water.message,
    },
    {
      label: "Sunlight",
      icon: "☀️",
      score: assessment.sunlight.score,
      rating: assessment.sunlight.rating,
      message: assessment.sunlight.message,
    },
    {
      label: "Temperature",
      icon: "🌡️",
      score: assessment.temperature.score,
      rating: assessment.temperature.rating,
      message: assessment.temperature.message,
    },
    {
      label: "Plant health",
      icon: "🌱",
      score: assessment.growth.score,
      rating: assessment.growth.rating,
      message: assessment.growth.message,
    },
  ].sort((a, b) => a.score - b.score);

  const primaryConcern = concerns[0];

  return {
    plant,
    assessment,
    primaryConcern,
    needsAttention: primaryConcern.score < 75,
  };
});

  const waterConcernCount = careAssessments.filter(
    (assessment) => assessment.water.score < 75,
  ).length;

  const lowestWaterScore =
    careAssessments.length > 0
      ? Math.min(
          ...careAssessments.map(
            (assessment) => assessment.water.score,
          ),
        )
      : null;

  const wateringStatus =
    lowestWaterScore === null
      ? "No plants"
      : lowestWaterScore < 30
        ? "Urgent"
        : lowestWaterScore < 55
          ? "Due"
          : lowestWaterScore < 75
            ? "Monitor"
            : "Good";

  let gardenRecommendation =
    "No immediate watering action is needed. Continue normal care.";

  if (plants.length === 0) {
    gardenRecommendation =
      "Add plants to this garden to receive personalised care recommendations.";
  } else if (
    waterConcernCount > 0 &&
    expectedRainMm !== undefined &&
    expectedRainMm >= 3
  ) {
    gardenRecommendation =
      `${waterConcernCount} ${
        waterConcernCount === 1
          ? "plant may"
          : "plants may"
      } need water, but ` +
      `${expectedRainMm.toFixed(
        1,
      )} mm of rain is expected through tomorrow. ` +
      "Check the soil before watering.";
  } else if (waterConcernCount > 0) {
    gardenRecommendation =
      `${waterConcernCount} ${
        waterConcernCount === 1
          ? "plant may"
          : "plants may"
      } need watering today. ` +
      "Check the soil before watering.";
  } else if (
    temperatureC !== undefined &&
    temperatureC > 30
  ) {
    gardenRecommendation =
      `No plants are currently overdue for watering, but ` +
      `${Math.round(
        temperatureC,
      )}°C conditions may increase water stress.`;
  }

  return (
    <div className="garden-page">
      <header className="garden-page-header">
        <Link to="/dashboard" className="back-link">
          ← Dashboard
        </Link>

        <div>
          <p className="garden-page-eyebrow">
            Garden area
          </p>
          <h1>{garden.name}</h1>
          <p>{garden.description}</p>
        </div>

        <button
          type="button"
          className="garden-settings-button"
        >
          ⚙️ Edit garden
        </button>
      </header>

      <main className="garden-page-content">
        <section className="garden-stat-grid">
          <article>
            <span>🌱</span>
            <strong>
              {isLoadingPlants ? "…" : plants.length}
            </strong>
            <small>Plants</small>
          </article>

          <article>
            <span>⚠️</span>
            <strong>
              {isLoadingPlants ? "…" : alertCount}
            </strong>
            <small>Alerts</small>
          </article>

          <article>
            <span>☀️</span>
            <strong>
              {sunlightHours !== undefined
                ? `${sunlightHours.toFixed(1)}h`
                : "—"}
            </strong>
            <small>Sunlight today</small>
          </article>

          <article>
            <span>💧</span>
            <strong>
              {isLoadingPlants
                ? "…"
                : wateringStatus}
            </strong>
            <small>Watering status</small>
          </article>

          <article>
            <span>🌡️</span>
            <strong>
              {temperatureC !== undefined
                ? `${Math.round(temperatureC)}°C`
                : "—"}
            </strong>
            <small>Temperature</small>
          </article>
        </section>

        <section className="garden-plants-section">
          <div className="garden-plants-heading">
            <div>
              <h2>Plants in this garden</h2>
              <p>
                Select a plant to view its full care
                record.
              </p>
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
              <p className="plant-load-error">
                {plantError}
              </p>
            ) : plants.length === 0 ? (
              <div className="empty-garden-message">
                <span>🌱</span>
                <h3>No plants added yet</h3>
                <p>
                  Add the first plant to this garden.
                </p>
              </div>
            ) : (
              <div className="garden-plant-grid">
                {plantCareSummaries.map(
  ({
    plant,
    assessment,
    primaryConcern,
    needsAttention,
  }) => (
    <button
      className={`garden-plant-card ${
        needsAttention
          ? "plant-needs-attention"
          : "plant-healthy"
      }`}
      type="button"
      onClick={() => {
        navigate(
          `/garden/${garden.id}/plant/${plant.id}`,
        );
      }}
      key={plant.id}
    >
      <span className="plant-card-icon">
        {plant.icon}
      </span>

      <span className="plant-card-content">
        <strong>{plant.name}</strong>

        {plant.variety && (
          <small>{plant.variety}</small>
        )}

        <span>{plant.stage}</span>

        {needsAttention ? (
          <>
            <span className="plant-status-warning">
  {primaryConcern.icon}{" "}
  {primaryConcern.label} ·{" "}
  {primaryConcern.rating}
</span>

            <small className="plant-care-message">
              {primaryConcern.message}
            </small>
          </>
        ) : (
          <span className="plant-status-good">
            ✓ {assessment.overallRating}
          </span>
        )}
      </span>

      <span className="plant-card-arrow">
        ›
      </span>
    </button>
  ),
)}
              </div>
            )}
          </div>
        </section>

        <section className="garden-care-summary">
          <div>
            <span>
              {waterConcernCount > 0
                ? "💧"
                : temperatureC !== undefined &&
                    temperatureC > 30
                  ? "🌡️"
                  : "✅"}
            </span>

            <div>
              <strong>
                Garden care recommendation
              </strong>
              <p>{gardenRecommendation}</p>
            </div>
          </div>

          {attentionItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const priorityPlant =
                  attentionItems[0];

                navigate(
                  `/garden/${priorityPlant.gardenId}/plant/${priorityPlant.plantId}`,
                );
              }}
            >
              View priority plant
            </button>
          )}
        </section>
      </main>

      {isAddingPlant && (
        <AddPlantForm
          gardenId={garden.id}
          gardenName={garden.name}
          onClose={() =>
            setIsAddingPlant(false)
          }
        />
      )}
    </div>
  );
}