export type PlantSummary = {
  id: string;
  name: string;
  icon: string;
  variety?: string;
  status: string;
  stage: string;
  needsAttention?: boolean;
};

export type GardenDetails = {
  id: string;
  name: string;
  description: string;
  plantCount: number;
  alertCount: number;
  sunlightHours: number;
  moistureStatus: string;
  temperature: number;
  plants: PlantSummary[];
};

export const gardens: GardenDetails[] = [
  {
    id: "front-garden",
    name: "Front Garden",
    description: "Decorative planting and pollinator-friendly flowers.",
    plantCount: 8,
    alertCount: 0,
    sunlightHours: 5.2,
    moistureStatus: "Good",
    temperature: 19,
    plants: [
      {
        id: "magnolia",
        name: "Magnolia",
        icon: "🌸",
        status: "Healthy",
        stage: "Established",
      },
      {
        id: "lavender",
        name: "Lavender",
        icon: "🪻",
        status: "Healthy",
        stage: "Flowering",
      },
    ],
  },
  {
    id: "back-garden",
    name: "Back Garden",
    description: "Main lawn, containers and seasonal fruit plants.",
    plantCount: 24,
    alertCount: 2,
    sunlightHours: 6.4,
    moistureStatus: "Dry",
    temperature: 21,
    plants: [
      {
        id: "tomato",
        name: "Tomato",
        variety: "Moneymaker",
        icon: "🍅",
        status: "Needs water",
        stage: "Fruiting",
        needsAttention: true,
      },
      {
        id: "strawberry",
        name: "Strawberry",
        icon: "🍓",
        status: "Healthy",
        stage: "Fruiting",
      },
      {
        id: "mint",
        name: "Mint",
        icon: "🌿",
        status: "Healthy",
        stage: "Established",
      },
    ],
  },
  {
    id: "vegetable-patch",
    name: "Vegetable Patch",
    description: "Raised beds for vegetables and seasonal crops.",
    plantCount: 16,
    alertCount: 1,
    sunlightHours: 7.8,
    moistureStatus: "Moderate",
    temperature: 22,
    plants: [
      {
        id: "cucumber",
        name: "Cucumber",
        icon: "🥒",
        status: "Check leaves",
        stage: "Fruiting",
        needsAttention: true,
      },
      {
        id: "lettuce",
        name: "Lettuce",
        icon: "🥬",
        status: "Ready soon",
        stage: "Maturing",
      },
      {
        id: "carrot",
        name: "Carrot",
        icon: "🥕",
        status: "Healthy",
        stage: "Growing",
      },
    ],
  },
  {
    id: "herb-garden",
    name: "Herb Garden",
    description: "Compact area for culinary and aromatic herbs.",
    plantCount: 9,
    alertCount: 1,
    sunlightHours: 4.7,
    moistureStatus: "Good",
    temperature: 18,
    plants: [
      {
        id: "basil",
        name: "Basil",
        icon: "🌱",
        status: "Cold warning",
        stage: "Growing",
        needsAttention: true,
      },
      {
        id: "chives",
        name: "Chives",
        icon: "🌿",
        status: "Healthy",
        stage: "Established",
      },
    ],
  },
];

export function getGardenById(id: string) {
  return gardens.find((garden) => garden.id === id);
}