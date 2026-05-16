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
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite',
  // Image-capable text+image models (Nano Banana / Nano Banana 2 / Nano Banana Pro)
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview',
  // Imagen models
  'imagen-4.0-generate-001',
  'imagen-4.0-fast-generate-001'
] as const;

// Gemini 3.x text models — these use the `thinkingLevel` config (vs `thinkingBudget` on 2.5).
export const GEMINI_3_TEXT_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite',
] as const;

// Back-compat alias.
export const GEMINI_3_MODELS = GEMINI_3_TEXT_MODELS;

export const IMAGE_CAPABLE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview',
  'imagen-4.0-generate-001',
  'imagen-4.0-fast-generate-001'
] as const;

export const NANO_BANANA_PRO_MODEL = 'gemini-3-pro-image-preview';

export const ALL_ASPECT_RATIOS = [
  '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9',
  // Nano Banana 2 (gemini-3.1-flash-image-preview) narrow-format extras
  '1:4', '4:1', '1:8', '8:1'
] as const;

export const ALL_RESOLUTIONS = [
  '512',  // Nano Banana 2 only
  '1K', '2K', '4K'
] as const;

export function loadConfig(): Config {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Gemini API key not configured. Please set the GEMINI_API_KEY environment variable.'
    );
  }

  const defaultModel = process.env.GEMINI_DEFAULT_MODEL || 'gemini-3.1-pro-preview';
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
