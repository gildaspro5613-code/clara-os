import type { Connector } from "@/lib/connectors/core/connector";
import type { WazeContext } from "./waze-context";
import type { WazeResult } from "./waze-result";

export interface WazeConnector extends Connector {
  navigate(
    context: WazeContext,
  ): Promise<WazeResult>;
}
