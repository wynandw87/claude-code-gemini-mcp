#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config.js';
import { createGeminiClient } from './gemini-client.js';
import {
  BRAINSTORM_PROMPT, CODE_REVIEW_PROMPT, EXPLAIN_PROMPT, IMAGE_GENERATION_PROMPT,
  SEARCH_WEB_PROMPT, CODE_EXECUTION_PROMPT, URL_CONTEXT_PROMPT, GOOGLE_MAPS_PROMPT
} from './prompts.js';

const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';

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
        version: '2.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Register tools/list handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
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
                  description: 'Model identifier (optional, defaults to gemini-2.5-flash)'
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'brainstorm',
            description: 'Creative ideation and brainstorming assistant using Gemini 3 Pro for cutting-edge reasoning',
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
            description: 'Thorough code analysis and review using Gemini 2.5 Pro for high-quality analysis',
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
            description: 'Clear explanations of concepts, code, or technical topics using Gemini 3 Flash for fast, modern explanations',
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
            description: 'Generate images using Gemini or Imagen models. Returns the image inline and optionally saves to disk.',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Image generation prompt describing what to create'
                },
                model: {
                  type: 'string',
                  description: `Model to use (optional, defaults to "${DEFAULT_IMAGE_MODEL}"). Options: gemini-2.5-flash-image, gemini-3-pro-image-preview, imagen-4.0-generate-001, imagen-4.0-fast-generate-001`
                },
                aspect_ratio: {
                  type: 'string',
                  description: 'Aspect ratio: "1:1", "16:9", "9:16", "4:3", "3:4"',
                  enum: ['1:1', '16:9', '9:16', '4:3', '3:4']
                },
                resolution: {
                  type: 'string',
                  description: 'Image resolution: "1K", "2K", "4K" (Gemini models only)',
                  enum: ['1K', '2K', '4K']
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
                  description: 'Aspect ratio for output: "1:1", "16:9", "9:16", "4:3", "3:4"',
                  enum: ['1:1', '16:9', '9:16', '4:3', '3:4']
                },
                resolution: {
                  type: 'string',
                  description: 'Image resolution: "1K", "2K", "4K"',
                  enum: ['1K', '2K', '4K']
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
                  description: 'Model identifier (optional, defaults to gemini-2.5-flash)'
                },
                excluded_domains: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Exclude these domains from search (max 5)',
                  maxItems: 5
                }
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
                  description: 'Model identifier (optional, defaults to gemini-2.5-flash). All Gemini 2.5 and 3 models support thinking.'
                },
                thinking_level: {
                  type: 'string',
                  description: 'Thinking intensity: "minimal", "low", "medium", "high" (default: "high")',
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
                  description: 'Model identifier (optional, defaults to gemini-2.5-flash)'
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
                  description: 'URLs to fetch and analyze (max 20)',
                  maxItems: 20
                },
                model: {
                  type: 'string',
                  description: 'Model identifier (optional, defaults to gemini-2.5-flash)'
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
                  description: 'Model identifier (optional, defaults to gemini-2.5-flash)'
                }
              },
              required: ['image_path']
            }
          },
          {
            name: 'upload_file',
            description: 'Upload a document for Gemini to analyze. Supports: txt, md, py, js, csv, json, pdf, and more (max 48MB). Optionally ask a question about it immediately.',
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
                  description: 'Model identifier (optional, defaults to gemini-2.5-flash)'
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
                  description: 'Optional latitude for location context'
                },
                longitude: {
                  type: 'number',
                  description: 'Optional longitude for location context'
                },
                model: {
                  type: 'string',
                  description: 'Model identifier (optional, defaults to gemini-2.5-flash)'
                }
              },
              required: ['query']
            }
          }
        ]
      };
    });

    // Helper: save image to disk
    function saveImage(base64Data: string, savePath: string): string {
      const dir = path.dirname(savePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(savePath, buffer);
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
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'ask': {
            const schema = z.object({
              prompt: z.string().min(1),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = input.model || config.defaultModel;
            const response = await client.generate(model, input.prompt);
            return {
              content: [{ type: 'text', text: response }]
            };
          }

          case 'brainstorm': {
            const schema = z.object({
              topic: z.string().min(1)
            });
            const input = schema.parse(args);
            const prompt = `Brainstorm ideas about: ${input.topic}`;
            const response = await client.generate('gemini-3-pro-preview', prompt, BRAINSTORM_PROMPT);
            return {
              content: [{ type: 'text', text: response }]
            };
          }

          case 'code_review': {
            const schema = z.object({
              code: z.string().min(1)
            });
            const input = schema.parse(args);
            const prompt = `Review this code:\n\n${input.code}`;
            const response = await client.generate('gemini-2.5-pro', prompt, CODE_REVIEW_PROMPT);
            return {
              content: [{ type: 'text', text: response }]
            };
          }

          case 'explain': {
            const schema = z.object({
              concept: z.string().min(1)
            });
            const input = schema.parse(args);
            const prompt = `Explain: ${input.concept}`;
            const response = await client.generate('gemini-3-flash-preview', prompt, EXPLAIN_PROMPT);
            return {
              content: [{ type: 'text', text: response }]
            };
          }

          case 'generate_image': {
            const schema = z.object({
              prompt: z.string().min(1),
              model: z.string().optional(),
              aspect_ratio: z.string().optional(),
              resolution: z.string().optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);
            const model = input.model || DEFAULT_IMAGE_MODEL;

            const result = await client.generateImage(model, input.prompt, {
              aspectRatio: input.aspect_ratio,
              resolution: input.resolution,
              systemPrompt: IMAGE_GENERATION_PROMPT
            });

            if (result.images.length === 0) {
              return {
                content: [{ type: 'text', text: 'No image was generated. The model may have declined the request or encountered a safety filter. Try rephrasing your prompt.' }],
                isError: true
              };
            }

            const image = result.images[0];
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'generated');
            const savedTo = saveImage(image.data, savePath);

            const content: any[] = [];

            // Add the image content block for inline display
            content.push({
              type: 'image',
              data: image.data,
              mimeType: image.mimeType
            });

            // Add text with save path and any model text
            let textParts = [`Image saved to: ${savedTo}`];
            if (result.text) {
              textParts.push(`\nModel notes: ${result.text}`);
            }
            content.push({ type: 'text', text: textParts.join('') });

            return { content };
          }

          case 'edit_image': {
            const schema = z.object({
              prompt: z.string().min(1),
              image_path: z.string().min(1),
              model: z.string().optional(),
              aspect_ratio: z.string().optional(),
              resolution: z.string().optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);
            const model = input.model || DEFAULT_IMAGE_MODEL;

            // Read the source image
            const imagePath = path.resolve(input.image_path);
            if (!fs.existsSync(imagePath)) {
              return {
                content: [{ type: 'text', text: `Source image not found: ${imagePath}` }],
                isError: true
              };
            }

            const imageBuffer = fs.readFileSync(imagePath);
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
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'edited');
            const savedTo = saveImage(image.data, savePath);

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
            content.push({ type: 'text', text: textParts.join('') });

            return { content };
          }

          case 'search_web': {
            const schema = z.object({
              query: z.string().min(1),
              model: z.string().optional(),
              excluded_domains: z.array(z.string()).max(5).optional()
            });
            const input = schema.parse(args);
            const model = input.model || config.defaultModel;

            const result = await client.searchWeb(model, input.query, {
              systemPrompt: SEARCH_WEB_PROMPT,
              excludeDomains: input.excluded_domains
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
            const model = input.model || config.defaultModel;

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

            return { content: [{ type: 'text', text: responseText }] };
          }

          case 'run_code': {
            const schema = z.object({
              prompt: z.string().min(1),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = input.model || config.defaultModel;

            const result = await client.executeCode(model, input.prompt, CODE_EXECUTION_PROMPT);

            let responseText = result.text;
            if (result.code) {
              responseText += '\n\n```python\n' + result.code + '\n```';
            }
            if (result.output) {
              responseText += '\n\n**Output:**\n```\n' + result.output + '\n```';
            }

            return { content: [{ type: 'text', text: responseText }] };
          }

          case 'fetch_url': {
            const schema = z.object({
              prompt: z.string().min(1),
              urls: z.array(z.string()).min(1).max(20),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = input.model || config.defaultModel;

            const result = await client.fetchUrl(model, input.prompt, input.urls, URL_CONTEXT_PROMPT);

            let responseText = result.text;
            if (result.urlMetadata.length > 0) {
              responseText += '\n\n---\n**URL Retrieval Status:**\n';
              for (const meta of result.urlMetadata) {
                const statusIcon = meta.status === 'URL_RETRIEVAL_STATUS_SUCCESS' ? 'OK' : meta.status;
                responseText += `- ${meta.url}: ${statusIcon}\n`;
              }
            }

            return { content: [{ type: 'text', text: responseText }] };
          }

          case 'analyze_image': {
            const schema = z.object({
              image_path: z.string().min(1),
              prompt: z.string().optional(),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = input.model || config.defaultModel;
            const prompt = input.prompt || 'Describe this image in detail';

            const imagePath = path.resolve(input.image_path);
            if (!fs.existsSync(imagePath)) {
              return {
                content: [{ type: 'text', text: `Image not found: ${imagePath}` }],
                isError: true
              };
            }

            const imageBuffer = fs.readFileSync(imagePath);
            const imageBase64 = imageBuffer.toString('base64');
            const mimeType = getMimeType(imagePath);

            const response = await client.analyzeImage(model, prompt, imageBase64, mimeType);

            return { content: [{ type: 'text', text: response }] };
          }

          case 'upload_file': {
            const schema = z.object({
              file_path: z.string().min(1),
              query: z.string().optional(),
              model: z.string().optional()
            });
            const input = schema.parse(args);
            const model = input.model || config.defaultModel;

            const filePath = path.resolve(input.file_path);
            if (!fs.existsSync(filePath)) {
              return {
                content: [{ type: 'text', text: `File not found: ${filePath}` }],
                isError: true
              };
            }

            const result = await client.uploadAndQuery(model, filePath, input.query);

            let responseText = result.text;
            responseText += `\n\n---\n*File: ${result.fileName}*`;

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
            const model = input.model || config.defaultModel;

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
    console.error('Gemini MCP Server v3.0.0 running');

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
