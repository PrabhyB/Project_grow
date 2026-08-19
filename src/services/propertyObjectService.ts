import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";

import type {
  PropertyPoint,
  SpaceShapeType,
} from "./propertyService";

import { auth, db } from "../lib/firebase";

export type PropertyObjectType =
  | "tree"
  | "fence"
  | "shed"
  | "greenhouse"
  | "patio"
  | "path"
  | "pond"
  | "house";

  export type StructureKind =
  | "house"
  | "flat"
  | "maisonette"
  | "other";

export type PropertyObject = {
  id: string;

  type: PropertyObjectType;
  name: string;

  x: number;
  y: number;

  // Top-down dimensions on the map.
  width: number;
  height: number;

  rotation: number;

  // Actual real-world height used for
  // sunlight/shadow calculations.
  physicalHeightM?: number;

  createdAt?: unknown;
  updatedAt?: unknown;

  structureKind?: StructureKind;

shapeType?: SpaceShapeType;
boundary?: PropertyPoint[];

// Mainly useful for flats / maisonettes.
floorLevel?: number;

// Height of the floor above ground level.
baseElevationM?: number;

// Internal floor-to-ceiling height.
ceilingHeightM?: number;
};

export type NewPropertyObject = Omit<
  PropertyObject,
  "id" | "createdAt" | "updatedAt"
>;

function getPropertyObjectsCollection() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be logged in to access property objects.",
    );
  }

  return collection(
    db,
    "users",
    user.uid,
    "propertyObjects",
  );
}

function getPropertyObjectReference(
  objectId: string,
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be logged in to update property objects.",
    );
  }

  return doc(
    db,
    "users",
    user.uid,
    "propertyObjects",
    objectId,
  );
}

export function subscribeToPropertyObjects(
  onObjectsChanged: (
    objects: PropertyObject[],
  ) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    getPropertyObjectsCollection(),
    (snapshot) => {
      const objects = snapshot.docs.map(
        (objectDocument) => ({
          id: objectDocument.id,
          ...objectDocument.data(),
        }),
      ) as PropertyObject[];

      onObjectsChanged(objects);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function createPropertyObject(
  object: NewPropertyObject,
) {
  const result = await addDoc(
    getPropertyObjectsCollection(),
    {
      ...object,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );

  return result.id;
}

export async function updatePropertyObject(
  objectId: string,
  changes: Partial<NewPropertyObject>,
) {
  await updateDoc(
    getPropertyObjectReference(objectId),
    {
      ...changes,
      updatedAt: serverTimestamp(),
    },
  );
}

export async function deletePropertyObject(
  objectId: string,
) {
  await deleteDoc(
    getPropertyObjectReference(objectId),
  );
}