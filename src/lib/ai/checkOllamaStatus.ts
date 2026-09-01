export interface OllamaStatus {
  provider: 'ollama' | 'gemini';
  model: string;
  connected: boolean;
  modelAvailable: boolean;
  availableModels?: string[];
  error?: string;
}

function modelMatches(available: string[], configured: string): boolean {
  const normalized = configured.replace(/:latest$/, '');
  return available.some(
    (name) =>
      name === configured ||
      name === normalized ||
      name.startsWith(`${normalized}:`) ||
      configured.startsWith(`${name}:`)
  );
}

export async function checkOllamaStatus(): Promise<OllamaStatus> {
  const provider = (process.env.AI_PROVIDER ?? 'ollama').toLowerCase();
  const model =
    provider === 'gemini'
      ? (process.env.GEMINI_MODEL ?? 'gemini-2.0-flash')
      : (process.env.OLLAMA_VISION_MODEL ?? 'llava:latest');

  if (provider === 'gemini') {
    return {
      provider: 'gemini',
      model,
      connected: Boolean(process.env.GEMINI_API_KEY),
      modelAvailable: Boolean(process.env.GEMINI_API_KEY),
      error: process.env.GEMINI_API_KEY ? undefined : 'GEMINI_API_KEY is not set',
    };
  }

  const baseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');

  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return {
        provider: 'ollama',
        model,
        connected: false,
        modelAvailable: false,
        error: `Ollama returned ${res.status}`,
      };
    }

    const data = (await res.json()) as { models?: { name: string }[] };
    const availableModels = (data.models ?? []).map((m) => m.name);

    return {
      provider: 'ollama',
      model,
      connected: true,
      modelAvailable: modelMatches(availableModels, model),
      availableModels,
      error: modelMatches(availableModels, model)
        ? undefined
        : `Model "${model}" not found. Run: ollama pull ${model.replace(/:latest$/, '')}`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      provider: 'ollama',
      model,
      connected: false,
      modelAvailable: false,
      error:
        msg.includes('ECONNREFUSED') || msg.includes('fetch failed')
          ? 'Ollama is not running. Start Ollama, then run: ollama pull llava'
          : `Ollama connection failed: ${msg}`,
    };
  }
}
