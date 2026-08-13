import type {
  AttentionItem,
  AttentionLevel,
} from "../components/AttentionSection";
import {
  assessPlantCare,
  type CareEnvironment,
} from "./careEngine";
import type { GardenPlant } from "./plantService";

export type DashboardPlant = GardenPlant & {
  gardenId: string;
  gardenName: string;
};

export type DashboardCareContext = Pick<
  CareEnvironment,
  "sunlightHours" | "temperatureC" | "expectedRainMm"
>;

type ConcernType =
  | "water"
  | "sunlight"
  | "temperature"
  | "growth";

function getDaysSinceWatering(lastWateredAt: unknown): number {
  if (!lastWateredAt) {
    return 7;
  }

  let wateredDate: Date | null = null;

  if (typeof lastWateredAt === "string") {
    wateredDate = new Date(`${lastWateredAt}T00:00:00`);
  } else if (
    typeof lastWateredAt === "object" &&
    lastWateredAt !== null &&
    "toDate" in lastWateredAt &&
    typeof (lastWateredAt as { toDate?: unknown }).toDate ===
      "function"
  ) {
    wateredDate = (
      lastWateredAt as { toDate: () => Date }
    ).toDate();
  }

  if (!wateredDate || Number.isNaN(wateredDate.getTime())) {
    return 7;
  }

  return Math.max(
    0,
    Math.floor(
      (Date.now() - wateredDate.getTime()) / 86_400_000,
    ),
  );
}

function getAttentionLevel(score: number): AttentionLevel {
  if (score < 30) {
    return "urgent";
  }

  if (score < 55) {
    return "warning";
  }

  return "weather";
}

function getConcernPresentation(type: ConcernType) {
  switch (type) {
    case "water":
      return {
        title: "Watering",
        icon: "💧",
      };

    case "sunlight":
      return {
        title: "Sunlight",
        icon: "☀️",
      };

    case "temperature":
      return {
        title: "Weather",
        icon: "🌡️",
      };

    case "growth":
      return {
        title: "Plant health",
        icon: "🌱",
      };
  }
}

export function buildAttentionItems(
  plants: DashboardPlant[],
  context: DashboardCareContext = {},
): AttentionItem[] {
  const items = plants
    .map((plant) => {
      const assessment = assessPlantCare(plant, {
        ...context,
        daysSinceWatering: getDaysSinceWatering(
          plant.lastWateredAt,
        ),
      });

      const concerns = [
        {
          type: "water" as const,
          assessment: assessment.water,
        },
        {
          type: "sunlight" as const,
          assessment: assessment.sunlight,
        },
        {
          type: "temperature" as const,
          assessment: assessment.temperature,
        },
        {
          type: "growth" as const,
          assessment: assessment.growth,
        },
      ].sort(
        (a, b) =>
          a.assessment.score - b.assessment.score,
      );

      const mainConcern = concerns[0];

      // Healthy plants do not need to appear in Needs attention.
      if (mainConcern.assessment.score >= 75) {
        return null;
      }

      const presentation = getConcernPresentation(
        mainConcern.type,
      );

      return {
        id: `${plant.gardenId}:${plant.id}`,
        plantId: plant.id,
        gardenId: plant.gardenId,
        plantName: plant.name,
        gardenName: plant.gardenName,
        title: presentation.title,
        description: mainConcern.assessment.message,
        icon: presentation.icon,
        actionLabel: "Open plant",
        level: getAttentionLevel(
          mainConcern.assessment.score,
        ),
        score: mainConcern.assessment.score,
      };
    })
    .filter(
      (
        item,
      ): item is AttentionItem & { score: number } =>
        item !== null,
    );

  // Most urgent plants appear first.
  items.sort((a, b) => a.score - b.score);

  return items.map(({ score: _score, ...item }) => item);
}