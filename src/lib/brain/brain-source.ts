/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : brain-source.ts
 * Responsibility :
 * Defines the common contract used by
 * information sources connected to the Brain.
 * ============================================
 */

import { Event } from "@/types";

export interface BrainSourceContext<
  TData = unknown,
  TSource extends string = string,
> {
  available: boolean;
  source: TSource;
  data: TData;
  summary: string;
  error?: string;
}

export interface BrainSource<
  TContext extends object = object,
> {
  id: string;

  shouldLoad(
    event: Event,
  ): boolean;

  build(
    event: Event,
    now: Date,
  ): Promise<TContext | null>;

  summarize(
    context: TContext,
  ): string;
}
