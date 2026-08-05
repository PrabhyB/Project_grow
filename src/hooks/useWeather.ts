import { useCallback, useEffect, useState } from "react";

import {
  getCurrentPosition,
  getWeatherForecast,
  type WeatherForecast,
} from "../services/weatherService";

type WeatherState = {
  forecast: WeatherForecast | null;
  isLoading: boolean;
  error: string;
  permissionDenied: boolean;
};

export function useWeather() {
  const [state, setState] = useState<WeatherState>({
    forecast: null,
    isLoading: true,
    error: "",
    permissionDenied: false,
  });

  const loadWeather = useCallback(async () => {
    setState((current) => ({
      ...current,
      isLoading: true,
      error: "",
      permissionDenied: false,
    }));

    try {
      const position = await getCurrentPosition();

      const forecast = await getWeatherForecast(
        position.coords.latitude,
        position.coords.longitude,
      );

      setState({
        forecast,
        isLoading: false,
        error: "",
        permissionDenied: false,
      });
    } catch (caughtError) {
      const geolocationError = caughtError as
  | GeolocationPositionError
  | undefined;

const isPermissionError = geolocationError?.code === 1;

      setState({
        forecast: null,
        isLoading: false,
        permissionDenied: isPermissionError,
        error: isPermissionError
          ? "Location permission was declined."
          : caughtError instanceof Error
            ? caughtError.message
            : "The weather could not be loaded.",
      });
    }
  }, []);

  useEffect(() => {
    void loadWeather();
  }, [loadWeather]);

  return {
    ...state,
    reloadWeather: loadWeather,
  };
}