import { useMemo, useState } from "react";

import {
  plantLibrary,
  searchPlantLibrary,
  type PlantCategory,
  type PlantLibraryEntry,
} from "../data/plantLibrary";

import "./PlantLibraryPicker.css";

type PlantLibraryPickerProps = {
  selectedPlantId?: string;
  onSelectPlant: (plant: PlantLibraryEntry) => void;
};

const categories: Array<PlantCategory | "All"> = [
  "All",
  "Vegetable",
  "Fruit",
  "Herb",
  "Flower",
];

export default function PlantLibraryPicker({
  selectedPlantId,
  onSelectPlant,
}: PlantLibraryPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] =
    useState<PlantCategory | "All">("All");

  const filteredPlants = useMemo(() => {
    const searchResults = searchPlantLibrary(searchTerm);

    if (category === "All") {
      return searchResults;
    }

    return searchResults.filter(
      (plant) => plant.category === category,
    );
  }, [searchTerm, category]);

  return (
    <section className="plant-library-picker">
      <label className="plant-library-search">
        <span>Search the plant library</span>

        <input
          type="search"
          value={searchTerm}
          placeholder="Search tomato, basil, strawberry…"
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </label>

      <div className="plant-category-filter">
        {categories.map((categoryOption) => (
          <button
            className={
              categoryOption === category ? "active" : ""
            }
            type="button"
            key={categoryOption}
            onClick={() => setCategory(categoryOption)}
          >
            {categoryOption}
          </button>
        ))}
      </div>

      <div className="plant-library-results">
        {filteredPlants.length === 0 ? (
          <div className="plant-library-empty">
            <span>🔍</span>
            <p>No matching plants were found.</p>
          </div>
        ) : (
          filteredPlants.map((plant) => {
            const isSelected = plant.id === selectedPlantId;

            return (
              <button
                className={`plant-library-result ${
                  isSelected ? "selected" : ""
                }`}
                type="button"
                key={plant.id}
                onClick={() => onSelectPlant(plant)}
              >
                <span className="library-plant-icon">
                  {plant.icon}
                </span>

                <span className="library-plant-copy">
                  <strong>{plant.commonName}</strong>

                  {plant.variety && (
                    <span>{plant.variety}</span>
                  )}

                  <small>{plant.scientificName}</small>

                  <small>
                    {plant.sunRequirement} · Water:{" "}
                    {plant.wateringNeed}
                  </small>
                </span>

                <span className="library-selection">
                  {isSelected ? "✓" : "›"}
                </span>
              </button>
            );
          })
        )}
      </div>

      <p className="plant-library-total">
        {plantLibrary.length} starter plants currently available
      </p>
    </section>
  );
}