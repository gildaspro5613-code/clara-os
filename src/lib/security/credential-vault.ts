export interface CredentialVaultWriteInput {
  organizationId: string;
  providerId: string;
  connectionAccountId: string;
  credentials: Record<string, unknown>;
}

export interface CredentialVault {
  store(input: CredentialVaultWriteInput): Promise<string>;
  read(credentialRef: string): Promise<Record<string, unknown>>;
  delete(credentialRef: string): Promise<void>;
}

/**
 * Credential storage boundary.
 *
 * Implementations must store secrets outside Clara's PostgreSQL persistence and
 * return only an opaque credential reference. The Brain, Journal, Mission Store
 * and organization connector registry must never receive raw credentials.
 */
export class UnconfiguredCredentialVault implements CredentialVault {
  public async store(_input: CredentialVaultWriteInput): Promise<string> {
    throw new Error("Credential Vault is not configured.");
  }

  public async read(_credentialRef: string): Promise<Record<string, unknown>> {
    throw new Error("Credential Vault is not configured.");
  }

  public async delete(_credentialRef: string): Promise<void> {
    throw new Error("Credential Vault is not configured.");
  }
}

let credentialVault: CredentialVault = new UnconfiguredCredentialVault();

export function getCredentialVault(): CredentialVault {
  return credentialVault;
}

/**
 * Server composition root hook. Do not expose this setter to client code.
 */
export function configureCredentialVault(vault: CredentialVault): void {
  credentialVault = vault;
}
