export type OperationalExecutionStatus =
  | "completed"
  | "accepted"
  | "pending"
  | "failed";

/**
 * Provider-neutral result returned by connector-backed capabilities.
 *
 * Provider adapters may attach provider-specific data, but Clara OS keeps the
 * execution envelope stable so Runtime/Brain consumers never need to depend on
 * a connector implementation.
 */
export interface OperationalCapabilityResult {
  readonly capabilityId: string;
  readonly success: boolean;
  readonly provider: string;
  readonly connectionId?: string;
  readonly status?: OperationalExecutionStatus;
  readonly executionId?: string;
  readonly data?: unknown;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly retryable?: boolean;
  };
}
