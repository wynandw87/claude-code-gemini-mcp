#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { createGeminiClient } from './gemini-client.js';
import { BRAINSTORM_PROMPT, CODE_REVIEW_PROMPT, EXPLAIN_PROMPT } from './prompts.js';

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
        version: '1.0.0'
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
            name: 'ask_gemini',
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
            name: 'gemini_brainstorm',
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
            name: 'gemini_code_review',
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
            name: 'gemini_explain',
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
          }
        ]
      };
    });

    // Register tools/call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'ask_gemini': {
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

          case 'gemini_brainstorm': {
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

          case 'gemini_code_review': {
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

          case 'gemini_explain': {
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
    console.error('Gemini MCP Server running');

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
