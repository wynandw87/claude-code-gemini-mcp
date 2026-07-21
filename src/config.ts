export interface Config {
  apiKey: string;
  defaultModel: string;
  timeout: number;
  outputDir: string;
  allowUnlistedModels: boolean;
  maxFileBytes: number;
}

export const DEFAULT_TEXT_MODEL = 'gemini-3.1-pro-preview';
export const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image';

// Gemini's Files API caps uploads at 48MB. Also used as the ceiling for images
// read into memory, since every byte is base64-encoded into a second buffer.
export const MAX_FILE_BYTES = 48 * 1024 * 1024;

// Floating aliases Google repoints as models ship. Verified 2026-07-21 to
// resolve to: pro -> gemini-3.1-pro-preview, flash -> gemini-3.5-flash,
// flash-lite -> gemini-3.1-flash-lite. All Gemini 3.x, hence thinkingLevel.
export const LATEST_ALIASES = [
  'gemini-pro-latest',
  'gemini-flash-latest',
  'gemini-flash-lite-latest'
] as const;

export const TEXT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  ...LATEST_ALIASES
] as const;

// Nano Banana 2 — native 512 output and narrow aspect ratios.
export const NANO_BANANA_2_MODELS = [
  'gemini-3.1-flash-image',
  'gemini-3.1-flash-image-preview'
] as const;

// Nano Banana Pro — thinking output, Google Search grounding, highest quality.
export const NANO_BANANA_PRO_MODELS = [
  'gemini-3-pro-image',
  'gemini-3-pro-image-preview',
  'nano-banana-pro-preview'
] as const;

export const IMAGEN_MODELS = [
  'imagen-4.0-generate-001',
  'imagen-4.0-fast-generate-001',
  'imagen-4.0-ultra-generate-001'
] as const;

// Gemini image models accept reference images and inline editing; Imagen does not.
export const GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  ...NANO_BANANA_2_MODELS,
  ...NANO_BANANA_PRO_MODELS
] as const;

export const IMAGE_CAPABLE_MODELS = [
  ...GEMINI_IMAGE_MODELS,
  ...IMAGEN_MODELS
] as const;

export const SUPPORTED_MODELS = [
  ...TEXT_MODELS,
  ...IMAGE_CAPABLE_MODELS
] as const;

// Back-compat alias — prefer isNanoBananaProModel() for checks.
export const NANO_BANANA_PRO_MODEL = 'gemini-3-pro-image';

export const STANDARD_ASPECT_RATIOS = [
  '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'
] as const;

// Narrow formats are Nano Banana 2 only.
export const NARROW_ASPECT_RATIOS = ['1:4', '4:1', '1:8', '8:1'] as const;

export const ALL_ASPECT_RATIOS = [
  ...STANDARD_ASPECT_RATIOS,
  ...NARROW_ASPECT_RATIOS
] as const;

export const STANDARD_RESOLUTIONS = ['1K', '2K', '4K'] as const;

export const ALL_RESOLUTIONS = [
  '512',  // Nano Banana 2 only
  ...STANDARD_RESOLUTIONS
] as const;

const GEMINI_VERSION_RE = /^gemini-(\d+)(?:\.(\d+))?-/;

/**
 * Gemini 3.x and newer take `thinkingLevel`; 2.5 and older take `thinkingBudget`.
 * Derived from the version in the model id rather than a hardcoded list, so new
 * releases (gemini-3.5-flash, gemini-4-*) route correctly without a code change.
 * The `-latest` aliases carry no version in their id, so they are listed
 * explicitly — all three currently point at Gemini 3.x.
 */
export function usesThinkingLevel(model: string): boolean {
  if ((LATEST_ALIASES as readonly string[]).includes(model)) {
    return true;
  }
  const match = GEMINI_VERSION_RE.exec(model);
  return match ? Number(match[1]) >= 3 : false;
}

/** Gemini 3.1 Pro rejects thinkingLevel 'minimal'; callers get bumped to 'low'. */
export function rejectsMinimalThinking(model: string): boolean {
  return /3\.1-pro/.test(model) || model === 'gemini-pro-latest';
}

export function isNanoBananaProModel(model: string): boolean {
  return (NANO_BANANA_PRO_MODELS as readonly string[]).includes(model);
}

export function isNanoBanana2Model(model: string): boolean {
  return (NANO_BANANA_2_MODELS as readonly string[]).includes(model);
}

export function isImagenModel(model: string): boolean {
  return model.startsWith('imagen-');
}

export function isImageCapableModel(model: string): boolean {
  return (IMAGE_CAPABLE_MODELS as readonly string[]).includes(model);
}

export function isTextModel(model: string): boolean {
  return (TEXT_MODELS as readonly string[]).includes(model);
}

export function isSupportedModel(model: string): boolean {
  return (SUPPORTED_MODELS as readonly string[]).includes(model);
}

/** Reference images are supported by every Gemini image model, but not by Imagen. */
export function supportsReferenceImages(model: string): boolean {
  return (GEMINI_IMAGE_MODELS as readonly string[]).includes(model);
}

/** Google Search grounding during image generation is Nano Banana Pro only. */
export function supportsSearchGrounding(model: string): boolean {
  return isNanoBananaProModel(model);
}

const UNLISTED_HINT =
  'Set GEMINI_ALLOW_UNLISTED_MODELS=true to pass unrecognized model ids through to the API.';

/**
 * Rejects models this server has not been wired up for. The lists above go stale
 * as Google ships new ids, so GEMINI_ALLOW_UNLISTED_MODELS=true skips the check
 * and passes whatever the caller supplies straight through to the API.
 */
export function assertSupportedModel(
  model: string,
  opts: { kind?: 'text' | 'image' | 'any'; allowUnlisted?: boolean } = {}
): void {
  if (opts.allowUnlisted) {
    return;
  }

  const kind = opts.kind ?? 'any';
  const allowed =
    kind === 'image' ? IMAGE_CAPABLE_MODELS : kind === 'text' ? TEXT_MODELS : SUPPORTED_MODELS;

  if ((allowed as readonly string[]).includes(model)) {
    return;
  }

  const label = kind === 'any' ? 'model' : `${kind} model`;
  throw new Error(
    `Unsupported ${label}: "${model}". Supported: ${allowed.join(', ')}. ${UNLISTED_HINT}`
  );
}

/**
 * Rejects image options the resolved model cannot honor, so an incompatible
 * combination fails locally with a specific message rather than as an opaque
 * remote API error — or worse, succeeds with the option silently dropped.
 */
export function assertImageOptions(
  model: string,
  opts: {
    aspectRatio?: string;
    resolution?: string;
    referenceImages?: boolean;
    searchGrounding?: boolean;
    allowUnlisted?: boolean;
  }
): void {
  if (opts.allowUnlisted) {
    return;
  }

  if (opts.resolution === '512' && !isNanoBanana2Model(model)) {
    throw new Error(
      `Resolution "512" is only supported by Nano Banana 2 (${NANO_BANANA_2_MODELS.join(', ')}); ` +
        `"${model}" supports ${STANDARD_RESOLUTIONS.join(', ')}.`
    );
  }

  if (
    opts.aspectRatio &&
    (NARROW_ASPECT_RATIOS as readonly string[]).includes(opts.aspectRatio) &&
    !isNanoBanana2Model(model)
  ) {
    throw new Error(
      `Aspect ratio "${opts.aspectRatio}" is only supported by Nano Banana 2 ` +
        `(${NANO_BANANA_2_MODELS.join(', ')}); "${model}" supports ${STANDARD_ASPECT_RATIOS.join(', ')}.`
    );
  }

  if (opts.referenceImages && !supportsReferenceImages(model)) {
    throw new Error(
      `Model "${model}" does not accept reference images. Use a Gemini image model ` +
        `(${GEMINI_IMAGE_MODELS.join(', ')}).`
    );
  }

  if (opts.searchGrounding && !supportsSearchGrounding(model)) {
    throw new Error(
      `Google Search grounding during image generation is Nano Banana Pro only ` +
        `(${NANO_BANANA_PRO_MODELS.join(', ')}); "${model}" does not support it.`
    );
  }
}

export function loadConfig(): Config {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Gemini API key not configured. Please set the GEMINI_API_KEY environment variable.'
    );
  }

  const allowUnlistedModels = process.env.GEMINI_ALLOW_UNLISTED_MODELS === 'true';
  const defaultModel = process.env.GEMINI_DEFAULT_MODEL || DEFAULT_TEXT_MODEL;
  const outputDir = process.env.GEMINI_OUTPUT_DIR || './generated-images';

  // Must be a *text* model: this is the fallback for ask, search_web, run_code,
  // fetch_url, analyze_image, upload_file and google_maps, all of which call
  // generateContent. An image-only id here would fail every default text call.
  if (!allowUnlistedModels && !isTextModel(defaultModel)) {
    throw new Error(
      `GEMINI_DEFAULT_MODEL must be a text model, got "${defaultModel}". ` +
        `Supported: ${TEXT_MODELS.join(', ')}. ${UNLISTED_HINT}`
    );
  }

  const timeoutStr = process.env.GEMINI_TIMEOUT;
  const timeout = timeoutStr ? parseInt(timeoutStr, 10) : 60000;

  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error('GEMINI_TIMEOUT must be a positive number');
  }

  const maxFileBytesStr = process.env.GEMINI_MAX_FILE_BYTES;
  const maxFileBytes = maxFileBytesStr ? parseInt(maxFileBytesStr, 10) : MAX_FILE_BYTES;

  if (!Number.isFinite(maxFileBytes) || maxFileBytes <= 0) {
    throw new Error('GEMINI_MAX_FILE_BYTES must be a positive number');
  }

  return {
    apiKey,
    defaultModel,
    timeout,
    outputDir,
    allowUnlistedModels,
    maxFileBytes
  };
}
