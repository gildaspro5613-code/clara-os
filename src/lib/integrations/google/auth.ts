import { google } from "googleapis";
import { GoogleAuth } from "@/lib/connectors/internal/google/auth/google-auth";

/** Compatibility facade backed by Clara's durable Google authentication. */
export class GoogleIntegration {
  static createClient() {
    return new GoogleAuth().createClient();
  }

  static async testConnection(): Promise<boolean> {
    try {
      const auth = await this.createClient();
      const drive = google.drive({ version: "v3", auth });
      await drive.about.get({ fields: "user" });
      return true;
    } catch {
      return false;
    }
  }
}
