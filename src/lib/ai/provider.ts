import { createGeminiProvider } from './providers/gemini';
import { createOllamaProvider } from './providers/ollama';
import type { VisionProvider } from './providers/types';
import type { VisionRequest } from './providers/types';

function createOllamaFromEnv(): VisionProvider {
  return createOllamaProvider({
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    model: process.env.OLLAMA_VISION_MODEL ?? 'llava:latest',
  });
}

function isGeminiQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests');
}

/** Vision provider with automatic Ollama fallback when Gemini quota is exceeded. */
function createProviderWithFallback(primary: VisionProvider): VisionProvider {
  return {
    name: primary.name,
    async analyze(request: VisionRequest): Promise<string> {
      try {
        return await primary.analyze(request);
      } catch (error) {
        if (primary.name === 'gemini' && isGeminiQuotaError(error)) {
          console.warn('Gemini quota exceeded — falling back to Ollama');
          return createOllamaFromEnv().analyze(request);
        }
        throw error;
      }
    },
  };
}

export function getVisionProvider(): VisionProvider {
  const provider = (process.env.AI_PROVIDER ?? 'ollama').toLowerCase();

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required when AI_PROVIDER=gemini');
    }
    return createProviderWithFallback(
      createGeminiProvider({
        apiKey,
        model: process.env.GEMINI_MODEL,
      })
    );
  }

  return createOllamaFromEnv();
}

/**
 * Text-only classifier (no images). Prefers Gemini when a key is configured so
 * "Suggest with AI" works even when AI_PROVIDER=ollama and Ollama isn't running.
 */
export function getTextClassifierProvider(): VisionProvider {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return createGeminiProvider({
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL,
    });
  }
  return getVisionProvider();
}
