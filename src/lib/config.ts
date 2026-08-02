import { z } from 'zod';

/**
 * Single, validated source of runtime configuration (Story 1.1 / AR16).
 *
 * Values are read and validated once at module load. Feature credentials
 * (AI, Figma, Resend) are optional so absence disables a feature rather than
 * blocking startup; drivers and auth mode are constrained enums with defaults
 * matching the current-phase architecture (filesystem/local/open).
 */

const booleanFromEnv = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) return defaultValue;
      return !['false', '0', 'no', 'off'].includes(value.toLowerCase());
    });

/** Blank env vars (`KEY=`) are treated as unset so Zod defaults apply. */
function envOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),

  // Deployment drivers — current phase supports filesystem/local only;
  // postgres/s3 are accepted by the schema but rejected at the composition
  // root until their adapters land (Epics F1/F2).
  storageDriver: z.enum(['filesystem', 'postgres']).default('filesystem'),
  assetDriver: z.enum(['local', 's3']).default('local'),

  // Access posture — enforced requires an identity adapter (Epic F4).
  authMode: z.enum(['open', 'enforced']).default('open'),

  // Bind host used for exposure-gate checks (Story 2.7).
  host: z.string().min(1).default('localhost'),

  // Legacy static demo routes (/preview/*, /api/email/[template]) — on by default
  // in development, off in production unless explicitly enabled (Story 2.4).
  legacyDemosEnabled: booleanFromEnv(false),

  // Absolute base URL used to resolve image URLs in sent emails.
  baseUrl: z.string().url().default('http://localhost:3000'),

  ai: z.object({
    provider: z.enum(['ollama', 'gemini']).default('ollama'),
    ollamaBaseUrl: z.string().url().default('http://localhost:11434'),
    ollamaVisionModel: z.string().min(1).default('llava:latest'),
    geminiApiKey: z.string().min(1).optional(),
    geminiModel: z.string().min(1).default('gemini-2.0-flash'),
  }),

  figma: z.object({
    accessToken: z.string().min(1).optional(),
    debug: booleanFromEnv(true),
  }),

  resend: z.object({
    apiKey: z.string().min(1).optional(),
    // Empty until send time; the send route falls back to onboarding@resend.dev.
    from: z.string().default(''),
  }),
});

export type AppConfig = z.infer<typeof configSchema>;

function loadConfig(): AppConfig {
  const result = configSchema.safeParse({
    nodeEnv: process.env.NODE_ENV,
    storageDriver: process.env.STORAGE_DRIVER,
    assetDriver: process.env.ASSET_DRIVER,
    authMode: process.env.AUTH_MODE,
    host: process.env.HOST,
    legacyDemosEnabled:
      process.env.ENABLE_LEGACY_DEMOS ??
      (process.env.NODE_ENV === 'development' ? 'true' : 'false'),
    baseUrl: envOptional(process.env.PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL),
    ai: {
      provider: process.env.AI_PROVIDER?.toLowerCase(),
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
      ollamaVisionModel: process.env.OLLAMA_VISION_MODEL,
      geminiApiKey: process.env.GEMINI_API_KEY,
      geminiModel: process.env.GEMINI_MODEL,
    },
    figma: {
      accessToken: envOptional(process.env.FIGMA_ACCESS_TOKEN),
      debug: process.env.FIGMA_DEBUG,
    },
    resend: {
      apiKey: envOptional(process.env.RESEND_API_KEY),
      from: envOptional(process.env.RESEND_FROM),
    },
  });

  if (!result.success) {
    // Report offending keys and reasons only — never the values — so a
    // misconfiguration fails fast without leaking secrets into logs.
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid application configuration:\n${issues}`);
  }

  return Object.freeze(result.data);
}

export const config: AppConfig = loadConfig();
