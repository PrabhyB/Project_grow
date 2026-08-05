import type { DailyWeather } from "../services/weatherService";

import "./WeatherForecastStrip.css";

type WeatherForecastStripProps = {
  days: DailyWeather[];
};

function getWeatherIcon(weatherCode: number) {
  if (weatherCode === 0) return "☀️";

  if (weatherCode === 1 || weatherCode === 2) {
    return "🌤️";
  }

  if (weatherCode === 3) return "☁️";

  if (weatherCode === 45 || weatherCode === 48) {
    return "🌫️";
  }

  if (
    weatherCode === 51 ||
    weatherCode === 53 ||
    weatherCode === 55 ||
    weatherCode === 56 ||
    weatherCode === 57
  ) {
    return "🌦️";
  }

  if (
    weatherCode === 61 ||
    weatherCode === 63 ||
    weatherCode === 65 ||
    weatherCode === 66 ||
    weatherCode === 67
  ) {
    return "🌧️";
  }

  if (
    weatherCode === 71 ||
    weatherCode === 73 ||
    weatherCode === 75 ||
    weatherCode === 77
  ) {
    return "❄️";
  }

  if (
    weatherCode === 80 ||
    weatherCode === 81 ||
    weatherCode === 82
  ) {
    return "🌦️";
  }

  if (weatherCode === 85 || weatherCode === 86) {
    return "🌨️";
  }

  if (
    weatherCode === 95 ||
    weatherCode === 96 ||
    weatherCode === 99
  ) {
    return "⛈️";
  }

  return "🌤️";
}

function formatDay(date: string, index: number) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
  }).format(new Date(`${date}T12:00:00`));
}

export default function WeatherForecastStrip({
  days,
}: WeatherForecastStripProps) {
  if (days.length === 0) {
    return null;
  }

  return (
    <section className="weather-forecast-section">
      <div className="weather-forecast-heading">
        <div>
          <p>Local forecast</p>
          <h2>Next 7 days</h2>
        </div>

        <span>Weather-aware garden planning</span>
      </div>

      <div className="weather-forecast-strip">
        {days.slice(0, 7).map((day, index) => (
          <article
            className="weather-forecast-day"
            key={day.date}
          >
            <strong>{formatDay(day.date, index)}</strong>

            <span
              className="weather-forecast-icon"
              aria-hidden="true"
            >
              {getWeatherIcon(day.weatherCode)}
            </span>

            <div className="weather-forecast-temperature">
              <strong>
                {Math.round(day.temperatureMaxC)}°
              </strong>

              <span>
                {Math.round(day.temperatureMinC)}°
              </span>
            </div>

            <div className="weather-forecast-rain">
              <span>💧</span>

              <small>
                {Math.round(
                  day.precipitationProbability,
                )}
                %
              </small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}