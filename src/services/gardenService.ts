import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

export type GardenAreaType =
  | "garden"
  | "vegetable"
  | "herb";

export type GardenArea = {
  id: string;
  name: string;
  description: string;
  type: GardenAreaType;

  x: number;
  y: number;
  width: number;
  height: number;

  createdAt?: unknown;
  updatedAt?: unknown;
};

export type NewGardenArea = Omit<
  GardenArea,
  "id" | "createdAt" | "updatedAt"
>;

const defaultGardens: Array<
  GardenArea & {
    createdAt?: never;
    updatedAt?: never;
  }
> = [
  {
    id: "front-garden",
    name: "Front Garden",
    description:
      "Decorative planting and pollinator-friendly flowers.",
    type: "garden",
    x: 55,
    y: 150,
    width: 175,
    height: 145,
  },
  {
    id: "back-garden",
    name: "Back Garden",
    description:
      "Main lawn, containers and seasonal fruit plants.",
    type: "garden",
    x: 440,
    y: 255,
    width: 245,
    height: 210,
  },
  {
    id: "vegetable-patch",
    name: "Vegetable Patch",
    description:
      "Raised beds for vegetables and seasonal crops.",
    type: "vegetable",
    x: 720,
    y: 170,
    width: 250,
    height: 275,
  },
  {
    id: "herb-garden",
    name: "Herb Garden",
    description:
      "Compact area for culinary and aromatic herbs.",
    type: "herb",
    x: 680,
    y: 450,
    width: 150,
    height: 125,
  },
];

function getUserGardensCollection() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be logged in to access gardens.",
    );
  }

  return collection(
    db,
    "users",
    user.uid,
    "gardens",
  );
}

function getGardenReference(gardenId: string) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be logged in to update gardens.",
    );
  }

  return doc(
    db,
    "users",
    user.uid,
    "gardens",
    gardenId,
  );
}

export async function ensureDefaultGardens() {
  const gardensCollection =
    getUserGardensCollection();

  const snapshot = await getDocs(
    gardensCollection,
  );

  if (!snapshot.empty) {
    return;
  }

  await Promise.all(
    defaultGardens.map((garden) =>
      setDoc(
        getGardenReference(garden.id),
        {
          name: garden.name,
          description: garden.description,
          type: garden.type,
          x: garden.x,
          y: garden.y,
          width: garden.width,
          height: garden.height,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    ),
  );
}

export function subscribeToGardens(
  onGardensChanged: (
    gardens: GardenArea[],
  ) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    getUserGardensCollection(),
    (snapshot) => {
      const gardens = snapshot.docs.map(
        (gardenDocument) => ({
          id: gardenDocument.id,
          ...gardenDocument.data(),
        }),
      ) as GardenArea[];

      onGardensChanged(gardens);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function createGardenArea(
  garden: NewGardenArea,
) {
  const result = await addDoc(
    getUserGardensCollection(),
    {
      ...garden,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );

  return result.id;
}

export async function updateGardenArea(
  gardenId: string,
  changes: Partial<NewGardenArea>,
) {
  await updateDoc(
    getGardenReference(gardenId),
    {
      ...changes,
      updatedAt: serverTimestamp(),
    },
  );
}