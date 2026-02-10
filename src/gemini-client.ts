import { GoogleGenAI, type Part } from '@google/genai';
import { Config } from './config.js';

export interface ImageResult {
  data: string;       // base64-encoded image bytes
  mimeType: string;   // e.g. 'image/png'
}

export interface GenerateImageResponse {
  text?: string;
  images: ImageResult[];
}

export class GeminiClient {
  private ai: GoogleGenAI;
  private timeout: number;

  constructor(config: Config) {
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    this.timeout = config.timeout;
  }

  async generate(
    model: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      const response = await Promise.race([
        this.ai.models.generateContent({
          model,
          contents: prompt,
          config: systemPrompt ? { systemInstruction: systemPrompt } : undefined
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout)
        )
      ]);

      return response.text ?? '';
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async generateImage(
    model: string,
    prompt: string,
    options?: {
      aspectRatio?: string;
      resolution?: string;
      systemPrompt?: string;
    }
  ): Promise<GenerateImageResponse> {
    const isImagenModel = model.startsWith('imagen-');

    if (isImagenModel) {
      return this.generateWithImagen(model, prompt, options);
    }

    return this.generateWithGemini(model, prompt, options);
  }

  async editImage(
    model: string,
    prompt: string,
    imageBase64: string,
    mimeType: string,
    options?: {
      aspectRatio?: string;
      resolution?: string;
      systemPrompt?: string;
    }
  ): Promise<GenerateImageResponse> {
    try {
      const contents: Part[] = [
        { inlineData: { data: imageBase64, mimeType } },
        { text: prompt }
      ];

      const response = await Promise.race([
        this.ai.models.generateContent({
          model,
          contents,
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
            systemInstruction: options?.systemPrompt,
            ...(options?.aspectRatio || options?.resolution
              ? {
                  imageConfig: {
                    ...(options.aspectRatio && { aspectRatio: options.aspectRatio }),
                    ...(options.resolution && { imageSize: options.resolution })
                  }
                }
              : {})
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout * 3)
        )
      ]);

      return this.extractImageResponse(response);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private async generateWithGemini(
    model: string,
    prompt: string,
    options?: {
      aspectRatio?: string;
      resolution?: string;
      systemPrompt?: string;
    }
  ): Promise<GenerateImageResponse> {
    try {
      const response = await Promise.race([
        this.ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
            systemInstruction: options?.systemPrompt,
            ...(options?.aspectRatio || options?.resolution
              ? {
                  imageConfig: {
                    ...(options.aspectRatio && { aspectRatio: options.aspectRatio }),
                    ...(options.resolution && { imageSize: options.resolution })
                  }
                }
              : {})
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout * 3)
        )
      ]);

      return this.extractImageResponse(response);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private async generateWithImagen(
    model: string,
    prompt: string,
    options?: {
      aspectRatio?: string;
      resolution?: string;
    }
  ): Promise<GenerateImageResponse> {
    try {
      const response = await Promise.race([
        this.ai.models.generateImages({
          model,
          prompt,
          config: {
            numberOfImages: 1,
            ...(options?.aspectRatio && { aspectRatio: options.aspectRatio }),
            ...(options?.resolution && { imageSize: options.resolution })
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout * 3)
        )
      ]);

      const images: ImageResult[] = [];
      if (response.generatedImages) {
        for (const img of response.generatedImages) {
          if (img.image?.imageBytes) {
            images.push({
              data: img.image.imageBytes,
              mimeType: img.image.mimeType || 'image/png'
            });
          }
        }
      }

      return { images };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private extractImageResponse(response: any): GenerateImageResponse {
    const result: GenerateImageResponse = { images: [] };

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return result;
    }

    for (const part of parts) {
      if (part.text) {
        result.text = (result.text || '') + part.text;
      }
      if (part.inlineData?.data) {
        result.images.push({
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png'
        });
      }
    }

    return result;
  }

  private handleError(error: any): Error {
    if (error.message === 'Request timeout') {
      return new Error('Gemini API request timed out. Please try again.');
    }
    if (error.status === 401 || error.status === 403) {
      return new Error(
        'Invalid Gemini API key. Please check your GEMINI_API_KEY environment variable.'
      );
    }
    if (error.status === 429) {
      return new Error(
        'Gemini API rate limit exceeded. Please wait a moment and try again.'
      );
    }
    if (
      error.message?.includes('SAFETY') ||
      error.message?.includes('blocked')
    ) {
      return new Error(
        "Content blocked by Gemini's safety filters. Try rephrasing your request."
      );
    }
    if (
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.message?.includes('fetch')
    ) {
      return new Error(`Failed to connect to Gemini API: ${error.message}`);
    }
    return new Error(`Gemini API error: ${error.message || error}`);
  }
}

export function createGeminiClient(config: Config): GeminiClient {
  return new GeminiClient(config);
}
