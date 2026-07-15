import "./AttentionSection.css";

export type AttentionLevel = "urgent" | "warning" | "weather";

export type AttentionItem = {
  id: string;
  plantName: string;
  gardenName: string;
  title: string;
  description: string;
  icon: string;
  actionLabel: string;
  level: AttentionLevel;
};

type AttentionSectionProps = {
  items: AttentionItem[];
  onAction?: (item: AttentionItem) => void;
  onViewAll?: () => void;
};

export default function AttentionSection({
  items,
  onAction,
  onViewAll,
}: AttentionSectionProps) {
  const hasAttentionItems = items.length > 0;

  return (
    <section className="attention-section">
      <div className="attention-heading">
        <div className="attention-title-group">
          <h2>Needs attention</h2>

          {hasAttentionItems && (
            <span className="attention-count">{items.length}</span>
          )}
        </div>

        {hasAttentionItems && (
          <button
            className="attention-view-all"
            type="button"
            onClick={onViewAll}
          >
            View all →
          </button>
        )}
      </div>

      {!hasAttentionItems ? (
        <article className="all-clear-card">
          <span className="all-clear-icon">✓</span>

          <div>
            <h3>Everything is fine</h3>
            <p>Your plants do not need any immediate attention.</p>
          </div>
        </article>
      ) : (
        <div className="attention-card-grid">
          {items.map((item) => (
            <article
              className={`plant-alert-card alert-${item.level}`}
              key={item.id}
            >
              <div className="plant-alert-icon">{item.icon}</div>

              <div className="plant-alert-content">
                <span className="plant-alert-title">{item.title}</span>

                <h3>{item.plantName}</h3>

                <p className="plant-alert-location">{item.gardenName}</p>

                <p className="plant-alert-description">
                  {item.description}
                </p>

                <button
                  type="button"
                  onClick={() => onAction?.(item)}
                >
                  {item.actionLabel}
                </button>
              </div>
            </article>
          ))}

          <article className="other-plants-card">
            <span className="other-plants-icon">✓</span>

            <div>
              <h3>Everything else is fine</h3>
              <p>Your other plants are looking healthy.</p>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
