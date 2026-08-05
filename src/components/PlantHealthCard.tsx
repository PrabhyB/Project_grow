import type {
  CareScore,
  PlantCareAssessment,
} from "../services/careEngine";

import "./PlantHealthCard.css";

type PlantHealthCardProps = {
  assessment: PlantCareAssessment;
};

type ScoreRowProps = {
  icon: string;
  label: string;
  careScore: CareScore;
};

function ScoreRow({
  icon,
  label,
  careScore,
}: ScoreRowProps) {
  return (
    <article className="health-score-row">
      <span className="health-score-icon">{icon}</span>

      <div className="health-score-content">
        <div className="health-score-heading">
          <strong>{label}</strong>
          <span>{careScore.score}%</span>
        </div>

        <div
          className="health-score-track"
          aria-label={`${label} score ${careScore.score} percent`}
        >
          <span style={{ width: `${careScore.score}%` }} />
        </div>

        <small>
          {careScore.rating} · {careScore.message}
        </small>
      </div>
    </article>
  );
}

export default function PlantHealthCard({
  assessment,
}: PlantHealthCardProps) {
  return (
    <section className="plant-health-card">
      <div className="plant-health-summary">
        <div>
          <p>GrowHub health score</p>
          <h2>{assessment.overallScore}%</h2>
          <strong>{assessment.overallRating}</strong>
        </div>

        <div
          className="health-score-ring"
          style={{
            background: `conic-gradient(
              #3b9148 ${assessment.overallScore}%,
              #e1e9de ${assessment.overallScore}% 100%
            )`,
          }}
        >
          <span>{assessment.overallScore}</span>
        </div>
      </div>

      <div className="health-score-list">
        <ScoreRow
          icon="💧"
          label="Water"
          careScore={assessment.water}
        />

        <ScoreRow
          icon="☀️"
          label="Sunlight"
          careScore={assessment.sunlight}
        />

        <ScoreRow
          icon="🌡️"
          label="Temperature"
          careScore={assessment.temperature}
        />

        <ScoreRow
          icon="🌱"
          label="Growth"
          careScore={assessment.growth}
        />
      </div>

      <div className="health-next-action">
        <span>✨</span>

        <div>
          <strong>Recommended next action</strong>
          <p>{assessment.nextAction}</p>
        </div>
      </div>
    </section>
  );
}