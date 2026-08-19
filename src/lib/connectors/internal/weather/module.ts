import { WeatherEngine } from "./weather-engine";

export const weatherModule = {
  name: "Weather Connector",
  description:
    "Provides current weather information through WeatherAPI.",
  engine: new WeatherEngine(),
};
