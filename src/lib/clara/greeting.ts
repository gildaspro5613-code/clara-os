/**
 * ============================================
 * CLARA OS
 * Clara Module
 * --------------------------------------------
 * File : greeting.ts
 * Responsibility :
 * Generates Clara's greeting message.
 * Supports all five Clara OS locales.
 * ============================================
 */

import type { ClaraSession } from "@/lib/core";
import type { Locale } from "@/i18n/types";

/** Locale-aware greeting lines keyed by state and locale. */
const GREETINGS: Record<string, Partial<Record<Locale, string[]>>> = {
  GREETING: {
    fr: ["Bonjour."],
    en: ["Hello."],
    es: ["Buenos días."],
    de: ["Guten Tag."],
    it: ["Buongiorno."],
  },
  STARTING: {
    fr: ["Bonjour.", "", "Je démarre mon environnement.", "J'initialise mon Brain et mes services."],
    en: ["Hello.", "", "Starting my environment.", "Initialising Brain and services."],
    es: ["Buenos días.", "", "Iniciando mi entorno.", "Inicializando Brain y servicios."],
    de: ["Guten Tag.", "", "Ich starte meine Umgebung.", "Brain und Dienste werden initialisiert."],
    it: ["Buongiorno.", "", "Avvio del mio ambiente.", "Inizializzazione del Brain e dei servizi."],
  },
  WORKING_DEFAULT: {
    fr: ["Bonjour.", "", "Je suis opérationnelle.", "Tous les systèmes sont disponibles.", "Quelle est notre priorité aujourd'hui ?"],
    en: ["Hello.", "", "I'm fully operational.", "All systems available.", "What's our priority today?"],
    es: ["Buenos días.", "", "Estoy operativa.", "Todos los sistemas disponibles.", "¿Cuál es nuestra prioridad hoy?"],
    de: ["Guten Tag.", "", "Ich bin betriebsbereit.", "Alle Systeme verfügbar.", "Was ist unsere heutige Priorität?"],
    it: ["Buongiorno.", "", "Sono operativa.", "Tutti i sistemi disponibili.", "Qual è la nostra priorità oggi?"],
  },
  WORKING_QUESTION: {
    fr: ["Quelle est notre priorité ?"],
    en: ["What's our priority?"],
    es: ["¿Cuál es nuestra prioridad?"],
    de: ["Was ist unsere Priorität?"],
    it: ["Qual è la nostra priorità?"],
  },
  STOPPING: {
    fr: ["Je termine les tâches en cours.", "Je sécurise la session avant l'arrêt."],
    en: ["Finishing current tasks.", "Securing the session before shutdown."],
    es: ["Terminando las tareas en curso.", "Asegurando la sesión antes del cierre."],
    de: ["Laufende Aufgaben werden abgeschlossen.", "Sitzung wird vor dem Herunterfahren gesichert."],
    it: ["Sto completando le attività in corso.", "Sto proteggendo la sessione prima dell'arresto."],
  },
  STOPPED: {
    fr: ["Je suis arrêtée."],
    en: ["I am stopped."],
    es: ["Estoy detenida."],
    de: ["Ich bin gestoppt."],
    it: ["Sono ferma."],
  },
  DEFAULT: {
    fr: ["Je suis en attente."],
    en: ["I am on standby."],
    es: ["Estoy en espera."],
    de: ["Ich warte."],
    it: ["Sono in attesa."],
  },
};

function resolveLines(key: string, locale: Locale): string {
  const map = GREETINGS[key] ?? {};
  return (map[locale] ?? map["fr"] ?? []).join("\n");
}

/**
 * Returns Clara's greeting message.
 *
 * @param session - Current Clara session.
 * @param locale - Active locale (defaults to "fr").
 */
export function buildGreeting(
  session: ClaraSession,
  locale: Locale = "fr",
): string {
  switch (session.state) {
    case "STARTING":
      return resolveLines("STARTING", locale);

    case "WORKING":
      if (session.recommendation) {
        return [
          resolveLines("GREETING", locale),
          "",
          session.recommendation.summary,
          "",
          resolveLines("WORKING_QUESTION", locale),
        ].join("\n");
      }
      return resolveLines("WORKING_DEFAULT", locale);

    case "STOPPING":
      return resolveLines("STOPPING", locale);

    case "STOPPED":
      return resolveLines("STOPPED", locale);

    default:
      return resolveLines("DEFAULT", locale);
  }
}
