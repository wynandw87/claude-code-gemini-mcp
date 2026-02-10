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
import { BRAINSTORM_PROMPT, CODE_REVIEW_PROMPT, EXPLAIN_PROMPT, IMAGE_GENERATION_PROMPT } from './prompts.js';

const DEFAULT_IMAGE_MODEL = 'gemini-2.0-flash-exp';

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
                  description: `Model to use (optional, defaults to "${DEFAULT_IMAGE_MODEL}"). Options: gemini-2.0-flash-exp, gemini-2.0-flash-preview-image-generation, imagen-4.0-generate-001, imagen-4.0-fast-generate-001`
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
    console.error('Gemini MCP Server v2.0.0 running (text + image generation)');

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
