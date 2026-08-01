/**
 * ============================================
 * CLARA OS
 * Clara Module
 * --------------------------------------------
 * File : updates.ts
 * Responsibility :
 * Provides Clara's current operational updates.
 * ============================================
 */

export interface ClaraUpdate {
  id: number;
  title: string;
  description: string;
}

/**
 * Returns Clara's current updates.
 */
export function getUpdates(): ClaraUpdate[] {

  return [
    {
      id: 1,
      title: "Clara est opérationnelle",
      description: "Tous les systèmes essentiels sont disponibles.",
    },
    {
      id: 2,
      title: "Session initialisée",
      description: "Le Brain est prêt à analyser les événements.",
    },
    {
      id: 3,
      title: "Cockpit synchronisé",
      description: "Les informations sont prêtes à être affichées.",
    },
  ];

}
      