import type { Connector } from "@/lib/connectors/core/connector";
import type { WeatherContext } from "./weather-context";
import type { WeatherResult } from "./weather-result";

export interface WeatherConnector extends Connector {
  read(
    context: WeatherContext,
  ): Promise<WeatherResult>;
}
