import "./App.css";

type AttentionItem = {
  id: number;
  plant: string;
  garden: string;
  status: string;
  detail: string;
  icon: string;
  action: string;
  tone: "danger" | "warning" | "cold";
};

const attentionItems: AttentionItem[] = [
  {
    id: 1,
    plant: "Tomato",
    garden: "Back Garden",
    status: "Needs water",
    detail: "Last watered 2 days ago",
    icon: "💧",
    action: "Water now",
    tone: "danger",
  },
  {
    id: 2,
    plant: "Cucumber",
    garden: "Vegetable Patch",
    status: "Possible pests",
    detail: "Check the leaves",
    icon: "🐛",
    action: "Inspect",
    tone: "warning",
  },
  {
    id: 3,
    plant: "Basil",
    garden: "Herb Garden",
    status: "Frost alert",
    detail: "Protect tonight",
    icon: "❄️",
    action: "Protect",
    tone: "cold",
  },
];

const weather = [
  { day: "Today", icon: "🌤️", high: 18, low: 12, rain: 10 },
  { day: "Tue", icon: "☀️", high: 20, low: 13, rain: 10 },
  { day: "Wed", icon: "🌧️", high: 17, low: 11, rain: 30 },
  { day: "Thu", icon: "🌧️", high: 16, low: 10, rain: 70 },
  { day: "Fri", icon: "🌤️", high: 19, low: 11, rain: 20 },
  { day: "Sat", icon: "☀️", high: 21, low: 11, rain: 10 },
];

const gardens = [
  {
    name: "Front Garden",
    plants: 8,
    className: "garden-zone front-garden",
  },
  {
    name: "Back Garden",
    plants: 24,
    className: "garden-zone back-garden",
  },
  {
    name: "Vegetable Patch",
    plants: 16,
    className: "garden-zone vegetable-patch",
  },
  {
    name: "Herb Garden",
    plants: 9,
    className: "garden-zone herb-garden",
  },
];

function App() {
  const userName = "Prabhdeep";

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-icon">🌿</span>
          <span>GrowHub</span>
        </div>

        <button className="profile-button" type="button">
          <span className="profile-avatar">P</span>
          <span>{userName}</span>
        </button>
      </header>

      <main className="dashboard">
        <section className="welcome-section">
          <div>
            <h1>Good morning, {userName} 🌱</h1>
            <p className="welcome-summary">You have 3 tasks today.</p>
            <p className="welcome-highlight">
              Your tomatoes are nearly ready to harvest.
            </p>
          </div>

          <button className="current-weather" type="button">
            <span className="large-weather-icon">🌤️</span>

            <span>
              <strong>18°C</strong>
              <small>Partly cloudy</small>
              <small>London, UK</small>
            </span>
          </button>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <div>
              <h2>Needs attention</h2>
              <span className="count-badge">{attentionItems.length}</span>
            </div>

            <button className="text-button" type="button">
              View all
            </button>
          </div>

          <div className="attention-grid">
            {attentionItems.map((item) => (
              <article
                className={`attention-card ${item.tone}`}
                key={item.id}
              >
                <div className="attention-icon">{item.icon}</div>

                <div className="attention-content">
                  <span className="attention-status">{item.status}</span>
                  <h3>{item.plant}</h3>
                  <p className="garden-name">{item.garden}</p>
                  <p>{item.detail}</p>

                  <button type="button">{item.action}</button>
                </div>
              </article>
            ))}

            <article className="all-good-card">
              <span className="all-good-icon">✓</span>
              <div>
                <h3>All good</h3>
                <p>Everything else is looking great.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <h2>Weather outlook</h2>

            <button className="text-button" type="button">
              View full forecast
            </button>
          </div>

          <div className="weather-grid">
            {weather.map((day) => (
              <button className="weather-card" type="button" key={day.day}>
                <strong>{day.day}</strong>
                <span className="weather-icon">{day.icon}</span>
                <span>
                  {day.high}° / {day.low}°
                </span>
                <small>💧 {day.rain}%</small>
              </button>
            ))}
          </div>
        </section>

        <section className="content-section">
          <div className="section-heading garden-heading">
            <div>
              <h2>Your gardens</h2>
              <p>Tap an area to see the plants inside.</p>
            </div>

            <button className="text-button" type="button">
              Manage gardens
            </button>
          </div>

          <div className="property-map">
            <div className="house">
              <div className="roof" />
              <div className="house-body">
                <span>House</span>
              </div>
            </div>

            <div className="driveway">
              <div className="car">🚙</div>
            </div>

            <div className="patio">
              <span className="patio-table">◉</span>
            </div>

            <div className="tree tree-one">🌳</div>
            <div className="tree tree-two">🌳</div>
            <div className="shed">Shed</div>

            {gardens.map((garden) => (
              <button className={garden.className} type="button" key={garden.name}>
                <strong>{garden.name}</strong>
                <span>{garden.plants} plants</span>
              </button>
            ))}
          </div>
        </section>

        <section className="tasks-panel">
          <div>
            <span className="task-icon">☑️</span>
            <div>
              <strong>Today’s tasks</strong>
              <span>3 tasks to complete</span>
            </div>
          </div>

          <button type="button">💧 Water tomatoes</button>
          <button type="button">🐛 Check cucumber leaves</button>
          <button type="button">❄️ Cover basil</button>
        </section>
      </main>

      <nav className="bottom-navigation">
        <button className="active" type="button">
          <span>🏠</span>
          Home
        </button>

        <button type="button">
          <span>🌱</span>
          My Garden
        </button>

        <button className="add-button" type="button" aria-label="Add plant">
          +
        </button>

        <button type="button">
          <span>☑️</span>
          Tasks
        </button>

        <button type="button">
          <span>👤</span>
          Profile
        </button>
      </nav>
    </div>
  );
}

export default App;