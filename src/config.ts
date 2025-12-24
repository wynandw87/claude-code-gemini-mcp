export interface Config {
  apiKey: string;
  defaultModel: string;
  timeout: number;
}

export const SUPPORTED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview'
] as const;

export function loadConfig(): Config {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Gemini API key not configured. Please set the GEMINI_API_KEY environment variable.'
    );
  }

  const defaultModel = process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash';

  const timeoutStr = process.env.GEMINI_TIMEOUT;
  const timeout = timeoutStr ? parseInt(timeoutStr, 10) : 60000;

  if (timeout <= 0) {
    throw new Error('GEMINI_TIMEOUT must be a positive number');
  }

  return {
    apiKey,
    defaultModel,
    timeout
  };
}
