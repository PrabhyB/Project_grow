import "./PropertyMap.css";

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
};

export default function PropertyMap({
  zones,
  selectedZoneId,
  onSelectZone,
}: PropertyMapProps) {
  return (
    <section className="property-section">
      <div className="property-heading">
        <div>
          <h2>Your gardens</h2>
          <p>Tap an area to see the plants inside.</p>
        </div>

        <button type="button">Manage gardens</button>
      </div>

      <div className="property-map-frame">
        <svg
          className="property-map"
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

          {zones.map((zone) => (
            <g
              key={zone.id}
              className={`garden-zone-group ${
  selectedZoneId === zone.id ? "zone-selected" : ""
}`}
              onClick={() => onSelectZone(zone)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  onSelectZone(zone);
                }
              }}
            >
              <rect
                className={`garden-zone-hitbox zone-${zone.type}`}
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                rx="18"
              />

              <foreignObject
                x={zone.x + 10}
                y={zone.y + 10}
                width={Math.max(zone.width - 20, 120)}
                height={Math.max(zone.height - 20, 76)}
              >
                <div className="garden-zone-label">
                  <strong>{zone.name}</strong>
                  <span>{zone.plantCount} plants</span>

                  {zone.alerts ? (
                    <small>{zone.alerts} need attention</small>
                  ) : (
                    <small>Everything is fine</small>
                  )}
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
