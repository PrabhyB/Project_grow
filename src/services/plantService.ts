import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

export type GardenPlant = {
  id: string;
  name: string;
  variety: string;
  stage: string;
  status: string;
  icon: string;
  plantedDate: string;
  lastWateredAt?: unknown;
  createdAt?: unknown;
};

export type NewGardenPlant = Omit<GardenPlant, "id" | "createdAt">;

function getPlantsCollection(gardenId: string) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in to access plants.");
  }

  return collection(
    db,
    "users",
    user.uid,
    "gardens",
    gardenId,
    "plants",
  );
}

export async function addPlantToGarden(
  gardenId: string,
  plant: NewGardenPlant,
) {
  const plantsCollection = getPlantsCollection(gardenId);

  const documentReference = await addDoc(plantsCollection, {
    ...plant,
    createdAt: serverTimestamp(),
  });

  return documentReference.id;
}

export function subscribeToGardenPlants(
  gardenId: string,
  onPlantsChanged: (plants: GardenPlant[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const plantsQuery = query(
    getPlantsCollection(gardenId),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    plantsQuery,
    (snapshot) => {
      const plants = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })) as GardenPlant[];

      onPlantsChanged(plants);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function getGardenPlant(
  gardenId: string,
  plantId: string,
): Promise<GardenPlant | null> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in to view this plant.");
  }

  const plantReference = doc(
    db,
    "users",
    user.uid,
    "gardens",
    gardenId,
    "plants",
    plantId,
  );

  const snapshot = await getDoc(plantReference);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as GardenPlant;
}
export type WateringRecord = {
  id: string;
  wateredAt: string;
  amount: string;
  note: string;
  createdAt?: unknown;
};

export type NewWateringRecord = Omit<
  WateringRecord,
  "id" | "createdAt"
>;

function getPlantReference(gardenId: string, plantId: string) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in to update this plant.");
  }

  return doc(
    db,
    "users",
    user.uid,
    "gardens",
    gardenId,
    "plants",
    plantId,
  );
}

function getWateringCollection(gardenId: string, plantId: string) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in to access watering records.");
  }

  return collection(
    db,
    "users",
    user.uid,
    "gardens",
    gardenId,
    "plants",
    plantId,
    "waterings",
  );
}

export async function recordPlantWatering(
  gardenId: string,
  plantId: string,
  watering: NewWateringRecord,
) {
  const plantReference = getPlantReference(gardenId, plantId);
  const wateringCollection = getWateringCollection(gardenId, plantId);

  await addDoc(wateringCollection, {
    ...watering,
    createdAt: serverTimestamp(),
  });

  await updateDoc(plantReference, {
    lastWateredAt: watering.wateredAt,
    status: "Healthy",
  });
}

export function subscribeToWateringHistory(
  gardenId: string,
  plantId: string,
  onRecordsChanged: (records: WateringRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const wateringQuery = query(
    getWateringCollection(gardenId, plantId),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    wateringQuery,
    (snapshot) => {
      const records = snapshot.docs.map((wateringDocument) => ({
        id: wateringDocument.id,
        ...wateringDocument.data(),
      })) as WateringRecord[];

      onRecordsChanged(records);
    },
    (error) => {
      onError?.(error);
    },
  );
}