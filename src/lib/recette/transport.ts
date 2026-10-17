import net from 'node:net';
import dgram from 'node:dgram';
import childProcess from 'node:child_process';
import { AsyncLocalStorage } from 'node:async_hooks';
import { syncBuiltinESMExports } from 'node:module';
import { neonConfig } from '@neondatabase/serverless';
import { configureRecetteOrigin, recetteDatabase, recetteRequested } from './policy';

let installed = false;
/** Install BEFORE loading request modules. No real provider receives a fake receipt.
 * Only the attested Neon HTTPS SQL endpoint is permitted, including redirects. */
export function installRecetteTransport(): void {
  if (!recetteRequested() || installed) return;
  // Refuse startup on ambiguous/custom-production configuration, not just writes.
  const database = recetteDatabase();
  configureRecetteOrigin();
  const connectionString = process.env.DATABASE_URL;
  const endpoint = new URL(typeof neonConfig.fetchEndpoint === 'function'
    ? neonConfig.fetchEndpoint(database.hostname, 5432) : neonConfig.fetchEndpoint);
  if (endpoint.protocol !== 'https:' || !endpoint.hostname.endsWith('.neon.tech') || endpoint.pathname !== '/sql')
    throw Error('RECETTE_DATABASE_REFUSED');
  const permitted = new AsyncLocalStorage<boolean>();
  const originalFetch = globalThis.fetch;
  const deny = () => { throw Error('RECETTE_EXTERNAL_OPERATION_BLOCKED'); };
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (headers.get('Neon-Connection-String') !== connectionString ||
        url.protocol !== 'https:' || url.hostname !== endpoint.hostname ||
        url.port || url.pathname !== '/sql' || url.search || url.username || url.password || method !== 'POST') deny();
    return permitted.run(true, () => originalFetch(input, { ...init, redirect: 'error' }));
  };
  const connect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function (this: net.Socket, ...args: unknown[]) {
    // net normalizes options to [options, callback] when called via TLS.
    const first = Array.isArray(args[0]) ? args[0][0] : args[0];
    const options = first && typeof first === 'object' ? first as {host?: string; port?: number; path?: string} : null;
    if (!permitted.getStore() || !options || options.host !== endpoint.hostname ||
        Number(options.port) !== 443 || options.path) deny();
    return Reflect.apply(connect, this, args);
  } as typeof connect;
  // UDP and subprocesses could bypass fetch (hardware, IMAP/SMTP helpers, shell).
  dgram.Socket.prototype.send = deny as typeof dgram.Socket.prototype.send;
  for (const key of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork'] as const)
    Object.assign(childProcess, { [key]: deny });
  syncBuiltinESMExports();
  installed = true;
}
