import type { GardenPlant } from "./plantService";

export type CareRating =
  | "Excellent"
  | "Good"
  | "Monitor"
  | "Needs attention"
  | "Critical";

export type CareScore = {
  score: number;
  rating: CareRating;
  message: string;
};

export type PlantCareAssessment = {
  overallScore: number;
  overallRating: CareRating;
  water: CareScore;
  sunlight: CareScore;
  temperature: CareScore;
  growth: CareScore;
  nextAction: string;
};

export type CareEnvironment = {
  sunlightHours?: number;
  temperatureC?: number;
  daysSinceWatering?: number;
  expectedRainMm?: number;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getRating(score: number): CareRating {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 55) return "Monitor";
  if (score >= 30) return "Needs attention";
  return "Critical";
}

function createCareScore(score: number, message: string): CareScore {
  const safeScore = clampScore(score);

  return {
    score: safeScore,
    rating: getRating(safeScore),
    message,
  };
}

function calculateWaterScore(
  plant: GardenPlant,
  daysSinceWatering: number,
  expectedRainMm: number,
  temperatureC: number,
): CareScore {
  const wateringNeed = plant.wateringNeed ?? "Moderate";

  let idealIntervalDays =
    wateringNeed === "High"
      ? 1
      : wateringNeed === "Low"
        ? 5
        : 3;

  if (temperatureC >= 28) {
    idealIntervalDays = Math.max(1, idealIntervalDays - 1);
  }

  const meaningfulRainExpected = expectedRainMm >= 3;

  if (
    meaningfulRainExpected &&
    daysSinceWatering >= idealIntervalDays
  ) {
    return createCareScore(
      82,
      `${expectedRainMm.toFixed(
        1,
      )} mm of rain is expected. Check the soil before watering.`,
    );
  }

  if (daysSinceWatering <= idealIntervalDays) {
    if (temperatureC >= 28) {
      return createCareScore(
        86,
        "Watering is on schedule, but hot weather may dry the soil faster.",
      );
    }

    return createCareScore(
      95,
      "Watering appears to be on schedule.",
    );
  }

  const overdueDays = daysSinceWatering - idealIntervalDays;
  const score = 95 - overdueDays * 22;

  return createCareScore(
    score,
    overdueDays === 1
      ? "Watering may be due today."
      : `Watering is approximately ${overdueDays} days overdue.`,
  );
}

function calculateSunlightScore(
  plant: GardenPlant,
  sunlightHours: number,
): CareScore {
  const requirement = plant.sunRequirement ?? "Full sun";

  const targetHours =
    requirement === "Shade"
      ? 2
      : requirement === "Partial shade"
        ? 4
        : 6;

  const difference = sunlightHours - targetHours;

  if (difference >= 0) {
    return createCareScore(
      96,
      `Estimated sunlight meets the ${requirement.toLowerCase()} requirement.`,
    );
  }

  const score = 96 - Math.abs(difference) * 18;

  return createCareScore(
    score,
    `This plant may need around ${Math.abs(difference).toFixed(1)} more hours of direct light.`,
  );
}

function calculateTemperatureScore(
  temperatureC: number,
): CareScore {
  if (temperatureC >= 16 && temperatureC <= 26) {
    return createCareScore(
      95,
      "The current temperature is within a comfortable growing range.",
    );
  }

  if (temperatureC < 5) {
    return createCareScore(
      20,
      "Very low temperatures may damage this plant.",
    );
  }

  if (temperatureC < 10) {
    return createCareScore(
      45,
      "Cold conditions may slow growth.",
    );
  }

  if (temperatureC > 35) {
    return createCareScore(
      25,
      "Extreme heat may cause serious plant stress.",
    );
  }

  if (temperatureC > 30) {
    return createCareScore(
      50,
      "High temperatures may increase water stress.",
    );
  }

  return createCareScore(
    72,
    "Conditions are usable, but not currently ideal.",
  );
}

function calculateGrowthScore(plant: GardenPlant): CareScore {
  const status = plant.status?.toLowerCase() ?? "healthy";

  if (status.includes("healthy")) {
    return createCareScore(
      95,
      `${plant.stage || "Growth"} appears to be progressing normally.`,
    );
  }

  if (
    status.includes("water") ||
    status.includes("pest") ||
    status.includes("feed") ||
    status.includes("warning")
  ) {
    return createCareScore(
      55,
      `The recorded status is: ${plant.status}.`,
    );
  }

  return createCareScore(
    78,
    `Growth stage recorded as ${plant.stage || "unknown"}.`,
  );
}

function chooseNextAction(
  water: CareScore,
  sunlight: CareScore,
  temperature: CareScore,
  growth: CareScore,
) {
  const scores = [
    {
      type: "water",
      score: water.score,
      action: "Check the soil and water the plant if it feels dry.",
    },
    {
      type: "sunlight",
      score: sunlight.score,
      action: "Review whether this plant is receiving enough direct sunlight.",
    },
    {
      type: "temperature",
      score: temperature.score,
      action: "Protect the plant from unsuitable temperatures.",
    },
    {
      type: "growth",
      score: growth.score,
      action: "Inspect the plant for visible stress, pests or nutrient problems.",
    },
  ];

  scores.sort((a, b) => a.score - b.score);

  if (scores[0].score >= 85) {
    return "No urgent action is needed. Continue normal care.";
  }

  return scores[0].action;
}

export function assessPlantCare(
  plant: GardenPlant,
  environment: CareEnvironment = {},
): PlantCareAssessment {
  const sunlightHours = environment.sunlightHours ?? 6;
  const temperatureC = environment.temperatureC ?? 20;
  const daysSinceWatering = environment.daysSinceWatering ?? 2;
  const expectedRainMm = environment.expectedRainMm ?? 0;

  const water = calculateWaterScore(
  plant,
  daysSinceWatering,
  expectedRainMm,
  temperatureC,
);
  const sunlight = calculateSunlightScore(plant, sunlightHours);
  const temperature = calculateTemperatureScore(temperatureC);
  const growth = calculateGrowthScore(plant);

  const overallScore = clampScore(
    water.score * 0.35 +
      sunlight.score * 0.25 +
      temperature.score * 0.2 +
      growth.score * 0.2,
  );

  return {
    overallScore,
    overallRating: getRating(overallScore),
    water,
    sunlight,
    temperature,
    growth,
    nextAction: chooseNextAction(
      water,
      sunlight,
      temperature,
      growth,
    ),
  };
}