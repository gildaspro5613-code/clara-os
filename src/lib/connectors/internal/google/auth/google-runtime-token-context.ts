import { AsyncLocalStorage } from "node:async_hooks";

export interface GoogleRuntimeTokenContext {
  readonly accessToken: string;
  readonly userId: string;
  readonly organizationId?: string;
}

const storage = new AsyncLocalStorage<GoogleRuntimeTokenContext>();

export function getGoogleRuntimeTokenContext():
  | GoogleRuntimeTokenContext
  | undefined {
  return storage.getStore();
}

export async function withGoogleRuntimeToken<T>(
  context: GoogleRuntimeTokenContext,
  operation: () => Promise<T>,
): Promise<T> {
  return storage.run(context, operation);
}
