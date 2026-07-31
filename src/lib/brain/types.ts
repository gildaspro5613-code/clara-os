// src/lib/brain/types.ts

/**
 * ============================================================================
 * Clara OS - Brain Types
 * ============================================================================
 * Source unique des types du module Brain.
 * ============================================================================
 */

export interface BrainContext {
  userId: string;
  sessionId: string;

  input: string;

  timestamp: Date;

  metadata?: Record<string, unknown>;
}

export interface BrainMemory {
  shortTerm: string[];

  longTerm: string[];

  facts: Record<string, unknown>;
}

export interface BrainReasoning {
  intent: string;

  confidence: number;

  summary: string;

  entities: string[];

  nextStep?: string;
}

export interface BrainPriority {
  id: string;

  label: string;

  score: number;
}

export interface BrainAction {
  id: string;

  title: string;

  description?: string;

  priority: number;

  completed: boolean;
}

export interface BrainRecommendation {
  title: string;

  description: string;

  score: number;
}

export interface BrainDashboard {
  context: BrainContext;

  memory: BrainMemory;

  reasoning: BrainReasoning;

  priorities: BrainPriority[];

  actions: BrainAction[];

  recommendations: BrainRecommendation[];
}