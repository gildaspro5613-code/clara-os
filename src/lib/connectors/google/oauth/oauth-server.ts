/**
 * ============================================
 * CLARA OS
 * Google OAuth Server
 * --------------------------------------------
 * File : oauth-server.ts
 * Responsibility :
 * Starts a local HTTP server used
 * to receive the Google OAuth
 * authorization code.
 * ============================================
 */

import http from "node:http";
import { URL } from "node:url";

/**
 * Thrown when a required
 * environment variable
 * is missing.
 */
class MissingEnvironmentVariableError
  extends Error {

  /**
   * Creates a new error.
   */
  constructor(
    variableName: string,
  ) {

    super(
      `Missing environment variable: ${variableName}`,
    );

    this.name =
      "MissingEnvironmentVariableError";

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );

  }

}

/**
 * Thrown when the configured
 * Redirect URI is invalid.
 */
class InvalidRedirectUriError
  extends Error {

  /**
   * Creates a new error.
   */
  constructor(
    message: string,
  ) {

    super(
      `Invalid Redirect URI: ${message}`,
    );

    this.name =
      "InvalidRedirectUriError";

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );

  }

}

/**
 * Thrown when the OAuth callback
 * is invalid.
 */
class InvalidCallbackError
  extends Error {

  /**
   * Creates a new error.
   */
  constructor(
    message: string,
  ) {

    super(message);

    this.name =
      "InvalidCallbackError";

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );

  }

}

/**
 * Thrown when waiting
 * for the callback
 * exceeds the timeout.
 */
class TimeoutError
  extends Error {

  /**
   * Creates a new error.
   */
  constructor(
    timeout: number,
  ) {

    super(
      `Timeout after ${timeout} ms.`,
    );

    this.name =
      "TimeoutError";

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );

  }

}

/**
 * Thrown when the
 * HTTP server fails.
 */
class ServerError
  extends Error {

  /**
   * Original error.
   */
  public readonly cause?: unknown;

  /**
   * Creates a new error.
   */
  constructor(
    message: string,
    cause?: unknown,
  ) {

    super(message);

    this.name =
      "ServerError";

    this.cause = cause;

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );

  }

}

/**
 * Receives the OAuth
 * authorization code.
 */
export class GoogleOAuthServer {

  /**
   * Redirect URI.
   */
  private readonly redirectUri:
    URL;

  /**
   * Hostname.
   */
  private readonly hostname:
    string;

  /**
   * Port.
   */
  private readonly port:
    number;

  /**
   * Callback path.
   */
  private readonly callbackPath:
    string;

  /**
   * Creates the server.
   */
  constructor() {

    const rawRedirectUri =
      process.env
        .GOOGLE_REDIRECT_URI;

    if (
      !rawRedirectUri ||
      !rawRedirectUri.trim()
    ) {

      throw new MissingEnvironmentVariableError(
        "GOOGLE_REDIRECT_URI",
      );

    }

    let redirectUri: URL;

    try {

      redirectUri =
        new URL(
          rawRedirectUri.trim(),
        );

    } catch {

      throw new InvalidRedirectUriError(
        "Invalid URL.",
      );

    }

    if (
      redirectUri.protocol !==
      "http:"
    ) {

      throw new InvalidRedirectUriError(
        "Only HTTP callbacks are supported.",
      );

    }

    this.redirectUri =
      redirectUri;

    this.hostname =
      redirectUri.hostname;

    this.port =
      redirectUri.port
        ? Number(
            redirectUri.port,
          )
        : 80;

    this.callbackPath =
      redirectUri.pathname;

  }  /**
   * Waits for the OAuth callback
   * and returns the authorization code.
   */
  public async listenForCode(
    timeout = 120_000,
  ): Promise<string> {

    return new Promise<string>(
      (
        resolve,
        reject,
      ) => {

        const server =
          http.createServer(
            (
              request,
              response,
            ) => {

              try {

                if (
                  !request.url
                ) {

                  this.sendText(
                    response,
                    400,
                    "Bad Request",
                  );

                  return;

                }

                const url =
                  new URL(
                    request.url,
                    `http://${
                      request.headers.host ??
                      this.hostname
                    }`,
                  );

                if (
                  url.pathname !==
                  this.callbackPath
                ) {

                  this.sendText(
                    response,
                    404,
                    "Not Found",
                  );

                  return;

                }

                const code =
                  url.searchParams.get(
                    "code",
                  );

                if (
                  !code ||
                  !code.trim()
                ) {

                  this.sendHtml(
                    response,
                    400,
                    GoogleOAuthServer.failurePage(
                      "Missing authorization code.",
                    ),
                  );

                  cleanup();

                  reject(

                    new InvalidCallbackError(
                      "Missing OAuth code.",
                    ),

                  );

                  return;

                }

                this.sendHtml(
                  response,
                  200,
                  GoogleOAuthServer.successPage(),
                );

                cleanup();

                resolve(code);

              } catch (error) {

                try {

                  this.sendText(
                    response,
                    500,
                    "Internal Server Error",
                  );

                } catch {

                  // Ignore response errors.

                }

                cleanup();

                reject(

                  new ServerError(
                    "Unexpected server error.",
                    error,
                  ),

                );

              }

            },
          );

        const onError =
          (
            error: unknown,
          ) => {

            cleanup();

            reject(

              new ServerError(
                "Unable to start HTTP server.",
                error,
              ),

            );

          };

        server.once(
          "error",
          onError,
        );

        server.listen(

          this.port,

          this.hostname,

        );

        const timer =
          setTimeout(
            () => {

              cleanup();

              reject(

                new TimeoutError(
                  timeout,
                ),

              );

            },
            timeout,
          );

        const cleanup =
          () => {

            clearTimeout(
              timer,
            );

            server.removeListener(
              "error",
              onError,
            );

            try {

              server.close();

            } catch {

              // Ignore close errors.

            }

          };

      },
    );

  }  /**
   * Sends an HTML response.
   */
  private sendHtml(
    response: http.ServerResponse,
    status: number,
    html: string,
  ): void {

    const buffer =
      Buffer.from(
        html,
        "utf8",
      );

    response.writeHead(
      status,
      {
        "Content-Type":
          "text/html; charset=utf-8",
        "Content-Length":
          String(buffer.length),
        Connection:
          "close",
      },
    );

    response.end(
      buffer,
    );

  }

  /**
   * Sends a plain text response.
   */
  private sendText(
    response: http.ServerResponse,
    status: number,
    text: string,
  ): void {

    const buffer =
      Buffer.from(
        text,
        "utf8",
      );

    response.writeHead(
      status,
      {
        "Content-Type":
          "text/plain; charset=utf-8",
        "Content-Length":
          String(buffer.length),
        Connection:
          "close",
      },
    );

    response.end(
      buffer,
    );

  }

  /**
   * Success page displayed
   * after authentication.
   */
  private static successPage():
    string {

    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Clara OS</title>
<style>

body {

  font-family:
    system-ui,
    sans-serif;

  background:
    #f5f7fb;

  display:flex;

  justify-content:center;

  align-items:center;

  height:100vh;

}

.card {

  background:white;

  padding:32px;

  border-radius:12px;

  box-shadow:
    0 4px 20px
    rgba(0,0,0,.08);

  text-align:center;

}

</style>
</head>

<body>

<div class="card">

<h2>
Authentication completed
</h2>

<p>
You may now close this window.
</p>

</div>

</body>

</html>
`;

  }

  /**
   * Failure page displayed
   * when authentication fails.
   */
  private static failurePage(
    message: string,
  ): string {

    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Clara OS</title>
</head>

<body>

<h2>
Authentication failed
</h2>

<p>

${message}

</p>

</body>

</html>
`;

  }

}

export default
  GoogleOAuthServer;