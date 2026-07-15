import "./SunlightControls.css";

type SunlightControlsProps = {
  enabled: boolean;
  timeMinutes: number;
  onEnabledChange: (enabled: boolean) => void;
  onTimeChange: (minutes: number) => void;
};

function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export default function SunlightControls({
  enabled,
  timeMinutes,
  onEnabledChange,
  onTimeChange,
}: SunlightControlsProps) {
  return (
    <div className="sunlight-controls">
      <div className="map-mode-toggle">
        <button
          className={!enabled ? "active" : ""}
          type="button"
          onClick={() => onEnabledChange(false)}
        >
          🗺️ Map
        </button>

        <button
          className={enabled ? "active" : ""}
          type="button"
          onClick={() => onEnabledChange(true)}
        >
          ☀️ Sunlight
        </button>
      </div>

      {enabled && (
        <div className="sunlight-time-panel">
          <div className="sunlight-time-heading">
            <div>
              <span className="sunlight-symbol">☀️</span>
              <strong>{formatTime(timeMinutes)}</strong>
            </div>

            <span>Estimated sunlight preview</span>
          </div>

          <div className="sunlight-slider-row">
            <span>06:00</span>

            <input
              aria-label="Time of day"
              min={360}
              max={1260}
              step={15}
              type="range"
              value={timeMinutes}
              onChange={(event) => onTimeChange(Number(event.target.value))}
            />

            <span>21:00</span>
          </div>
        </div>
      )}
    </div>
  );
}