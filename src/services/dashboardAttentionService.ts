import type { AttentionItem } from "../components/AttentionSection";
import type { GardenPlant } from "./plantService";

export type DashboardPlant = GardenPlant & {
  gardenId: string;
  gardenName: string;
};

export function buildAttentionItems(
  plants: DashboardPlant[],
): AttentionItem[] {
  return plants.map((plant) => ({
    id: plant.id,
    plantName: plant.name,
    gardenName: plant.gardenName,
    title: "Plant check",
    description: "Live plant loaded successfully.",
    icon: "🌱",
    actionLabel: "Open",
    level: "warning",
  }));
}