import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";


import {
  createPropertyConfig,
  subscribeToPropertyConfig,
  replaceSetupPropertySpaces,
  resetPropertySetupForDevelopment,
  updatePropertyConfig, 
  subscribeToPropertySpaces,
  type PropertySpace, 
  type PropertyType,
  type SpaceType,
  type NewPropertySpace,
type PropertyPoint,
type SpaceShapeType,  
} from "../services/propertyService";

import {
  deleteSetupStructure,
  saveSetupStructure,
  subscribeToPropertyObjects,
  type PropertyObject,
  type StructureKind,
} from "../services/propertyObjectService";

import "./PropertySetupPage.css";

type LayoutPosition = {
  x: number;
  y: number;
  rotation: number;
};

type SelectedLayoutItem =
  | {
      kind: "structure";
    }
  | {
      kind: "space";
      spaceType: SpaceType;
    }
  | null;

type LayoutDrag = {
  key: string;
  offsetX: number;
  offsetY: number;
} | null;

type SpaceShapeDraft = {
  name: string;

  shapeType: SpaceShapeType;

  // Overall bounding dimensions.
  widthM: string;
  depthM: string;

  // Used differently depending
  // on the selected quick shape.
  detailWidthM: string;
  detailDepthM: string;

  elevationM: string;

  // Used only for Custom.
  customPoints: PropertyPoint[];
};

type StructureDraft = {
  enabled: boolean;

  name: string;
  structureKind: StructureKind;

  shapeType: SpaceShapeType;

  widthM: string;
  depthM: string;

  detailWidthM: string;
  detailDepthM: string;

  customPoints: PropertyPoint[];

  // Houses use this as the
  // approximate total building height.
  physicalHeightM: string;

  // Flats / maisonettes.
  floorLevel: string;
  baseElevationM: string;
  ceilingHeightM: string;
};

type PropertyOption = {
  type: PropertyType;
  icon: string;
  title: string;
  description: string;
};

type SpaceOption = {
  type: SpaceType;
  icon: string;
  title: string;
  description: string;
};

const propertyOptions: PropertyOption[] = [
  {
    type: "detached",
    icon: "🏠",
    title: "Detached house",
    description:
      "A standalone house. We'll add its gardens and other spaces next.",
  },
  {
    type: "semi-detached",
    icon: "🏡",
    title: "Semi-detached house",
    description:
      "A house joined to one neighbouring property.",
  },
  {
    type: "terraced",
    icon: "🏘️",
    title: "Terraced house",
    description:
      "A house within a terrace, often with separate front and back spaces.",
  },
  {
    type: "flat",
    icon: "🏢",
    title: "Flat / apartment",
    description:
      "An apartment or flat. Balconies, terraces and shared gardens come next.",
  },
  {
    type: "maisonette",
    icon: "🌿",
    title: "Maisonette / ground-floor flat",
    description:
      "A maisonette or flat that may have its own outdoor spaces.",
  },
  {
    type: "allotment",
    icon: "🌱",
    title: "Allotment / dedicated plot",
    description:
      "A separate plot used primarily for growing.",
  },
  {
    type: "communal",
    icon: "🌳",
    title: "Community / shared growing site",
    description:
      "A shared garden, community plot or communal growing location.",
  },
  {
    type: "land",
    icon: "🌲",
    title: "Large property / land",
    description:
      "A larger property or piece of land containing multiple spaces.",
  },
  {
    type: "custom",
    icon: "✏️",
    title: "Something else",
    description:
      "Start without a template and define your own property or site.",
  },
];

const allSpaceOptions: Record<
  SpaceType,
  SpaceOption
> = {
  garden: {
    type: "garden",
    icon: "🌳",
    title: "Garden",
    description:
      "A general outdoor garden area.",
  },

  "front-garden": {
    type: "front-garden",
    icon: "🌷",
    title: "Front garden",
    description:
      "An outdoor space at the front of the property.",
  },

  "back-garden": {
    type: "back-garden",
    icon: "🌿",
    title: "Back garden",
    description:
      "An outdoor space behind the property.",
  },

  "side-garden": {
    type: "side-garden",
    icon: "🌱",
    title: "Side garden",
    description:
      "An outdoor area running beside the property.",
  },

  balcony: {
    type: "balcony",
    icon: "🪴",
    title: "Balcony",
    description:
      "A balcony where containers or other plants can be grown.",
  },

  terrace: {
    type: "terrace",
    icon: "☀️",
    title: "Terrace / patio",
    description:
      "A paved or decked outdoor space used for growing.",
  },

  rooftop: {
    type: "rooftop",
    icon: "🏙️",
    title: "Rooftop",
    description:
      "A roof area that can be used for plants or containers.",
  },

  allotment: {
    type: "allotment",
    icon: "🥕",
    title: "Main plot",
    description:
      "The main growing plot of an allotment or dedicated site.",
  },

  courtyard: {
    type: "courtyard",
    icon: "🧱",
    title: "Courtyard",
    description:
      "An enclosed or partly enclosed outdoor area.",
  },

  "shared-garden": {
    type: "shared-garden",
    icon: "🌳",
    title: "Shared garden",
    description:
      "An outdoor area shared with other residents or growers.",
  },

  indoor: {
    type: "indoor",
    icon: "🪴",
    title: "Indoor growing area",
    description:
      "An indoor location used specifically for growing plants.",
  },

  windowsill: {
    type: "windowsill",
    icon: "🪟",
    title: "Windowsill",
    description:
      "One or more windowsills used for plants.",
  },

  custom: {
    type: "custom",
    icon: "➕",
    title: "Another space",
    description:
      "Add a space that isn't covered by the choices above.",
  },
};

function createDefaultSpaceDraft(
  spaceType: SpaceType,
): SpaceShapeDraft {
  return {
    name:
      allSpaceOptions[
        spaceType
      ].title,

    shapeType: "rectangle",

    widthM: "",
    depthM: "",

    detailWidthM: "",
    detailDepthM: "",

    elevationM: "0",

    customPoints: [],
  };
}

function buildStructureBoundary(
  draft: StructureDraft,
): PropertyPoint[] | null {
  const width =
    Number(draft.widthM);

  const depth =
    Number(draft.depthM);

  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(depth) ||
    depth <= 0
  ) {
    return null;
  }

  if (
    draft.shapeType ===
    "rectangle"
  ) {
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      {
        x: width,
        y: depth,
      },
      { x: 0, y: depth },
    ];
  }

  if (
    draft.shapeType ===
    "l-shape"
  ) {
    const cutoutWidth =
      Number(
        draft.detailWidthM,
      );

    const cutoutDepth =
      Number(
        draft.detailDepthM,
      );

    if (
      !Number.isFinite(
        cutoutWidth,
      ) ||
      cutoutWidth <= 0 ||
      cutoutWidth >= width ||
      !Number.isFinite(
        cutoutDepth,
      ) ||
      cutoutDepth <= 0 ||
      cutoutDepth >= depth
    ) {
      return null;
    }

    return [
      { x: 0, y: 0 },
      {
        x:
          width -
          cutoutWidth,
        y: 0,
      },
      {
        x:
          width -
          cutoutWidth,
        y: cutoutDepth,
      },
      {
        x: width,
        y: cutoutDepth,
      },
      {
        x: width,
        y: depth,
      },
      {
        x: 0,
        y: depth,
      },
    ];
  }

  if (
    draft.shapeType ===
    "u-shape"
  ) {
    const openingWidth =
      Number(
        draft.detailWidthM,
      );

    const openingDepth =
      Number(
        draft.detailDepthM,
      );

    if (
      !Number.isFinite(
        openingWidth,
      ) ||
      openingWidth <= 0 ||
      openingWidth >= width ||
      !Number.isFinite(
        openingDepth,
      ) ||
      openingDepth <= 0 ||
      openingDepth >= depth
    ) {
      return null;
    }

    const sideWidth =
      (width -
        openingWidth) /
      2;

    return [
      { x: 0, y: 0 },
      {
        x: sideWidth,
        y: 0,
      },
      {
        x: sideWidth,
        y: openingDepth,
      },
      {
        x:
          sideWidth +
          openingWidth,
        y: openingDepth,
      },
      {
        x:
          sideWidth +
          openingWidth,
        y: 0,
      },
      {
        x: width,
        y: 0,
      },
      {
        x: width,
        y: depth,
      },
      {
        x: 0,
        y: depth,
      },
    ];
  }

  if (
    draft.shapeType ===
    "t-shape"
  ) {
    const stemWidth =
      Number(
        draft.detailWidthM,
      );

    const topDepth =
      Number(
        draft.detailDepthM,
      );

    if (
      !Number.isFinite(
        stemWidth,
      ) ||
      stemWidth <= 0 ||
      stemWidth >= width ||
      !Number.isFinite(
        topDepth,
      ) ||
      topDepth <= 0 ||
      topDepth >= depth
    ) {
      return null;
    }

    const stemLeft =
      (width -
        stemWidth) /
      2;

    const stemRight =
      stemLeft +
      stemWidth;

    return [
      { x: 0, y: 0 },
      {
        x: width,
        y: 0,
      },
      {
        x: width,
        y: topDepth,
      },
      {
        x: stemRight,
        y: topDepth,
      },
      {
        x: stemRight,
        y: depth,
      },
      {
        x: stemLeft,
        y: depth,
      },
      {
        x: stemLeft,
        y: topDepth,
      },
      {
        x: 0,
        y: topDepth,
      },
    ];
  }

  if (
    draft.shapeType ===
    "custom"
  ) {
    return draft.customPoints
      .length >= 3
      ? draft.customPoints
      : null;
  }

  return null;
}

function buildSpaceBoundary(
  draft: SpaceShapeDraft,
): PropertyPoint[] | null {
  const width =
    Number(draft.widthM);

  const depth =
    Number(draft.depthM);

  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(depth) ||
    depth <= 0
  ) {
    return null;
  }

  if (
    draft.shapeType ===
    "rectangle"
  ) {
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      {
        x: width,
        y: depth,
      },
      { x: 0, y: depth },
    ];
  }

  if (
    draft.shapeType ===
    "l-shape"
  ) {
    const cutoutWidth =
      Number(
        draft.detailWidthM,
      );

    const cutoutDepth =
      Number(
        draft.detailDepthM,
      );

    if (
      !Number.isFinite(
        cutoutWidth,
      ) ||
      cutoutWidth <= 0 ||
      cutoutWidth >= width ||
      !Number.isFinite(
        cutoutDepth,
      ) ||
      cutoutDepth <= 0 ||
      cutoutDepth >= depth
    ) {
      return null;
    }

    return [
      { x: 0, y: 0 },

      {
        x:
          width -
          cutoutWidth,
        y: 0,
      },

      {
        x:
          width -
          cutoutWidth,
        y: cutoutDepth,
      },

      {
        x: width,
        y: cutoutDepth,
      },

      {
        x: width,
        y: depth,
      },

      {
        x: 0,
        y: depth,
      },
    ];
  }

  if (
    draft.shapeType ===
    "u-shape"
  ) {
    const openingWidth =
      Number(
        draft.detailWidthM,
      );

    const openingDepth =
      Number(
        draft.detailDepthM,
      );

    if (
      !Number.isFinite(
        openingWidth,
      ) ||
      openingWidth <= 0 ||
      openingWidth >= width ||
      !Number.isFinite(
        openingDepth,
      ) ||
      openingDepth <= 0 ||
      openingDepth >= depth
    ) {
      return null;
    }

    const leftLeg =
      (width -
        openingWidth) /
      2;

    return [
      { x: 0, y: 0 },

      {
        x: leftLeg,
        y: 0,
      },

      {
        x: leftLeg,
        y: openingDepth,
      },

      {
        x:
          leftLeg +
          openingWidth,
        y: openingDepth,
      },

      {
        x:
          leftLeg +
          openingWidth,
        y: 0,
      },

      {
        x: width,
        y: 0,
      },

      {
        x: width,
        y: depth,
      },

      {
        x: 0,
        y: depth,
      },
    ];
  }

  if (
    draft.shapeType ===
    "t-shape"
  ) {
    const stemWidth =
      Number(
        draft.detailWidthM,
      );

    const topBarDepth =
      Number(
        draft.detailDepthM,
      );

    if (
      !Number.isFinite(
        stemWidth,
      ) ||
      stemWidth <= 0 ||
      stemWidth >= width ||
      !Number.isFinite(
        topBarDepth,
      ) ||
      topBarDepth <= 0 ||
      topBarDepth >= depth
    ) {
      return null;
    }

    const leftStem =
      (width - stemWidth) /
      2;

    const rightStem =
      leftStem + stemWidth;

    return [
      { x: 0, y: 0 },

      {
        x: width,
        y: 0,
      },

      {
        x: width,
        y: topBarDepth,
      },

      {
        x: rightStem,
        y: topBarDepth,
      },

      {
        x: rightStem,
        y: depth,
      },

      {
        x: leftStem,
        y: depth,
      },

      {
        x: leftStem,
        y: topBarDepth,
      },

      {
        x: 0,
        y: topBarDepth,
      },
    ];
  }

  if (
    draft.shapeType ===
    "custom"
  ) {
    if (
      draft.customPoints.length <
      3
    ) {
      return null;
    }

    return draft.customPoints;
  }

  return null;
}

function getBoundaryDimensions(
  boundary: PropertyPoint[] | undefined,
) {
  if (
    !boundary ||
    boundary.length === 0
  ) {
    return null;
  }

  const xValues =
    boundary.map(
      (point) => point.x,
    );

  const yValues =
    boundary.map(
      (point) => point.y,
    );

  return {
    width:
      Math.max(...xValues) -
      Math.min(...xValues),

    depth:
      Math.max(...yValues) -
      Math.min(...yValues),
  };
}

const spacesByPropertyType: Record<
  PropertyType,
  SpaceType[]
> = {
  detached: [
    "front-garden",
    "back-garden",
    "side-garden",
    "terrace",
    "courtyard",
    "balcony",
    "rooftop",
    "indoor",
    "windowsill",
    "custom",
  ],

  "semi-detached": [
    "front-garden",
    "back-garden",
    "side-garden",
    "terrace",
    "courtyard",
    "balcony",
    "indoor",
    "windowsill",
    "custom",
  ],

  terraced: [
    "front-garden",
    "back-garden",
    "courtyard",
    "terrace",
    "balcony",
    "rooftop",
    "indoor",
    "windowsill",
    "shared-garden",
    "custom",
  ],

  flat: [
    "balcony",
    "terrace",
    "rooftop",
    "shared-garden",
    "courtyard",
    "indoor",
    "windowsill",
    "custom",
  ],

  maisonette: [
    "front-garden",
    "back-garden",
    "side-garden",
    "balcony",
    "terrace",
    "courtyard",
    "shared-garden",
    "indoor",
    "windowsill",
    "custom",
  ],

  allotment: [
    "allotment",
    "shared-garden",
    "custom",
  ],

  communal: [
    "shared-garden",
    "garden",
    "allotment",
    "courtyard",
    "indoor",
    "custom",
  ],

  land: [
    "garden",
    "front-garden",
    "back-garden",
    "side-garden",
    "allotment",
    "courtyard",
    "terrace",
    "indoor",
    "custom",
  ],

  custom: [
    "garden",
    "front-garden",
    "back-garden",
    "side-garden",
    "balcony",
    "terrace",
    "rooftop",
    "allotment",
    "courtyard",
    "shared-garden",
    "indoor",
    "windowsill",
    "custom",
  ],
};

function createDefaultStructureDraft(
  propertyType: PropertyType | null,
): StructureDraft {
  if (propertyType === "flat") {
    return {
      enabled: true,

      name: "My Flat",
      structureKind: "flat",

      shapeType: "rectangle",

      widthM: "",
      depthM: "",

      detailWidthM: "",
      detailDepthM: "",

      customPoints: [],

      physicalHeightM: "2.4",

      floorLevel: "0",
      baseElevationM: "0",
      ceilingHeightM: "2.4",
    };
  }

  if (propertyType === "maisonette") {
    return {
      enabled: true,

      name: "My Maisonette",
      structureKind: "maisonette",

      shapeType: "rectangle",

      widthM: "",
      depthM: "",

      detailWidthM: "",
      detailDepthM: "",

      customPoints: [],

      physicalHeightM: "2.4",

      floorLevel: "0",
      baseElevationM: "0",
      ceilingHeightM: "2.4",
    };
  }

  if (
    propertyType === "detached" ||
    propertyType === "semi-detached" ||
    propertyType === "terraced"
  ) {
    return {
      enabled: true,

      name: "House",
      structureKind: "house",

      shapeType: "rectangle",

      widthM: "",
      depthM: "",

      detailWidthM: "",
      detailDepthM: "",

      customPoints: [],

      physicalHeightM: "5.5",

      floorLevel: "0",
      baseElevationM: "0",
      ceilingHeightM: "2.4",
    };
  }

  return {
    enabled: false,

    name: "Structure",
    structureKind: "other",

    shapeType: "rectangle",

    widthM: "",
    depthM: "",

    detailWidthM: "",
    detailDepthM: "",

    customPoints: [],

    physicalHeightM: "2.5",

    floorLevel: "0",
    baseElevationM: "0",
    ceilingHeightM: "2.4",
  };
}

export default function PropertySetupPage() {
  const [currentStep, setCurrentStep] =
  useState<1 | 2 | 3 | 4>(1);

  const [
  structureDraft,
  setStructureDraft,
] = useState<StructureDraft>(
  createDefaultStructureDraft(null),
);

    const [
  northRotation,
  setNorthRotation,
] = useState(0);

const [
  stepFourStage,
  setStepFourStage,
] = useState<
  "structure" | "layout"
>("structure");

const [
  structureDraftPropertyType,
  setStructureDraftPropertyType,
] = useState<PropertyType | null>(
  null,
);

  const [
    isResettingSetup,
    setIsResettingSetup,
  ] = useState(false);

  const [propertyName, setPropertyName] =
    useState("My Home");

  const [
    selectedType,
    setSelectedType,
  ] = useState<PropertyType | null>(
    null,
  );

  const [
  spaceDimensionDrafts,
  setSpaceDimensionDrafts,
] = useState<
  Partial<
    Record<
      SpaceType,
      SpaceShapeDraft
    >
  >
>({});

const layoutCanvasRef =
  useRef<HTMLDivElement | null>(
    null,
  );

  const isEditMode =
  new URLSearchParams(
    window.location.search,
  ).get("edit") === "1";

const editLayoutLoaded =
  useRef(false);

const [
  layoutPositions,
  setLayoutPositions,
] = useState<
  Record<string, LayoutPosition>
>({});

const [
  selectedLayoutItem,
  setSelectedLayoutItem,
] =
  useState<SelectedLayoutItem>(
    null,
  );

const [
  layoutDrag,
  setLayoutDrag,
] =
  useState<LayoutDrag>(null);

const spaceShapeOptions: {
  type: SpaceShapeType;
  icon: string;
  title: string;
}[] = [
  {
    type: "rectangle",
    icon: "▭",
    title: "Rectangle",
  },
  {
    type: "l-shape",
    icon: "└",
    title: "L-shape",
  },
  {
    type: "u-shape",
    icon: "⊔",
    title: "U-shape",
  },
  {
    type: "t-shape",
    icon: "┬",
    title: "T-shape",
  },
  {
    type: "custom",
    icon: "✏️",
    title: "Custom",
  },
];

const [
  stepThreeComplete,
  setStepThreeComplete,
] = useState(false);

  const [
    selectedSpaces,
    setSelectedSpaces,
  ] = useState<SpaceType[]>([]);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState("");

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

function startLayoutDrag(
  event: ReactPointerEvent<HTMLDivElement>,
  key: string,
) {
  event.preventDefault();

  const canvas =
    layoutCanvasRef.current;

  const position =
    layoutPositions[key];

  if (
    !canvas ||
    !position
  ) {
    return;
  }

  const rectangle =
    canvas.getBoundingClientRect();

  const centreX =
    rectangle.left +
    position.x *
      rectangle.width;

  const centreY =
    rectangle.top +
    position.y *
      rectangle.height;

  event.currentTarget.setPointerCapture(
    event.pointerId,
  );

  setLayoutDrag({
    key,

    offsetX:
      event.clientX -
      centreX,

    offsetY:
      event.clientY -
      centreY,
  });
}

function moveLayoutDrag(
  event: ReactPointerEvent<HTMLDivElement>,
  key: string,
) {
  if (
    layoutDrag?.key !== key
  ) {
    return;
  }

  const canvas =
    layoutCanvasRef.current;

  if (!canvas) {
    return;
  }

  const rectangle =
    canvas.getBoundingClientRect();

  const x =
    (
      event.clientX -
      rectangle.left -
      layoutDrag.offsetX
    ) /
    rectangle.width;

  const y =
    (
      event.clientY -
      rectangle.top -
      layoutDrag.offsetY
    ) /
    rectangle.height;

  setLayoutPositions(
    (current) => ({
      ...current,

      [key]: {
        ...current[key],

        x: clamp(
          x,
          0.03,
          0.97,
        ),

        y: clamp(
          y,
          0.03,
          0.97,
        ),
      },
    }),
  );
}

function finishLayoutDrag(
  event: ReactPointerEvent<HTMLDivElement>,
) {
  if (
    event.currentTarget.hasPointerCapture(
      event.pointerId,
    )
  ) {
    event.currentTarget.releasePointerCapture(
      event.pointerId,
    );
  }

  setLayoutDrag(null);
}

    useEffect(() => {
  if (!selectedType) {
    return;
  }

  if (
    selectedType ===
    structureDraftPropertyType
  ) {
    return;
  }

  setStructureDraft(
    createDefaultStructureDraft(
      selectedType,
    ),
  );

  setStructureDraftPropertyType(
    selectedType,
  );
}, [
  selectedType,
  structureDraftPropertyType,
]);

  useEffect(() => {
  if (
    !isEditMode ||
    editLayoutLoaded.current
  ) {
    return;
  }

  let savedSpaces:
    PropertySpace[] | null =
    null;

  let savedObjects:
    PropertyObject[] | null =
    null;

  function tryLoadSavedLayout() {
    if (
      savedSpaces === null ||
      savedObjects === null ||
      editLayoutLoaded.current
    ) {
      return;
    }

    const setupSpaces =
      savedSpaces.filter(
        (space) =>
          space.id.startsWith(
            "setup-",
          ),
      );

    const drafts: Partial<
      Record<
        SpaceType,
        SpaceShapeDraft
      >
    > = {};

    const positions: Record<
      string,
      LayoutPosition
    > = {};

    const loadedSpaceTypes:
      SpaceType[] = [];

    setupSpaces.forEach(
      (space) => {
        loadedSpaceTypes.push(
          space.type,
        );

        drafts[space.type] = {
          name:
            space.name,

          shapeType:
            space.shapeType,

          widthM:
            String(
              space.widthM,
            ),

          depthM:
            String(
              space.depthM,
            ),

          detailWidthM:
            space
              .shapeDetailWidthM !==
            undefined
              ? String(
                  space
                    .shapeDetailWidthM,
                )
              : "",

          detailDepthM:
            space
              .shapeDetailDepthM !==
            undefined
              ? String(
                  space
                    .shapeDetailDepthM,
                )
              : "",

          elevationM:
            String(
              space.elevationM ??
                0,
            ),

          customPoints:
            space.shapeType ===
            "custom"
              ? space.boundary
              : [],
        };

        positions[
          `space:${space.type}`
        ] = {
          x:
            space.layoutX ??
            0.5,

          y:
            space.layoutY ??
            0.5,

          rotation:
            space.rotation ??
            0,
        };
      },
    );

    setSelectedSpaces(
      loadedSpaceTypes,
    );

    setSpaceDimensionDrafts(
      drafts,
    );

    const mainStructure =
      savedObjects.find(
        (object) =>
          object.id ===
          "setup-main-structure",
      );

    if (mainStructure) {
      const boundaryDimensions =
        getBoundaryDimensions(
          mainStructure.boundary,
        );

      const widthM =
        mainStructure.widthM ??
        boundaryDimensions?.width ??
        mainStructure.width /
          20;

      const depthM =
        mainStructure.depthM ??
        boundaryDimensions?.depth ??
        mainStructure.height /
          20;

      const savedShape =
        mainStructure.shapeType ??
        "rectangle";

      const hasShapeDetails =
        mainStructure
          .shapeDetailWidthM !==
          undefined &&
        mainStructure
          .shapeDetailDepthM !==
          undefined;

      /*
       * Older saved L/U/T shapes may
       * not have their shape-detail
       * measurements.
       *
       * In that case preserve their
       * exact polygon by treating them
       * as a custom outline.
       */
      const editableShape =
        savedShape ===
          "rectangle" ||
        savedShape ===
          "custom" ||
        hasShapeDetails
          ? savedShape
          : "custom";

      setStructureDraft({
        enabled: true,

        name:
          mainStructure.name,

        structureKind:
          mainStructure
            .structureKind ??
          "other",

        shapeType:
          editableShape,

        widthM:
          String(widthM),

        depthM:
          String(depthM),

        detailWidthM:
          mainStructure
            .shapeDetailWidthM !==
          undefined
            ? String(
                mainStructure
                  .shapeDetailWidthM,
              )
            : "",

        detailDepthM:
          mainStructure
            .shapeDetailDepthM !==
          undefined
            ? String(
                mainStructure
                  .shapeDetailDepthM,
              )
            : "",

        customPoints:
          editableShape ===
          "custom"
            ? mainStructure
                .boundary ?? []
            : [],

        physicalHeightM:
          String(
            mainStructure
              .physicalHeightM ??
              5,
          ),

        floorLevel:
          String(
            mainStructure
              .floorLevel ??
              0,
          ),

        baseElevationM:
          String(
            mainStructure
              .baseElevationM ??
              0,
          ),

        ceilingHeightM:
          String(
            mainStructure
              .ceilingHeightM ??
              2.4,
          ),
      });

      positions.structure = {
        x:
          mainStructure.layoutX ??
          0.5,

        y:
          mainStructure.layoutY ??
          0.3,

        rotation:
          mainStructure.rotation ??
          0,
      };

      /*
       * Prevent the existing
       * selectedType effect from
       * replacing the loaded building
       * with a default one.
       */
      if (
  mainStructure.structureKind ===
    "flat"
) {
  setStructureDraftPropertyType(
    "flat",
  );
} else if (
  mainStructure.structureKind ===
    "maisonette"
) {
  setStructureDraftPropertyType(
    "maisonette",
  );
} else if (
  selectedType
) {
  setStructureDraftPropertyType(
    selectedType,
  );
}
    }

    setLayoutPositions(
      positions,
    );

    setCurrentStep(4);

    setStepFourStage(
      "layout",
    );

    editLayoutLoaded.current =
      true;
  }

  const unsubscribeSpaces =
    subscribeToPropertySpaces(
      (spaces) => {
        savedSpaces =
          spaces;

        tryLoadSavedLayout();
      },
      (loadError) => {
        console.error(
          "Unable to load saved property spaces:",
          loadError,
        );
      },
    );

  const unsubscribeObjects =
    subscribeToPropertyObjects(
      (objects) => {
        savedObjects =
          objects;

        tryLoadSavedLayout();
      },
      (loadError) => {
        console.error(
          "Unable to load saved property objects:",
          loadError,
        );
      },
    );

  return () => {
    unsubscribeSpaces();
    unsubscribeObjects();
  };
}, [
  isEditMode,
  selectedType,
]);

  useEffect(() => {
    const unsubscribe =
      subscribeToPropertyConfig(
        (config) => {
          if (!config) {
            return;
          }

          setNorthRotation(
  config.northRotation ?? 0,
);

          setPropertyName(config.name);

          const savedTypeStillExists =
            propertyOptions.some(
              (option) =>
                option.type ===
                config.propertyType,
            );

          setSelectedType(
            savedTypeStillExists
              ? config.propertyType
              : null,
          );

          if (
            config.selectedSpaceTypes
          ) {
            setSelectedSpaces(
              config.selectedSpaceTypes,
            );
          }
        },
        (subscriptionError) => {
          console.error(
            "Unable to load property config:",
            subscriptionError,
          );
        },
      );

    return unsubscribe;
  }, []);

  const availableSpaces =
    useMemo(() => {
      if (!selectedType) {
        return [];
      }

      return spacesByPropertyType[
        selectedType
      ].map(
        (spaceType) =>
          allSpaceOptions[spaceType],
      );
    }, [selectedType]);

  async function handleStepOneSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedType) {
      setError(
        "Choose the type of property or site you have.",
      );

      return;
    }

    const trimmedName =
      propertyName.trim();

    if (!trimmedName) {
      setError(
        "Give your property a name.",
      );

      return;
    }

    setError("");
    setIsSaving(true);

    try {
      await createPropertyConfig({
        name: trimmedName,
        propertyType: selectedType,
        northRotation: 0,
        setupComplete: false,
      });

      setCurrentStep(2);
    } catch (caughtError) {
      console.error(
        "Unable to save property setup:",
        caughtError,
      );

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Your property could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStepTwoSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (selectedSpaces.length === 0) {
      setError(
        "Choose at least one space that belongs to your property.",
      );

      return;
    }

    setError("");
    setIsSaving(true);

    try {
      await updatePropertyConfig({
  selectedSpaceTypes:
    selectedSpaces,
});


setSpaceDimensionDrafts(
  (existingDrafts) => {
    const nextDrafts = {
      ...existingDrafts,
    };

    selectedSpaces.forEach(
      (spaceType) => {
        if (
          nextDrafts[spaceType]
        ) {
          return;
        }

        nextDrafts[
  spaceType
] =
  createDefaultSpaceDraft(
    spaceType,
  );
      },
    );

    return nextDrafts;
  },
);

setCurrentStep(3);
    } catch (caughtError) {
      console.error(
        "Unable to save property spaces:",
        caughtError,
      );

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Your spaces could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function toggleSpace(
    spaceType: SpaceType,
  ) {
    setSelectedSpaces(
      (currentSpaces) => {
        if (
          currentSpaces.includes(
            spaceType,
          )
        ) {
          return currentSpaces.filter(
            (type) =>
              type !== spaceType,
          );
        }

        return [
          ...currentSpaces,
          spaceType,
        ];
      },
    );

    setError("");
  }

  function updateSpaceDraft(
  spaceType: SpaceType,
  changes: Partial<
    SpaceShapeDraft
  >,
) {
  setSpaceDimensionDrafts(
    (currentDrafts) => {
      const current =
        currentDrafts[
          spaceType
        ] ?? {
          name:
            allSpaceOptions[
              spaceType
            ].title,

          widthM: "",
          depthM: "",
          elevationM: "0",
        };

        createDefaultSpaceDraft(
  spaceType,
)

      return {
        ...currentDrafts,

        [spaceType]: {
          ...current,
          ...changes,
        },
      };
    },
  );
}

function handleStructureOutlinePointerDown(
  event: ReactPointerEvent<SVGSVGElement>,
) {
  event.preventDefault();

  const width =
    Number(
      structureDraft.widthM,
    );

  const depth =
    Number(
      structureDraft.depthM,
    );

  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(depth) ||
    depth <= 0
  ) {
    setError(
      "Enter the overall width and depth before drawing the layout.",
    );

    return;
  }

  const rectangle =
    event.currentTarget.getBoundingClientRect();

  const relativeX =
    (event.clientX -
      rectangle.left) /
    rectangle.width;

  const relativeY =
    (event.clientY -
      rectangle.top) /
    rectangle.height;

  const point: PropertyPoint = {
    x: Number(
      (
        relativeX *
        width
      ).toFixed(2),
    ),

    y: Number(
      (
        relativeY *
        depth
      ).toFixed(2),
    ),
  };

  setStructureDraft(
    (current) => ({
      ...current,

      customPoints: [
        ...current.customPoints,
        point,
      ],
    }),
  );

  setError("");
}

function handleCustomOutlinePointerDown(
  event: ReactPointerEvent<SVGSVGElement>,
  spaceType: SpaceType,
) {
  event.preventDefault();

  const draft =
    spaceDimensionDrafts[
      spaceType
    ];

  if (!draft) {
    return;
  }

  const width =
    Number(draft.widthM);

  const depth =
    Number(draft.depthM);

  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(depth) ||
    depth <= 0
  ) {
    setError(
      "Enter the overall width and depth before drawing the custom outline.",
    );

    return;
  }

  const rectangle =
    event.currentTarget.getBoundingClientRect();

  const relativeX =
    (event.clientX -
      rectangle.left) /
    rectangle.width;

  const relativeY =
    (event.clientY -
      rectangle.top) /
    rectangle.height;

  const point = {
    x: Number(
      (
        relativeX *
        width
      ).toFixed(2),
    ),

    y: Number(
      (
        relativeY *
        depth
      ).toFixed(2),
    ),
  };

  updateSpaceDraft(
    spaceType,
    {
      customPoints: [
        ...draft.customPoints,
        point,
      ],
    },
  );

  setError("");
}

async function handleSaveProperty() {
  setError("");
  setIsSaving(true);

  try {
    const finalSpaces:
      NewPropertySpace[] = [];

    for (
      const spaceType of
      selectedSpaces
    ) {
      const draft =
        spaceDimensionDrafts[
          spaceType
        ];

      const position =
        layoutPositions[
          `space:${spaceType}`
        ];

      if (
        !draft ||
        !position
      ) {
        throw new Error(
          "One of the property spaces is missing its layout position.",
        );
      }

      const widthM =
        Number(
          draft.widthM,
        );

      const depthM =
        Number(
          draft.depthM,
        );

      const elevationM =
        Number(
          draft.elevationM ||
            "0",
        );

      const boundary =
        buildSpaceBoundary(
          draft,
        );

      if (
        !boundary ||
        !Number.isFinite(
          widthM,
        ) ||
        widthM <= 0 ||
        !Number.isFinite(
          depthM,
        ) ||
        depthM <= 0
      ) {
        throw new Error(
          `Check the measurements for ${draft.name}.`,
        );
      }

      finalSpaces.push({
        name:
          draft.name.trim(),

        type: spaceType,

        widthM,
        depthM,

        shapeType:
          draft.shapeType,

        boundary,

        ...(draft.detailWidthM.trim()
  ? {
      shapeDetailWidthM:
        Number(
          draft.detailWidthM,
        ),
    }
  : {}),

...(draft.detailDepthM.trim()
  ? {
      shapeDetailDepthM:
        Number(
          draft.detailDepthM,
        ),
    }
  : {}),

        elevationM,

        // Kept for compatibility with
        // the existing model.
        x: 0,
        y: 0,

        // Actual final layout.
        layoutX:
          position.x,

        layoutY:
          position.y,

        rotation:
          position.rotation,
      });
    }

    // Save the final version of
    // all spaces again because the
    // user may have changed their
    // dimensions on the layout page.
    await replaceSetupPropertySpaces(
      finalSpaces,
    );

    if (
      structureDraft.enabled
    ) {
      const structurePosition =
        layoutPositions.structure;

      if (
        !structurePosition
      ) {
        throw new Error(
          "The building is missing its layout position.",
        );
      }

      const structureWidth =
        Number(
          structureDraft.widthM,
        );

      const structureDepth =
        Number(
          structureDraft.depthM,
        );

      const structureBoundary =
        buildStructureBoundary(
          structureDraft,
        );

      if (
        !structureBoundary ||
        !Number.isFinite(
          structureWidth,
        ) ||
        structureWidth <= 0 ||
        !Number.isFinite(
          structureDepth,
        ) ||
        structureDepth <= 0
      ) {
        throw new Error(
          "Check the building measurements before saving.",
        );
      }

      const isFlatLike =
        structureDraft
          .structureKind ===
          "flat" ||
        structureDraft
          .structureKind ===
          "maisonette";

      await saveSetupStructure({
  type: "house",

  name:
    structureDraft.name.trim(),

  structureKind:
    structureDraft.structureKind,

  shapeType:
    structureDraft.shapeType,

  boundary:
    structureBoundary,

  widthM:
    structureWidth,

  depthM:
    structureDepth,

  ...(structureDraft
    .detailWidthM
    .trim()
    ? {
        shapeDetailWidthM:
          Number(
            structureDraft
              .detailWidthM,
          ),
      }
    : {}),

  ...(structureDraft
    .detailDepthM
    .trim()
    ? {
        shapeDetailDepthM:
          Number(
            structureDraft
              .detailDepthM,
          ),
      }
    : {}),

  // Existing legacy map values.
  x: 300,
  y: 180,

  width:
    structureWidth * 20,

  height:
    structureDepth * 20,

  // New saved layout.
  layoutX:
    structurePosition.x,

  layoutY:
    structurePosition.y,

  rotation:
    structurePosition.rotation,

  physicalHeightM:
    isFlatLike
      ? Number(
          structureDraft
            .ceilingHeightM,
        )
      : Number(
          structureDraft
            .physicalHeightM,
        ),

  baseElevationM:
    isFlatLike
      ? Number(
          structureDraft
            .baseElevationM,
        )
      : 0,

  ...(isFlatLike
    ? {
        floorLevel:
          Number(
            structureDraft
              .floorLevel,
          ),

        ceilingHeightM:
          Number(
            structureDraft
              .ceilingHeightM,
          ),
      }
    : {}),
});
    } else {
      await deleteSetupStructure();
    }

    // This is the switch that tells
    // the rest of GrowHub that the
    // new property layout is ready.
    await updatePropertyConfig({
      northRotation,
      setupComplete: true,
    });

    window.location.assign(
      "/dashboard",
    );
  } catch (saveError) {
    console.error(
      "Unable to save property:",
      saveError,
    );

    setError(
      saveError instanceof Error
        ? saveError.message
        : "The property could not be saved.",
    );
  } finally {
    setIsSaving(false);
  }
}

async function handleStepThreeSubmit(
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  setError("");

  const spacesToSave:
    NewPropertySpace[] = [];

  for (
    let index = 0;
    index <
    selectedSpaces.length;
    index += 1
  ) {
    const spaceType =
      selectedSpaces[index];

    const draft =
      spaceDimensionDrafts[
        spaceType
      ];

    if (!draft) {
      setError(
        "Complete every selected space.",
      );

      return;
    }

    const name =
      draft.name.trim();

    const widthM =
      Number(draft.widthM);

    const depthM =
      Number(draft.depthM);

    const elevationM =
      Number(
        draft.elevationM ||
          "0",
      );

    if (!name) {
      setError(
        "Every space needs a name.",
      );

      return;
    }

    if (
      !Number.isFinite(widthM) ||
      widthM <= 0 ||
      !Number.isFinite(depthM) ||
      depthM <= 0
    ) {
      setError(
        `Enter valid overall dimensions for ${name}.`,
      );

      return;
    }

    const boundary =
      buildSpaceBoundary(
        draft,
      );

    if (!boundary) {
      if (
        draft.shapeType ===
        "custom"
      ) {
        setError(
          `${name} needs at least three custom outline points.`,
        );
      } else {
        setError(
          `Check the shape measurements for ${name}.`,
        );
      }

      return;
    }

    if (
      !Number.isFinite(
        elevationM,
      ) ||
      elevationM < 0
    ) {
      setError(
        `Enter a valid elevation for ${name}.`,
      );

      return;
    }

    spacesToSave.push({
      name,
      type: spaceType,

      widthM,
      depthM,

      shapeType:
        draft.shapeType,

      boundary,

      elevationM,

      x:
        60 +
        (index % 2) * 440,

      y:
        60 +
        Math.floor(
          index / 2,
        ) *
          300,
    });
  }

  setIsSaving(true);

  try {
    await replaceSetupPropertySpaces(
      spacesToSave,
    );

    setCurrentStep(4);

  } catch (caughtError) {
    console.error(
      "Unable to save space shapes:",
      caughtError,
    );

    setError(
      caughtError instanceof Error
        ? caughtError.message
        : "The spaces could not be saved.",
    );
  } finally {
    setIsSaving(false);
  }
}


  if (stepThreeComplete) {
  return (
    <main className="property-setup-page">
      <section className="property-setup-complete">
        <div className="property-setup-complete-icon">
          ✓
        </div>

        <p className="property-setup-kicker">
          Step 3 complete
        </p>

        <h1>
          Your spaces have dimensions
        </h1>

        <p>
          GrowHub now knows the
          real-world size of{" "}
          <strong>
            {selectedSpaces.length}
          </strong>{" "}
          {selectedSpaces.length ===
          1
            ? "space"
            : "spaces"}
          .
        </p>

        <p className="property-setup-muted">
          Next we'll position the
          spaces and establish the
          property's orientation so
          sunlight and shadows can be
          calculated correctly.
        </p>

        <button
          type="button"
          onClick={() =>
            setStepThreeComplete(
              false,
            )
          }
        >
          Edit dimensions
        </button>
      </section>
    </main>
  );
}
function ShapeDetailFields({
  firstLabel,
  secondLabel,
}: {
  firstLabel: string;
  secondLabel: string;
}) {
  return (
    <div className="space-measurement-grid shape-detail-measurements">
      <label>
        {firstLabel}

        <div className="measurement-input">
          <input
            type="number"
            min="0.1"
            step="0.1"
            inputMode="decimal"
            value={
              structureDraft
                .detailWidthM
            }
            onChange={(event) =>
              setStructureDraft(
                (current) => ({
                  ...current,

                  detailWidthM:
                    event.target
                      .value,
                }),
              )
            }
          />

          <span>
            metres
          </span>
        </div>
      </label>

      <label>
        {secondLabel}

        <div className="measurement-input">
          <input
            type="number"
            min="0.1"
            step="0.1"
            inputMode="decimal"
            value={
              structureDraft
                .detailDepthM
            }
            onChange={(event) =>
              setStructureDraft(
                (current) => ({
                  ...current,

                  detailDepthM:
                    event.target
                      .value,
                }),
              )
            }
          />

          <span>
            metres
          </span>
        </div>
      </label>
    </div>
  );
}

if (
  currentStep === 4 &&
  stepFourStage === "layout"
) {
  const structureWidth =
    Number(
      structureDraft.widthM,
    );

  const structureDepth =
    Number(
      structureDraft.depthM,
    );

  const structureBoundary =
    structureDraft.enabled
      ? buildStructureBoundary(
          structureDraft,
        )
      : null;

  const allLayoutDimensions: number[] =
  [];

if (
  structureDraft.enabled
) {
  allLayoutDimensions.push(
    Number(
      structureDraft.widthM,
    ) || 0,

    Number(
      structureDraft.depthM,
    ) || 0,
  );
}

selectedSpaces.forEach(
  (spaceType) => {
    const draft =
      spaceDimensionDrafts[
        spaceType
      ];

    if (!draft) {
      return;
    }

    allLayoutDimensions.push(
      Number(
        draft.widthM,
      ) || 0,

      Number(
        draft.depthM,
      ) || 0,
    );
  },
);

const largestDimension =
  Math.max(
    10,
    ...allLayoutDimensions,
  );

const layoutPixelsPerMetre =
  Math.max(
    8,
    Math.min(
      32,
      420 /
        largestDimension,
    ),
  );

  return (
    <main className="property-setup-page">
      <section className="property-setup-card">
        <header className="property-setup-header">
          <p className="property-setup-kicker">
            Property setup · Step 4
          </p>

          <h1>
  {isEditMode
    ? "Edit your property"
    : "Arrange your property"}
</h1>

          <p>
  {isEditMode
    ? "Move, resize or rotate your existing property layout, then save your changes."
    : "This is the first view of your property map. Position your building and spaces here before saving."}
</p>
        </header>

        <div className="property-layout-toolbar">
          <div>
            <strong>
              North direction
            </strong>

            <small>
              Rotate the compass so
              it matches your real
              property.
            </small>
          </div>

          <div className="north-control">
            <input
              type="range"
              min="0"
              max="359"
              step="1"
              value={
                northRotation
              }
              onChange={(
                event,
              ) =>
                setNorthRotation(
                  Number(
                    event.target
                      .value,
                  ),
                )
              }
            />

            <span>
              {northRotation}°
            </span>
          </div>
        </div>

        {selectedLayoutItem && (
  <section className="layout-inspector">
    <div className="layout-inspector-heading">
      <div>
        <strong>
          {selectedLayoutItem.kind ===
          "structure"
            ? structureDraft.name
            : spaceDimensionDrafts[
                selectedLayoutItem
                  .spaceType
              ]?.name}
        </strong>

        <small>
          Adjust measurements and
          rotation before saving.
        </small>
      </div>

      <button
        type="button"
        onClick={() =>
          setSelectedLayoutItem(
            null,
          )
        }
      >
        ×
      </button>
    </div>

    {selectedLayoutItem.kind ===
      "structure" && (
      <div className="layout-inspector-fields">
        <label>
          Width

          <div className="measurement-input">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={
                structureDraft.widthM
              }
              onChange={(event) =>
                setStructureDraft(
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

  <div className="measurement-input">
    <input
      type="number"
      min="0.1"
      step="0.1"
      value={
        structureDraft.depthM
      }
      onChange={(event) =>
        setStructureDraft(
          (current) => ({
            ...current,

            depthM:
              event.target.value,
          }),
        )
      }
    />

    <span>m</span>
  </div>
</label>

<label>
  Rotation

  <div className="measurement-input">
    <input
      type="number"
      min="0"
      max="359"
      step="1"
      value={
        layoutPositions
          .structure
          ?.rotation ?? 0
      }
      onChange={(event) =>
        setLayoutPositions(
          (current) => ({
            ...current,

            structure: {
              ...current.structure,

              rotation:
                Number(
                  event.target.value,
                ),
            },
          }),
        )
      }
    />

    <span>°</span>
  </div>
</label>
        
      </div>
    )}

    {selectedLayoutItem.kind ===
      "space" &&
      (() => {
        const spaceType =
          selectedLayoutItem.spaceType;

        const draft =
          spaceDimensionDrafts[
            spaceType
          ];

        const position =
          layoutPositions[
            `space:${spaceType}`
          ];

        if (!draft) {
          return null;
        }

        return (
          <div className="layout-inspector-fields">
            <label>
              Width

              <div className="measurement-input">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={
                    draft.widthM
                  }
                  onChange={(
                    event,
                  ) =>
                    updateSpaceDraft(
                      spaceType,
                      {
                        widthM:
                          event
                            .target
                            .value,
                      },
                    )
                  }
                />

                <span>
                  m
                </span>
              </div>
            </label>

            <label>
              Depth

              <div className="measurement-input">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={
                    draft.depthM
                  }
                  onChange={(
                    event,
                  ) =>
                    updateSpaceDraft(
                      spaceType,
                      {
                        depthM:
                          event
                            .target
                            .value,
                      },
                    )
                  }
                />

                <span>
                  m
                </span>
              </div>
            </label>

            <label>
              Rotation

              <div className="measurement-input">
                <input
                  type="number"
                  min="0"
                  max="359"
                  step="1"
                  value={
                    position
                      ?.rotation ??
                    0
                  }
                  onChange={(
                    event,
                  ) =>
                    setLayoutPositions(
                      (
                        current,
                      ) => ({
                        ...current,

                        [`space:${spaceType}`]:
                          {
                            ...current[
                              `space:${spaceType}`
                            ],

                            rotation:
                              Number(
                                event
                                  .target
                                  .value,
                              ),
                          },
                      }),
                    )
                  }
                />

                <span>
                  °
                </span>
              </div>
            </label>
          </div>
        );
      })()}
  </section>
)}

        <div
  ref={layoutCanvasRef}
  className="property-layout-canvas"
>
          <div
            className="property-layout-north"
            style={{
              transform: `rotate(${northRotation}deg)`,
            }}
          >
            ↑
            <span>N</span>
          </div>

          {structureDraft.enabled &&
  structureBoundary &&
  layoutPositions.structure && (
    <div
      className={
        selectedLayoutItem?.kind ===
        "structure"
          ? "layout-item layout-item-selected"
          : "layout-item"
      }
      style={{
        left: `${
          layoutPositions
            .structure.x * 100
        }%`,

        top: `${
          layoutPositions
            .structure.y * 100
        }%`,

        width: `${
          structureWidth *
          layoutPixelsPerMetre
        }px`,

        height: `${
          structureDepth *
          layoutPixelsPerMetre
        }px`,
      }}
      onPointerDown={(
        event,
      ) => {
        setSelectedLayoutItem({
          kind: "structure",
        });

        startLayoutDrag(
          event,
          "structure",
        );
      }}
      onPointerMove={(
        event,
      ) =>
        moveLayoutDrag(
          event,
          "structure",
        )
      }
      onPointerUp={
        finishLayoutDrag
      }
      onPointerCancel={
        finishLayoutDrag
      }
    >
      <div
        className="layout-item-rotatable"
        style={{
          transform: `rotate(${
            layoutPositions
              .structure
              .rotation
          }deg)`,
        }}
      >
        <svg
          viewBox={`0 0 ${structureWidth} ${structureDepth}`}
        >
          <polygon
            points={structureBoundary
              .map(
                (point) =>
                  `${point.x},${point.y}`,
              )
              .join(" ")}
            className="layout-structure-polygon"
          />
        </svg>
      </div>

      <div className="layout-item-name">
        {
          structureDraft.name
        }
      </div>

      <div className="layout-item-dimensions">
        {structureWidth} m
        ×{" "}
        {structureDepth} m
      </div>
    </div>
  )}

          <div className="layout-space-list">
            {selectedSpaces.map(
              (spaceType) => {
                const draft =
                  spaceDimensionDrafts[
                    spaceType
                  ];

                if (!draft) {
                  return null;
                }

                const width =
                  Number(
                    draft.widthM,
                  );

                const depth =
                  Number(
                    draft.depthM,
                  );

                const boundary =
                  buildSpaceBoundary(
                    draft,
                  );

                  const key =
  `space:${spaceType}`;

const position =
  layoutPositions[key];

if (!position) {
  return null;
}

                if (
                  !boundary ||
                  !width ||
                  !depth
                ) {
                  return null;
                }

                return (
                  <div
  key={spaceType}
  className={
    selectedLayoutItem?.kind ===
      "space" &&
    selectedLayoutItem.spaceType ===
      spaceType
      ? "layout-item layout-space-item layout-item-selected"
      : "layout-item layout-space-item"
  }
  style={{
    left: `${
      position.x * 100
    }%`,

    top: `${
      position.y * 100
    }%`,

    width: `${
      width *
      layoutPixelsPerMetre
    }px`,

    height: `${
      depth *
      layoutPixelsPerMetre
    }px`,
  }}
  onPointerDown={(
    event,
  ) => {
    setSelectedLayoutItem({
      kind: "space",
      spaceType,
    });

    startLayoutDrag(
      event,
      key,
    );
  }}
  onPointerMove={(
    event,
  ) =>
    moveLayoutDrag(
      event,
      key,
    )
  }
  onPointerUp={
    finishLayoutDrag
  }
  onPointerCancel={
    finishLayoutDrag
  }
>
  <div
    className="layout-item-rotatable"
    style={{
      transform: `rotate(${position.rotation}deg)`,
    }}
  >
    <svg
      viewBox={`0 0 ${width} ${depth}`}
    >
      <polygon
        points={boundary
          .map(
            (point) =>
              `${point.x},${point.y}`,
          )
          .join(" ")}
      />
    </svg>
  </div>

  <div className="layout-item-name">
    {draft.name}
  </div>

  <div className="layout-item-dimensions">
    {width} m × {depth} m
  </div>
</div>
                );
              },
            )}
          </div>
        </div>

        <p className="layout-help-text">
          This first version places
          the items automatically.
          Next we'll make them
          draggable and rotatable.
        </p>

        {error && (
  <p className="property-setup-error">
    {error}
  </p>
)}

        <footer className="property-setup-actions">
          <button
            className="property-setup-back"
            type="button"
            onClick={() =>
              setStepFourStage(
                "structure",
              )
            }
          >
            ← Back
          </button>

          <span>
            Step 4 of 4
          </span>

          <button
  className="property-setup-continue"
  type="button"
  disabled={isSaving}
  onClick={() => {
    void handleSaveProperty();
  }}
>
  {isSaving
  ? "Saving changes…"
  : isEditMode
    ? "Save changes"
    : "Save property"}
</button>
        </footer>
      </section>
    </main>
  );
}

if (
  currentStep === 4 &&
  stepFourStage === "structure"
) {
  const isFlatLike =
    selectedType === "flat" ||
    selectedType === "maisonette";

  const isHouse =
    selectedType === "detached" ||
    selectedType ===
      "semi-detached" ||
    selectedType === "terraced";

  const structureIsOptional =
    !isFlatLike &&
    !isHouse;



  const structureTitle =
    selectedType === "flat"
      ? "Define your flat layout"
      : selectedType ===
          "maisonette"
        ? "Define your maisonette"
        : isHouse
          ? "Define your house"
          : "Add a structure";

  return (
    <main className="property-setup-page">
      <form
        className="property-setup-card"
        onSubmit={(event) => {
  event.preventDefault();

  setError("");

  if (structureDraft.enabled) {
    const width =
      Number(
        structureDraft.widthM,
      );

    const depth =
      Number(
        structureDraft.depthM,
      );

    if (
      !Number.isFinite(width) ||
      width <= 0 ||
      !Number.isFinite(depth) ||
      depth <= 0
    ) {
      setError(
        "Enter valid dimensions for the property layout.",
      );

      return;
    }

    if (
      structureDraft.shapeType ===
        "custom" &&
      structureDraft.customPoints
        .length < 3
    ) {
      setError(
        "Add at least three points to the custom footprint.",
      );

      return;
    }
  }
setLayoutPositions(
  (current) => {
    if (
      Object.keys(current)
        .length > 0
    ) {
      return current;
    }

    const next: Record<
      string,
      LayoutPosition
    > = {};

    if (
      structureDraft.enabled
    ) {
      next.structure = {
        x: 0.5,
        y: 0.3,
        rotation: 0,
      };
    }

    selectedSpaces.forEach(
      (spaceType, index) => {
        next[
          `space:${spaceType}`
        ] = {
          x:
            0.22 +
            (index % 3) *
              0.28,

          y:
            0.68 +
            Math.floor(
              index / 3,
            ) *
              0.18,

          rotation: 0,
        };
      },
    );

    return next;
  },
);

setStepFourStage(
  "layout",
);
}}
      >
        <header className="property-setup-header">
          <p className="property-setup-kicker">
            Property setup · Step 4
          </p>

          <h1>
            {structureTitle}
          </h1>

          <p>
            {isFlatLike
              ? "Create the footprint of your home. Later we'll add exterior walls and windows so GrowHub can understand indoor sunlight."
              : isHouse
                ? "Define the footprint and approximate height of your main house."
                : "Add any main structure that affects your growing spaces and sunlight."}
          </p>
        </header>

        {structureIsOptional && (
          <div className="building-choice">
            <button
              type="button"
              className={
                structureDraft.enabled
                  ? "building-choice-card building-choice-card-selected"
                  : "building-choice-card"
              }
              onClick={() =>
                setStructureDraft(
                  (current) => ({
                    ...current,
                    enabled: true,
                  }),
                )
              }
            >
              <span>🏠</span>

              <div>
                <strong>
                  Add a structure
                </strong>

                <small>
                  Shed, building or
                  another major
                  structure.
                </small>
              </div>
            </button>

            <button
              type="button"
              className={
                !structureDraft.enabled
                  ? "building-choice-card building-choice-card-selected"
                  : "building-choice-card"
              }
              onClick={() =>
                setStructureDraft(
                  (current) => ({
                    ...current,
                    enabled: false,
                  }),
                )
              }
            >
              <span>🌱</span>

              <div>
                <strong>
                  No main structure
                </strong>

                <small>
                  Continue with an
                  open growing site.
                </small>
              </div>
            </button>
          </div>
        )}

        {structureDraft.enabled && (
          <section className="building-setup-card">
            <label>
              {isFlatLike
                ? "Home name"
                : "Building name"}

              <input
                type="text"
                value={
                  structureDraft.name
                }
                onChange={(event) =>
                  setStructureDraft(
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

            <div className="space-shape-section">
              <strong>
                {isFlatLike
                  ? "Flat footprint"
                  : "Building footprint"}
              </strong>

              <div className="space-shape-options">
                {spaceShapeOptions.map(
                  (shape) => {
                    const isSelected =
                      structureDraft
                        .shapeType ===
                      shape.type;

                    return (
                      <button
                        key={
                          shape.type
                        }
                        type="button"
                        className={
                          isSelected
                            ? "space-shape-option space-shape-option-selected"
                            : "space-shape-option"
                        }
                        onClick={() =>
                          setStructureDraft(
                            (
                              current,
                            ) => ({
                              ...current,

                              shapeType:
                                shape.type,

                              customPoints:
                                shape.type ===
                                "custom"
                                  ? current.customPoints
                                  : [],
                            }),
                          )
                        }
                      >
                        <span>
                          {
                            shape.icon
                          }
                        </span>

                        {
                          shape.title
                        }
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="space-measurement-grid">
              <label>
                Overall width

                <div className="measurement-input">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    inputMode="decimal"
                    value={
                      structureDraft
                        .widthM
                    }
                    onChange={(
                      event,
                    ) =>
                      setStructureDraft(
                        (
                          current,
                        ) => ({
                          ...current,

                          widthM:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />

                  <span>
                    metres
                  </span>
                </div>
              </label>

              <label>
                Overall depth

                <div className="measurement-input">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    inputMode="decimal"
                    value={
                      structureDraft
                        .depthM
                    }
                    onChange={(
                      event,
                    ) =>
                      setStructureDraft(
                        (
                          current,
                        ) => ({
                          ...current,

                          depthM:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />

                  <span>
                    metres
                  </span>
                </div>
              </label>

              {!isFlatLike && (
                <label>
                  Approximate height

                  <div className="measurement-input">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      inputMode="decimal"
                      value={
                        structureDraft
                          .physicalHeightM
                      }
                      onChange={(
                        event,
                      ) =>
                        setStructureDraft(
                          (
                            current,
                          ) => ({
                            ...current,

                            physicalHeightM:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                    />

                    <span>
                      metres
                    </span>
                  </div>
                </label>
              )}
            </div>

            {isFlatLike && (
              <div className="flat-layout-details">
                <h2>
                  Flat position
                </h2>

                <p>
                  This helps GrowHub
                  understand the
                  elevation of your
                  windows and balcony.
                </p>

                <div className="space-measurement-grid">
                  <label>
                    Floor level

                    <div className="measurement-input">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={
                          structureDraft
                            .floorLevel
                        }
                        onChange={(
                          event,
                        ) =>
                          setStructureDraft(
                            (
                              current,
                            ) => ({
                              ...current,

                              floorLevel:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />
                    </div>
                  </label>

                  <label>
                    Height above ground

                    <div className="measurement-input">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        inputMode="decimal"
                        value={
                          structureDraft
                            .baseElevationM
                        }
                        onChange={(
                          event,
                        ) =>
                          setStructureDraft(
                            (
                              current,
                            ) => ({
                              ...current,

                              baseElevationM:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />

                      <span>
                        metres
                      </span>
                    </div>
                  </label>

                  <label>
                    Ceiling height

                    <div className="measurement-input">
                      <input
                        type="number"
                        min="1"
                        step="0.1"
                        inputMode="decimal"
                        value={
                          structureDraft
                            .ceilingHeightM
                        }
                        onChange={(
                          event,
                        ) =>
                          setStructureDraft(
                            (
                              current,
                            ) => ({
                              ...current,

                              ceilingHeightM:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />

                      <span>
                        metres
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {structureDraft.shapeType ===
              "l-shape" && (
              <ShapeDetailFields
                firstLabel="Cut-out width"
                secondLabel="Cut-out depth"
              />
            )}

            {structureDraft.shapeType ===
              "u-shape" && (
              <ShapeDetailFields
                firstLabel="Opening width"
                secondLabel="Opening depth"
              />
            )}

            {structureDraft.shapeType ===
              "t-shape" && (
              <ShapeDetailFields
                firstLabel="Stem width"
                secondLabel="Top section depth"
              />
            )}

            {structureDraft.shapeType ===
              "custom" && (
              <div className="custom-outline-section">
                <div className="custom-outline-heading">
                  <div>
                    <strong>
                      Draw the footprint
                    </strong>

                    <p>
                      Enter the overall
                      dimensions above,
                      then tap each
                      corner in order.
                    </p>
                  </div>

                  <span>
                    {
                      structureDraft
                        .customPoints
                        .length
                    }{" "}
                    corners
                  </span>
                </div>

                <svg
                  className="custom-outline-editor"
                  viewBox="0 0 400 260"
                  onPointerDown={
                    handleStructureOutlinePointerDown
                  }
                >
                  <rect
                    x="1"
                    y="1"
                    width="398"
                    height="258"
                    rx="10"
                    className="custom-outline-background"
                  />

                  {structureDraft.customPoints
                    .length >= 3 && (
                    <polygon
                      points={structureDraft.customPoints
                        .map(
                          (
                            point,
                          ) => {
                            const width =
                              Number(
                                structureDraft
                                  .widthM,
                              );

                            const depth =
                              Number(
                                structureDraft
                                  .depthM,
                              );

                            return `${
                              (point.x /
                                width) *
                              400
                            },${
                              (point.y /
                                depth) *
                              260
                            }`;
                          },
                        )
                        .join(" ")}
                      className="custom-outline-fill"
                    />
                  )}

                  {structureDraft.customPoints.map(
                    (
                      point,
                      index,
                    ) => {
                      const width =
                        Number(
                          structureDraft
                            .widthM,
                        );

                      const depth =
                        Number(
                          structureDraft
                            .depthM,
                        );

                      if (
                        !width ||
                        !depth
                      ) {
                        return null;
                      }

                      return (
                        <g
                          key={`${point.x}-${point.y}-${index}`}
                        >
                          <circle
                            cx={
                              (point.x /
                                width) *
                              400
                            }
                            cy={
                              (point.y /
                                depth) *
                              260
                            }
                            r="7"
                            className="custom-outline-point"
                          />

                          <text
                            x={
                              (point.x /
                                width) *
                                400 +
                              10
                            }
                            y={
                              (point.y /
                                depth) *
                                260 -
                              8
                            }
                            className="custom-outline-point-label"
                          >
                            {index +
                              1}
                          </text>
                        </g>
                      );
                    },
                  )}
                </svg>

                <div className="custom-outline-actions">
                  <button
                    type="button"
                    onClick={() =>
                      setStructureDraft(
                        (
                          current,
                        ) => ({
                          ...current,

                          customPoints:
                            current.customPoints.slice(
                              0,
                              -1,
                            ),
                        }),
                      )
                    }
                  >
                    ↶ Undo corner
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStructureDraft(
                        (
                          current,
                        ) => ({
                          ...current,
                          customPoints:
                            [],
                        }),
                      )
                    }
                  >
                    Clear outline
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <footer className="property-setup-actions">
          <button
            className="property-setup-back"
            type="button"
            onClick={() => {
              setCurrentStep(3);
              setError("");
            }}
          >
            ← Back
          </button>

          <span>
            Step 4
          </span>

          <button
            className="property-setup-continue"
            type="submit"
          >
            Continue to layout
          </button>
        </footer>
      </form>
    </main>
  );
}

if (currentStep === 3) {
  return (
    <main className="property-setup-page">
      <form
        className="property-setup-card"
        onSubmit={
          handleStepThreeSubmit
        }
      >
        {import.meta.env.DEV && (
  <button
    type="button"
    className="development-reset-button"
    disabled={isResettingSetup}
    onClick={async () => {
      const confirmed =
        window.confirm(
          "Reset the onboarding setup for this account?\n\nYour gardens, plants and property objects will not be deleted.",
        );

      if (!confirmed) {
        return;
      }

      setIsResettingSetup(true);

      try {
        await Promise.all([
  resetPropertySetupForDevelopment(),
  deleteSetupStructure(),
]);

        window.location.href =
          "/setup-property";
      } catch (resetError) {
        console.error(
          "Unable to reset setup:",
          resetError,
        );

        window.alert(
          "The setup could not be reset.",
        );

        setIsResettingSetup(false);
      }
    }}
  >
    {isResettingSetup
      ? "Resetting…"
      : "↻ Reset setup test"}
  </button>
)}
        <header className="property-setup-header">
          <p className="property-setup-kicker">
            Property setup · Step 3
          </p>

          <h1>
          What shape are your spaces?
          </h1>

          <p>
  Choose a common shape or
  draw your own outline, then
  add its real-world
  measurements.
</p>
        </header>

        <div className="space-dimension-list">
          {selectedSpaces.map(
            (spaceType) => {
              const option =
                allSpaceOptions[
                  spaceType
                ];

              const draft =
  spaceDimensionDrafts[
    spaceType
  ] ??
  createDefaultSpaceDraft(
    spaceType,
  );

              const asksForElevation =
                spaceType ===
                  "balcony" ||
                spaceType ===
                  "rooftop";

              return (
                <section
                  key={spaceType}
                  className="space-dimension-card"
                >
                  <header>
                    <span>
                      {option.icon}
                    </span>

                    <div>
                      <strong>
                        {
                          option.title
                        }
                      </strong>

                      <small>
                        {
                          option.description
                        }
                      </small>
                    </div>
                  </header>

                  <label>
                    Space name

                    <input
                      type="text"
                      value={
                        draft.name
                      }
                      onChange={(
                        event,
                      ) =>
                        updateSpaceDraft(
                          spaceType,
                          {
                            name:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                    />
                  </label>

                  <div className="space-shape-section">
  <strong>
    Shape
  </strong>

  <div className="space-shape-options">
    {spaceShapeOptions.map(
      (shape) => {
        const isSelected =
          draft.shapeType ===
          shape.type;

        return (
          <button
            key={shape.type}
            type="button"
            className={
              isSelected
                ? "space-shape-option space-shape-option-selected"
                : "space-shape-option"
            }
            onClick={() =>
              updateSpaceDraft(
                spaceType,
                {
                  shapeType:
                    shape.type,
                },
              )
            }
          >
            <span>
              {shape.icon}
            </span>

            {shape.title}
          </button>
        );
      },
    )}
  </div>
</div>

                  <div className="space-measurement-grid">
                    <label>
                      Width

                      <div className="measurement-input">
                        <input
                          type="number"
                          min="0.1"
                          max="1000"
                          step="0.1"
                          inputMode="decimal"
                          value={
                            draft.widthM
                          }
                          onChange={(
                            event,
                          ) =>
                            updateSpaceDraft(
                              spaceType,
                              {
                                widthM:
                                  event
                                    .target
                                    .value,
                              },
                            )
                          }
                        />

                        <span>
                          metres
                        </span>
                      </div>
                    </label>

                    <label>
                      Depth

                      <div className="measurement-input">
                        <input
                          type="number"
                          min="0.1"
                          max="1000"
                          step="0.1"
                          inputMode="decimal"
                          value={
                            draft.depthM
                          }
                          onChange={(
                            event,
                          ) =>
                            updateSpaceDraft(
                              spaceType,
                              {
                                depthM:
                                  event
                                    .target
                                    .value,
                              },
                            )
                          }
                        />

                        <span>
                          metres
                        </span>
                      </div>
                    </label>
                    {draft.shapeType ===
  "l-shape" && (
  <div className="space-measurement-grid shape-detail-measurements">
    <label>
      Cut-out width

      <div className="measurement-input">
        <input
          type="number"
          min="0.1"
          step="0.1"
          inputMode="decimal"
          value={
            draft.detailWidthM
          }
          onChange={(event) =>
            updateSpaceDraft(
              spaceType,
              {
                detailWidthM:
                  event.target
                    .value,
              },
            )
          }
        />

        <span>metres</span>
      </div>
    </label>

    <label>
      Cut-out depth

      <div className="measurement-input">
        <input
          type="number"
          min="0.1"
          step="0.1"
          inputMode="decimal"
          value={
            draft.detailDepthM
          }
          onChange={(event) =>
            updateSpaceDraft(
              spaceType,
              {
                detailDepthM:
                  event.target
                    .value,
              },
            )
          }
        />

        <span>metres</span>
      </div>
    </label>
  </div>
)}
{draft.shapeType ===
  "u-shape" && (
  <div className="space-measurement-grid shape-detail-measurements">
    <label>
      Opening width

      <div className="measurement-input">
        <input
          type="number"
          min="0.1"
          step="0.1"
          inputMode="decimal"
          value={
            draft.detailWidthM
          }
          onChange={(event) =>
            updateSpaceDraft(
              spaceType,
              {
                detailWidthM:
                  event.target
                    .value,
              },
            )
          }
        />

        <span>metres</span>
      </div>
    </label>

    <label>
      Opening depth

      <div className="measurement-input">
        <input
          type="number"
          min="0.1"
          step="0.1"
          inputMode="decimal"
          value={
            draft.detailDepthM
          }
          onChange={(event) =>
            updateSpaceDraft(
              spaceType,
              {
                detailDepthM:
                  event.target
                    .value,
              },
            )
          }
        />

        <span>metres</span>
      </div>
    </label>
  </div>
)}
{draft.shapeType ===
  "t-shape" && (
  <div className="space-measurement-grid shape-detail-measurements">
    <label>
      Stem width

      <div className="measurement-input">
        <input
          type="number"
          min="0.1"
          step="0.1"
          inputMode="decimal"
          value={
            draft.detailWidthM
          }
          onChange={(event) =>
            updateSpaceDraft(
              spaceType,
              {
                detailWidthM:
                  event.target
                    .value,
              },
            )
          }
        />

        <span>metres</span>
      </div>
    </label>

    <label>
      Top section depth

      <div className="measurement-input">
        <input
          type="number"
          min="0.1"
          step="0.1"
          inputMode="decimal"
          value={
            draft.detailDepthM
          }
          onChange={(event) =>
            updateSpaceDraft(
              spaceType,
              {
                detailDepthM:
                  event.target
                    .value,
              },
            )
          }
        />

        <span>metres</span>
      </div>
    </label>
  </div>
)}
{draft.shapeType ===
  "custom" && (
  <div className="custom-outline-section">
    <div className="custom-outline-heading">
      <div>
        <strong>
          Draw your outline
        </strong>

        <p>
          Enter the overall width
          and depth above, then tap
          each corner of the space
          in order.
        </p>
      </div>

      <span>
        {
          draft.customPoints
            .length
        }{" "}
        corners
      </span>
    </div>

    <svg
      className="custom-outline-editor"
      viewBox="0 0 400 260"
      onPointerDown={(
        event,
      ) =>
        handleCustomOutlinePointerDown(
          event,
          spaceType,
        )
      }
    >
      <rect
        x="1"
        y="1"
        width="398"
        height="258"
        rx="10"
        className="custom-outline-background"
      />

      {draft.customPoints.length >
        1 && (
        <polyline
          points={draft.customPoints
            .map(
              (point) => {
                const width =
                  Number(
                    draft.widthM,
                  );

                const depth =
                  Number(
                    draft.depthM,
                  );

                if (
                  !width ||
                  !depth
                ) {
                  return "0,0";
                }

                return `${
                  (point.x /
                    width) *
                  400
                },${
                  (point.y /
                    depth) *
                  260
                }`;
              },
            )
            .join(" ")}
          className="custom-outline-line"
        />
      )}

      {draft.customPoints.length >=
        3 && (
        <polygon
          points={draft.customPoints
            .map(
              (point) => {
                const width =
                  Number(
                    draft.widthM,
                  );

                const depth =
                  Number(
                    draft.depthM,
                  );

                if (
                  !width ||
                  !depth
                ) {
                  return "0,0";
                }

                return `${
                  (point.x /
                    width) *
                  400
                },${
                  (point.y /
                    depth) *
                  260
                }`;
              },
            )
            .join(" ")}
          className="custom-outline-fill"
        />
      )}

      {draft.customPoints.map(
        (point, index) => {
          const width =
            Number(
              draft.widthM,
            );

          const depth =
            Number(
              draft.depthM,
            );

          if (
            !width ||
            !depth
          ) {
            return null;
          }

          return (
            <g
              key={`${point.x}-${point.y}-${index}`}
            >
              <circle
                cx={
                  (point.x /
                    width) *
                  400
                }
                cy={
                  (point.y /
                    depth) *
                  260
                }
                r="7"
                className="custom-outline-point"
              />

              <text
                x={
                  (point.x /
                    width) *
                    400 +
                  10
                }
                y={
                  (point.y /
                    depth) *
                    260 -
                  8
                }
                className="custom-outline-point-label"
              >
                {index + 1}
              </text>
            </g>
          );
        },
      )}
    </svg>

    <div className="custom-outline-actions">
      <button
        type="button"
        disabled={
          draft.customPoints
            .length === 0
        }
        onClick={() =>
          updateSpaceDraft(
            spaceType,
            {
              customPoints:
                draft.customPoints.slice(
                  0,
                  -1,
                ),
            },
          )
        }
      >
        ↶ Undo corner
      </button>

      <button
        type="button"
        disabled={
          draft.customPoints
            .length === 0
        }
        onClick={() =>
          updateSpaceDraft(
            spaceType,
            {
              customPoints: [],
            },
          )
        }
      >
        Clear outline
      </button>
    </div>
  </div>
)}

                    {asksForElevation && (
                      <label>
                        Height above
                        ground

                        <div className="measurement-input">
                          <input
                            type="number"
                            min="0"
                            max="500"
                            step="0.1"
                            inputMode="decimal"
                            value={
                              draft.elevationM
                            }
                            onChange={(
                              event,
                            ) =>
                              updateSpaceDraft(
                                spaceType,
                                {
                                  elevationM:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                          />

                          <span>
                            metres
                          </span>
                        </div>
                      </label>
                    )}
                  </div>
                </section>
              );
            },
          )}
        </div>

        {error && (
          <p className="property-setup-error">
            {error}
          </p>
        )}

        <footer className="property-setup-actions">
          <button
            className="property-setup-back"
            type="button"
            onClick={() => {
              setCurrentStep(2);
              setError("");
            }}
          >
            ← Back
          </button>

          <span>
            Step 3 of 4
          </span>

          <button
            className="property-setup-continue"
            type="submit"
            disabled={isSaving}
          >
            {isSaving
              ? "Saving…"
              : "Save & continue"}
          </button>
        </footer>
      </form>
    </main>
  );
}

  if (currentStep === 2) {
    const selectedPropertyOption =
      propertyOptions.find(
        (option) =>
          option.type ===
          selectedType,
      );

    return (
      <main className="property-setup-page">
        <form
          className="property-setup-card"
          onSubmit={
            handleStepTwoSubmit
          }
        >
          <header className="property-setup-header">
            <p className="property-setup-kicker">
              Property setup · Step 2
            </p>

            <h1>
              Which spaces do you have?
            </h1>

            <p>
              You've chosen{" "}
              <strong>
                {
                  selectedPropertyOption?.title
                }
              </strong>
              . Select all the spaces
              that belong to it.
            </p>
          </header>

          <div className="setup-property-summary">
            <span>
              {
                selectedPropertyOption?.icon
              }
            </span>

            <div>
              <strong>
                {propertyName}
              </strong>

              <small>
                {
                  selectedPropertyOption?.title
                }
              </small>
            </div>

            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                setError("");
              }}
            >
              Change
            </button>
          </div>

          <div className="property-type-grid">
            {availableSpaces.map(
              (space) => {
                const isSelected =
                  selectedSpaces.includes(
                    space.type,
                  );

                return (
                  <button
                    key={space.type}
                    type="button"
                    className={
                      isSelected
                        ? "property-type-card property-type-card-selected"
                        : "property-type-card"
                    }
                    aria-pressed={
                      isSelected
                    }
                    onClick={() =>
                      toggleSpace(
                        space.type,
                      )
                    }
                  >
                    <span className="property-type-icon">
                      {space.icon}
                    </span>

                    <span className="property-type-copy">
                      <strong>
                        {space.title}
                      </strong>

                      <span>
                        {
                          space.description
                        }
                      </span>
                    </span>

                    <span className="property-type-check">
                      {isSelected
                        ? "✓"
                        : ""}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <div className="selected-space-count">
            {selectedSpaces.length ===
            0
              ? "No spaces selected yet"
              : `${selectedSpaces.length} ${
                  selectedSpaces.length ===
                  1
                    ? "space"
                    : "spaces"
                } selected`}
          </div>

          {error && (
            <p className="property-setup-error">
              {error}
            </p>
          )}

          <footer className="property-setup-actions">
            <button
              className="property-setup-back"
              type="button"
              onClick={() => {
                setCurrentStep(1);
                setError("");
              }}
            >
              ← Back
            </button>

            <span>
              Step 2 of 4
            </span>

            <button
              className="property-setup-continue"
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Saving…"
                : "Save & continue"}
            </button>
          </footer>
        </form>
      </main>
    );
  }

  return (
    <main className="property-setup-page">
      <form
        className="property-setup-card"
        onSubmit={
          handleStepOneSubmit
        }
      >
        <header className="property-setup-header">
          <p className="property-setup-kicker">
            Property setup · Step 1
          </p>

          <h1>
            Let's create your property
          </h1>

          <p>
            First, tell GrowHub what
            kind of property or growing
            site you're setting up.
          </p>
        </header>

        <label className="property-name-field">
          What would you like to call it?

          <input
            type="text"
            value={propertyName}
            onChange={(event) =>
              setPropertyName(
                event.target.value,
              )
            }
            placeholder="e.g. My Home"
            maxLength={60}
          />
        </label>

        <fieldset className="property-type-fieldset">
          <legend>
            What type of property or
            site is this?
          </legend>

          <p className="property-type-help">
            This gives GrowHub a
            sensible starting point.
            On the next step you'll
            choose the spaces that
            belong to it.
          </p>

          <div className="property-type-grid">
            {propertyOptions.map(
              (option) => {
                const isSelected =
                  selectedType ===
                  option.type;

                return (
                  <button
                    key={option.type}
                    type="button"
                    className={
                      isSelected
                        ? "property-type-card property-type-card-selected"
                        : "property-type-card"
                    }
                    aria-pressed={
                      isSelected
                    }
                    onClick={() => {
                      if (
                        selectedType !==
                        option.type
                      ) {
                        setSelectedSpaces(
                          [],
                        );
                      }

                      setSelectedType(
                        option.type,
                      );

                      setError("");
                    }}
                  >
                    <span className="property-type-icon">
                      {option.icon}
                    </span>

                    <span className="property-type-copy">
                      <strong>
                        {option.title}
                      </strong>

                      <span>
                        {
                          option.description
                        }
                      </span>
                    </span>

                    <span className="property-type-check">
                      {isSelected
                        ? "✓"
                        : ""}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </fieldset>

        {error && (
          <p className="property-setup-error">
            {error}
          </p>
        )}

        <footer className="property-setup-actions">
          <span>
            Step 1 of 4
          </span>

          <button
            className="property-setup-continue"
            type="submit"
            disabled={isSaving}
          >
            {isSaving
              ? "Saving…"
              : "Save & continue"}
          </button>
        </footer>
      </form>
    </main>
  );
}