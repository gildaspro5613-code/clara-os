import { AsyncLocalStorage } from "node:async_hooks";

export interface MicrosoftRuntimeTokenContext {
  readonly accessToken: string;
  readonly userId: string;
  readonly organizationId?: string;
}

const storage = new AsyncLocalStorage<MicrosoftRuntimeTokenContext>();

export function getMicrosoftRuntimeTokenContext():
  | MicrosoftRuntimeTokenContext
  | undefined {
  return storage.getStore();
}

export async function withMicrosoftRuntimeToken<T>(
  context: MicrosoftRuntimeTokenContext,
  operation: () => Promise<T>,
): Promise<T> {
  return storage.run(context, operation);
}
