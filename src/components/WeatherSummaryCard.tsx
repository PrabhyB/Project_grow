import type { WeatherForecast } from "../services/weatherService";

import "./WeatherSummaryCard.css";

type WeatherSummaryCardProps = {
  forecast: WeatherForecast | null;
  isLoading: boolean;
  error: string;
  onRetry: () => void;
};

type WeatherDisplay = {
  icon: string;
  description: string;
};

function getWeatherDisplay(weatherCode: number): WeatherDisplay {
  if (weatherCode === 0) {
    return {
      icon: "☀️",
      description: "Clear sky",
    };
  }

  if (weatherCode === 1 || weatherCode === 2) {
    return {
      icon: "🌤️",
      description: "Partly cloudy",
    };
  }

  if (weatherCode === 3) {
    return {
      icon: "☁️",
      description: "Overcast",
    };
  }

  if (weatherCode === 45 || weatherCode === 48) {
    return {
      icon: "🌫️",
      description: "Foggy",
    };
  }

  if (
    weatherCode === 51 ||
    weatherCode === 53 ||
    weatherCode === 55 ||
    weatherCode === 56 ||
    weatherCode === 57
  ) {
    return {
      icon: "🌦️",
      description: "Drizzle",
    };
  }

  if (
    weatherCode === 61 ||
    weatherCode === 63 ||
    weatherCode === 65 ||
    weatherCode === 66 ||
    weatherCode === 67
  ) {
    return {
      icon: "🌧️",
      description: "Rain",
    };
  }

  if (
    weatherCode === 71 ||
    weatherCode === 73 ||
    weatherCode === 75 ||
    weatherCode === 77
  ) {
    return {
      icon: "❄️",
      description: "Snow",
    };
  }

  if (
    weatherCode === 80 ||
    weatherCode === 81 ||
    weatherCode === 82
  ) {
    return {
      icon: "🌦️",
      description: "Rain showers",
    };
  }

  if (
    weatherCode === 85 ||
    weatherCode === 86
  ) {
    return {
      icon: "🌨️",
      description: "Snow showers",
    };
  }

  if (
    weatherCode === 95 ||
    weatherCode === 96 ||
    weatherCode === 99
  ) {
    return {
      icon: "⛈️",
      description: "Thunderstorms",
    };
  }

  return {
    icon: "🌤️",
    description: "Current conditions",
  };
}

export default function WeatherSummaryCard({
  forecast,
  isLoading,
  error,
  onRetry,
}: WeatherSummaryCardProps) {
  if (isLoading) {
    return (
      <section className="weather-summary-card weather-summary-status">
        <span className="weather-loading-icon">🌤️</span>

        <div>
          <strong>Loading weather…</strong>
          <p>Checking your garden conditions</p>
        </div>
      </section>
    );
  }

  if (error || !forecast) {
    return (
      <section className="weather-summary-card weather-summary-status">
        <span>⚠️</span>

        <div>
          <strong>Weather unavailable</strong>

          <button type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  const today = forecast.daily[0];

  const weather = getWeatherDisplay(
    forecast.current.weatherCode,
  );

  return (
    <section className="weather-summary-card">
      <span
        className="weather-summary-icon"
        aria-hidden="true"
      >
        {weather.icon}
      </span>

      <div className="weather-summary-main">
        <strong>
          {Math.round(forecast.current.temperatureC)}°C
        </strong>

        <p>{weather.description}</p>
        <small>Your garden</small>
      </div>

      {today && (
        <div className="weather-summary-range">
          <span>
            ↑ {Math.round(today.temperatureMaxC)}°
          </span>

          <span>
            ↓ {Math.round(today.temperatureMinC)}°
          </span>
        </div>
      )}
    </section>
  );
}