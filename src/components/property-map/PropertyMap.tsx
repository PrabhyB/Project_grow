import "./PropertyMap.css";
import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import SunlightControls from "./SunlightControls";

export type GardenZone = {
  id: string;
  name: string;
  plantCount: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "garden" | "vegetable" | "herb";
  alerts?: number;
};

type PropertyMapProps = {
  zones: GardenZone[];
  selectedZoneId?: string;
  onSelectZone: (zone: GardenZone) => void;

  onCreateZone?: () => void | Promise<void>;

  onMoveZone?: (
  gardenId: string,
  x: number,
  y: number,
) => void | Promise<void>;

onResizeZone?: (
  gardenId: string,
  width: number,
  height: number,
) => void | Promise<void>;
};

export default function PropertyMap({
  zones,
  selectedZoneId,
  onSelectZone,
  onCreateZone,
  onMoveZone,
  onResizeZone,
}: PropertyMapProps) {
  const [sunlightEnabled, setSunlightEnabled] = useState(false);
const [isEditing, setIsEditing] =
  useState(false);
  const [draggedZoneId, setDraggedZoneId] =
  useState<string | null>(null);

const [dragPreview, setDragPreview] = useState<{
  x: number;
  y: number;
} | null>(null);

const dragOffset = useRef({
  x: 0,
  y: 0,
});

const [resizingZoneId, setResizingZoneId] =
  useState<string | null>(null);

const [resizePreview, setResizePreview] =
  useState<{
    width: number;
    height: number;
  } | null>(null);

const svgRef =
  useRef<SVGSVGElement | null>(null);
  const [timeMinutes, setTimeMinutes] = useState(720);

const daylightProgress = Math.min(
  1,
  Math.max(0, (timeMinutes - 360) / (1260 - 360)),
);

// Sun travels from the left side of the property to the right.
const sunX = 80 + daylightProgress * 840;

// Creates a curved path: lower at sunrise/sunset and higher at midday.
const sunY =
  155 - Math.sin(daylightProgress * Math.PI) * 105;

// Approximate centre of the house.
const houseCentreX = 330;
const houseCentreY = 350;

// Direction from the sun toward the house.
const directionX = houseCentreX - sunX;
const directionY = houseCentreY - sunY;

const directionLength =
  Math.sqrt(directionX * directionX + directionY * directionY) || 1;

// Shadow points away from the sun.
const normalisedX = directionX / directionLength;
const normalisedY = directionY / directionLength;

// Longer shadows near sunrise/sunset; shorter around midday.
const sunHeight = Math.sin(daylightProgress * Math.PI);
const shadowLength = 240 - sunHeight * 150;

const shadowOffsetX = normalisedX * shadowLength;
const shadowOffsetY = normalisedY * shadowLength;

function getSvgCoordinates(
  clientX: number,
  clientY: number,
) {
  const svg = svgRef.current;

  if (!svg) {
    return null;
  }

  const point = svg.createSVGPoint();

  point.x = clientX;
  point.y = clientY;

  const matrix = svg.getScreenCTM();

  if (!matrix) {
    return null;
  }

  return point.matrixTransform(
    matrix.inverse(),
  );
}

function handleZonePointerDown(
  event: ReactPointerEvent<SVGGElement>,
  zone: GardenZone,
) {
  if (!isEditing) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const position =
    getSvgCoordinates(
  event.clientX,
  event.clientY,
);

  if (!position) {
    return;
  }

  dragOffset.current = {
    x: position.x - zone.x,
    y: position.y - zone.y,
  };

  setDraggedZoneId(zone.id);

  setDragPreview({
    x: zone.x,
    y: zone.y,
  });

  event.currentTarget.setPointerCapture(
    event.pointerId,
  );
}

function handleZonePointerMove(
  event: ReactPointerEvent<SVGGElement>,
  zone: GardenZone,
) {
  if (
    !isEditing ||
    draggedZoneId !== zone.id
  ) {
    return;
  }

  const position =
    getSvgCoordinates(
  event.clientX,
  event.clientY,
);

  if (!position) {
    return;
  }

  const nextX = Math.max(
    8,
    Math.min(
      992 - zone.width,
      position.x - dragOffset.current.x,
    ),
  );

  const nextY = Math.max(
    8,
    Math.min(
      612 - zone.height,
      position.y - dragOffset.current.y,
    ),
  );

  setDragPreview({
    x: Math.round(nextX),
    y: Math.round(nextY),
  });
}

function handleZonePointerUp(
  event: ReactPointerEvent<SVGGElement>,
  zone: GardenZone,
) {
  if (
    !isEditing ||
    draggedZoneId !== zone.id
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (dragPreview) {
    void onMoveZone?.(
      zone.id,
      dragPreview.x,
      dragPreview.y,
    );
  }

  if (
    event.currentTarget.hasPointerCapture(
      event.pointerId,
    )
  ) {
    event.currentTarget.releasePointerCapture(
      event.pointerId,
    );
  }

  setDraggedZoneId(null);
  setDragPreview(null);
}

function handleResizePointerDown(
  event: ReactPointerEvent<SVGCircleElement>,
  zone: GardenZone,
) {
  if (!isEditing) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  setResizingZoneId(zone.id);

  setResizePreview({
    width: zone.width,
    height: zone.height,
  });

  event.currentTarget.setPointerCapture(
    event.pointerId,
  );
}

function handleResizePointerMove(
  event: ReactPointerEvent<SVGCircleElement>,
  zone: GardenZone,
) {
  if (
    !isEditing ||
    resizingZoneId !== zone.id
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const position = getSvgCoordinates(
    event.clientX,
    event.clientY,
  );

  if (!position) {
    return;
  }

  const minimumWidth = 120;
  const minimumHeight = 90;

  const maximumWidth =
    992 - zone.x;

  const maximumHeight =
    612 - zone.y;

  const nextWidth = Math.max(
    minimumWidth,
    Math.min(
      maximumWidth,
      position.x - zone.x,
    ),
  );

  const nextHeight = Math.max(
    minimumHeight,
    Math.min(
      maximumHeight,
      position.y - zone.y,
    ),
  );

  setResizePreview({
    width: Math.round(nextWidth),
    height: Math.round(nextHeight),
  });
}

function handleResizePointerUp(
  event: ReactPointerEvent<SVGCircleElement>,
  zone: GardenZone,
) {
  if (
    !isEditing ||
    resizingZoneId !== zone.id
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (resizePreview) {
    void onResizeZone?.(
      zone.id,
      resizePreview.width,
      resizePreview.height,
    );
  }

  if (
    event.currentTarget.hasPointerCapture(
      event.pointerId,
    )
  ) {
    event.currentTarget.releasePointerCapture(
      event.pointerId,
    );
  }

  setResizingZoneId(null);
  setResizePreview(null);
}
  return (
    <section className="property-section">
      <div className="property-heading">
        <div>
          <h2>Your gardens</h2>
          <p>Tap an area to see the plants inside.</p>
        </div>

        <div className="property-edit-actions">
  {isEditing && (
    <button
      type="button"
      className="add-garden-area-button"
      onClick={() => {
        void onCreateZone?.();
      }}
    >
      ＋ Add growing area
    </button>
  )}

  <button
    type="button"
    className={
      isEditing
        ? "finish-garden-edit-button"
        : undefined
    }
    onClick={() => {
      setIsEditing((current) => !current);
    }}
  >
    {isEditing
      ? "✓ Done"
      : "Manage gardens"}
  </button>
</div>
      </div>
      {isEditing && (
  <div className="property-edit-banner">
    <span>✥</span>

    <div>
      <strong>Editing garden layout</strong>
      <p>
        Add growing areas to your property.
        Moving and resizing comes next.
      </p>
    </div>
  </div>
)}
      <SunlightControls
  enabled={sunlightEnabled}
  timeMinutes={timeMinutes}
  onEnabledChange={setSunlightEnabled}
  onTimeChange={setTimeMinutes}
/>

      <div className="property-map-frame">
        <svg
  ref={svgRef}
  className={`property-map ${
    isEditing
      ? "property-map-editing"
      : ""
  }`}
          viewBox="0 0 1000 620"
          role="img"
          aria-label="Top-down map of the property and garden areas"
        >
          <defs>
            <pattern
              id="lawnPattern"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              <rect width="28" height="28" fill="#86af63" />
              <circle cx="7" cy="8" r="1.6" fill="#739c54" />
              <circle cx="21" cy="19" r="1.3" fill="#97be75" />
            </pattern>

            <pattern
              id="patioPattern"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <rect width="40" height="40" fill="#c6bba3" />
              <path
                d="M0 0H40M0 40H40M0 0V40M40 0V40"
                stroke="#b1a58f"
                strokeWidth="2"
              />
            </pattern>

            <pattern
              id="soilPattern"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <rect width="24" height="24" fill="#77513a" />
              <circle cx="6" cy="7" r="1.5" fill="#8b654b" />
              <circle cx="17" cy="16" r="1.4" fill="#65432f" />
            </pattern>

            <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow
                dx="4"
                dy="6"
                stdDeviation="4"
                floodColor="#27412f"
                floodOpacity="0.22"
              />
            </filter>
            <clipPath id="propertyBoundary">
  <rect
    x="8"
    y="8"
    width="984"
    height="604"
    rx="28"
  />
</clipPath>
{sunlightEnabled && (
  <g clipPath="url(#propertyBoundary)">
    <rect
      className="sunlight-map-tint"
      x="8"
      y="8"
      width="984"
      height="604"
      rx="28"
    />

    <polygon
      className="house-shadow"
      points={`
        175,205
        485,205
        ${485 + shadowOffsetX},${205 + shadowOffsetY}
        ${175 + shadowOffsetX},${205 + shadowOffsetY}
      `}
    />

    <circle className="sun-glow" cx={sunX} cy={sunY} r="42" />
    <circle className="sun-core" cx={sunX} cy={sunY} r="24" />
  </g>
)}
          </defs>
       <rect
            x="8"
            y="8"
            width="984"
            height="604"
            rx="28"
            fill="url(#lawnPattern)"
            stroke="#6f954f"
            strokeWidth="8"
          />
          {sunlightEnabled && (
  <>
    <g
  className="house-shadow"
  transform={`translate(${shadowOffsetX} ${shadowOffsetY})`}
>
  <rect
    x="175"
    y="205"
    width="310"
    height="285"
    rx="16"
  />

  <polygon points="155,235 330,125 505,235 470,355 195,355" />
</g>

<polygon
  className="shadow-connector"
  points={`
    175,205
    485,205
    ${485 + shadowOffsetX},${205 + shadowOffsetY}
    ${175 + shadowOffsetX},${205 + shadowOffsetY}
  `}
/>

    <circle
      className="sun-glow"
      cx={sunX}
      cy={sunY}
      r="42"
    />

    <circle
      className="sun-core"
      cx={sunX}
      cy={sunY}
      r="24"
    />
  </>
)}

          <rect
            x="20"
            y="120"
            width="125"
            height="470"
            rx="18"
            fill="#bbbcb5"
          />

          <path
            d="M20 135H145M20 180H145M20 225H145M20 270H145M20 315H145M20 360H145M20 405H145M20 450H145M20 495H145M20 540H145"
            stroke="#a6a7a0"
            strokeWidth="3"
          />

          <g transform="translate(53 430) rotate(-90)">
            <rect
              x="0"
              y="0"
              width="82"
              height="42"
              rx="13"
              fill="#2f6690"
              stroke="#1d496d"
              strokeWidth="4"
            />
            <rect x="18" y="7" width="34" height="28" rx="8" fill="#9fc5dc" />
            <circle cx="15" cy="42" r="7" fill="#27343b" />
            <circle cx="66" cy="42" r="7" fill="#27343b" />
          </g>

          <g filter="url(#softShadow)">
            <rect
              x="175"
              y="205"
              width="310"
              height="285"
              rx="16"
              fill="#d5c2a8"
              stroke="#aa9680"
              strokeWidth="5"
            />

            <polygon
              points="155,235 330,125 505,235 470,355 195,355"
              fill="#645045"
              stroke="#4e3e36"
              strokeWidth="6"
            />

            <path
              d="M175 250H485M195 290H470M210 330H455"
              stroke="#795f50"
              strokeWidth="5"
              opacity="0.8"
            />

            <rect x="270" y="395" width="115" height="95" fill="#b99f80" />
            <rect x="305" y="430" width="45" height="60" fill="#6f5849" />
          </g>

          <rect
            x="420"
            y="35"
            width="320"
            height="145"
            rx="18"
            fill="url(#patioPattern)"
            stroke="#aa9c86"
            strokeWidth="5"
          />

          <circle cx="580" cy="105" r="38" fill="#756955" />
          <circle cx="580" cy="105" r="17" fill="#ada38f" />

          <rect x="544" y="48" width="72" height="18" rx="8" fill="#8d806c" />
          <rect x="544" y="143" width="72" height="18" rx="8" fill="#8d806c" />

          <g filter="url(#softShadow)">
            <circle cx="390" cy="78" r="58" fill="#4f873d" />
            <circle cx="360" cy="82" r="41" fill="#6da653" />
            <circle cx="420" cy="86" r="43" fill="#5d9747" />
            <circle cx="390" cy="111" r="38" fill="#79ad5d" />
          </g>

          <g filter="url(#softShadow)">
            <circle cx="770" cy="82" r="55" fill="#4b833b" />
            <circle cx="745" cy="92" r="40" fill="#6ca351" />
            <circle cx="798" cy="92" r="38" fill="#5b9547" />
          </g>

          <g className="vegetable-beds">
            {Array.from({ length: 12 }).map((_, index) => {
              const column = index % 4;
              const row = Math.floor(index / 4);

              return (
                <g
                  key={index}
                  transform={`translate(${735 + column * 58} ${200 + row * 75})`}
                >
                  <rect
                    width="48"
                    height="62"
                    rx="6"
                    fill="url(#soilPattern)"
                    stroke="#60402e"
                    strokeWidth="4"
                  />
                  <circle cx="15" cy="20" r="5" fill="#5ca84a" />
                  <circle cx="30" cy="38" r="5" fill="#6bb957" />
                </g>
              );
            })}
          </g>

          <g filter="url(#softShadow)">
            <rect
              x="800"
              y="460"
              width="150"
              height="115"
              rx="9"
              fill="#7e9987"
              stroke="#536c5c"
              strokeWidth="5"
            />
            <polygon points="790,480 875,425 960,480" fill="#566d5d" />
            <text
              x="875"
              y="525"
              textAnchor="middle"
              className="map-object-label"
            >
              Shed
            </text>
          </g>
          {sunlightEnabled && (
  <g clipPath="url(#propertyBoundary)" pointerEvents="none">
    <polygon
      points={`
        155,235
        505,235
        ${505 + shadowOffsetX},${235 + shadowOffsetY}
        ${330 + shadowOffsetX},${125 + shadowOffsetY}
        ${155 + shadowOffsetX},${235 + shadowOffsetY}
      `}
      fill="#26352b"
      fillOpacity="0.28"
    />

    <rect
      x={175 + shadowOffsetX}
      y={205 + shadowOffsetY}
      width="310"
      height="285"
      rx="16"
      fill="#26352b"
      fillOpacity="0.28"
    />

    <polygon
      points={`
        ${155 + shadowOffsetX},${235 + shadowOffsetY}
        ${330 + shadowOffsetX},${125 + shadowOffsetY}
        ${505 + shadowOffsetX},${235 + shadowOffsetY}
        ${470 + shadowOffsetX},${355 + shadowOffsetY}
        ${195 + shadowOffsetX},${355 + shadowOffsetY}
      `}
      fill="#26352b"
      fillOpacity="0.28"
    />
  </g>
)}

          {zones.map((zone) => {
  const isDragging =
    draggedZoneId === zone.id;

    const isResizing =
  resizingZoneId === zone.id;

  const displayX =
    isDragging && dragPreview
      ? dragPreview.x
      : zone.x;

  const displayY =
    isDragging && dragPreview
      ? dragPreview.y
      : zone.y;

      const displayWidth =
  isResizing && resizePreview
    ? resizePreview.width
    : zone.width;

const displayHeight =
  isResizing && resizePreview
    ? resizePreview.height
    : zone.height;

  return (
    <g
      key={zone.id}
      className={`garden-zone-group ${
        selectedZoneId === zone.id
          ? "zone-selected"
          : ""
      } ${
        isEditing
          ? "zone-editing"
          : ""
      } ${
        isDragging
          ? "zone-dragging"
          : ""
      } ${isResizing
  ? "zone-resizing"
  : ""}`}
      onClick={() => {
        if (!isEditing) {
          onSelectZone(zone);
        }
      }}
      onPointerDown={(event) =>
        handleZonePointerDown(
          event,
          zone,
        )
      }
      onPointerMove={(event) =>
        handleZonePointerMove(
          event,
          zone,
        )
      }
      onPointerUp={(event) =>
        handleZonePointerUp(
          event,
          zone,
        )
      }
      onPointerCancel={(event) =>
        handleZonePointerUp(
          event,
          zone,
        )
      }
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          !isEditing &&
          (
            event.key === "Enter" ||
            event.key === " "
          )
        ) {
          onSelectZone(zone);
        }
      }}
    >
      <rect
        className={`garden-zone-hitbox zone-${zone.type}`}
        x={displayX}
        y={displayY}
        width={displayWidth}
        height={displayHeight}
        rx="18"
      />

      {isEditing && (
        <text
          className="garden-drag-symbol"
          x={
            displayX +
            zone.width -
            25
          }
          y={displayY + 30}
        >
          ✥
        </text>
      )}

      <foreignObject
        x={displayX + 10}
        y={displayY + 10}
        width={Math.max(
          displayWidth - 20,
          120,
        )}
        height={Math.max(
          displayHeight - 20,
          76,
        )}
        pointerEvents="none"
      >
        <div className="garden-zone-label">
          <strong>
            {zone.name}
          </strong>

          <span>
            {zone.plantCount}{" "}
            {zone.plantCount === 1
              ? "plant"
              : "plants"}
          </span>

          {zone.alerts ? (
            <small>
              {zone.alerts} need
              attention
            </small>
          ) : (
            <small>
              Everything is fine
            </small>
          )}
        </div>
      </foreignObject>
      {isEditing && (
  <>
    <circle
      className="garden-resize-handle"
      cx={
        displayX +
        displayWidth -
        12
      }
      cy={
        displayY +
        displayHeight -
        12
      }
      r="13"
      onPointerDown={(event) =>
        handleResizePointerDown(
          event,
          zone,
        )
      }
      onPointerMove={(event) =>
        handleResizePointerMove(
          event,
          zone,
        )
      }
      onPointerUp={(event) =>
        handleResizePointerUp(
          event,
          zone,
        )
      }
      onPointerCancel={(event) =>
        handleResizePointerUp(
          event,
          zone,
        )
      }
    />

    <text
      className="garden-resize-symbol"
      x={
        displayX +
        displayWidth -
        12
      }
      y={
        displayY +
        displayHeight -
        7
      }
      textAnchor="middle"
    >
      ↘
    </text>
  </>
)}
    </g>
  );
})}
        </svg>
      </div>
    </section>
  );
}
