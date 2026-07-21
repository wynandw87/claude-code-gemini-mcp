#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  loadConfig, assertSupportedModel, assertImageOptions,
  ALL_ASPECT_RATIOS, ALL_RESOLUTIONS, MAX_FILE_BYTES,
  DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL
} from './config.js';
import { createGeminiClient } from './gemini-client.js';
import {
  BRAINSTORM_PROMPT, CODE_REVIEW_PROMPT, EXPLAIN_PROMPT, IMAGE_GENERATION_PROMPT,
  SEARCH_WEB_PROMPT, CODE_EXECUTION_PROMPT, URL_CONTEXT_PROMPT, GOOGLE_MAPS_PROMPT
} from './prompts.js';

// Single source of truth for the version reported over the MCP initialize
// handshake, so it can't drift from the published package.
function packageVersion(): string {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(fsSync.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const VERSION = packageVersion();

function modelFooter(modelVersion: string | undefined, requestedModel: string): string {
  const reported = modelVersion || requestedModel;
  return `\n\n---\n*Model: \`${reported}\`*`;
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function main() {
  try {
    // Load configuration
    const config = loadConfig();

    // Initialize Gemini client
    const client = createGeminiClient(config);

    // Create MCP server instance
    const server = new Server(
      {
        name: 'gemini-mcp-server',
        version: VERSION
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    const TOOLS = [
          {
            name: 'ask',
            description: 'Flexible, general-purpose interface to query any Gemini model',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'The question or instruction for Gemini'
                },
                model: {
                  type: 'string',
                  description: `Model identifier (optional, defaults to ${DEFAULT_TEXT_MODEL}, overridable via GEMINI_DEFAULT_MODEL)`
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'brainstorm',
            description: 'Creative ideation and brainstorming assistant using Gemini 3.1 Pro for cutting-edge reasoning',
            inputSchema: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: 'The subject to brainstorm about'
                }
              },
              required: ['topic']
            }
          },
          {
            name: 'code_review',
            description: 'Thorough code analysis and review using Gemini 3.1 Pro for high-quality analysis',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'The code to review'
                }
              },
              required: ['code']
            }
          },
          {
            name: 'explain',
            description: 'Clear explanations of concepts, code, or technical topics using Gemini 3.1 Pro',
            inputSchema: {
              type: 'object',
              properties: {
                concept: {
                  type: 'string',
                  description: 'What to explain (code, concept, or technical topic)'
                }
              },
              required: ['concept']
            }
          },
          {
            name: 'generate_image',
            description: 'Generate images using Gemini or Imagen models. Returns the image inline and optionally saves to disk. Use gemini-3-pro-image (Nano Banana Pro) for professional assets, high-fidelity text rendering, and complex multi-reference compositions. Use gemini-3.1-flash-image (Nano Banana 2) for an efficient default.',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Image generation prompt describing what to create'
                },
                model: {
                  type: 'string',
                  description: `Model to use (optional, defaults to "${DEFAULT_IMAGE_MODEL}"). Options: gemini-2.5-flash-image (Nano Banana - fast), gemini-3.1-flash-image (Nano Banana 2 - efficient default), gemini-3-pro-image (Nano Banana Pro - highest quality, thinking, search grounding, multi-reference), imagen-4.0-generate-001, imagen-4.0-fast-generate-001, imagen-4.0-ultra-generate-001`
                },
                aspect_ratio: {
                  type: 'string',
                  description: 'Aspect ratio for the generated image',
                  enum: [...ALL_ASPECT_RATIOS]
                },
                resolution: {
                  type: 'string',
                  description: 'Image resolution. "512" is Nano Banana 2 only (fastest); "1K"/"2K"/"4K" supported by all Gemini image models.',
                  enum: [...ALL_RESOLUTIONS]
                },
                use_search_grounding: {
                  type: 'boolean',
                  description: 'Enable Google Search grounding for reference-accurate generation (Nano Banana Pro only). Useful for real landmarks, products, or factual imagery.'
                },
                reference_image_paths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Absolute paths to reference images (up to 14) for style/content guidance (Gemini image models only — not Imagen)',
                  minItems: 1,
                  maxItems: 14
                },
                save_path: {
                  type: 'string',
                  description: 'File path to save the image. If not provided, auto-saves to output directory.'
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'edit_image',
            description: 'Edit an existing image using Gemini. Provide a source image and edit instructions. Returns the edited image inline and optionally saves to disk.',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Edit instructions describing what changes to make'
                },
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the source image file to edit'
                },
                model: {
                  type: 'string',
                  description: `Model to use (optional, defaults to "${DEFAULT_IMAGE_MODEL}")`
                },
                aspect_ratio: {
                  type: 'string',
                  description: 'Aspect ratio for the edited image',
                  enum: [...ALL_ASPECT_RATIOS]
                },
                resolution: {
                  type: 'string',
                  description: 'Image resolution. "512" is Nano Banana 2 only; "1K"/"2K"/"4K" supported by all Gemini image models.',
                  enum: [...ALL_RESOLUTIONS]
                },
                save_path: {
                  type: 'string',
                  description: 'File path to save the edited image. If not provided, auto-saves to output directory.'
                }
              },
              required: ['prompt', 'image_path']
            }
          },
          {
            name: 'search_web',
            description: 'Search the web using Gemini with Google Search grounding. Returns search results with citations and source URLs.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query or question to research on the web'
                },
                model: {
                  type: 'string',
                  description: `Model identifier (optional, defaults to ${DEFAULT_TEXT_MODEL}, overridable via GEMINI_DEFAULT_MODEL)`
                },
              },
              required: ['query']
            }
          },
          {
            name: 'search_with_thinking',
            description: "Query Gemini with extended thinking/reasoning enabled. Shows the model's thought process alongside its answer. Best for complex reasoning tasks.",
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'The question or problem requiring deep reasoning'
                },
                model: {
                  type: 'string',
                  description: `Model identifier (optional, defaults to ${DEFAULT_TEXT_MODEL}, overridable via GEMINI_DEFAULT_MODEL). All Gemini 2.5 and 3.x models support thinking.`
                },
                thinking_level: {
                  type: 'string',
                  description: 'Thinking intensity (Gemini 3.x models): "minimal" (Flash/Flash-Lite only — silently bumped to "low" on Pro), "low", "medium", "high" (default).',
                  enum: ['minimal', 'low', 'medium', 'high']
                },
                thinking_budget: {
                  type: 'number',
                  description: 'Token budget for thinking (Gemini 2.5 models only). Default: 8192. Use -1 for automatic.'
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'run_code',
            description: "Execute Python code in Gemini's sandboxed environment with NumPy, Pandas, Matplotlib, SciPy. Useful for calculations, data analysis, and generating visualizations.",
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Description of what to compute or analyze. Gemini will write and execute Python code automatically.'
                },
                model: {
                  type: 'string',
                  description: `Model identifier (optional, defaults to ${DEFAULT_TEXT_MODEL}, overridable via GEMINI_DEFAULT_MODEL)`
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'fetch_url',
            description: "Fetch and analyze web page content using Gemini's URL context tool. Provide URLs and a question about their content.",
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Question or instruction about the URL content'
                },
                urls: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'URLs to fetch and analyze (1-20)',
                  minItems: 1,
                  maxItems: 20
                },
                model: {
                  type: 'string',
                  description: `Model identifier (optional, defaults to ${DEFAULT_TEXT_MODEL}, overridable via GEMINI_DEFAULT_MODEL)`
                }
              },
              required: ['prompt', 'urls']
            }
          },
          {
            name: 'analyze_image',
            description: "Analyze an image using Gemini's vision model. Provide a file path and optional prompt.",
            inputSchema: {
              type: 'object',
              properties: {
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the image file to analyze'
                },
                prompt: {
                  type: 'string',
                  description: 'Question or instruction about the image',
                  default: 'Describe this image in detail'
                },
                model: {
                  type: 'string',
                  description: `Model identifier (optional, defaults to ${DEFAULT_TEXT_MODEL}, overridable via GEMINI_DEFAULT_MODEL)`
                }
              },
              required: ['image_path']
            }
          },
          {
            name: 'upload_file',
            description: `Upload a document for Gemini to analyze. Supports: txt, md, py, js, csv, json, pdf, and more (max ${formatBytes(MAX_FILE_BYTES)}). Optionally ask a question about it immediately. The remote copy is deleted once the query returns.`,
            inputSchema: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description: 'Absolute path to the file to upload'
                },
                query: {
                  type: 'string',
                  description: 'Optional question to ask about the file immediately after upload'
                },
                model: {
                  type: 'string',
                  description: `Model identifier (optional, defaults to ${DEFAULT_TEXT_MODEL}, overridable via GEMINI_DEFAULT_MODEL)`
                }
              },
              required: ['file_path']
            }
          },
          {
            name: 'google_maps',
            description: 'Location-aware queries using Google Maps grounding. Find places, get reviews, and location information.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Location-related query (e.g., "best coffee shops near me")'
                },
                latitude: {
                  type: 'number',
                  description: 'Optional latitude for location context',
                  minimum: -90,
                  maximum: 90
                },
                longitude: {
                  type: 'number',
                  description: 'Optional longitude for location context',
                  minimum: -180,
                  maximum: 180
                },
                model: {
                  type: 'string',
                  description: `Model identifier (optional, defaults to ${DEFAULT_TEXT_MODEL}, overridable via GEMINI_DEFAULT_MODEL)`
                }
              },
              required: ['query']
            }
          }
    ];

    // Derived from the same array the client sees, so the dispatch guard can't
    // drift from the advertised tool list.
    const TOOL_NAMES = new Set(TOOLS.map(t => t.name));

    // Register tools/list handler
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

    const outputRoot = path.resolve(config.outputDir);

    // Helper: pick the model for a call and reject ids this server can't route
    function resolveModel(requested: string | undefined, imageOnly = false): string {
      const model = requested || (imageOnly ? DEFAULT_IMAGE_MODEL : config.defaultModel);
      assertSupportedModel(model, {
        kind: imageOnly ? 'image' : 'any',
        allowUnlisted: config.allowUnlistedModels
      });
      return model;
    }

    /**
     * Confine a caller-supplied save path to the configured output directory.
     * These tools write bytes to disk from a prompt that may itself be derived
     * from untrusted content, so an unconstrained path is an arbitrary-write
     * primitive ("../../../.ssh/authorized_keys").
     */
    function resolveSavePath(requested: string): string {
      const resolved = path.resolve(outputRoot, requested);
      const relative = path.relative(outputRoot, resolved);
      if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(
          `save_path must stay inside the output directory (${outputRoot}). ` +
            `Refusing to write to "${resolved}". Set GEMINI_OUTPUT_DIR to write elsewhere.`
        );
      }
      return resolved;
    }

    // Helper: read a file, refusing anything large enough to threaten the
    // process (every byte is base64-encoded into a second, larger buffer).
    async function readFileChecked(filePath: string, label: string): Promise<Buffer> {
      let stat;
      try {
        stat = await fs.stat(filePath);
      } catch {
        throw new Error(`${label} not found: ${filePath}`);
      }
      if (!stat.isFile()) {
        throw new Error(`${label} is not a regular file: ${filePath}`);
      }
      if (stat.size > config.maxFileBytes) {
        throw new Error(
          `${label} is ${formatBytes(stat.size)}, over the ${formatBytes(config.maxFileBytes)} limit: ${filePath}`
        );
      }
      return fs.readFile(filePath);
    }

    // Helper: save image to disk
    async function saveImage(base64Data: string, savePath: string): Promise<string> {
      await fs.mkdir(path.dirname(savePath), { recursive: true });
      await fs.writeFile(savePath, Buffer.from(base64Data, 'base64'));
      return savePath;
    }

    // Helper: generate auto save path
    function getAutoSavePath(outputDir: string, prefix: string): string {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${prefix}-${timestamp}.png`;
      return path.resolve(outputDir, filename);
    }

    // Helper: detect mime type from file extension
    function getMimeType(filePath: string): string {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp'
      };
      return mimeTypes[ext] || 'image/png';
    }

    // Register tools/call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // An unknown tool name is a protocol-level fault, not a tool that ran and
      // failed — surface it as a JSON-RPC error so clients can tell them apart.
      if (!TOOL_NAMES.has(name)) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      try {
        switch (name) {
          case 'ask': {
            const schema = z.object({
              prompt: z.string().min(1),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = resolveModel(input.model);
            const response = await client.generate(model, input.prompt);
            return {
              content: [{ type: 'text', text: response.text + modelFooter(response.modelVersion, model) }]
            };
          }

          case 'brainstorm': {
            const schema = z.object({
              topic: z.string().min(1)
            });
            const input = schema.parse(args);
            const prompt = `Brainstorm ideas about: ${input.topic}`;
            const response = await client.generate(DEFAULT_TEXT_MODEL, prompt, BRAINSTORM_PROMPT);
            return {
              content: [{ type: 'text', text: response.text + modelFooter(response.modelVersion, DEFAULT_TEXT_MODEL) }]
            };
          }

          case 'code_review': {
            const schema = z.object({
              code: z.string().min(1)
            });
            const input = schema.parse(args);
            const prompt = `Review this code:\n\n${input.code}`;
            const response = await client.generate(DEFAULT_TEXT_MODEL, prompt, CODE_REVIEW_PROMPT);
            return {
              content: [{ type: 'text', text: response.text + modelFooter(response.modelVersion, DEFAULT_TEXT_MODEL) }]
            };
          }

          case 'explain': {
            const schema = z.object({
              concept: z.string().min(1)
            });
            const input = schema.parse(args);
            const prompt = `Explain: ${input.concept}`;
            const response = await client.generate(DEFAULT_TEXT_MODEL, prompt, EXPLAIN_PROMPT);
            return {
              content: [{ type: 'text', text: response.text + modelFooter(response.modelVersion, DEFAULT_TEXT_MODEL) }]
            };
          }

          case 'generate_image': {
            const schema = z.object({
              prompt: z.string().min(1),
              model: z.string().optional(),
              aspect_ratio: z.enum(ALL_ASPECT_RATIOS).optional(),
              resolution: z.enum(ALL_RESOLUTIONS).optional(),
              use_search_grounding: z.boolean().optional(),
              reference_image_paths: z.array(z.string()).min(1).max(14).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);
            const model = resolveModel(input.model, true);

            assertImageOptions(model, {
              aspectRatio: input.aspect_ratio,
              resolution: input.resolution,
              referenceImages: !!input.reference_image_paths?.length,
              searchGrounding: input.use_search_grounding,
              allowUnlisted: config.allowUnlistedModels
            });

            // Resolve the destination before spending a generation on it.
            const savePath = input.save_path
              ? resolveSavePath(input.save_path)
              : getAutoSavePath(config.outputDir, 'generated');

            // Load reference images if provided
            let referenceImages: Array<{ data: string; mimeType: string }> | undefined;
            if (input.reference_image_paths?.length) {
              referenceImages = [];
              for (const refPath of input.reference_image_paths) {
                const resolved = path.resolve(refPath);
                const buf = await readFileChecked(resolved, 'Reference image');
                referenceImages.push({
                  data: buf.toString('base64'),
                  mimeType: getMimeType(resolved)
                });
              }
            }

            const result = await client.generateImage(model, input.prompt, {
              aspectRatio: input.aspect_ratio,
              resolution: input.resolution,
              systemPrompt: IMAGE_GENERATION_PROMPT,
              useSearchGrounding: input.use_search_grounding,
              referenceImages
            });

            if (result.images.length === 0) {
              return {
                content: [{ type: 'text', text: 'No image was generated. The model may have declined the request or encountered a safety filter. Try rephrasing your prompt.' }],
                isError: true
              };
            }

            const image = result.images[0];
            const savedTo = await saveImage(image.data, savePath);

            const content: any[] = [];

            // Add the image content block for inline display
            content.push({
              type: 'image',
              data: image.data,
              mimeType: image.mimeType
            });

            // Add text with save path, thinking output, and model text
            let textParts = [`Image saved to: ${savedTo}`];
            if (result.thinking) {
              textParts.push(`\n\n**Thinking:**\n${result.thinking}`);
            }
            if (result.text) {
              textParts.push(`\nModel notes: ${result.text}`);
            }
            textParts.push(modelFooter(result.modelVersion, model));
            content.push({ type: 'text', text: textParts.join('') });

            return { content };
          }

          case 'edit_image': {
            const schema = z.object({
              prompt: z.string().min(1),
              image_path: z.string().min(1),
              model: z.string().optional(),
              aspect_ratio: z.enum(ALL_ASPECT_RATIOS).optional(),
              resolution: z.enum(ALL_RESOLUTIONS).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);
            const model = resolveModel(input.model, true);

            assertImageOptions(model, {
              aspectRatio: input.aspect_ratio,
              resolution: input.resolution,
              allowUnlisted: config.allowUnlistedModels
            });

            // Resolve the destination before spending an edit on it.
            const savePath = input.save_path
              ? resolveSavePath(input.save_path)
              : getAutoSavePath(config.outputDir, 'edited');

            // Read the source image
            const imagePath = path.resolve(input.image_path);
            const imageBuffer = await readFileChecked(imagePath, 'Source image');
            const imageBase64 = imageBuffer.toString('base64');
            const mimeType = getMimeType(imagePath);

            const result = await client.editImage(model, input.prompt, imageBase64, mimeType, {
              aspectRatio: input.aspect_ratio,
              resolution: input.resolution,
              systemPrompt: IMAGE_GENERATION_PROMPT
            });

            if (result.images.length === 0) {
              return {
                content: [{ type: 'text', text: 'No edited image was generated. The model may have declined the request or encountered a safety filter. Try rephrasing your prompt.' }],
                isError: true
              };
            }

            const image = result.images[0];
            const savedTo = await saveImage(image.data, savePath);

            const content: any[] = [];

            content.push({
              type: 'image',
              data: image.data,
              mimeType: image.mimeType
            });

            let textParts = [`Edited image saved to: ${savedTo}`];
            if (result.text) {
              textParts.push(`\nModel notes: ${result.text}`);
            }
            textParts.push(modelFooter(result.modelVersion, model));
            content.push({ type: 'text', text: textParts.join('') });

            return { content };
          }

          case 'search_web': {
            const schema = z.object({
              query: z.string().min(1),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = resolveModel(input.model);

            const result = await client.searchWeb(model, input.query, {
              systemPrompt: SEARCH_WEB_PROMPT
            });

            let responseText = result.text;
            if (result.citations.length > 0) {
              responseText += '\n\n---\n**Sources:**\n';
              for (const citation of result.citations) {
                responseText += `- [${citation.title}](${citation.uri})\n`;
              }
            }
            if (result.searchQueries.length > 0) {
              responseText += `\n**Search queries:** ${result.searchQueries.join(', ')}`;
            }
            responseText += modelFooter(result.modelVersion, model);

            return { content: [{ type: 'text', text: responseText }] };
          }

          case 'search_with_thinking': {
            const schema = z.object({
              prompt: z.string().min(1),
              model: z.string().optional(),
              thinking_level: z.enum(['minimal', 'low', 'medium', 'high']).optional(),
              thinking_budget: z.number().optional()
            });
            const input = schema.parse(args);
            const model = resolveModel(input.model);

            const result = await client.generateWithThinking(model, input.prompt, {
              thinkingLevel: input.thinking_level,
              thinkingBudget: input.thinking_budget
            });

            let responseText = '';
            if (result.thinking) {
              responseText += `<thinking>\n${result.thinking}\n</thinking>\n\n`;
            }
            responseText += result.text;
            if (result.thinkingTokens) {
              responseText += `\n\n---\n*Thinking tokens used: ${result.thinkingTokens}*`;
            }
            responseText += modelFooter(result.modelVersion, model);

            return { content: [{ type: 'text', text: responseText }] };
          }

          case 'run_code': {
            const schema = z.object({
              prompt: z.string().min(1),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = resolveModel(input.model);

            const result = await client.executeCode(model, input.prompt, CODE_EXECUTION_PROMPT);

            let responseText = result.text;
            if (result.code) {
              responseText += '\n\n```python\n' + result.code + '\n```';
            }
            if (result.output) {
              responseText += '\n\n**Output:**\n```\n' + result.output + '\n```';
            }
            responseText += modelFooter(result.modelVersion, model);

            return { content: [{ type: 'text', text: responseText }] };
          }

          case 'fetch_url': {
            const schema = z.object({
              prompt: z.string().min(1),
              urls: z.array(z.string()).min(1).max(20),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = resolveModel(input.model);

            const result = await client.fetchUrl(model, input.prompt, input.urls, URL_CONTEXT_PROMPT);

            let responseText = result.text;
            if (result.urlMetadata.length > 0) {
              responseText += '\n\n---\n**URL Retrieval Status:**\n';
              for (const meta of result.urlMetadata) {
                const statusIcon = meta.status === 'URL_RETRIEVAL_STATUS_SUCCESS' ? 'OK' : meta.status;
                responseText += `- ${meta.url}: ${statusIcon}\n`;
              }
            }
            responseText += modelFooter(result.modelVersion, model);

            return { content: [{ type: 'text', text: responseText }] };
          }

          case 'analyze_image': {
            const schema = z.object({
              image_path: z.string().min(1),
              prompt: z.string().optional(),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = resolveModel(input.model);
            const prompt = input.prompt || 'Describe this image in detail';

            const imagePath = path.resolve(input.image_path);
            const imageBuffer = await readFileChecked(imagePath, 'Image');
            const imageBase64 = imageBuffer.toString('base64');
            const mimeType = getMimeType(imagePath);

            const response = await client.analyzeImage(model, prompt, imageBase64, mimeType);

            return { content: [{ type: 'text', text: response.text + modelFooter(response.modelVersion, model) }] };
          }

          case 'upload_file': {
            const schema = z.object({
              file_path: z.string().min(1),
              query: z.string().optional(),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = resolveModel(input.model);

            const filePath = path.resolve(input.file_path);
            // Size-check locally so an oversized file fails with an actionable
            // message instead of an opaque remote rejection after the upload.
            const stat = await fs.stat(filePath).catch(() => null);
            if (!stat || !stat.isFile()) {
              return {
                content: [{ type: 'text', text: `File not found: ${filePath}` }],
                isError: true
              };
            }
            if (stat.size > config.maxFileBytes) {
              return {
                content: [{
                  type: 'text',
                  text: `File is ${formatBytes(stat.size)}, over the ${formatBytes(config.maxFileBytes)} upload limit: ${filePath}`
                }],
                isError: true
              };
            }

            const result = await client.uploadAndQuery(model, filePath, input.query);

            let responseText = result.text;
            responseText += `\n\n---\n*File: ${path.basename(filePath)} (uploaded as ${result.fileName}, since deleted)*`;
            responseText += modelFooter(result.modelVersion, model);

            return { content: [{ type: 'text', text: responseText }] };
          }

          case 'google_maps': {
            const schema = z.object({
              query: z.string().min(1),
              latitude: z.number().min(-90).max(90).optional(),
              longitude: z.number().min(-180).max(180).optional(),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = resolveModel(input.model);

            const result = await client.searchMaps(model, input.query, {
              systemPrompt: GOOGLE_MAPS_PROMPT,
              latitude: input.latitude,
              longitude: input.longitude
            });

            let responseText = result.text;
            if (result.places.length > 0) {
              responseText += '\n\n---\n**Places:**\n';
              for (const place of result.places) {
                responseText += `- **${place.title}**`;
                if (place.uri) responseText += ` ([View](${place.uri}))`;
                if (place.text) responseText += `\n  ${place.text}`;
                responseText += '\n';
              }
            }
            responseText += modelFooter(result.modelVersion, model);

            return { content: [{ type: 'text', text: responseText }] };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: error.message || 'An error occurred' }],
          isError: true
        };
      }
    });

    // Start server with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Log startup message to stderr (stdout is used for MCP protocol)
    console.error(`Gemini MCP Server v${VERSION} running`);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.error('Shutting down Gemini MCP Server...');
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('Shutting down Gemini MCP Server...');
      await server.close();
      process.exit(0);
    });
  } catch (error: any) {
    console.error('Failed to start Gemini MCP Server:', error.message);
    process.exit(1);
  }
}

main();
