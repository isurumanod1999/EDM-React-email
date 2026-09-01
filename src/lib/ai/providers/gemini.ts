import type { VisionProvider, VisionRequest } from './types';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export function createGeminiProvider(config: GeminiConfig): VisionProvider {
  const model = config.model ?? 'gemini-2.0-flash';

  return {
    name: 'gemini',
    async analyze(request: VisionRequest): Promise<string> {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(config.apiKey);
      const geminiModel = genAI.getGenerativeModel({
        model,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
        { text: `${request.systemPrompt}\n\n${request.userPrompt}` },
      ];

      for (const img of request.images) {
        parts.push({
          inlineData: { mimeType: img.mimeType, data: img.base64 },
        });
      }

      const result = await geminiModel.generateContent(parts);
      const content = result.response.text()?.trim();

      if (!content) {
        throw new Error('Gemini returned an empty response');
      }

      return content;
    },
  };
}
