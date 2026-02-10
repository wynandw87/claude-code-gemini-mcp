export interface Config {
  apiKey: string;
  defaultModel: string;
  timeout: number;
  outputDir: string;
}

export const SUPPORTED_MODELS = [
  // Text models
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  // Image-capable text+image models
  'gemini-2.5-flash-preview-native-audio-dialog',
  // Imagen models
  'imagen-4.0-generate-001',
  'imagen-4.0-fast-generate-001'
] as const;

export const GEMINI_3_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
] as const;

export const IMAGE_CAPABLE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
  'imagen-4.0-generate-001',
  'imagen-4.0-fast-generate-001'
] as const;

export function loadConfig(): Config {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Gemini API key not configured. Please set the GEMINI_API_KEY environment variable.'
    );
  }

  const defaultModel = process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash';
  const outputDir = process.env.GEMINI_OUTPUT_DIR || './generated-images';

  const timeoutStr = process.env.GEMINI_TIMEOUT;
  const timeout = timeoutStr ? parseInt(timeoutStr, 10) : 60000;

  if (timeout <= 0) {
    throw new Error('GEMINI_TIMEOUT must be a positive number');
  }

  return {
    apiKey,
    defaultModel,
    timeout,
    outputDir
  };
}
