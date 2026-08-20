import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

export type PropertyType =
  | "detached"
  | "semi-detached"
  | "terraced"
  | "flat"
  | "maisonette"
  | "allotment"
  | "communal"
  | "land"
  | "custom";


export type SpaceType =
  | "garden"
  | "front-garden"
  | "back-garden"
  | "side-garden"
  | "balcony"
  | "terrace"
  | "rooftop"
  | "allotment"
  | "courtyard"
  | "shared-garden"
  | "indoor"
  | "windowsill"
  | "custom";

export type PropertyConfig = {
  name: string;

  propertyType: PropertyType;

  // Degrees clockwise from north.
  northRotation: number;

  setupComplete: boolean;

  selectedSpaceTypes?: SpaceType[];

  createdAt?: unknown;
  updatedAt?: unknown;
};

export type SpaceShapeType =
  | "rectangle"
  | "l-shape"
  | "u-shape"
  | "t-shape"
  | "custom";

export type PropertyPoint = {
  // Real-world coordinates in metres.
  x: number;
  y: number;
};

export type PropertySpace = {
  id: string;

  name: string;
  type: SpaceType;

  // Real-world dimensions.
  widthM: number;
  depthM: number;

   // Actual shape used by the map.
  shapeType: SpaceShapeType;

  // Polygon coordinates measured in metres.
  boundary: PropertyPoint[];
  
  // Useful later for balconies,
  // rooftops and raised spaces.
  elevationM?: number;

  // Position when showing multiple
  // spaces together.
  x: number;
  y: number;

  layoutX?: number;
layoutY?: number;
rotation?: number;

shapeDetailWidthM?: number;
shapeDetailDepthM?: number;

  createdAt?: unknown;
  updatedAt?: unknown;
};

export type NewPropertySpace = Omit<
  PropertySpace,
  "id" | "createdAt" | "updatedAt"
>;

function getUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be logged in to access property data.",
    );
  }

  return user;
}

function getPropertyConfigReference() {
  const user = getUser();

  return doc(
    db,
    "users",
    user.uid,
    "property",
    "config",
  );
}

function getPropertySpacesCollection() {
  const user = getUser();

  return collection(
    db,
    "users",
    user.uid,
    "propertySpaces",
  );
}

function getPropertySpaceReference(
  spaceId: string,
) {
  const user = getUser();

  return doc(
    db,
    "users",
    user.uid,
    "propertySpaces",
    spaceId,
  );
}

export function subscribeToPropertyConfig(
  onConfigChanged: (
    config: PropertyConfig | null,
  ) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    getPropertyConfigReference(),
    (snapshot) => {
      if (!snapshot.exists()) {
        onConfigChanged(null);
        return;
      }

      onConfigChanged(
        snapshot.data() as PropertyConfig,
      );
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function createPropertyConfig(
  config: Omit<
    PropertyConfig,
    "createdAt" | "updatedAt"
  >,
) {
  await setDoc(
  getPropertyConfigReference(),
  {
    ...config,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  },
  {
    merge: true,
  },
);
}

export async function updatePropertyConfig(
  changes: Partial<
    Omit<
      PropertyConfig,
      "createdAt" | "updatedAt"
    >
  >,
) {
  await setDoc(
    getPropertyConfigReference(),
    {
      ...changes,
      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    },
  );
}

export function subscribeToPropertySpaces(
  onSpacesChanged: (
    spaces: PropertySpace[],
  ) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    getPropertySpacesCollection(),
    (snapshot) => {
      const spaces = snapshot.docs.map(
        (spaceDocument) => ({
          id: spaceDocument.id,
          ...spaceDocument.data(),
        }),
      ) as PropertySpace[];

      onSpacesChanged(spaces);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function createPropertySpace(
  space: NewPropertySpace,
) {
  const result = await addDoc(
    getPropertySpacesCollection(),
    {
      ...space,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );

  return result.id;
}

export async function updatePropertySpace(
  spaceId: string,
  changes: Partial<NewPropertySpace>,
) {
  await updateDoc(
    getPropertySpaceReference(spaceId),
    {
      ...changes,
      updatedAt: serverTimestamp(),
    },
  );
}

export async function replaceSetupPropertySpaces(
  spaces: NewPropertySpace[],
) {
  const spacesCollection =
    getPropertySpacesCollection();

  const snapshot =
    await getDocs(spacesCollection);

  const setupDocuments =
    snapshot.docs.filter(
      (spaceDocument) =>
        spaceDocument.id.startsWith(
          "setup-",
        ),
    );

  const wantedIds = new Set(
    spaces.map(
      (space) =>
        `setup-${space.type}`,
    ),
  );

  const deletions =
    setupDocuments
      .filter(
        (spaceDocument) =>
          !wantedIds.has(
            spaceDocument.id,
          ),
      )
      .map(
        (spaceDocument) =>
          deleteDoc(
            spaceDocument.ref,
          ),
      );

  const saves =
    spaces.map((space) => {
      const reference =
        getPropertySpaceReference(
          `setup-${space.type}`,
        );

      return setDoc(
        reference,
        {
          ...space,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        },
      );
    });

  await Promise.all([
    ...deletions,
    ...saves,
  ]);
}

export async function resetPropertySetupForDevelopment() {
  if (!import.meta.env.DEV) {
    throw new Error(
      "Property setup reset is only available in development.",
    );
  }

  const spacesSnapshot =
    await getDocs(
      getPropertySpacesCollection(),
    );

  const setupSpaces =
    spacesSnapshot.docs.filter(
      (spaceDocument) =>
        spaceDocument.id.startsWith(
          "setup-",
        ),
    );

  await Promise.all(
    setupSpaces.map(
      (spaceDocument) =>
        deleteDoc(
          spaceDocument.ref,
        ),
    ),
  );

  await deleteDoc(
    getPropertyConfigReference(),
  );
}