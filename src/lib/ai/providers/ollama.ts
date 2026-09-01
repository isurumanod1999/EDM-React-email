import type { VisionProvider, VisionRequest } from './types';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export function createOllamaProvider(config: OllamaConfig): VisionProvider {
  const baseUrl = config.baseUrl.replace(/\/$/, '');

  return {
    name: 'ollama',
    async analyze(request: VisionRequest): Promise<string> {
      let response: Response;

      try {
        response = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: 'system', content: request.systemPrompt },
              {
                role: 'user',
                content: request.userPrompt,
                images: request.images.map((img) => img.base64),
              },
            ],
            stream: false,
            format: 'json',
          }),
          signal: AbortSignal.timeout(300000),
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
          throw new Error(
            'Ollama is not running. Start Ollama, then run: ollama pull llava'
          );
        }
        throw new Error(`Ollama connection failed: ${msg}`);
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        if (response.status === 404) {
          throw new Error(
            `Ollama model "${config.model}" not found. Run: ollama pull ${config.model}`
          );
        }
        if (
          body.includes('allocate buffer') ||
          body.includes('startup failed') ||
          body.includes('out of memory')
        ) {
          throw new Error(
            'Ollama ran out of memory processing the image. Close other apps, use llava:latest (not 13b), or run: ollama pull moondream'
          );
        }
        throw new Error(`Ollama error (${response.status}): ${body.slice(0, 200)}`);
      }

      const data = (await response.json()) as { message?: { content?: string } };
      const content = data.message?.content?.trim();

      if (!content) {
        throw new Error('Ollama returned an empty response');
      }

      return content;
    },
  };
}
