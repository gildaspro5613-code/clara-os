/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : brain-source-registry.ts
 * Responsibility :
 * Central registry for Brain information sources.
 * ============================================
 */

import { Event } from "@/types";

import {
  BrainSource,
  BrainSourceContext,
} from "./brain-source";

import {
  buildCalendarContext,
  BrainCalendarContext,
  summarizeCalendarContext,
} from "./calendar-context";

import {
  buildGmailContext,
  BrainGmailContext,
  summarizeGmailContext,
} from "./gmail-context";

import {
  buildWeatherContext,
  BrainWeatherContext,
  summarizeWeatherContext,
} from "./weather-context";

import {
  buildWazeContext,
  BrainWazeContext,
  summarizeWazeContext,
} from "./waze-context";

import {
  buildDriveContext,
  BrainDriveContext,
  summarizeDriveContext,
} from "./drive-context";

function extractMessage(event: Event): string {
  if (
    event.type !== "USER_MESSAGE" ||
    typeof event.payload !== "object" ||
    event.payload === null ||
    !("message" in event.payload) ||
    typeof event.payload.message !== "string"
  ) {
    return "";
  }

  return event.payload.message.trim();
}

const calendarSource: BrainSource<BrainCalendarContext> = {
  id: "google-calendar",

  shouldLoad(event: Event): boolean {
    return /\b(agenda|calendrier|calendar|réunion|rendez-vous|rdv|meeting|planning|programme|aujourd'hui|demain|ce matin|cet après-midi|ce soir)\b/i.test(
      extractMessage(event),
    );
  },

  build: buildCalendarContext,
  summarize: summarizeCalendarContext,
};

const gmailSource: BrainSource<BrainGmailContext> = {
  id: "google-gmail",

  shouldLoad(event: Event): boolean {
    return /\b(mail|mails|email|emails|e-mail|e-mails|gmail|courriel|courriels|message|messages|reçu|reçus|reçue|reçues|boîte de réception|inbox)\b/i.test(
      extractMessage(event),
    );
  },

  build: buildGmailContext,
  summarize: summarizeGmailContext,
};

const weatherSource: BrainSource<BrainWeatherContext> = {
  id: "weather",

  shouldLoad(event: Event): boolean {
    return /\b(météo|meteo|temps|température|temperature|pluie|pleut|soleil|ensoleillé|ensoleille|orage|neige|vent|climat)\b/i.test(
      extractMessage(event),
    );
  },

  build: buildWeatherContext,
  summarize: summarizeWeatherContext,
};

const wazeSource: BrainSource<BrainWazeContext> = {
  id: "waze",

  shouldLoad(event: Event): boolean {
    return /\b(waze|navigation|naviguer|itinéraire|itineraire|destination|aller à|aller au|aller chez|conduire|route vers)\b/i.test(
      extractMessage(event),
    );
  },

  async build(event: Event, now: Date) {
    const message = extractMessage(event);

    const match = message.match(
      /(?:vers|à|au|chez|pour)\s+(.+)$/i,
    );

    const destination = match?.[1]
      ?.trim()
      .replace(/[.,!?;:]+$/g, "")
      .trim();

    if (!destination) {
      return null;
    }

    return buildWazeContext(
      event,
      now,
      destination,
    );
  },

  summarize: summarizeWazeContext,
};

const driveSource: BrainSource<BrainDriveContext> = {
  id: "google-drive",

  shouldLoad(event: Event): boolean {
    return /\b(drive|google drive|fichier|fichiers|document|documents|dossier|dossiers)\b/i.test(
      extractMessage(event),
    );
  },

  async build(event: Event, now: Date) {
    const message = extractMessage(event);

    const match = message.match(
      /(?:dans|sur|aller|va|chercher|cherche|trouve|retrouve|ouvre)\s+(?:mon|mes|le|les)?\s*(?:google drive|drive)?\s*(.*)$/i,
    );

    const query = (match?.[1] ?? "")
      .replace(/\s+(?:dans|sur)\s+(?:mon|ma|mes|le|la|les)?\s*(?:google drive|drive)\.?$/i, "")
      .trim()
      .replace(/[.,!?;:]+$/g, "")
      .trim();

    return buildDriveContext(
      event,
      now,
      query,
    );
  },

  summarize: summarizeDriveContext,
};

export const brainSources = [
  calendarSource,
  gmailSource,
  weatherSource,
  wazeSource,
  driveSource,
] as const;

export async function buildBrainSources(
  event: Event,
  now: Date,
): Promise<BrainSourceContext[]> {
  const contexts: BrainSourceContext[] = [];

  for (const source of brainSources) {
    if (!source.shouldLoad(event)) {
      continue;
    }

    const context = await source.build(event, now);

    if (!context) {
      continue;
    }

    const summary = (
      source.summarize as (context: {
        available: boolean;
        source: string;
        error?: string;
      }) => string
    )(context);

    contexts.push({
      available: context.available,
      source: context.source,
      data: context,
      summary,
      ...(context.error ? { error: context.error } : {}),
    });
  }

  return contexts;
}
