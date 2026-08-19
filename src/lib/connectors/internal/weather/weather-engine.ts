import type { WeatherContext } from "./weather-context";
import type { WeatherResult } from "./weather-result";

const WEATHER_API_BASE_URL = "https://api.weatherapi.com/v1";

export class WeatherEngine {

  public async read(
    context: WeatherContext,
  ): Promise<WeatherResult> {

    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        location: context.location,
        message: "Missing WEATHER_API_KEY configuration.",
        completedAt: new Date(),
      };
    }

    try {
      const url = new URL(
        `${WEATHER_API_BASE_URL}/current.json`,
      );

      url.searchParams.set("key", apiKey);
      url.searchParams.set("q", context.location);

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(
          `WeatherAPI request failed: ${response.status}`,
        );
      }

      const data = await response.json();

      return {
        success: true,
        location: data.location.name,
        country: data.location.country,
        temperatureC: data.current.temp_c,
        condition: data.current.condition.text,
        icon: data.current.condition.icon,
        updatedAt: new Date(
          data.current.last_updated,
        ),
        message: "Weather loaded successfully.",
        completedAt: new Date(),
      };

    } catch (error) {
      return {
        success: false,
        location: context.location,
        message:
          error instanceof Error
            ? error.message
            : "Unknown WeatherAPI error.",
        completedAt: new Date(),
      };
    }
  }
}
