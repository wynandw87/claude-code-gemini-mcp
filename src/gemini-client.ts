import { GoogleGenerativeAI } from '@google/generative-ai';
import { Config, SUPPORTED_MODELS } from './config.js';

export class GeminiClient {
  private ai: GoogleGenerativeAI;
  private timeout: number;

  constructor(config: Config) {
    this.ai = new GoogleGenerativeAI(config.apiKey);
    this.timeout = config.timeout;
  }

  async generate(
    model: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    // Validate model
    if (!SUPPORTED_MODELS.includes(model as any)) {
      throw new Error(
        `Unknown model '${model}'. Available models: ${SUPPORTED_MODELS.join(', ')}`
      );
    }

    try {
      // Get the generative model
      const generativeModel = this.ai.getGenerativeModel({
        model,
        systemInstruction: systemPrompt
      });

      // Generate content with timeout
      const result = await Promise.race([
        generativeModel.generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout)
        )
      ]);

      // Extract and return text
      const response = result.response;
      return response.text();
    } catch (error: any) {
      // Handle specific error types
      if (error.message === 'Request timeout') {
        throw new Error('Gemini API request timed out. Please try again.');
      }

      // Check for API key errors
      if (error.status === 401 || error.status === 403) {
        throw new Error(
          'Invalid Gemini API key. Please check your GEMINI_API_KEY environment variable.'
        );
      }

      // Check for rate limit
      if (error.status === 429) {
        throw new Error(
          'Gemini API rate limit exceeded. Please wait a moment and try again.'
        );
      }

      // Check for content safety blocks
      if (
        error.message?.includes('SAFETY') ||
        error.message?.includes('blocked')
      ) {
        throw new Error(
          "Content blocked by Gemini's safety filters. Try rephrasing your request."
        );
      }

      // Network errors
      if (
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED' ||
        error.message?.includes('fetch')
      ) {
        throw new Error(`Failed to connect to Gemini API: ${error.message}`);
      }

      // Default error
      throw new Error(`Gemini API error: ${error.message || error}`);
    }
  }
}

export function createGeminiClient(config: Config): GeminiClient {
  return new GeminiClient(config);
}
