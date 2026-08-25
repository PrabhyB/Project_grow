import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import {
  subscribeToPropertyConfig,
  subscribeToPropertySpaces,
  type PropertyConfig,
  type PropertyPoint,
  type PropertySpace,
} from "../services/propertyService";

import {
  createPropertyObject,
  deletePropertyObject,
  subscribeToPropertyObjects,
  updatePropertyObject,
  type PropertyObject,
} from "../services/propertyObjectService";

import {
  createGardenArea,
  deleteGardenArea,
  subscribeToGardens,
  updateGardenArea,
  type GardenArea,
  type GardenAreaType,
  type GrowingAreaKind,
} from "../services/gardenService";

import {
  getGardenPlantCount,
} from "../services/plantService";

import {
  useNavigate,
} from "react-router-dom";

import "./SavedPropertyLayout.css";

type SavedPropertyLayoutProps = {
  fallback?: ReactNode;
};

type ObjectDraft = {
  id: string;
  widthM: string;
  depthM: string;
  rotation: string;
  physicalHeightM: string;
};

type ObjectDrag = {
  id: string;
  offsetX: number;
  offsetY: number;
} | null;

type ObjectDragPreview = {
  id: string;
  x: number;
  y: number;
} | null;

function clamp(
  value: number,
  minimum: number,
  maximum: number,
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}

function pointOnSegment(
  point: PropertyPoint,
  start: PropertyPoint,
  end: PropertyPoint,
) {
  const tolerance = 0.0001;

  const cross =
    (
      point.y -
      start.y
    ) *
      (
        end.x -
        start.x
      ) -
    (
      point.x -
      start.x
    ) *
      (
        end.y -
        start.y
      );

  if (
    Math.abs(cross) >
    tolerance
  ) {
    return false;
  }

  const dot =
    (
      point.x -
      start.x
    ) *
      (
        end.x -
        start.x
      ) +
    (
      point.y -
      start.y
    ) *
      (
        end.y -
        start.y
      );

  if (
    dot <
    -tolerance
  ) {
    return false;
  }

  const lengthSquared =
    (
      end.x -
      start.x
    ) ** 2 +
    (
      end.y -
      start.y
    ) ** 2;

  return (
    dot <=
    lengthSquared +
      tolerance
  );
}

function pointInPolygon(
  point: PropertyPoint,
  polygon: PropertyPoint[],
) {
  if (
    polygon.length < 3
  ) {
    return false;
  }

  for (
    let index = 0;
    index <
    polygon.length;
    index += 1
  ) {
    const nextIndex =
      (
        index + 1
      ) %
      polygon.length;

    if (
      pointOnSegment(
        point,
        polygon[index],
        polygon[nextIndex],
      )
    ) {
      return true;
    }
  }

  let inside = false;

  for (
    let index = 0,
      previous =
        polygon.length - 1;
    index <
    polygon.length;
    previous = index++
  ) {
    const current =
      polygon[index];

    const prior =
      polygon[previous];

    const crosses =
      (
        current.y >
        point.y
      ) !==
        (
          prior.y >
          point.y
        ) &&
      point.x <
        (
          (
            prior.x -
            current.x
          ) *
            (
              point.y -
              current.y
            )
        ) /
          (
            prior.y -
            current.y
          ) +
          current.x;

    if (crosses) {
      inside = !inside;
    }
  }

  return inside;
}

function getGrowingAreaCorners(
  centreX: number,
  centreY: number,
  widthM: number,
  depthM: number,
  rotation: number,
): PropertyPoint[] {
  const radians =
    (
      rotation *
      Math.PI
    ) /
    180;

  const cosine =
    Math.cos(
      radians,
    );

  const sine =
    Math.sin(
      radians,
    );

  const halfWidth =
    widthM / 2;

  const halfDepth =
    depthM / 2;

  const corners = [
    {
      x: -halfWidth,
      y: -halfDepth,
    },
    {
      x: halfWidth,
      y: -halfDepth,
    },
    {
      x: halfWidth,
      y: halfDepth,
    },
    {
      x: -halfWidth,
      y: halfDepth,
    },
  ];

  return corners.map(
    (corner) => ({
      x:
        centreX +
        corner.x *
          cosine -
        corner.y *
          sine,

      y:
        centreY +
        corner.x *
          sine +
        corner.y *
          cosine,
    }),
  );
}

function isGrowingAreaInsideSpace(
  space: PropertySpace,
  widthM: number,
  depthM: number,
  rotation: number,
  layoutX: number,
  layoutY: number,
) {
  if (
    !space.boundary ||
    space.boundary.length <
      3
  ) {
    return false;
  }

  const centreX =
    layoutX *
    space.widthM;

  const centreY =
    layoutY *
    space.depthM;

  const corners =
    getGrowingAreaCorners(
      centreX,
      centreY,
      widthM,
      depthM,
      rotation,
    );

  /*
   * Check several points along
   * every edge as well as the
   * centre. This also catches
   * concave L/U/T-shaped spaces.
   */
  const pointsToCheck:
    PropertyPoint[] = [
      {
        x: centreX,
        y: centreY,
      },
    ];

  corners.forEach(
    (
      corner,
      index,
    ) => {
      const nextCorner =
        corners[
          (
            index + 1
          ) %
            corners.length
        ];

      for (
        let step = 0;
        step <= 4;
        step += 1
      ) {
        const progress =
          step / 4;

        pointsToCheck.push({
          x:
            corner.x +
            (
              nextCorner.x -
              corner.x
            ) *
              progress,

          y:
            corner.y +
            (
              nextCorner.y -
              corner.y
            ) *
              progress,
        });
      }
    },
  );

  return pointsToCheck.every(
    (point) =>
      pointInPolygon(
        point,
        space.boundary,
      ),
  );
}

function findValidGrowingAreaPosition(
  space: PropertySpace,
  widthM: number,
  depthM: number,
  rotation: number,
  preferredX: number,
  preferredY: number,
) {
  const radians =
    (
      rotation *
      Math.PI
    ) /
    180;

  const halfWidth =
    Math.abs(
      Math.cos(
        radians,
      ),
    ) *
      (
        widthM / 2
      ) +
    Math.abs(
      Math.sin(
        radians,
      ),
    ) *
      (
        depthM / 2
      );

  const halfDepth =
    Math.abs(
      Math.sin(
        radians,
      ),
    ) *
      (
        widthM / 2
      ) +
    Math.abs(
      Math.cos(
        radians,
      ),
    ) *
      (
        depthM / 2
      );

  if (
    halfWidth * 2 >
      space.widthM ||
    halfDepth * 2 >
      space.depthM
  ) {
    return null;
  }

  const minimumX =
    halfWidth /
    space.widthM;

  const maximumX =
    1 -
    minimumX;

  const minimumY =
    halfDepth /
    space.depthM;

  const maximumY =
    1 -
    minimumY;

  const preferred = {
    x:
      clamp(
        preferredX,
        minimumX,
        maximumX,
      ),

    y:
      clamp(
        preferredY,
        minimumY,
        maximumY,
      ),
  };

  if (
    isGrowingAreaInsideSpace(
      space,
      widthM,
      depthM,
      rotation,
      preferred.x,
      preferred.y,
    )
  ) {
    return preferred;
  }

  /*
   * Search for the nearest
   * valid location if the
   * preferred position sits
   * in a cut-out.
   */
  let best:
    {
      x: number;
      y: number;
      distance: number;
    } | null =
    null;

  const steps = 20;

  for (
    let row = 0;
    row <= steps;
    row += 1
  ) {
    const y =
      minimumY +
      (
        maximumY -
        minimumY
      ) *
        (
          row /
          steps
        );

    for (
      let column = 0;
      column <= steps;
      column += 1
    ) {
      const x =
        minimumX +
        (
          maximumX -
          minimumX
        ) *
          (
            column /
            steps
          );

      if (
        !isGrowingAreaInsideSpace(
          space,
          widthM,
          depthM,
          rotation,
          x,
          y,
        )
      ) {
        continue;
      }

      const distance =
        (
          x -
          preferred.x
        ) ** 2 +
        (
          y -
          preferred.y
        ) ** 2;

      if (
        !best ||
        distance <
          best.distance
      ) {
        best = {
          x,
          y,
          distance,
        };
      }
    }
  }

  if (!best) {
    return null;
  }

  return {
    x: best.x,
    y: best.y,
  };
}

function getBoundarySize(
  boundary: PropertyPoint[],
) {
  if (
    boundary.length === 0
  ) {
    return {
      width: 1,
      depth: 1,
    };
  }

  const xs =
    boundary.map(
      (point) => point.x,
    );

  const ys =
    boundary.map(
      (point) => point.y,
    );

  return {
    width:
      Math.max(...xs) -
        Math.min(...xs) ||
      1,

    depth:
      Math.max(...ys) -
        Math.min(...ys) ||
      1,
  };
}

function getObjectSize(
  object: PropertyObject,
) {
  return {
    widthM:
      object.widthM ??
      Math.max(
        0.2,
        object.width / 20,
      ),

    depthM:
      object.depthM ??
      Math.max(
        0.2,
        object.height / 20,
      ),
  };
}

function getObjectPosition(
  object: PropertyObject,
) {
  /*
   * New objects use normalized
   * layout coordinates.
   *
   * The fallback converts objects
   * created by the older map.
   */
  return {
    x:
      object.layoutX ??
      clamp(
        (
          object.x +
          object.width / 2
        ) / 1000,
        0.04,
        0.96,
      ),

    y:
      object.layoutY ??
      clamp(
        (
          object.y +
          object.height / 2
        ) / 620,
        0.04,
        0.96,
      ),
  };
}

type GrowingAreaDraft = {
  name: string;

  propertySpaceId:
    string;

  growingAreaKind:
    GrowingAreaKind;

  widthM: string;
  depthM: string;

  rotation: string;
};

type GrowingAreaEditDraft = {
  id: string;

  name: string;

  propertySpaceId: string;

  growingAreaKind:
    GrowingAreaKind;

  widthM: string;
  depthM: string;

  rotation: string;
};

type GrowingAreaDrag = {
  id: string;

  startClientX: number;
  startClientY: number;

  startX: number;
  startY: number;

  parentRotation: number;

  parentWidthPx: number;
  parentDepthPx: number;
} | null;

type GrowingAreaDragPreview = {
  id: string;

  x: number;
  y: number;
} | null;

const growingAreaKindOptions: {
  value: GrowingAreaKind;
  label: string;
  icon: string;
}[] = [
  {
    value: "raised-bed",
    label: "Raised bed",
    icon: "🪴",
  },
  {
    value:
      "vegetable-patch",
    label:
      "Vegetable patch",
    icon: "🥕",
  },
  {
    value: "herb-bed",
    label: "Herb bed",
    icon: "🌿",
  },
  {
    value: "border",
    label: "Garden border",
    icon: "🌷",
  },
  {
    value: "containers",
    label: "Container area",
    icon: "🪴",
  },
  {
    value: "grow-bags",
    label: "Grow bags",
    icon: "🍅",
  },
  {
    value:
      "greenhouse-bed",
    label:
      "Greenhouse bed",
    icon: "🏡",
  },
  {
    value: "custom",
    label: "Custom",
    icon: "✏️",
  },
];

function getGardenAreaType(
  kind: GrowingAreaKind,
): GardenAreaType {
  if (
    kind === "herb-bed"
  ) {
    return "herb";
  }

  if (
    kind ===
      "raised-bed" ||
    kind ===
      "vegetable-patch" ||
    kind ===
      "grow-bags" ||
    kind ===
      "greenhouse-bed"
  ) {
    return "vegetable";
  }

  return "garden";
}

export default function SavedPropertyLayout({
  fallback,
}: SavedPropertyLayoutProps) {

  const navigate =
  useNavigate();
  const [
    config,
    setConfig,
  ] =
    useState<PropertyConfig | null>(
      null,
    );

  const [
    spaces,
    setSpaces,
  ] =
    useState<PropertySpace[]>([]);

  const [
    objects,
    setObjects,
  ] =
    useState<PropertyObject[]>([]);

  const [
    hasLoaded,
    setHasLoaded,
  ] = useState(false);

  const [
    isObjectEditing,
    setIsObjectEditing,
  ] = useState(false);

  const [
  growingAreas,
  setGrowingAreas,
] =
  useState<GardenArea[]>([]);

  const [
  isGrowingAreaEditing,
  setIsGrowingAreaEditing,
] = useState(false);

const [
  selectedGrowingAreaId,
  setSelectedGrowingAreaId,
] =
  useState<string | null>(
    null,
  );

const [
  growingAreaEditDraft,
  setGrowingAreaEditDraft,
] =
  useState<GrowingAreaEditDraft | null>(
    null,
  );

const [
  growingAreaDrag,
  setGrowingAreaDrag,
] =
  useState<GrowingAreaDrag>(
    null,
  );

const [
  growingAreaDragPreview,
  setGrowingAreaDragPreview,
] =
  useState<GrowingAreaDragPreview>(
    null,
  );

const [
  showGrowingAreaForm,
  setShowGrowingAreaForm,
] = useState(false);

const [
  growingAreaDraft,
  setGrowingAreaDraft,
] =
  useState<GrowingAreaDraft>({
    name: "Growing Area",

    propertySpaceId: "",

    growingAreaKind:
      "raised-bed",

    widthM: "2",
    depthM: "1",

    rotation: "0",
  });

const [
  growingAreaError,
  setGrowingAreaError,
] = useState("");

const [
  isGrowingAreaSaving,
  setIsGrowingAreaSaving,
] = useState(false);

  const [
    selectedObjectId,
    setSelectedObjectId,
  ] = useState<string | null>(
    null,
  );

  const [
    objectDraft,
    setObjectDraft,
  ] =
    useState<ObjectDraft | null>(
      null,
    );

  const [
    objectDrag,
    setObjectDrag,
  ] =
    useState<ObjectDrag>(null);

  const [
    objectDragPreview,
    setObjectDragPreview,
  ] =
    useState<ObjectDragPreview>(
      null,
    );

  const [
    objectError,
    setObjectError,
  ] = useState("");

  const [
    isObjectSaving,
    setIsObjectSaving,
  ] = useState(false);

  const canvasRef =
    useRef<HTMLDivElement | null>(
      null,
    );

    const [
  viewZoom,
  setViewZoom,
] = useState(1);

const [
  viewPan,
  setViewPan,
] = useState({
  x: 0,
  y: 0,
});

  useEffect(() => {
    let configLoaded = false;
    let spacesLoaded = false;
    let objectsLoaded = false;

    const updateLoaded =
      () => {
        if (
          configLoaded &&
          spacesLoaded &&
          objectsLoaded
        ) {
          setHasLoaded(true);
        }
      };

    const unsubscribeConfig =
      subscribeToPropertyConfig(
        (nextConfig) => {
          configLoaded = true;

          setConfig(
            nextConfig,
          );

          updateLoaded();
        },
        (error) => {
          console.error(
            "Unable to load property config:",
            error,
          );

          configLoaded = true;
          updateLoaded();
        },
      );

    const unsubscribeSpaces =
      subscribeToPropertySpaces(
        (nextSpaces) => {
          spacesLoaded = true;

          setSpaces(
            nextSpaces,
          );

          updateLoaded();
        },
        (error) => {
          console.error(
            "Unable to load property spaces:",
            error,
          );

          spacesLoaded = true;
          updateLoaded();
        },
      );

    const unsubscribeObjects =
      subscribeToPropertyObjects(
        (nextObjects) => {
          objectsLoaded = true;

          setObjects(
            nextObjects,
          );

          updateLoaded();
        },
        (error) => {
          console.error(
            "Unable to load property objects:",
            error,
          );

          objectsLoaded = true;
          updateLoaded();
        },
      );

    return () => {
      unsubscribeConfig();
      unsubscribeSpaces();
      unsubscribeObjects();
    };
  }, []);

  useEffect(() => {
  const unsubscribe =
    subscribeToGardens(
      (nextGardens) => {
        setGrowingAreas(
          nextGardens,
        );
      },
      (error) => {
        console.error(
          "Unable to load growing areas:",
          error,
        );
      },
    );

  return unsubscribe;
}, []);

  const structure =
    useMemo(
      () =>
        objects.find(
          (object) =>
            object.id ===
            "setup-main-structure",
        ) ?? null,
      [objects],
    );

  const editableObjects =
    useMemo(
      () =>
        objects.filter(
          (object) =>
            object.id !==
              "setup-main-structure" &&
            (
              object.type ===
                "tree" ||
              object.type ===
                "fence"
            ),
        ),
      [objects],
    );

  const selectedObject =
    useMemo(
      () =>
        editableObjects.find(
          (object) =>
            object.id ===
            selectedObjectId,
        ) ?? null,
      [
        editableObjects,
        selectedObjectId,
      ],
    );

    const selectedGrowingArea =
  useMemo(
    () =>
      growingAreas.find(
        (area) =>
          area.id ===
          selectedGrowingAreaId,
      ) ?? null,
    [
      growingAreas,
      selectedGrowingAreaId,
    ],
  );

  function selectObject(
    object: PropertyObject,
  ) {
    const size =
      getObjectSize(object);

    setSelectedObjectId(
      object.id,
    );

    setObjectDraft({
      id:
        object.id,

      widthM:
        String(
          size.widthM,
        ),

      depthM:
        String(
          size.depthM,
        ),

      rotation:
        String(
          object.rotation ??
            0,
        ),

      physicalHeightM:
        String(
          object.physicalHeightM ??
            (
              object.type ===
              "tree"
                ? 4
                : 1.8
            ),
        ),
    });

    setObjectError("");
  }

  function selectGrowingArea(
  area: GardenArea,
) {
  setSelectedGrowingAreaId(
    area.id,
  );

  setGrowingAreaEditDraft({
    id: area.id,

    name:
      area.name,

    propertySpaceId:
      area.propertySpaceId ??
      "",

    growingAreaKind:
      area.growingAreaKind ??
      "custom",

    widthM:
      String(
        area.widthM ??
          Math.max(
            0.1,
            area.width /
              20,
          ),
      ),

    depthM:
      String(
        area.depthM ??
          Math.max(
            0.1,
            area.height /
              20,
          ),
      ),

    rotation:
      String(
        area.rotation ??
          0,
      ),
  });

  setGrowingAreaError(
    "",
  );
}

  async function handleAddTree() {
    setObjectError("");
    setIsObjectSaving(true);

    try {
      const id =
        await createPropertyObject({
          type: "tree",
          name: "Tree",

          // Legacy map compatibility.
          x: 675,
          y: 120,
          width: 90,
          height: 90,

          // New property layout.
          layoutX: 0.72,
          layoutY: 0.28,

          // Approximate canopy.
          widthM: 4.5,
          depthM: 4.5,

          rotation: 0,

          physicalHeightM: 4,
        });

      setIsObjectEditing(true);

      setSelectedObjectId(
        id,
      );

      setObjectDraft({
        id,
        widthM: "4.5",
        depthM: "4.5",
        rotation: "0",
        physicalHeightM: "4",
      });
    } catch (error) {
      console.error(
        "Unable to add tree:",
        error,
      );

      setObjectError(
        error instanceof Error
          ? error.message
          : "The tree could not be added.",
      );
    } finally {
      setIsObjectSaving(false);
    }
  }

  async function handleAddFence() {
    setObjectError("");
    setIsObjectSaving(true);

    try {
      const id =
        await createPropertyObject({
          type: "fence",
          name: "Fence",

          // Legacy compatibility.
          x: 390,
          y: 500,
          width: 220,
          height: 14,

          // New property layout.
          layoutX: 0.5,
          layoutY: 0.82,

          widthM: 8,
          depthM: 0.35,

          rotation: 0,

          physicalHeightM: 1.8,
        });

      setIsObjectEditing(true);

      setSelectedObjectId(
        id,
      );

      setObjectDraft({
        id,
        widthM: "8",
        depthM: "0.35",
        rotation: "0",
        physicalHeightM:
          "1.8",
      });
    } catch (error) {
      console.error(
        "Unable to add fence:",
        error,
      );

      setObjectError(
        error instanceof Error
          ? error.message
          : "The fence could not be added.",
      );
    } finally {
      setIsObjectSaving(false);
    }
  }

  function openGrowingAreaCreator() {
  const firstSpace =
    spaces.find(
      (space) =>
        space.id.startsWith(
          "setup-",
        ),
    ) ??
    spaces[0];

  if (!firstSpace) {
    setGrowingAreaError(
      "Add a property space before creating a growing area.",
    );

    return;
  }

  setGrowingAreaDraft({
    name: "Growing Area",

    propertySpaceId:
      firstSpace.id,

    growingAreaKind:
      "raised-bed",

    widthM: "2",
    depthM: "1",

    rotation: "0",
  });

  setGrowingAreaError("");

  setShowGrowingAreaForm(
    true,
  );
}

async function handleCreateGrowingArea() {
  const parentSpace =
    spaces.find(
      (space) =>
        space.id ===
        growingAreaDraft
          .propertySpaceId,
    );

  if (!parentSpace) {
    setGrowingAreaError(
      "Choose where this growing area belongs.",
    );

    return;
  }

  const name =
    growingAreaDraft
      .name
      .trim();

  const widthM =
    Number(
      growingAreaDraft.widthM,
    );

  const depthM =
    Number(
      growingAreaDraft.depthM,
    );

  const rotation =
    Number(
      growingAreaDraft.rotation,
    );

  if (!name) {
    setGrowingAreaError(
      "Give the growing area a name.",
    );

    return;
  }

  if (
    !Number.isFinite(
      widthM,
    ) ||
    widthM <= 0 ||
    !Number.isFinite(
      depthM,
    ) ||
    depthM <= 0
  ) {
    setGrowingAreaError(
      "Enter valid dimensions.",
    );

    return;
  }

  if (
    widthM >
      parentSpace.widthM ||
    depthM >
      parentSpace.depthM
  ) {
    setGrowingAreaError(
      `${name} is larger than ${parentSpace.name}.`,
    );

    return;
  }

  if (
    !Number.isFinite(
      rotation,
    )
  ) {
    setGrowingAreaError(
      "Enter a valid rotation.",
    );

    return;
  }

  setGrowingAreaError("");
  setIsGrowingAreaSaving(
    true,
  );

  try {
    const kind =
      growingAreaDraft
        .growingAreaKind;

    const kindLabel =
      growingAreaKindOptions.find(
        (option) =>
          option.value === kind,
      )?.label ??
      "Growing area";

    const newAreaId =
  await createGardenArea({
      name,

      description:
        `${kindLabel} in ${parentSpace.name}.`,

      type:
        getGardenAreaType(
          kind,
        ),

      propertySpaceId:
        parentSpace.id,

      growingAreaKind:
        kind,

      // Starts in the centre
      // of its parent space.
      layoutX: 0.5,
      layoutY: 0.5,

      widthM,
      depthM,

      rotation,

      // Legacy compatibility.
      x: 0,
      y: 0,

      width:
        Math.round(
          widthM * 20,
        ),

      height:
        Math.round(
          depthM * 20,
        ),
    });

    setShowGrowingAreaForm(
  false,
);

setIsGrowingAreaEditing(
  true,
);

setIsObjectEditing(
  false,
);

setSelectedGrowingAreaId(
  newAreaId,
);

setGrowingAreaEditDraft({
  id:
    newAreaId,

  name,

  propertySpaceId:
    parentSpace.id,

  growingAreaKind:
    kind,

  widthM:
    String(widthM),

  depthM:
    String(depthM),

  rotation:
    String(rotation),
});

  } catch (error) {
    console.error(
      "Unable to create growing area:",
      error,
    );

    setGrowingAreaError(
      error instanceof Error
        ? error.message
        : "The growing area could not be created.",
    );
  } finally {
    setIsGrowingAreaSaving(
      false,
    );
  }
}

  function startObjectDrag(
    event:
      ReactPointerEvent<HTMLDivElement>,
    object: PropertyObject,
  ) {
    if (!isObjectEditing) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    selectObject(
      object,
    );

    const rectangle =
      canvas.getBoundingClientRect();

    const savedPosition =
  getObjectPosition(
    object,
  );

const viewedPosition =
  projectLayoutPosition(
    savedPosition.x,
    savedPosition.y,
  );

const centreX =
  rectangle.left +
  viewedPosition.x *
    rectangle.width;

const centreY =
  rectangle.top +
  viewedPosition.y *
    rectangle.height;

    setObjectDrag({
      id:
        object.id,

      offsetX:
        event.clientX -
        centreX,

      offsetY:
        event.clientY -
        centreY,
    });

    setObjectDragPreview({
      id:
        object.id,

      x:
        savedPosition.x,

      y:
        savedPosition.y,
    });

    event.currentTarget
      .setPointerCapture(
        event.pointerId,
      );
  }

  function moveObjectDrag(
    event:
      ReactPointerEvent<HTMLDivElement>,
    object: PropertyObject,
  ) {
    if (
      !isObjectEditing ||
      objectDrag?.id !==
        object.id
    ) {
      return;
    }

    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const rectangle =
      canvas.getBoundingClientRect();

    const screenX =
  (
    event.clientX -
    rectangle.left -
    objectDrag.offsetX
  ) /
  rectangle.width;

const screenY =
  (
    event.clientY -
    rectangle.top -
    objectDrag.offsetY
  ) /
  rectangle.height;

const modelPosition =
  unprojectLayoutPosition(
    screenX,
    screenY,
  );

const x =
  modelPosition.x;

const y =
  modelPosition.y;

    setObjectDragPreview({
      id:
        object.id,

      x:
        clamp(
          x,
          0.03,
          0.97,
        ),

      y:
        clamp(
          y,
          0.03,
          0.97,
        ),
    });
  }

  function finishObjectDrag(
    event:
      ReactPointerEvent<HTMLDivElement>,
    object: PropertyObject,
  ) {
    if (
      !isObjectEditing ||
      objectDrag?.id !==
        object.id
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (
      event.currentTarget
        .hasPointerCapture(
          event.pointerId,
        )
    ) {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId,
        );
    }

    const preview =
      objectDragPreview;

    setObjectDrag(null);
    setObjectDragPreview(null);

    if (
      !preview ||
      preview.id !==
        object.id
    ) {
      return;
    }

    void updatePropertyObject(
      object.id,
      {
        layoutX:
          preview.x,

        layoutY:
          preview.y,
      },
    ).catch((error) => {
      console.error(
        "Unable to save object position:",
        error,
      );

      setObjectError(
        error instanceof Error
          ? error.message
          : "The new position could not be saved.",
      );
    });
  }

  function startGrowingAreaDrag(
  event:
    ReactPointerEvent<HTMLButtonElement>,
  area: GardenArea,
  space: PropertySpace,
) {
  if (
    !isGrowingAreaEditing
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (
    area.layoutX ===
      undefined ||
    area.layoutY ===
      undefined
  ) {
    return;
  }

  selectGrowingArea(
    area,
  );

  setGrowingAreaDrag({
    id: area.id,

    startClientX:
      event.clientX,

    startClientY:
      event.clientY,

    startX:
      area.layoutX,

    startY:
      area.layoutY,

    parentRotation:
      space.rotation ??
      0,

    parentWidthPx:
  space.widthM *
  viewPixelsPerMetre,

parentDepthPx:
  space.depthM *
  viewPixelsPerMetre,
  });

  setGrowingAreaDragPreview({
    id: area.id,

    x:
      area.layoutX,

    y:
      area.layoutY,
  });

  event.currentTarget
    .setPointerCapture(
      event.pointerId,
    );
}

function moveGrowingAreaDrag(
  event:
    ReactPointerEvent<HTMLButtonElement>,
  area: GardenArea,
  space: PropertySpace,
) {
  if (
    !isGrowingAreaEditing ||
    growingAreaDrag?.id !==
      area.id
  ) {
    return;
  }

  const widthM =
    area.widthM ??
    area.width / 20;

  const depthM =
    area.depthM ??
    area.height / 20;

  const deltaX =
    event.clientX -
    growingAreaDrag
      .startClientX;

  const deltaY =
    event.clientY -
    growingAreaDrag
      .startClientY;

  /*
   * The PropertySpace itself may
   * be rotated. Convert screen
   * movement back into its local
   * coordinate system first.
   */
  const radians =
    (
      -growingAreaDrag
        .parentRotation *
      Math.PI
    ) /
    180;

  const localDeltaX =
    deltaX *
      Math.cos(
        radians,
      ) -
    deltaY *
      Math.sin(
        radians,
      );

  const localDeltaY =
    deltaX *
      Math.sin(
        radians,
      ) +
    deltaY *
      Math.cos(
        radians,
      );

  const proposedX =
    growingAreaDrag
      .startX +
    localDeltaX /
      growingAreaDrag
        .parentWidthPx;

  const proposedY =
    growingAreaDrag
      .startY +
    localDeltaY /
      growingAreaDrag
        .parentDepthPx;

  const validPosition =
    findValidGrowingAreaPosition(
      space,
      widthM,
      depthM,
      area.rotation ??
        0,
      proposedX,
      proposedY,
    );

  if (!validPosition) {
    return;
  }

  setGrowingAreaDragPreview({
    id: area.id,

    x:
      validPosition.x,

    y:
      validPosition.y,
  });
}

function finishGrowingAreaDrag(
  event:
    ReactPointerEvent<HTMLButtonElement>,
  area: GardenArea,
) {
  if (
    growingAreaDrag?.id !==
    area.id
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (
    event.currentTarget
      .hasPointerCapture(
        event.pointerId,
      )
  ) {
    event.currentTarget
      .releasePointerCapture(
        event.pointerId,
      );
  }

  const preview =
    growingAreaDragPreview;

  setGrowingAreaDrag(
    null,
  );

  setGrowingAreaDragPreview(
    null,
  );

  if (
    !preview ||
    preview.id !==
      area.id
  ) {
    return;
  }

  void updateGardenArea(
    area.id,
    {
      layoutX:
        preview.x,

      layoutY:
        preview.y,
    },
  ).catch(
    (error) => {
      console.error(
        "Unable to save growing area position:",
        error,
      );

      setGrowingAreaError(
        error instanceof Error
          ? error.message
          : "The new position could not be saved.",
      );
    },
  );
}

async function handleSaveGrowingArea() {
  if (
    !selectedGrowingArea ||
    !growingAreaEditDraft
  ) {
    return;
  }

  const parentSpace =
    spaces.find(
      (space) =>
        space.id ===
        growingAreaEditDraft
          .propertySpaceId,
    );

  if (!parentSpace) {
    setGrowingAreaError(
      "Choose a property space.",
    );

    return;
  }

  const name =
    growingAreaEditDraft
      .name
      .trim();

  const widthM =
    Number(
      growingAreaEditDraft
        .widthM,
    );

  const depthM =
    Number(
      growingAreaEditDraft
        .depthM,
    );

  const rotation =
    Number(
      growingAreaEditDraft
        .rotation,
    );

  if (!name) {
    setGrowingAreaError(
      "Give the growing area a name.",
    );

    return;
  }

  if (
    !Number.isFinite(
      widthM,
    ) ||
    widthM <= 0 ||
    !Number.isFinite(
      depthM,
    ) ||
    depthM <= 0 ||
    !Number.isFinite(
      rotation,
    )
  ) {
    setGrowingAreaError(
      "Check the dimensions and rotation.",
    );

    return;
  }

  const parentChanged =
    parentSpace.id !==
    selectedGrowingArea
      .propertySpaceId;

  const preferredX =
    parentChanged
      ? 0.5
      : selectedGrowingArea
          .layoutX ??
        0.5;

  const preferredY =
    parentChanged
      ? 0.5
      : selectedGrowingArea
          .layoutY ??
        0.5;

  const validPosition =
    findValidGrowingAreaPosition(
      parentSpace,
      widthM,
      depthM,
      rotation,
      preferredX,
      preferredY,
    );

  if (!validPosition) {
    setGrowingAreaError(
      `${name} does not fit inside ${parentSpace.name}. Reduce its dimensions or choose another space.`,
    );

    return;
  }

  const kind =
    growingAreaEditDraft
      .growingAreaKind;

  const kindLabel =
    growingAreaKindOptions.find(
      (option) =>
        option.value ===
        kind,
    )?.label ??
    "Growing area";

  setGrowingAreaError("");
  setIsGrowingAreaSaving(
    true,
  );

  try {
    await updateGardenArea(
      selectedGrowingArea.id,
      {
        name,

        description:
          `${kindLabel} in ${parentSpace.name}.`,

        type:
          getGardenAreaType(
            kind,
          ),

        propertySpaceId:
          parentSpace.id,

        growingAreaKind:
          kind,

        widthM,
        depthM,

        rotation,

        layoutX:
          validPosition.x,

        layoutY:
          validPosition.y,

        // Legacy compatibility.
        width:
          Math.round(
            widthM * 20,
          ),

        height:
          Math.round(
            depthM * 20,
          ),
      },
    );
  } catch (error) {
    console.error(
      "Unable to save growing area:",
      error,
    );

    setGrowingAreaError(
      error instanceof Error
        ? error.message
        : "The growing area could not be saved.",
    );
  } finally {
    setIsGrowingAreaSaving(
      false,
    );
  }
}

async function handleDeleteGrowingArea() {
  if (
    !selectedGrowingArea
  ) {
    return;
  }

  setGrowingAreaError("");
  setIsGrowingAreaSaving(
    true,
  );

  try {
    const plantCount =
      await getGardenPlantCount(
        selectedGrowingArea.id,
      );

    if (
      plantCount > 0
    ) {
      setGrowingAreaError(
        `${selectedGrowingArea.name} contains ${plantCount} ${
          plantCount === 1
            ? "plant"
            : "plants"
        }. Move or remove those plants before deleting the growing area.`,
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${selectedGrowingArea.name}"?\n\nThis cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    await deleteGardenArea(
      selectedGrowingArea.id,
    );

    setSelectedGrowingAreaId(
      null,
    );

    setGrowingAreaEditDraft(
      null,
    );
  } catch (error) {
    console.error(
      "Unable to delete growing area:",
      error,
    );

    setGrowingAreaError(
      error instanceof Error
        ? error.message
        : "The growing area could not be deleted.",
    );
  } finally {
    setIsGrowingAreaSaving(
      false,
    );
  }
}

  async function handleSaveObject() {
    if (
      !selectedObject ||
      !objectDraft
    ) {
      return;
    }

    const widthM =
      Number(
        objectDraft.widthM,
      );

    const depthM =
      Number(
        objectDraft.depthM,
      );

    const rotation =
      Number(
        objectDraft.rotation,
      );

    const physicalHeightM =
      Number(
        objectDraft
          .physicalHeightM,
      );

    if (
      !Number.isFinite(
        widthM,
      ) ||
      widthM <= 0 ||
      !Number.isFinite(
        depthM,
      ) ||
      depthM <= 0
    ) {
      setObjectError(
        "Enter valid dimensions.",
      );

      return;
    }

    if (
      !Number.isFinite(
        rotation,
      )
    ) {
      setObjectError(
        "Enter a valid rotation.",
      );

      return;
    }

    if (
      !Number.isFinite(
        physicalHeightM,
      ) ||
      physicalHeightM <= 0
    ) {
      setObjectError(
        "Enter a valid physical height.",
      );

      return;
    }

    setObjectError("");
    setIsObjectSaving(true);

    try {
      await updatePropertyObject(
        selectedObject.id,
        {
          widthM,
          depthM,

          rotation,

          physicalHeightM,
        },
      );
    } catch (error) {
      console.error(
        "Unable to save property object:",
        error,
      );

      setObjectError(
        error instanceof Error
          ? error.message
          : "The object could not be saved.",
      );
    } finally {
      setIsObjectSaving(false);
    }
  }

  async function handleDeleteObject() {
    if (!selectedObject) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${selectedObject.name}"?\n\nThis cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      await deletePropertyObject(
        selectedObject.id,
      );

      setSelectedObjectId(
        null,
      );

      setObjectDraft(
        null,
      );
    } catch (error) {
      console.error(
        "Unable to delete property object:",
        error,
      );

      setObjectError(
        error instanceof Error
          ? error.message
          : "The object could not be deleted.",
      );
    }
  }

  if (!hasLoaded) {
    return (
      <>
        {fallback}
      </>
    );
  }

  if (
    !config?.setupComplete ||
    spaces.length === 0
  ) {
    return (
      <>
        {fallback}
      </>
    );
  }

  const dimensions: number[] =
    [];

  spaces.forEach(
    (space) => {
      dimensions.push(
        space.widthM,
        space.depthM,
      );
    },
  );

  if (
    structure?.boundary
  ) {
    const size =
      getBoundarySize(
        structure.boundary,
      );

    dimensions.push(
      structure.widthM ??
        size.width,

      structure.depthM ??
        size.depth,
    );
  }

  editableObjects.forEach(
    (object) => {
      const size =
        getObjectSize(
          object,
        );

      dimensions.push(
        size.widthM,
        size.depthM,
      );
    },
  );

  const largestDimension =
    Math.max(
      10,
      ...dimensions,
    );

  const pixelsPerMetre =
    Math.max(
      8,
      Math.min(
        32,
        420 /
          largestDimension,
      ),
    );

    const viewPixelsPerMetre =
  pixelsPerMetre *
  viewZoom;

function projectLayoutPosition(
  x: number,
  y: number,
) {
  return {
    x:
      0.5 +
      (
        x - 0.5
      ) *
        viewZoom +
      viewPan.x,

    y:
      0.5 +
      (
        y - 0.5
      ) *
        viewZoom +
      viewPan.y,
  };
}

function unprojectLayoutPosition(
  x: number,
  y: number,
) {
  return {
    x:
      0.5 +
      (
        x -
        0.5 -
        viewPan.x
      ) /
        viewZoom,

    y:
      0.5 +
      (
        y -
        0.5 -
        viewPan.y
      ) /
        viewZoom,
  };
}
function handleFitView() {
  const canvas =
    canvasRef.current;

  if (!canvas) {
    return;
  }

  const rectangle =
    canvas.getBoundingClientRect();

  if (
    rectangle.width <= 0 ||
    rectangle.height <= 0
  ) {
    return;
  }

  const bounds: {
    x: number;
    y: number;
    halfWidth: number;
    halfDepth: number;
  }[] = [];

  function addToBounds(
    x: number,
    y: number,
    widthM: number,
    depthM: number,
  ) {
    bounds.push({
      x,
      y,

      halfWidth:
        (
          widthM *
          pixelsPerMetre
        ) /
        (
          2 *
          rectangle.width
        ),

      halfDepth:
        (
          depthM *
          pixelsPerMetre
        ) /
        (
          2 *
          rectangle.height
        ),
    });
  }

  if (
    structure &&
    structure.layoutX !==
      undefined &&
    structure.layoutY !==
      undefined
  ) {
    const boundarySize =
      structure.boundary
        ? getBoundarySize(
            structure.boundary,
          )
        : {
            width: 1,
            depth: 1,
          };

    addToBounds(
      structure.layoutX,
      structure.layoutY,

      structure.widthM ??
        boundarySize.width,

      structure.depthM ??
        boundarySize.depth,
    );
  }

  spaces.forEach(
    (space) => {
      if (
        space.layoutX ===
          undefined ||
        space.layoutY ===
          undefined
      ) {
        return;
      }

      addToBounds(
        space.layoutX,
        space.layoutY,
        space.widthM,
        space.depthM,
      );
    },
  );

  editableObjects.forEach(
    (object) => {
      const position =
        getObjectPosition(
          object,
        );

      const size =
        getObjectSize(
          object,
        );

      addToBounds(
        position.x,
        position.y,
        size.widthM,
        size.depthM,
      );
    },
  );

  if (
    bounds.length === 0
  ) {
    setViewZoom(1);

    setViewPan({
      x: 0,
      y: 0,
    });

    return;
  }

  const minimumX =
    Math.min(
      ...bounds.map(
        (item) =>
          item.x -
          item.halfWidth,
      ),
    );

  const maximumX =
    Math.max(
      ...bounds.map(
        (item) =>
          item.x +
          item.halfWidth,
      ),
    );

  const minimumY =
    Math.min(
      ...bounds.map(
        (item) =>
          item.y -
          item.halfDepth,
      ),
    );

  const maximumY =
    Math.max(
      ...bounds.map(
        (item) =>
          item.y +
          item.halfDepth,
      ),
    );

  const width =
    Math.max(
      0.1,
      maximumX -
        minimumX,
    );

  const height =
    Math.max(
      0.1,
      maximumY -
        minimumY,
    );

  /*
   * Leave roughly 10% padding
   * around the complete property.
   */
  const nextZoom =
    clamp(
      Math.min(
        0.9 / width,
        0.9 / height,
      ),
      0.35,
      1.5,
    );

  const centreX =
    (
      minimumX +
      maximumX
    ) /
    2;

  const centreY =
    (
      minimumY +
      maximumY
    ) /
    2;

  setViewZoom(
    nextZoom,
  );

  setViewPan({
    x:
      -(
        centreX -
        0.5
      ) *
      nextZoom,

    y:
      -(
        centreY -
        0.5
      ) *
      nextZoom,
  });
}

  return (
    <section className="saved-property-layout-card">
      <div className="saved-property-layout-heading">
        <div>
          <h2>
            Your property
          </h2>

          <p>
            Your saved GrowHub
            property layout.
          </p>
        </div>

        <button
          type="button"
          className="saved-property-edit-button"
          onClick={() => {
            window.location.assign(
              "/setup-property?edit=1",
            );
          }}
        >
          ✏ Edit layout
        </button>
      </div>

      <div className="saved-property-object-toolbar">
        <button
          type="button"
          className={
            isObjectEditing
              ? "saved-object-toolbar-button saved-object-toolbar-button-active"
              : "saved-object-toolbar-button"
          }
          onClick={() => {
            setIsObjectEditing(
              (current) =>
                !current,
            );

            if (
              isObjectEditing
            ) {
              setSelectedObjectId(
                null,
              );

              setObjectDraft(
                null,
              );
            }
          }}
        >
          {isObjectEditing
            ? "✓ Done editing"
            : "✥ Manage objects"}
        </button>

        <button
          type="button"
          className="saved-object-toolbar-button"
          disabled={
            isObjectSaving
          }
          onClick={() => {
            void handleAddTree();
          }}
        >
          + 🌳 Tree
        </button>

        <button
          type="button"
          className="saved-object-toolbar-button"
          disabled={
            isObjectSaving
          }
          onClick={() => {
            void handleAddFence();
          }}
        >
          + Fence
        </button>

        <button
  type="button"
  className={
    isGrowingAreaEditing
      ? "saved-object-toolbar-button saved-object-toolbar-button-active"
      : "saved-object-toolbar-button"
  }
  onClick={() => {
    const next =
      !isGrowingAreaEditing;

    setIsGrowingAreaEditing(
      next,
    );

    if (next) {
      setIsObjectEditing(
        false,
      );

      setSelectedObjectId(
        null,
      );

      setObjectDraft(
        null,
      );
    } else {
      setSelectedGrowingAreaId(
        null,
      );

      setGrowingAreaEditDraft(
        null,
      );
    }

    setGrowingAreaError(
      "",
    );
  }}
>
  {isGrowingAreaEditing
    ? "✓ Done with areas"
    : "▦ Manage growing areas"}
</button>

        <button
  type="button"
  className="saved-object-toolbar-button"
  disabled={
    isGrowingAreaSaving
  }
  onClick={
    openGrowingAreaCreator
  }
>
  + 🌱 Growing area
</button>
      </div>
      {showGrowingAreaForm && (
  <section className="growing-area-creator">
    <div className="growing-area-creator-heading">
      <div>
        <strong>
          Add growing area
        </strong>

        <small>
          Choose which property
          space contains it.
        </small>
      </div>

      <button
        type="button"
        onClick={() =>
          setShowGrowingAreaForm(
            false,
          )
        }
      >
        ×
      </button>
    </div>

    <div className="growing-area-form-grid">
      <label>
        Name

        <input
          type="text"
          value={
            growingAreaDraft.name
          }
          onChange={(event) =>
            setGrowingAreaDraft(
              (current) => ({
                ...current,

                name:
                  event.target
                    .value,
              }),
            )
          }
        />
      </label>

      <label>
        Located in

        <select
          value={
            growingAreaDraft
              .propertySpaceId
          }
          onChange={(event) =>
            setGrowingAreaDraft(
              (current) => ({
                ...current,

                propertySpaceId:
                  event.target
                    .value,
              }),
            )
          }
        >
          {spaces.map(
            (space) => (
              <option
                key={space.id}
                value={space.id}
              >
                {space.name}
              </option>
            ),
          )}
        </select>
      </label>

      <label>
        Type

        <select
          value={
            growingAreaDraft
              .growingAreaKind
          }
          onChange={(event) =>
            setGrowingAreaDraft(
              (current) => ({
                ...current,

                growingAreaKind:
                  event.target
                    .value as GrowingAreaKind,
              }),
            )
          }
        >
          {growingAreaKindOptions.map(
            (option) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {option.icon}{" "}
                {option.label}
              </option>
            ),
          )}
        </select>
      </label>

      <label>
        Width

        <div className="saved-object-input">
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={
              growingAreaDraft
                .widthM
            }
            onChange={(event) =>
              setGrowingAreaDraft(
                (current) => ({
                  ...current,

                  widthM:
                    event.target
                      .value,
                }),
              )
            }
          />

          <span>m</span>
        </div>
      </label>

      <label>
        Depth

        <div className="saved-object-input">
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={
              growingAreaDraft
                .depthM
            }
            onChange={(event) =>
              setGrowingAreaDraft(
                (current) => ({
                  ...current,

                  depthM:
                    event.target
                      .value,
                }),
              )
            }
          />

          <span>m</span>
        </div>
      </label>

      <label>
        Rotation

        <div className="saved-object-input">
          <input
            type="number"
            min="0"
            max="359"
            step="1"
            value={
              growingAreaDraft
                .rotation
            }
            onChange={(event) =>
              setGrowingAreaDraft(
                (current) => ({
                  ...current,

                  rotation:
                    event.target
                      .value,
                }),
              )
            }
          />

          <span>°</span>
        </div>
      </label>
    </div>

    {growingAreaError && (
      <p className="saved-object-error">
        {growingAreaError}
      </p>
    )}

    <div className="growing-area-creator-actions">
      <button
        type="button"
        onClick={() =>
          setShowGrowingAreaForm(
            false,
          )
        }
      >
        Cancel
      </button>

      <button
        type="button"
        disabled={
          isGrowingAreaSaving
        }
        onClick={() => {
          void handleCreateGrowingArea();
        }}
      >
        {isGrowingAreaSaving
          ? "Adding…"
          : "Add growing area"}
      </button>
    </div>
  </section>
)}

      {objectError && (
        <p className="saved-object-error">
          {objectError}
        </p>
      )}

      <div className="saved-map-view-controls">
  <button
    type="button"
    onClick={
      handleFitView
    }
  >
    ⛶ Fit
  </button>

  <button
    type="button"
    aria-label="Zoom out"
    onClick={() =>
      setViewZoom(
        (current) =>
          clamp(
            current -
              0.1,
            0.35,
            2.5,
          ),
      )
    }
  >
    −
  </button>

  <span className="saved-map-zoom-value">
    {Math.round(
      viewZoom * 100,
    )}
    %
  </span>

  <button
    type="button"
    aria-label="Zoom in"
    onClick={() =>
      setViewZoom(
        (current) =>
          clamp(
            current +
              0.1,
            0.35,
            2.5,
          ),
      )
    }
  >
    +
  </button>

  <button
    type="button"
    onClick={() => {
      setViewZoom(1);

      setViewPan({
        x: 0,
        y: 0,
      });
    }}
  >
    Reset
  </button>

  <span className="saved-map-pan-divider" />

  <button
    type="button"
    aria-label="Move map left"
    onClick={() =>
      setViewPan(
        (current) => ({
          ...current,

          x:
            current.x -
            0.05,
        }),
      )
    }
  >
    ←
  </button>

  <button
    type="button"
    aria-label="Move map up"
    onClick={() =>
      setViewPan(
        (current) => ({
          ...current,

          y:
            current.y -
            0.05,
        }),
      )
    }
  >
    ↑
  </button>

  <button
    type="button"
    aria-label="Move map down"
    onClick={() =>
      setViewPan(
        (current) => ({
          ...current,

          y:
            current.y +
            0.05,
        }),
      )
    }
  >
    ↓
  </button>

  <button
    type="button"
    aria-label="Move map right"
    onClick={() =>
      setViewPan(
        (current) => ({
          ...current,

          x:
            current.x +
            0.05,
        }),
      )
    }
  >
    →
  </button>
</div>

      <div
        ref={canvasRef}
        className="saved-property-layout-canvas"
      >
        <div
          className="saved-layout-north"
          style={{
            transform: `rotate(${
              config.northRotation ??
              0
            }deg)`,
          }}
        >
          ↑
          <span>N</span>
        </div>

        {structure?.boundary &&
          structure.layoutX !==
            undefined &&
          structure.layoutY !==
            undefined &&
          (() => {
            const boundarySize =
              getBoundarySize(
                structure.boundary!,
              );

            const width =
              structure.widthM ??
              boundarySize.width;

            const depth =
              structure.depthM ??
              boundarySize.depth;

              const viewedPosition =
  projectLayoutPosition(
    structure.layoutX!,
    structure.layoutY!,
  );

            return (
              <div
                className="saved-layout-item saved-layout-structure"
                style={{
                  left: `${
  viewedPosition.x *
  100
}%`,

top: `${
  viewedPosition.y *
  100
}%`,

                  width: `${
  width *
  viewPixelsPerMetre
}px`,

height: `${
  depth *
  viewPixelsPerMetre
}px`,
                }}
              >
                <div
                  className="saved-layout-rotatable"
                  style={{
                    transform: `rotate(${
                      structure.rotation ??
                      0
                    }deg)`,
                  }}
                >
                  <svg
                    viewBox={`0 0 ${width} ${depth}`}
                    preserveAspectRatio="none"
                  >
                    <polygon
                      points={structure.boundary!
                        .map(
                          (
                            point,
                          ) =>
                            `${point.x},${point.y}`,
                        )
                        .join(" ")}
                    />
                  </svg>
                </div>

                <strong>
                  {structure.name}
                </strong>

                <small>
                  {width}m ×{" "}
                  {depth}m
                </small>
              </div>
            );
          })()}

        {spaces.map(
          (space) => {
            if (
              !space.boundary ||
              space.layoutX ===
                undefined ||
              space.layoutY ===
                undefined
            ) {
              return null;
            }

            const viewedPosition =
  projectLayoutPosition(
    space.layoutX,
    space.layoutY,
  );

            return (
              <div
                key={space.id}
                className="saved-layout-item saved-layout-space"
                style={{
                  left: `${
  viewedPosition.x *
  100
}%`,

top: `${
  viewedPosition.y *
  100
}%`,

                  width: `${
                    space.widthM *
viewPixelsPerMetre
                  }px`,

                  height: `${
                    space.depthM *
                    viewPixelsPerMetre
                  }px`,
                }}
              >
                <div
                  className="saved-layout-rotatable"
                  style={{
                    transform: `rotate(${
                      space.rotation ??
                      0
                    }deg)`,
                  }}
                >
                  <svg
                    viewBox={`0 0 ${space.widthM} ${space.depthM}`}
                    preserveAspectRatio="none"
                  >
                    <polygon
                      points={space.boundary
                        .map(
                          (
                            point,
                          ) =>
                            `${point.x},${point.y}`,
                        )
                        .join(" ")}
                    />
                  </svg>
                  {growingAreas
  .filter(
    (area) =>
      area.propertySpaceId ===
        space.id &&
      area.layoutX !==
        undefined &&
      area.layoutY !==
        undefined &&
      area.widthM !==
        undefined &&
      area.depthM !==
        undefined,
  )
  .map((area) => {
    const kind =
      growingAreaKindOptions.find(
        (option) =>
          option.value ===
          area.growingAreaKind,
      );

   const preview =
  growingAreaDragPreview
    ?.id ===
  area.id
    ? growingAreaDragPreview
    : null;

const position =
  preview ?? {
    x:
      area.layoutX!,
    y:
      area.layoutY!,
  };

const isSelected =
  selectedGrowingAreaId ===
  area.id;

return (
  <button
    key={area.id}
    type="button"
    className={[
      "saved-growing-area",

      isGrowingAreaEditing
        ? "saved-growing-area-editing"
        : "",

      isSelected
        ? "saved-growing-area-selected"
        : "",
    ]
      .filter(Boolean)
      .join(" ")}
    style={{
      left: `${
        position.x *
        100
      }%`,

      top: `${
        position.y *
        100
      }%`,

      width: `${
  area.widthM! *
  viewPixelsPerMetre
}px`,

height: `${
  area.depthM! *
  viewPixelsPerMetre
}px`,

      transform:
        `translate(-50%, -50%) rotate(${area.rotation ?? 0}deg)`,
    }}
    onPointerDown={(
      event,
    ) =>
      startGrowingAreaDrag(
        event,
        area,
        space,
      )
    }
    onPointerMove={(
      event,
    ) =>
      moveGrowingAreaDrag(
        event,
        area,
        space,
      )
    }
    onPointerUp={(
      event,
    ) =>
      finishGrowingAreaDrag(
        event,
        area,
      )
    }
    onPointerCancel={(
      event,
    ) =>
      finishGrowingAreaDrag(
        event,
        area,
      )
    }
    onClick={(event) => {
      event.stopPropagation();

      if (
        isGrowingAreaEditing
      ) {
        selectGrowingArea(
          area,
        );

        return;
      }

      navigate(
        `/garden/${area.id}`,
      );
    }}
  >
    <span>
      {kind?.icon ??
        "🌱"}
    </span>

    <strong>
      {area.name}
    </strong>
  </button>
);
  })}
                </div>

                <strong>
                  {space.name}
                </strong>

                <small>
                  {space.widthM}m ×{" "}
                  {space.depthM}m
                </small>
              </div>
            );
          },
        )}

        {editableObjects.map(
          (object) => {
            const size =
              getObjectSize(
                object,
              );

            const savedPosition =
              getObjectPosition(
                object,
              );

            const preview =
              objectDragPreview
                ?.id ===
              object.id
                ? objectDragPreview
                : null;

            const modelPosition =
  preview ??
  savedPosition;

const position =
  projectLayoutPosition(
    modelPosition.x,
    modelPosition.y,
  );

            const isSelected =
              selectedObjectId ===
              object.id;

            return (
              <div
                key={object.id}
                className={[
                  "saved-layout-object",
                  object.type ===
                  "tree"
                    ? "saved-layout-tree"
                    : "saved-layout-fence",
                  isObjectEditing
                    ? "saved-layout-object-editing"
                    : "",
                  isSelected
                    ? "saved-layout-object-selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  left: `${
                    position.x *
                    100
                  }%`,

                  top: `${
                    position.y *
                    100
                  }%`,

                  width: `${
                    size.widthM *
viewPixelsPerMetre
                  }px`,

                  height: `${
                    size.depthM *
                    viewPixelsPerMetre
                  }px`,
                }}
                onPointerDown={(
                  event,
                ) =>
                  startObjectDrag(
                    event,
                    object,
                  )
                }
                onPointerMove={(
                  event,
                ) =>
                  moveObjectDrag(
                    event,
                    object,
                  )
                }
                onPointerUp={(
                  event,
                ) =>
                  finishObjectDrag(
                    event,
                    object,
                  )
                }
                onPointerCancel={(
                  event,
                ) =>
                  finishObjectDrag(
                    event,
                    object,
                  )
                }
              >
                <div
                  className="saved-object-shape"
                  style={{
                    transform: `rotate(${
                      object.rotation ??
                      0
                    }deg)`,
                  }}
                >
                  {object.type ===
                    "tree" && (
                    <span className="saved-tree-icon">
                      🌳
                    </span>
                  )}
                </div>

                <span className="saved-object-label">
                  {object.name}
                </span>
              </div>
            );
          },
        )}

        {isObjectEditing &&
  editableObjects
    .filter(
      (object) =>
        object.type ===
        "tree",
    )
    .map((tree) => {
      const savedPosition =
        getObjectPosition(
          tree,
        );

      const preview =
        objectDragPreview
          ?.id ===
        tree.id
          ? objectDragPreview
          : null;

      const modelPosition =
        preview ??
        savedPosition;

      const position =
        projectLayoutPosition(
          modelPosition.x,
          modelPosition.y,
        );

      const selected =
        selectedObjectId ===
        tree.id;

      return (
        <div
          key={`tree-handle-${tree.id}`}
          className={[
            "saved-tree-edit-handle",

            selected
              ? "saved-tree-edit-handle-selected"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            left: `${
              position.x *
              100
            }%`,

            top: `${
              position.y *
              100
            }%`,
          }}
          title="Move or edit tree"
          onPointerDown={(
            event,
          ) =>
            startObjectDrag(
              event,
              tree,
            )
          }
          onPointerMove={(
            event,
          ) =>
            moveObjectDrag(
              event,
              tree,
            )
          }
          onPointerUp={(
            event,
          ) =>
            finishObjectDrag(
              event,
              tree,
            )
          }
          onPointerCancel={(
            event,
          ) =>
            finishObjectDrag(
              event,
              tree,
            )
          }
        >
          🌳
        </div>
      );
    })}
      </div>

      {isObjectEditing && (
        <p className="saved-object-help">
          Drag trees and fences
          directly on the map. Tap
          one to change its
          dimensions, height or
          rotation.
        </p>
      )}

      {isObjectEditing &&
        selectedObject &&
        objectDraft && (
          <section className="saved-object-inspector">
            <div className="saved-object-inspector-heading">
              <div>
                <strong>
                  {selectedObject.name}
                </strong>

                <small>
                  {selectedObject.type ===
                  "tree"
                    ? "Tree dimensions and height"
                    : "Fence dimensions and height"}
                </small>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedObjectId(
                    null,
                  );

                  setObjectDraft(
                    null,
                  );
                }}
              >
                ×
              </button>
            </div>

            <div className="saved-object-inspector-fields">
              <label>
                {selectedObject.type ===
                "tree"
                  ? "Canopy width"
                  : "Fence length"}

                <div className="saved-object-input">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={
                      objectDraft.widthM
                    }
                    onChange={(
                      event,
                    ) =>
                      setObjectDraft(
                        (
                          current,
                        ) =>
                          current
                            ? {
                                ...current,
                                widthM:
                                  event
                                    .target
                                    .value,
                              }
                            : current,
                      )
                    }
                  />

                  <span>m</span>
                </div>
              </label>

              <label>
                {selectedObject.type ===
                "tree"
                  ? "Canopy depth"
                  : "Fence thickness"}

                <div className="saved-object-input">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={
                      objectDraft.depthM
                    }
                    onChange={(
                      event,
                    ) =>
                      setObjectDraft(
                        (
                          current,
                        ) =>
                          current
                            ? {
                                ...current,
                                depthM:
                                  event
                                    .target
                                    .value,
                              }
                            : current,
                      )
                    }
                  />

                  <span>m</span>
                </div>
              </label>

              <label>
                {selectedObject.type ===
                "tree"
                  ? "Tree height"
                  : "Fence height"}

                <div className="saved-object-input">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={
                      objectDraft
                        .physicalHeightM
                    }
                    onChange={(
                      event,
                    ) =>
                      setObjectDraft(
                        (
                          current,
                        ) =>
                          current
                            ? {
                                ...current,
                                physicalHeightM:
                                  event
                                    .target
                                    .value,
                              }
                            : current,
                      )
                    }
                  />

                  <span>m</span>
                </div>
              </label>

              <label>
                Rotation

                <div className="saved-object-input">
                  <input
                    type="number"
                    min="0"
                    max="359"
                    step="1"
                    value={
                      objectDraft.rotation
                    }
                    onChange={(
                      event,
                    ) =>
                      setObjectDraft(
                        (
                          current,
                        ) =>
                          current
                            ? {
                                ...current,
                                rotation:
                                  event
                                    .target
                                    .value,
                              }
                            : current,
                      )
                    }
                  />

                  <span>°</span>
                </div>
              </label>
            </div>

            <div className="saved-object-inspector-actions">
              <button
                type="button"
                className="saved-object-delete-button"
                onClick={() => {
                  void handleDeleteObject();
                }}
              >
                Delete
              </button>

              <button
                type="button"
                className="saved-object-save-button"
                disabled={
                  isObjectSaving
                }
                onClick={() => {
                  void handleSaveObject();
                }}
              >
                {isObjectSaving
                  ? "Saving…"
                  : "Save object"}
              </button>
            </div>
          </section>
        )}
        {isGrowingAreaEditing &&
  selectedGrowingArea &&
  growingAreaEditDraft && (
    <section className="saved-object-inspector">
      <div className="saved-object-inspector-heading">
        <div>
          <strong>
            {
              selectedGrowingArea
                .name
            }
          </strong>

          <small>
            Edit this growing
            area.
          </small>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedGrowingAreaId(
              null,
            );

            setGrowingAreaEditDraft(
              null,
            );

            setGrowingAreaError(
              "",
            );
          }}
        >
          ×
        </button>
      </div>

      <div className="saved-object-inspector-fields">
        <label>
          Name

          <div className="saved-object-input">
            <input
              type="text"
              value={
                growingAreaEditDraft
                  .name
              }
              onChange={(event) =>
                setGrowingAreaEditDraft(
                  (current) =>
                    current
                      ? {
                          ...current,

                          name:
                            event
                              .target
                              .value,
                        }
                      : current,
                )
              }
            />
          </div>
        </label>

        <label>
          Located in

          <div className="saved-object-input">
            <select
              value={
                growingAreaEditDraft
                  .propertySpaceId
              }
              onChange={(event) =>
                setGrowingAreaEditDraft(
                  (current) =>
                    current
                      ? {
                          ...current,

                          propertySpaceId:
                            event
                              .target
                              .value,
                        }
                      : current,
                )
              }
            >
              {spaces.map(
                (space) => (
                  <option
                    key={
                      space.id
                    }
                    value={
                      space.id
                    }
                  >
                    {
                      space.name
                    }
                  </option>
                ),
              )}
            </select>
          </div>
        </label>

        <label>
          Type

          <div className="saved-object-input">
            <select
              value={
                growingAreaEditDraft
                  .growingAreaKind
              }
              onChange={(event) =>
                setGrowingAreaEditDraft(
                  (current) =>
                    current
                      ? {
                          ...current,

                          growingAreaKind:
                            event
                              .target
                              .value as GrowingAreaKind,
                        }
                      : current,
                )
              }
            >
              {growingAreaKindOptions.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {option.icon}{" "}
                    {
                      option.label
                    }
                  </option>
                ),
              )}
            </select>
          </div>
        </label>

        <label>
          Width

          <div className="saved-object-input">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={
                growingAreaEditDraft
                  .widthM
              }
              onChange={(event) =>
                setGrowingAreaEditDraft(
                  (current) =>
                    current
                      ? {
                          ...current,

                          widthM:
                            event
                              .target
                              .value,
                        }
                      : current,
                )
              }
            />

            <span>m</span>
          </div>
        </label>

        <label>
          Depth

          <div className="saved-object-input">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={
                growingAreaEditDraft
                  .depthM
              }
              onChange={(event) =>
                setGrowingAreaEditDraft(
                  (current) =>
                    current
                      ? {
                          ...current,

                          depthM:
                            event
                              .target
                              .value,
                        }
                      : current,
                )
              }
            />

            <span>m</span>
          </div>
        </label>

        <label>
          Rotation

          <div className="saved-object-input">
            <input
              type="number"
              min="0"
              max="359"
              step="1"
              value={
                growingAreaEditDraft
                  .rotation
              }
              onChange={(event) =>
                setGrowingAreaEditDraft(
                  (current) =>
                    current
                      ? {
                          ...current,

                          rotation:
                            event
                              .target
                              .value,
                        }
                      : current,
                )
              }
            />

            <span>°</span>
          </div>
        </label>
      </div>

      {growingAreaError && (
        <p className="saved-object-error">
          {growingAreaError}
        </p>
      )}

      <div className="saved-object-inspector-actions">
        <button
          type="button"
          className="saved-object-delete-button"
          onClick={() => {
            void handleDeleteGrowingArea();
          }}
        >
          Delete
        </button>

        <button
          type="button"
          className="saved-object-toolbar-button"
          onClick={() =>
            navigate(
              `/garden/${selectedGrowingArea.id}`,
            )
          }
        >
          Open area
        </button>

        <button
          type="button"
          className="saved-object-save-button"
          disabled={
            isGrowingAreaSaving
          }
          onClick={() => {
            void handleSaveGrowingArea();
          }}
        >
          {isGrowingAreaSaving
            ? "Saving…"
            : "Save changes"}
        </button>
      </div>
    </section>
  )}
    </section>
  );
}