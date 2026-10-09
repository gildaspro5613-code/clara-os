import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  serverExternalPackages: ["googleapis"],
  outputFileTracingIncludes: {
    "/api/internal/document-operations-purge": ["./db/maintenance/purge_document_operations.sql"],
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
