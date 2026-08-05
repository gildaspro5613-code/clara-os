/**
 * ============================================
 * CLARA OS
 * Environment Loader
 * --------------------------------------------
 * File : load-env.ts
 * Responsibility :
 * Loads Next.js environment variables
 * for standalone CLI scripts.
 * ============================================
 */

import { loadEnvConfig } from "@next/env";

// Charge .env.local depuis la racine du projet
loadEnvConfig(process.cwd());