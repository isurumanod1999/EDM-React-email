export interface VisionImage {
  base64: string;
  mimeType: string;
}

export interface VisionRequest {
  systemPrompt: string;
  userPrompt: string;
  images: VisionImage[];
}

export interface VisionProvider {
  name: string;
  analyze(request: VisionRequest): Promise<string>;
}
