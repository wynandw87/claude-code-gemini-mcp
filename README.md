# Google Gemini MCP Server

A Model Context Protocol (MCP) server that provides access to Google Gemini AI models for Claude Code. This server enables general-purpose AI queries, creative brainstorming, code review, concept explanations, and image generation.

## Features

- **General Queries** (`ask`) - Flexible interface to query any supported Gemini model
- **Brainstorming** (`brainstorm`) - Creative ideation using Gemini 3 Pro
- **Code Review** (`code_review`) - Thorough code analysis using Gemini 2.5 Pro
- **Explanations** (`explain`) - Clear concept explanations using Gemini 3 Flash
- **Image Generation** (`generate_image`) - Text-to-image generation using Gemini or Imagen models
- **Image Editing** (`edit_image`) - Edit existing images with natural language instructions

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
- `GEMINI_OUTPUT_DIR` - Directory for auto-saved generated images (defaults to `./generated-images`)

### Verifying Installation

Check that the server is registered with Claude Code:

```bash
claude mcp list
```

You should see `gemini` in the list of installed servers.

## Supported Models

### Text Models
- **gemini-2.5-flash** - Default model, fast and cost-effective
- **gemini-2.5-pro** - High-quality reasoning and analysis
- **gemini-3-flash-preview** - Latest Flash model with cutting-edge capabilities
- **gemini-3-pro-preview** - Latest Pro model for maximum quality

### Image-Capable Models
- **gemini-2.5-flash-image** - Default image model, fast text+image generation and editing
- **gemini-3-pro-image-preview** - Pro-quality image generation for professional asset production

### Imagen Models
- **imagen-4.0-generate-001** - High-quality image generation
- **imagen-4.0-fast-generate-001** - Fast image generation

## Usage

### ask

Query any Gemini model with a custom prompt.

**Parameters:**
- `prompt` (string, required) - The question or instruction
- `model` (string, optional) - Model identifier (defaults to `gemini-2.5-flash`)

### brainstorm

Get creative ideas and brainstorming assistance.

**Parameters:**
- `topic` (string, required) - The subject to brainstorm about

### code_review

Get thorough code analysis and review.

**Parameters:**
- `code` (string, required) - The code to review

### explain

Get clear explanations of concepts or code.

**Parameters:**
- `concept` (string, required) - What to explain

### generate_image

Generate images from text prompts. Returns the image inline in Claude Code and saves to disk.

**Parameters:**
- `prompt` (string, required) - Image generation prompt
- `model` (string, optional) - Model to use (defaults to `gemini-2.5-flash-image`)
- `aspect_ratio` (string, optional) - `"1:1"`, `"16:9"`, `"9:16"`, `"4:3"`, `"3:4"`
- `resolution` (string, optional) - `"1K"`, `"2K"`, `"4K"` (Gemini models only)
- `save_path` (string, optional) - File path to save the image (auto-saves if not provided)

### edit_image

Edit an existing image using natural language instructions. Returns the edited image inline and saves to disk.

**Parameters:**
- `prompt` (string, required) - Edit instructions
- `image_path` (string, required) - Absolute path to the source image
- `model` (string, optional) - Model to use (defaults to `gemini-2.5-flash-image`)
- `aspect_ratio` (string, optional) - `"1:1"`, `"16:9"`, `"9:16"`, `"4:3"`, `"3:4"`
- `resolution` (string, optional) - `"1K"`, `"2K"`, `"4K"`
- `save_path` (string, optional) - File path to save the edited image (auto-saves if not provided)

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
- **Content Safety**: "Content blocked by Gemini's safety filters. Try rephrasing your request."
- **Timeout**: "Gemini API request timed out. Please try again."

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

**Image generation issues:**
- Image generation uses a 3x timeout multiplier to account for longer processing
- If images aren't displaying inline, ensure your MCP SDK version supports image content blocks
- Check the `GEMINI_OUTPUT_DIR` path is writable for auto-saved images

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
