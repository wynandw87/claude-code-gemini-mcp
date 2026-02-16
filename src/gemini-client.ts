import { GoogleGenAI, type Part } from '@google/genai';
import * as path from 'path';
import { Config, GEMINI_3_MODELS, NANO_BANANA_PRO_MODEL } from './config.js';

export interface ImageResult {
  data: string;       // base64-encoded image bytes
  mimeType: string;   // e.g. 'image/png'
}

export interface GenerateImageResponse {
  text?: string;
  thinking?: string;
  images: ImageResult[];
}

export interface SearchWebResponse {
  text: string;
  citations: Array<{ title: string; uri: string }>;
  searchQueries: string[];
}

export interface ThinkingResponse {
  text: string;
  thinking: string;
  thinkingTokens?: number;
}

export interface CodeExecutionResponse {
  text: string;
  code: string;
  output: string;
}

export interface UrlContextResponse {
  text: string;
  urlMetadata: Array<{ url: string; status: string }>;
}

export interface MapsResponse {
  text: string;
  places: Array<{
    title: string;
    uri: string;
    placeId?: string;
    text?: string;
  }>;
  searchQueries: string[];
}

export interface FileUploadResponse {
  text: string;
  fileName: string;
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
      useSearchGrounding?: boolean;
      referenceImages?: Array<{ data: string; mimeType: string }>;
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

  async searchWeb(
    model: string,
    prompt: string,
    options?: {
      systemPrompt?: string;
      excludeDomains?: string[];
    }
  ): Promise<SearchWebResponse> {
    try {
      const googleSearch: any = options?.excludeDomains?.length
        ? { excludeDomains: options.excludeDomains }
        : {};

      const response = await Promise.race([
        this.ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: options?.systemPrompt,
            tools: [{ googleSearch }]
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout * 3)
        )
      ]);

      return this.extractSearchResponse(response);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async generateWithThinking(
    model: string,
    prompt: string,
    options?: {
      systemPrompt?: string;
      thinkingBudget?: number;
      thinkingLevel?: string;
    }
  ): Promise<ThinkingResponse> {
    try {
      const isGemini3 = GEMINI_3_MODELS.some(m => model.includes(m));

      const thinkingConfig: any = {
        includeThoughts: true,
      };

      if (isGemini3) {
        thinkingConfig.thinkingLevel = (options?.thinkingLevel || 'HIGH').toUpperCase();
      } else {
        thinkingConfig.thinkingBudget = options?.thinkingBudget ?? 8192;
      }

      const response = await Promise.race([
        this.ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: options?.systemPrompt,
            thinkingConfig
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout * 5)
        )
      ]);

      return this.extractThinkingResponse(response);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async executeCode(
    model: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<CodeExecutionResponse> {
    try {
      const response = await Promise.race([
        this.ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: systemPrompt,
            tools: [{ codeExecution: {} }]
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout * 3)
        )
      ]);

      return this.extractCodeExecutionResponse(response);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async fetchUrl(
    model: string,
    prompt: string,
    urls: string[],
    systemPrompt?: string
  ): Promise<UrlContextResponse> {
    try {
      const fullPrompt = `${prompt}\n\nURLs to analyze:\n${urls.map(u => `- ${u}`).join('\n')}`;

      const response = await Promise.race([
        this.ai.models.generateContent({
          model,
          contents: fullPrompt,
          config: {
            systemInstruction: systemPrompt,
            tools: [{ urlContext: {} }]
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout * 3)
        )
      ]);

      return this.extractUrlContextResponse(response);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async analyzeImage(
    model: string,
    prompt: string,
    imageBase64: string,
    mimeType: string
  ): Promise<string> {
    try {
      const contents: Part[] = [
        { inlineData: { data: imageBase64, mimeType } },
        { text: prompt }
      ];

      const response = await Promise.race([
        this.ai.models.generateContent({
          model,
          contents
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout * 2)
        )
      ]);

      return response.text ?? '';
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async uploadAndQuery(
    model: string,
    filePath: string,
    query?: string
  ): Promise<FileUploadResponse> {
    try {
      const uploadResult = await this.ai.files.upload({
        file: filePath,
        config: {
          mimeType: this.inferMimeType(filePath)
        }
      });

      if (!uploadResult.name) {
        throw new Error('File upload failed: no file name returned');
      }

      // Poll for ACTIVE state
      let file = uploadResult;
      const maxWait = 60000;
      const pollInterval = 2000;
      let waited = 0;

      while (file.state === 'PROCESSING' && waited < maxWait) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        waited += pollInterval;
        file = await this.ai.files.get({ name: uploadResult.name });
      }

      if (file.state === 'FAILED') {
        throw new Error('File processing failed');
      }
      if (file.state !== 'ACTIVE') {
        throw new Error('File processing timed out');
      }

      const promptText = query || 'Analyze this file and provide a detailed summary.';
      const contents: Part[] = [
        { fileData: { fileUri: file.uri!, mimeType: file.mimeType! } },
        { text: promptText }
      ];

      const response = await Promise.race([
        this.ai.models.generateContent({
          model,
          contents
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout * 3)
        )
      ]);

      return {
        text: response.text ?? '',
        fileName: uploadResult.name
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async searchMaps(
    model: string,
    prompt: string,
    options?: {
      systemPrompt?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<MapsResponse> {
    try {
      const config: any = {
        systemInstruction: options?.systemPrompt,
        tools: [{ googleMaps: {} }]
      };

      if (options?.latitude !== undefined && options?.longitude !== undefined) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: options.latitude,
              longitude: options.longitude
            }
          }
        };
      }

      const response = await Promise.race([
        this.ai.models.generateContent({
          model,
          contents: prompt,
          config
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout * 3)
        )
      ]);

      return this.extractMapsResponse(response);
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
      useSearchGrounding?: boolean;
      referenceImages?: Array<{ data: string; mimeType: string }>;
    }
  ): Promise<GenerateImageResponse> {
    try {
      const isProModel = model === NANO_BANANA_PRO_MODEL;

      // Build contents: text prompt + optional reference images
      let contents: string | Part[];
      if (options?.referenceImages?.length) {
        const parts: Part[] = [{ text: prompt }];
        for (const ref of options.referenceImages) {
          parts.push({ inlineData: { data: ref.data, mimeType: ref.mimeType } });
        }
        contents = parts;
      } else {
        contents = prompt;
      }

      // Build config
      const config: any = {
        responseModalities: ['TEXT', 'IMAGE'],
        systemInstruction: options?.systemPrompt,
      };

      if (options?.aspectRatio || options?.resolution) {
        config.imageConfig = {
          ...(options.aspectRatio && { aspectRatio: options.aspectRatio }),
          ...(options.resolution && { imageSize: options.resolution }),
        };
      }

      // Google Search grounding (Nano Banana Pro only)
      if (options?.useSearchGrounding && isProModel) {
        config.tools = [{ googleSearch: {} }];
      }

      const timeoutMultiplier = isProModel ? 5 : 3;
      const response = await Promise.race([
        this.ai.models.generateContent({ model, contents, config }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout * timeoutMultiplier)
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
      if (part.thought && part.text) {
        // Thinking output from Nano Banana Pro
        result.thinking = (result.thinking || '') + part.text;
      } else if (part.text) {
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

  private extractSearchResponse(response: any): SearchWebResponse {
    const candidate = response.candidates?.[0];
    const text = response.text ?? '';
    const citations: Array<{ title: string; uri: string }> = [];
    const searchQueries: string[] = [];

    if (candidate?.groundingMetadata) {
      const gm = candidate.groundingMetadata;
      if (gm.groundingChunks) {
        for (const chunk of gm.groundingChunks) {
          if (chunk.web) {
            citations.push({
              title: chunk.web.title || 'Untitled',
              uri: chunk.web.uri || ''
            });
          }
        }
      }
      if (gm.webSearchQueries) {
        searchQueries.push(...gm.webSearchQueries);
      }
    }

    return { text, citations, searchQueries };
  }

  private extractThinkingResponse(response: any): ThinkingResponse {
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    let thinking = '';
    let text = '';

    for (const part of parts) {
      if (part.thought && part.text) {
        thinking += part.text;
      } else if (part.text) {
        text += part.text;
      }
    }

    const thinkingTokens = response.usageMetadata?.thoughtsTokenCount;

    return { text, thinking, thinkingTokens };
  }

  private extractCodeExecutionResponse(response: any): CodeExecutionResponse {
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    let text = '';
    let code = '';
    let output = '';

    for (const part of parts) {
      if (part.executableCode?.code) {
        code += (code ? '\n' : '') + part.executableCode.code;
      } else if (part.codeExecutionResult?.output) {
        output += (output ? '\n' : '') + part.codeExecutionResult.output;
      } else if (part.text) {
        text += part.text;
      }
    }

    return { text, code, output };
  }

  private extractUrlContextResponse(response: any): UrlContextResponse {
    const candidate = response.candidates?.[0];
    const text = response.text ?? '';
    const urlMetadata: Array<{ url: string; status: string }> = [];

    if (candidate?.urlContextMetadata?.urlMetadata) {
      for (const meta of candidate.urlContextMetadata.urlMetadata) {
        urlMetadata.push({
          url: meta.retrievedUrl || '',
          status: meta.urlRetrievalStatus || 'UNKNOWN'
        });
      }
    }

    return { text, urlMetadata };
  }

  private extractMapsResponse(response: any): MapsResponse {
    const candidate = response.candidates?.[0];
    const text = response.text ?? '';
    const places: MapsResponse['places'] = [];
    const searchQueries: string[] = [];

    if (candidate?.groundingMetadata) {
      const gm = candidate.groundingMetadata;
      if (gm.groundingChunks) {
        for (const chunk of gm.groundingChunks) {
          if (chunk.maps) {
            places.push({
              title: chunk.maps.title || '',
              uri: chunk.maps.uri || '',
              placeId: chunk.maps.placeId,
              text: chunk.maps.text
            });
          }
        }
      }
      if (gm.webSearchQueries) {
        searchQueries.push(...gm.webSearchQueries);
      }
    }

    return { text, places, searchQueries };
  }

  private inferMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    // Gemini Files API only supports specific MIME types.
    // Code/config files use text/plain since types like
    // text/typescript and application/json are not supported.
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.csv': 'text/csv',
      '.json': 'text/plain',
      '.py': 'text/x-python',
      '.js': 'text/javascript',
      '.ts': 'text/plain',
      '.tsx': 'text/plain',
      '.jsx': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.xml': 'text/xml',
      '.yaml': 'text/plain',
      '.yml': 'text/plain',
      '.go': 'text/plain',
      '.rs': 'text/plain',
      '.rb': 'text/plain',
      '.java': 'text/plain',
      '.c': 'text/plain',
      '.cpp': 'text/plain',
      '.h': 'text/plain',
      '.sql': 'text/plain',
      '.sh': 'text/plain',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'text/plain';
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
