import { useState } from "react";
import type { FormEvent } from "react";

import {
  addPlantToGarden,
  type NewGardenPlant,
} from "../services/plantService";

import "./AddPlantForm.css";

type AddPlantFormProps = {
  gardenId: string;
  gardenName: string;
  onClose: () => void;
};

const initialPlant: NewGardenPlant = {
  name: "",
  variety: "",
  stage: "Growing",
  status: "Healthy",
  icon: "🌱",
  plantedDate: "",
};

export default function AddPlantForm({
  gardenId,
  gardenName,
  onClose,
}: AddPlantFormProps) {
  const [plant, setPlant] = useState<NewGardenPlant>(initialPlant);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updatePlant<Key extends keyof NewGardenPlant>(
    key: Key,
    value: NewGardenPlant[Key],
  ) {
    setPlant((currentPlant) => ({
      ...currentPlant,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      await addPlantToGarden(gardenId, plant);
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The plant could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="add-plant-backdrop" role="presentation">
      <section
        className="add-plant-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-plant-title"
      >
        <div className="add-plant-header">
          <div>
            <p>Add to {gardenName}</p>
            <h2 id="add-plant-title">Add a plant</h2>
          </div>

          <button
            type="button"
            className="add-plant-close"
            onClick={onClose}
            aria-label="Close add plant form"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-plant-form">
          <label>
            Plant name
            <input
              required
              value={plant.name}
              placeholder="For example, Tomato"
              onChange={(event) =>
                updatePlant("name", event.target.value)
              }
            />
          </label>

          <label>
            Variety
            <input
              value={plant.variety}
              placeholder="For example, Moneymaker"
              onChange={(event) =>
                updatePlant("variety", event.target.value)
              }
            />
          </label>

          <label>
            Icon
            <select
              value={plant.icon}
              onChange={(event) =>
                updatePlant("icon", event.target.value)
              }
            >
              <option value="🌱">🌱 General plant</option>
              <option value="🍅">🍅 Tomato</option>
              <option value="🥒">🥒 Cucumber</option>
              <option value="🥕">🥕 Carrot</option>
              <option value="🥬">🥬 Leafy vegetable</option>
              <option value="🍓">🍓 Strawberry</option>
              <option value="🌿">🌿 Herb</option>
              <option value="🌸">🌸 Flower</option>
            </select>
          </label>

          <label>
            Growth stage
            <select
              value={plant.stage}
              onChange={(event) =>
                updatePlant("stage", event.target.value)
              }
            >
              <option value="Seed">Seed</option>
              <option value="Seedling">Seedling</option>
              <option value="Growing">Growing</option>
              <option value="Flowering">Flowering</option>
              <option value="Fruiting">Fruiting</option>
              <option value="Ready to harvest">Ready to harvest</option>
              <option value="Established">Established</option>
            </select>
          </label>

          <label>
            Current status
            <select
              value={plant.status}
              onChange={(event) =>
                updatePlant("status", event.target.value)
              }
            >
              <option value="Healthy">Healthy</option>
              <option value="Needs water">Needs water</option>
              <option value="Needs feeding">Needs feeding</option>
              <option value="Check for pests">Check for pests</option>
              <option value="Ready soon">Ready soon</option>
            </select>
          </label>

          <label>
            Date planted
            <input
              type="date"
              value={plant.plantedDate}
              onChange={(event) =>
                updatePlant("plantedDate", event.target.value)
              }
            />
          </label>

          {error && <p className="add-plant-error">{error}</p>}

          <div className="add-plant-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>

            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save plant"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}