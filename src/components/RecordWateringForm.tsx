import { useState } from "react";
import type { FormEvent } from "react";

import {
  recordPlantWatering,
  type NewWateringRecord,
} from "../services/plantService";

import "./RecordWateringForm.css";

type RecordWateringFormProps = {
  gardenId: string;
  plantId: string;
  plantName: string;
  onClose: () => void;
};

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

export default function RecordWateringForm({
  gardenId,
  plantId,
  plantName,
  onClose,
}: RecordWateringFormProps) {
  const [watering, setWatering] = useState<NewWateringRecord>({
    wateredAt: getTodayDate(),
    amount: "Normal watering",
    note: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      await recordPlantWatering(gardenId, plantId, watering);
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The watering record could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="watering-backdrop">
      <section
        className="watering-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="watering-title"
      >
        <div className="watering-header">
          <div>
            <p>{plantName}</p>
            <h2 id="watering-title">Record watering</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close watering form"
          >
            ×
          </button>
        </div>

        <form className="watering-form" onSubmit={handleSubmit}>
          <label>
            Date watered
            <input
              required
              type="date"
              value={watering.wateredAt}
              onChange={(event) =>
                setWatering((current) => ({
                  ...current,
                  wateredAt: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Amount
            <select
              value={watering.amount}
              onChange={(event) =>
                setWatering((current) => ({
                  ...current,
                  amount: event.target.value,
                }))
              }
            >
              <option>Light watering</option>
              <option>Normal watering</option>
              <option>Deep watering</option>
              <option>Rain only</option>
            </select>
          </label>

          <label>
            Optional note
            <textarea
              rows={4}
              value={watering.note}
              placeholder="For example, soil was very dry."
              onChange={(event) =>
                setWatering((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
            />
          </label>

          {error && <p className="watering-error">{error}</p>}

          <div className="watering-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>

            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save watering"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
