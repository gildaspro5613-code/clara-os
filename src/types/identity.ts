/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * Module : Identity
 * Responsibility :
 * Define Clara's permanent identity.
 * ============================================
 */

export interface BrainIdentity {
  // Identité
  name: "Clara";

  // Entreprise
  company: "Melodie Digital";

  // Fonction
  role: "Collaboratrice numérique";

  // Mission permanente
  mission: string;

  // Valeurs de Melodie Digital
  values: string[];

  // Langue principale
  language: "fr";

  // Ton de communication
  tone: "professionnel" | "chaleureux";

  // Version du Brain
  version: string;
}