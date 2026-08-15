// ============================================
// CLARA OS
// Missions Module
//
// File : missions.mock.ts
// Responsibility :
// Temporary development data.
// ============================================

import type { Mission } from "../types/Mission";

export const missionsMock: Mission[] = [
  {
    id: "mission-001",
    title: "Préparer le lancement de Clara Edissimo",
    objective:
      "Rendre le dispositif Clara Edissimo complètement opérationnel.",
    context:
      "Landing page, widget, formulaire, automatisations et parcours prospect.",
    status: "active",
    priority: "high",
    createdAt: new Date(),
    tasks: [
      {
        id: "task-001",
        title: "Finaliser la landing page",
        completed: true,
      },
      {
        id: "task-002",
        title: "Installer le widget Clara",
        completed: true,
      },
      {
        id: "task-003",
        title: "Tester le formulaire",
        completed: true,
      },
      {
        id: "task-004",
        title: "Tester le scénario Make",
        completed: false,
      },
      {
        id: "task-005",
        title: "Valider le parcours prospect",
        completed: false,
      },
    ],
    progress: 60,
    nextAction: "Effectuer le test complet du parcours prospect.",
    lastAction: "Widget Clara installé.",
  },

  {
    id: "mission-002",
    title: "Mettre en production Clara OS",
    objective:
      "Finaliser la première version opérationnelle de Clara OS.",
    context:
      "Cockpit, Missions, Brain et intégrations principales.",
    status: "planned",
    priority: "critical",
    createdAt: new Date(),
    tasks: [
      {
        id: "task-006",
        title: "Finaliser le Cockpit",
        completed: true,
      },
      {
        id: "task-007",
        title: "Construire le module Missions",
        completed: false,
      },
      {
        id: "task-008",
        title: "Connecter le Brain",
        completed: false,
      },
      {
        id: "task-009",
        title: "Effectuer les tests globaux",
        completed: false,
      },
    ],
    progress: 25,
    nextAction: "Construire le module Missions.",
  },

  {
    id: "mission-003",
    title: "Documenter Clara OS",
    objective:
      "Centraliser la documentation fonctionnelle et technique de Clara OS.",
    status: "planned",
    priority: "medium",
    createdAt: new Date(),
    tasks: [
      {
        id: "task-010",
        title: "Documenter l'architecture",
        completed: false,
      },
      {
        id: "task-011",
        title: "Documenter les modules",
        completed: false,
      },
      {
        id: "task-012",
        title: "Documenter les intégrations",
        completed: false,
      },
    ],
    progress: 0,
    nextAction: "Créer la structure documentaire.",
  },
];
