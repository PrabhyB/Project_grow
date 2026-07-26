export type PlantCategory =
  | "Vegetable"
  | "Fruit"
  | "Herb"
  | "Flower";

export type PlantLibraryEntry = {
  id: string;
  commonName: string;
  scientificName: string;
  variety?: string;
  category: PlantCategory;
  icon: string;
  sunRequirement: "Full sun" | "Partial shade" | "Shade";
  wateringNeed: "Low" | "Moderate" | "High";
  spacingCm: number;
  typicalHeightCm: number;
  sowingMonths: number[];
  harvestMonths: number[];
  description: string;
};

export const plantLibrary: PlantLibraryEntry[] = [
  {
    id: "tomato-moneymaker",
    commonName: "Tomato",
    scientificName: "Solanum lycopersicum",
    variety: "Moneymaker",
    category: "Fruit",
    icon: "🍅",
    sunRequirement: "Full sun",
    wateringNeed: "High",
    spacingCm: 45,
    typicalHeightCm: 180,
    sowingMonths: [2, 3, 4],
    harvestMonths: [7, 8, 9, 10],
    description:
      "A dependable cordon tomato producing medium-sized fruit.",
  },
  {
    id: "tomato-gardeners-delight",
    commonName: "Tomato",
    scientificName: "Solanum lycopersicum",
    variety: "Gardener's Delight",
    category: "Fruit",
    icon: "🍅",
    sunRequirement: "Full sun",
    wateringNeed: "High",
    spacingCm: 45,
    typicalHeightCm: 180,
    sowingMonths: [2, 3, 4],
    harvestMonths: [7, 8, 9, 10],
    description:
      "A popular cherry tomato with sweet, abundant fruit.",
  },
  {
    id: "cucumber-marketmore",
    commonName: "Cucumber",
    scientificName: "Cucumis sativus",
    variety: "Marketmore",
    category: "Fruit",
    icon: "🥒",
    sunRequirement: "Full sun",
    wateringNeed: "High",
    spacingCm: 45,
    typicalHeightCm: 180,
    sowingMonths: [3, 4, 5],
    harvestMonths: [7, 8, 9],
    description:
      "A reliable outdoor cucumber suitable for UK gardens.",
  },
  {
    id: "courgette-black-beauty",
    commonName: "Courgette",
    scientificName: "Cucurbita pepo",
    variety: "Black Beauty",
    category: "Fruit",
    icon: "🥒",
    sunRequirement: "Full sun",
    wateringNeed: "High",
    spacingCm: 90,
    typicalHeightCm: 60,
    sowingMonths: [4, 5],
    harvestMonths: [7, 8, 9, 10],
    description:
      "A productive courgette producing dark green fruit.",
  },
  {
    id: "carrot-autumn-king",
    commonName: "Carrot",
    scientificName: "Daucus carota",
    variety: "Autumn King",
    category: "Vegetable",
    icon: "🥕",
    sunRequirement: "Full sun",
    wateringNeed: "Moderate",
    spacingCm: 8,
    typicalHeightCm: 35,
    sowingMonths: [3, 4, 5, 6, 7],
    harvestMonths: [8, 9, 10, 11],
    description:
      "A large maincrop carrot with good storage qualities.",
  },
  {
    id: "lettuce-little-gem",
    commonName: "Lettuce",
    scientificName: "Lactuca sativa",
    variety: "Little Gem",
    category: "Vegetable",
    icon: "🥬",
    sunRequirement: "Partial shade",
    wateringNeed: "Moderate",
    spacingCm: 20,
    typicalHeightCm: 20,
    sowingMonths: [2, 3, 4, 5, 6, 7, 8],
    harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    description:
      "A compact sweet lettuce suitable for small spaces.",
  },
  {
    id: "runner-bean-scarlet-emperor",
    commonName: "Runner Bean",
    scientificName: "Phaseolus coccineus",
    variety: "Scarlet Emperor",
    category: "Vegetable",
    icon: "🫘",
    sunRequirement: "Full sun",
    wateringNeed: "High",
    spacingCm: 20,
    typicalHeightCm: 250,
    sowingMonths: [4, 5, 6],
    harvestMonths: [7, 8, 9, 10],
    description:
      "A vigorous climbing bean with red flowers.",
  },
  {
    id: "strawberry-cambridge-favourite",
    commonName: "Strawberry",
    scientificName: "Fragaria × ananassa",
    variety: "Cambridge Favourite",
    category: "Fruit",
    icon: "🍓",
    sunRequirement: "Full sun",
    wateringNeed: "Moderate",
    spacingCm: 35,
    typicalHeightCm: 25,
    sowingMonths: [],
    harvestMonths: [6, 7],
    description:
      "A reliable strawberry variety with good flavour.",
  },
  {
    id: "basil-genovese",
    commonName: "Basil",
    scientificName: "Ocimum basilicum",
    variety: "Genovese",
    category: "Herb",
    icon: "🌿",
    sunRequirement: "Full sun",
    wateringNeed: "Moderate",
    spacingCm: 20,
    typicalHeightCm: 45,
    sowingMonths: [3, 4, 5, 6],
    harvestMonths: [6, 7, 8, 9],
    description:
      "A fragrant basil commonly used for pesto.",
  },
  {
    id: "mint-spearmint",
    commonName: "Mint",
    scientificName: "Mentha spicata",
    variety: "Spearmint",
    category: "Herb",
    icon: "🌿",
    sunRequirement: "Partial shade",
    wateringNeed: "High",
    spacingCm: 30,
    typicalHeightCm: 60,
    sowingMonths: [],
    harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    description:
      "A vigorous aromatic herb best grown in a container.",
  },
  {
    id: "chives-common",
    commonName: "Chives",
    scientificName: "Allium schoenoprasum",
    category: "Herb",
    icon: "🌿",
    sunRequirement: "Full sun",
    wateringNeed: "Moderate",
    spacingCm: 20,
    typicalHeightCm: 35,
    sowingMonths: [3, 4, 5],
    harvestMonths: [5, 6, 7, 8, 9],
    description:
      "A perennial herb producing edible leaves and flowers.",
  },
  {
    id: "lavender-english",
    commonName: "English Lavender",
    scientificName: "Lavandula angustifolia",
    category: "Flower",
    icon: "🪻",
    sunRequirement: "Full sun",
    wateringNeed: "Low",
    spacingCm: 45,
    typicalHeightCm: 60,
    sowingMonths: [],
    harvestMonths: [],
    description:
      "A drought-tolerant aromatic plant attractive to pollinators.",
  },
];

export function searchPlantLibrary(searchTerm: string) {
  const normalisedSearch = searchTerm.trim().toLowerCase();

  if (!normalisedSearch) {
    return plantLibrary;
  }

  return plantLibrary.filter((plant) => {
    const searchableText = [
      plant.commonName,
      plant.scientificName,
      plant.variety ?? "",
      plant.category,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalisedSearch);
  });
}