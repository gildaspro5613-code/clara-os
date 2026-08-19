import type { WazeContext } from "./waze-context";
import type { WazeResult } from "./waze-result";

const WAZE_BASE_URL = "https://waze.com/ul";

export class WazeEngine {
  public async navigate(
    context: WazeContext,
  ): Promise<WazeResult> {
    const destination = context.destination.trim();

    if (!destination) {
      return {
        success: false,
        destination: "",
        message: "Destination manquante.",
        completedAt: new Date(),
      };
    }

    const url = new URL(WAZE_BASE_URL);

    url.searchParams.set("q", destination);
    url.searchParams.set("navigate", "yes");

    return {
      success: true,
      destination,
      url: url.toString(),
      message: "Destination prête pour Waze.",
      completedAt: new Date(),
    };
  }
}
