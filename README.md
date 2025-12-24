# Google Gemini MCP Server

A Model Context Protocol (MCP) server that provides access to Google Gemini AI models for Claude Code. This server enables general-purpose AI queries, creative brainstorming, code review, and concept explanations.

## Features

- **General Queries** (`ask_gemini`) - Flexible interface to query any supported Gemini model
- **Brainstorming** (`gemini_brainstorm`) - Creative ideation using Gemini 3 Pro
- **Code Review** (`gemini_code_review`) - Thorough code analysis using Gemini 2.5 Pro
- **Explanations** (`gemini_explain`) - Clear concept explanations using Gemini 3 Flash

## Installation

### Option 1: Install from npm (Recommended)

Once published to npm, you can install globally:

```bash
npm install -g gemini-mcp-server
```

Then add to Claude Code:

```bash
# With API key
claude mcp add gemini -e GEMINI_API_KEY="your-api-key" -- gemini-mcp-server

# Or without API key (add it later to ~/.claude.json)
claude mcp add gemini -- gemini-mcp-server
```

### Option 2: Install from Source with Automated Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/wynandw87/claude-code-gemini-mcp.git
   cd claude-code-gemini-mcp
   ```

2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

3. Run the automated installer:
   ```bash
   npm run install:claude
   ```

This will automatically configure Claude Code to use the server.

### Option 3: Manual Installation from Source

1. Clone and build:
   ```bash
   git clone https://github.com/wynandw87/claude-code-gemini-mcp.git
   cd claude-code-gemini-mcp
   npm install
   npm run build
   ```

2. Add to Claude Code manually via CLI:
   ```bash
   # With API key
   claude mcp add gemini -e GEMINI_API_KEY="your-api-key" -- node "/absolute/path/to/claude-code-gemini-mcp/dist/index.js"

   # Or without API key (add it later to ~/.claude.json)
   claude mcp add gemini -- node "/absolute/path/to/claude-code-gemini-mcp/dist/index.js"
   ```

3. Or add manually to Claude Code config file (`~/.claude/config.json`):
   ```json
   {
     "mcpServers": {
       "gemini": {
         "command": "node",
         "args": ["/absolute/path/to/claude-code-gemini-mcp/dist/index.js"],
         "env": {
           "GEMINI_API_KEY": "your-api-key-here"
         }
       }
     }
   }
   ```

4. Restart Claude Code

## Configuration

### Environment Variables

**Required:**
- `GEMINI_API_KEY` - Your Google AI API key (get from [Google AI Studio](https://makersuite.google.com/app/apikey))

**Optional:**
- `GEMINI_DEFAULT_MODEL` - Override the default model (defaults to `gemini-2.5-flash`)
- `GEMINI_TIMEOUT` - API timeout in milliseconds (defaults to 60000)

### Verifying Installation

Check that the server is registered with Claude Code:

```bash
claude mcp list
```

You should see `gemini` in the list of installed servers.

## Supported Models

- **gemini-2.5-flash** - Default model, fast and cost-effective
- **gemini-2.5-pro** - High-quality reasoning and analysis
- **gemini-3-flash-preview** - Latest Flash model with cutting-edge capabilities
- **gemini-3-pro-preview** - Latest Pro model for maximum quality

## Usage

### ask_gemini

Query any Gemini model with a custom prompt.

**Parameters:**
- `prompt` (string, required) - The question or instruction
- `model` (string, optional) - Model identifier (defaults to `gemini-2.5-flash`)

**Example:**
```
Use the ask_gemini tool to query: "What are the benefits of TypeScript?"
```

### gemini_brainstorm

Get creative ideas and brainstorming assistance.

**Parameters:**
- `topic` (string, required) - The subject to brainstorm about

**Example:**
```
Use the gemini_brainstorm tool with topic: "innovative features for a note-taking app"
```

### gemini_code_review

Get thorough code analysis and review.

**Parameters:**
- `code` (string, required) - The code to review

**Example:**
```
Use the gemini_code_review tool to review:
function processData(data) {
  return data.map(x => x * 2);
}
```

### gemini_explain

Get clear explanations of concepts or code.

**Parameters:**
- `concept` (string, required) - What to explain

**Example:**
```
Use the gemini_explain tool to explain: "How does async/await work in JavaScript?"
```

## Development

Run in development mode with hot-reloading:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Error Handling

The server provides clear error messages for common issues:

- **Missing API Key**: "Gemini API key not configured. Please set the GEMINI_API_KEY environment variable."
- **Invalid API Key**: "Invalid Gemini API key. Please check your GEMINI_API_KEY environment variable."
- **Rate Limit**: "Gemini API rate limit exceeded. Please wait a moment and try again."
- **Network Errors**: "Failed to connect to Gemini API: [details]"
- **Invalid Model**: "Unknown model '[name]'. Available models: [list]"
- **Content Safety**: "Content blocked by Gemini's safety filters. Try rephrasing your request."

## Troubleshooting

**Server won't start:**
- Verify `GEMINI_API_KEY` is set in your environment
- Check that the server was built successfully (`npm run build`)
- Ensure you're using Node.js version 18 or later

**Tool not appearing in Claude Code:**
- Verify the path in `config.json` is correct and absolute
- Restart Claude Code after configuration changes
- Check Claude Code logs for connection errors

**API errors:**
- Verify your API key is valid at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Check your API usage limits and quotas
- Ensure you're using a supported model name

## Publishing to npm

To publish this package to npm (for maintainers):

1. **Ensure you're logged in to npm:**
   ```bash
   npm login
   ```

2. **Update the version in package.json** (follow semantic versioning):
   ```bash
   npm version patch  # or minor, or major
   ```

3. **Publish to npm:**
   ```bash
   npm publish
   ```

4. **Verify publication:**
   ```bash
   npm info gemini-mcp-server
   ```

After publishing, users can install with:
```bash
npm install -g gemini-mcp-server
claude mcp add gemini -e GEMINI_API_KEY="your-key" -- gemini-mcp-server
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
