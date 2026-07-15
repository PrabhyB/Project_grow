import type { GardenZone } from "./PropertyMap";
import "./GardenDetailsPanel.css";

type GardenDetailsPanelProps = {
  zone: GardenZone;
  onClose: () => void;
};

const samplePlants: Record<
  string,
  Array<{
    name: string;
    icon: string;
    status: string;
    needsAttention?: boolean;
  }>
> = {
  "front-garden": [
    {
      name: "Magnolia",
      icon: "🌸",
      status: "Healthy",
    },
    {
      name: "Lavender",
      icon: "🪻",
      status: "Healthy",
    },
  ],

  "back-garden": [
    {
      name: "Tomato",
      icon: "🍅",
      status: "Needs water",
      needsAttention: true,
    },
    {
      name: "Strawberry",
      icon: "🍓",
      status: "Healthy",
    },
    {
      name: "Mint",
      icon: "🌿",
      status: "Healthy",
    },
  ],

  "vegetable-patch": [
    {
      name: "Cucumber",
      icon: "🥒",
      status: "Check leaves",
      needsAttention: true,
    },
    {
      name: "Lettuce",
      icon: "🥬",
      status: "Ready soon",
    },
    {
      name: "Carrot",
      icon: "🥕",
      status: "Healthy",
    },
  ],

  "herb-garden": [
    {
      name: "Basil",
      icon: "🌱",
      status: "Cold warning",
      needsAttention: true,
    },
    {
      name: "Chives",
      icon: "🌿",
      status: "Healthy",
    },
  ],
};

export default function GardenDetailsPanel({
  zone,
  onClose,
}: GardenDetailsPanelProps) {
  const plants = samplePlants[zone.id] ?? [];

  return (
    <aside className="garden-details-panel" aria-label={`${zone.name} details`}>
      <div className="garden-details-header">
        <div>
          <p className="garden-details-eyebrow">Garden area</p>
          <h2>{zone.name}</h2>
          <p>{zone.plantCount} plants recorded</p>
        </div>

        <button
          className="garden-details-close"
          type="button"
          onClick={onClose}
          aria-label="Close garden details"
        >
          ×
        </button>
      </div>

      <div className="garden-health-summary">
        <div>
          <span>🌱</span>
          <strong>{zone.plantCount}</strong>
          <small>Plants</small>
        </div>

        <div>
          <span>⚠️</span>
          <strong>{zone.alerts ?? 0}</strong>
          <small>Alerts</small>
        </div>

        <div>
          <span>☀️</span>
          <strong>6h</strong>
          <small>Est. sunlight</small>
        </div>
      </div>

      <div className="garden-details-title-row">
        <h3>Plants in this garden</h3>

        <button type="button">Add plant</button>
      </div>

      {plants.length > 0 ? (
        <div className="garden-plant-list">
          {plants.map((plant) => (
            <button className="garden-plant-row" type="button" key={plant.name}>
              <span className="garden-plant-icon">{plant.icon}</span>

              <span>
                <strong>{plant.name}</strong>
                <small
                  className={plant.needsAttention ? "plant-warning" : ""}
                >
                  {plant.status}
                </small>
              </span>

              <span className="garden-row-arrow">›</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-garden-message">
          <span>🌱</span>
          <p>No plants have been added to this garden yet.</p>
        </div>
      )}

      <button className="open-garden-button" type="button">
        Open full garden
      </button>
    </aside>
  );
}