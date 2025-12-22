# Google Gemini MCP Server Design

**Date:** 2025-12-22
**Status:** Approved

## Overview

A Google Gemini MCP server for Claude Code that provides general-purpose AI assistance, specialized Gemini features, and side-by-side comparison capabilities. Built with TypeScript using the official Model Context Protocol SDK.

## Architecture

### Core Components

1. **MCP Server Instance** - Main server using `McpServer` from the SDK, configured with server metadata (name, version, description)

2. **Tool Registry** - Four registered tools with Zod-validated input schemas:
   - `ask_gemini` - General-purpose Gemini query tool
   - `gemini_brainstorm` - Specialized brainstorming assistant
   - `gemini_code_review` - Code analysis and review tool
   - `gemini_explain` - Concept explanation tool

3. **Gemini API Client** - Integration with Google's Generative AI SDK (`@google/generative-ai`)

4. **Configuration Manager** - Reads environment variables for API key and settings

### Technology Stack

- **TypeScript** - Type safety and developer experience
- **@modelcontextprotocol/sdk** - MCP protocol implementation
- **@google/generative-ai** - Gemini API access
- **Zod** - Runtime schema validation
- **Stdio transport** - Claude Code integration

## Tool Specifications

### Tool 1: `ask_gemini`

**Purpose:** Flexible, general-purpose interface to query any Gemini model

**Parameters:**
- `prompt` (string, required) - The question or instruction for Gemini
- `model` (string, optional) - Model identifier, defaults to `gemini-2.5-flash`

**Behavior:** Sends the prompt directly to the specified Gemini model and returns the response as plain text

**Use cases:** Ad-hoc queries, getting second opinions, alternative perspectives

### Tool 2: `gemini_brainstorm`

**Purpose:** Creative ideation and brainstorming assistant

**Parameters:**
- `topic` (string, required) - The subject to brainstorm about

**Model:** `gemini-3-pro-preview` (cutting-edge reasoning for creativity)

**System prompt:** Instructs Gemini to act as a creative brainstorming partner, generating diverse ideas, exploring possibilities, and thinking outside the box

**Use cases:** Feature ideas, problem-solving approaches, design alternatives

### Tool 3: `gemini_code_review`

**Purpose:** Thorough code analysis and review

**Parameters:**
- `code` (string, required) - The code to review

**Model:** `gemini-2.5-pro` (high-quality analysis)

**System prompt:** Instructs Gemini to act as an expert code reviewer, checking for bugs, security issues, performance problems, and best practices

**Use cases:** Code quality checks, security audits, identifying improvements

### Tool 4: `gemini_explain`

**Purpose:** Clear explanations of concepts, code, or technical topics

**Parameters:**
- `concept` (string, required) - What to explain

**Model:** `gemini-3-flash-preview` (fast, modern explanations)

**System prompt:** Instructs Gemini to provide clear, accurate explanations suitable for the context, breaking down complex topics into understandable parts

**Use cases:** Learning, understanding code, clarifying technical concepts

## Supported Models

- **gemini-2.5-flash** - Default model, fast and cost-effective
- **gemini-2.5-pro** - High-quality reasoning and analysis
- **gemini-3-flash-preview** - Latest Flash model with cutting-edge capabilities
- **gemini-3-pro-preview** - Latest Pro model for maximum quality

## Configuration

### Environment Variables

**Required:**
- `GEMINI_API_KEY` - Your Google AI API key (get from Google AI Studio)

**Optional:**
- `GEMINI_DEFAULT_MODEL` - Override the default model (defaults to `gemini-2.5-flash`)
- `GEMINI_TIMEOUT` - API timeout in milliseconds (defaults to 60000)

### Claude Code Integration

Add to Claude Code configuration file (`~/.claude/config.json` or workspace settings):

```json
{
  "mcpServers": {
    "gemini": {
      "command": "node",
      "args": ["/path/to/gemini-mcp-server/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

If `GEMINI_API_KEY` is already in the user's environment, the `env` section can be omitted.

### Installation Process

1. Clone/download the repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to compile TypeScript to JavaScript
4. Add server configuration to Claude Code settings
5. Restart Claude Code to load the server

## Error Handling

Simple, clear error messages returned as text content. No automatic retries or fallbacks.

### Error Scenarios

1. **Missing API Key**
   - Response: "Gemini API key not configured. Please set the GEMINI_API_KEY environment variable."

2. **Invalid API Key**
   - Response: "Invalid Gemini API key. Please check your GEMINI_API_KEY environment variable."

3. **Rate Limit Exceeded**
   - Response: "Gemini API rate limit exceeded. Please wait a moment and try again."

4. **Network Errors**
   - Response: "Failed to connect to Gemini API: [error details]"

5. **Invalid Model**
   - Response: "Unknown model '[model-name]'. Available models: gemini-2.5-flash, gemini-2.5-pro, gemini-3-flash-preview, gemini-3-pro-preview"

6. **Content Safety Blocks**
   - Response: "Content blocked by Gemini's safety filters. Try rephrasing your request."

7. **Empty/Invalid Input**
   - Response: Zod validation error messages (clear, specific)

## Implementation Structure

### File Organization

```
gemini-mcp-server/
├── src/
│   ├── index.ts              # Main entry point, server setup
│   ├── config.ts             # Environment variable loading
│   ├── gemini-client.ts      # Gemini API wrapper
│   ├── tools/
│   │   ├── ask-gemini.ts     # General query tool
│   │   ├── brainstorm.ts     # Brainstorming tool
│   │   ├── code-review.ts    # Code review tool
│   │   └── explain.ts        # Explanation tool
│   └── prompts.ts            # System prompts for specialized tools
├── package.json
├── tsconfig.json
└── README.md
```

### Key Implementation Details

**`index.ts`** - Creates McpServer instance, registers all tools, connects stdio transport

**`gemini-client.ts`** - Wraps Google's Generative AI SDK:
- Initialize with API key from environment
- Provide a simple `generate(model, prompt, systemPrompt?)` method
- Handle all API errors and convert to user-friendly messages

**Tool files** - Each tool file exports a function that registers the tool:
- Define Zod input schema
- Implement tool handler function
- Call Gemini client with appropriate parameters
- Return plain text response

**`prompts.ts`** - Exports hardcoded system prompts for specialized tools

### Build Process

- TypeScript compiles to `dist/` directory
- Entry point is `dist/index.js`
- No bundling needed - Node.js handles the module structure

## Design Decisions

### Why TypeScript?
Type safety, better developer experience, aligns with official MCP SDK examples

### Why Stdio transport?
Standard for local MCP servers, simple setup in Claude Code config

### Why minimal parameters?
Keep tools simple and easy to use, sensible defaults handle advanced options

### Why tool-specific model defaults?
Optimize each tool for its purpose (speed vs. quality vs. cutting-edge)

### Why plain text responses?
Clean and focused on content, no metadata clutter

### Why hardcoded prompts?
Ensure specialized tools work great out of the box with well-tested behavior

### Why environment variables?
Standard approach, secure, portable, works with Claude Code settings

### Why simple error messages?
Let Claude and the user decide how to handle errors, no hidden retry logic

## Future Enhancements

Potential features for future versions (not in initial scope):
- Multimodal analysis (images, video, audio)
- Streaming responses for long outputs
- Token usage tracking and reporting
- Conversation history management
- Custom system prompts via parameters
- Additional specialized tools (debug, refactor, test-generation)
