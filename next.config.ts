import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  serverExternalPackages: ["googleapis", "pdf-parse"],
  outputFileTracingIncludes: {
    "/api/documents": ["./src/lib/documents/pdf-text-worker.mjs", "./node_modules/pdf-parse/**/*", "./node_modules/pdfjs-dist/**/*", "./node_modules/@napi-rs/canvas*/**/*"],
    "/api/internal/document-operations-purge": ["./db/maintenance/purge_document_operations.sql"],
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
