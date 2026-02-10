# Google Gemini MCP Server

MCP server that brings Google Gemini to Claude Code — text generation, brainstorming, code review, explanations, web search, thinking/reasoning, code execution, URL fetching, image generation/editing/analysis, file upload, and Google Maps grounding. Supports Gemini 2.5/3 and Imagen 4.0 models.

## Features

### Text & Reasoning
- **General Queries** (`ask`) - Flexible interface to query any supported Gemini model
- **Brainstorming** (`brainstorm`) - Creative ideation using Gemini 3 Pro
- **Code Review** (`code_review`) - Thorough code analysis using Gemini 2.5 Pro
- **Explanations** (`explain`) - Clear concept explanations using Gemini 3 Flash
- **Thinking** (`search_with_thinking`) - Extended reasoning with visible thought process

### Search & Web
- **Web Search** (`search_web`) - Google Search grounding with citations and source URLs
- **URL Fetching** (`fetch_url`) - Fetch and analyze up to 20 web pages
- **Google Maps** (`google_maps`) - Location-aware queries with place data and links

### Code & Files
- **Code Execution** (`run_code`) - Server-side Python execution with NumPy, Pandas, Matplotlib, SciPy
- **File Upload** (`upload_file`) - Upload documents (PDF, CSV, code, etc.) for analysis

### Images
- **Image Generation** (`generate_image`) - Text-to-image using Gemini or Imagen models
- **Image Editing** (`edit_image`) - Edit existing images with natural language instructions
- **Image Analysis** (`analyze_image`) - Vision model to describe and analyze images

## Quick Start

### 1. Get Your API Key

Go to [Google AI Studio](https://makersuite.google.com/app/apikey) and create an API key.

### 2. Install

```bash
git clone https://github.com/wynandw87/claude-code-gemini-mcp.git
cd claude-code-gemini-mcp
npm install
npm run build
```

### 3. Register with Claude Code

```bash
claude mcp add -s user gemini -e GEMINI_API_KEY="your-api-key" -- node "/full/path/to/claude-code-gemini-mcp/dist/index.js"
```

### 4. Restart Claude Code

Verify with:
```bash
claude mcp list
```

## Usage

| Trigger | Tool | Example |
|---------|------|---------|
| `gemini search` | search_web | "gemini search: latest React 19 features" |
| `gemini think` | search_with_thinking | "gemini think: prove sqrt(2) is irrational" |
| `gemini run code` | run_code | "gemini calculate the first 50 prime numbers" |
| `gemini fetch` | fetch_url | "gemini fetch and summarize https://example.com" |
| `gemini analyze image` | analyze_image | "gemini analyze image at ./screenshot.png" |
| `gemini upload` | upload_file | "gemini upload ./report.pdf and summarize it" |
| `gemini maps` | google_maps | "gemini maps: best coffee shops in London" |
| `use gemini`, `ask gemini` | ask | "ask gemini about quantum computing" |
| `gemini review` | code_review | "gemini review this function for security" |
| `gemini brainstorm` | brainstorm | "gemini brainstorm ideas for authentication" |
| `gemini explain` | explain | "gemini explain how WebSockets work" |
| `gemini generate image` | generate_image | "gemini generate image of a sunset" |
| `gemini edit image` | edit_image | "gemini edit image: make the sky more blue" |

---

## Tool Reference

### search_web

Search the web using Google Search grounding. Returns answers with citations.

**Parameters:**
- `query` (string, required) - The search query or question
- `model` (string, optional) - Model identifier (defaults to `gemini-2.5-flash`)
- `excluded_domains` (string[], optional) - Domains to exclude from search (max 5)

### search_with_thinking

Query Gemini with extended thinking/reasoning. Shows the model's thought process.

**Parameters:**
- `prompt` (string, required) - The question or problem
- `model` (string, optional) - Model identifier (defaults to `gemini-2.5-flash`)
- `thinking_level` (string, optional) - `"minimal"`, `"low"`, `"medium"`, `"high"` (default: `"high"`)
- `thinking_budget` (number, optional) - Token budget for thinking (Gemini 2.5 models only, default: 8192)

### run_code

Execute Python code in Gemini's sandboxed environment.

**Parameters:**
- `prompt` (string, required) - Description of what to compute or analyze
- `model` (string, optional) - Model identifier (defaults to `gemini-2.5-flash`)

**Environment:** Python with NumPy, Pandas, Matplotlib, SciPy pre-installed.

### fetch_url

Fetch and analyze web page content.

**Parameters:**
- `prompt` (string, required) - Question or instruction about the URL content
- `urls` (string[], required) - URLs to fetch and analyze (max 20)
- `model` (string, optional) - Model identifier (defaults to `gemini-2.5-flash`)

### analyze_image

Analyze an image using Gemini's vision capabilities.

**Parameters:**
- `image_path` (string, required) - Absolute path to the image file
- `prompt` (string, optional) - Question about the image (default: "Describe this image in detail")
- `model` (string, optional) - Model identifier (defaults to `gemini-2.5-flash`)

### upload_file

Upload a document for Gemini to analyze. Supports PDF, txt, md, py, js, csv, json, and more.

**Parameters:**
- `file_path` (string, required) - Absolute path to the file to upload
- `query` (string, optional) - Question to ask about the file immediately after upload
- `model` (string, optional) - Model identifier (defaults to `gemini-2.5-flash`)

### google_maps

Location-aware queries using Google Maps grounding.

**Parameters:**
- `query` (string, required) - Location-related query
- `latitude` (number, optional) - Latitude for location context
- `longitude` (number, optional) - Longitude for location context
- `model` (string, optional) - Model identifier (defaults to `gemini-2.5-flash`)

### ask

Query any Gemini model with a custom prompt.

**Parameters:**
- `prompt` (string, required) - The question or instruction
- `model` (string, optional) - Model identifier (defaults to `gemini-2.5-flash`)

### brainstorm

Get creative ideas and brainstorming assistance using Gemini 3 Pro.

**Parameters:**
- `topic` (string, required) - The subject to brainstorm about

### code_review

Get thorough code analysis using Gemini 2.5 Pro.

**Parameters:**
- `code` (string, required) - The code to review

### explain

Get clear explanations using Gemini 3 Flash.

**Parameters:**
- `concept` (string, required) - What to explain

### generate_image

Generate images from text prompts. Returns the image inline and saves to disk.

**Parameters:**
- `prompt` (string, required) - Image generation prompt
- `model` (string, optional) - Defaults to `gemini-2.5-flash-image`. Options: `gemini-3-pro-image-preview`, `imagen-4.0-generate-001`, `imagen-4.0-fast-generate-001`
- `aspect_ratio` (string, optional) - `"1:1"`, `"16:9"`, `"9:16"`, `"4:3"`, `"3:4"`
- `resolution` (string, optional) - `"1K"`, `"2K"`, `"4K"` (Gemini models only)
- `save_path` (string, optional) - File path to save the image

### edit_image

Edit an existing image using natural language instructions.

**Parameters:**
- `prompt` (string, required) - Edit instructions
- `image_path` (string, required) - Absolute path to the source image
- `model` (string, optional) - Defaults to `gemini-2.5-flash-image`
- `aspect_ratio` (string, optional) - `"1:1"`, `"16:9"`, `"9:16"`, `"4:3"`, `"3:4"`
- `resolution` (string, optional) - `"1K"`, `"2K"`, `"4K"`
- `save_path` (string, optional) - File path to save the edited image

---

## Supported Models

### Text Models
| Model | Best For |
|-------|----------|
| `gemini-2.5-flash` | Default — fast and cost-effective |
| `gemini-2.5-pro` | High-quality reasoning and analysis |
| `gemini-3-flash-preview` | Latest Flash with cutting-edge capabilities |
| `gemini-3-pro-preview` | Maximum quality for complex tasks |

### Image Models
| Model | Best For |
|-------|----------|
| `gemini-2.5-flash-image` | Default — fast text+image generation and editing |
| `gemini-3-pro-image-preview` | Pro-quality image generation |
| `imagen-4.0-generate-001` | High-quality image generation |
| `imagen-4.0-fast-generate-001` | Fast image generation |

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | — | Google AI API key |
| `GEMINI_DEFAULT_MODEL` | No | `gemini-2.5-flash` | Default model for text tools |
| `GEMINI_TIMEOUT` | No | `60000` | API timeout in ms |
| `GEMINI_OUTPUT_DIR` | No | `./generated-images` | Directory for auto-saved images |

---

## How It Works

This MCP server uses the official `@google/genai` SDK to communicate with Google Gemini models. It connects to Claude Code via stdio transport.

**Tools provided:**
| Tool | API Feature | Default Model |
|------|-------------|---------------|
| `ask` | generateContent | Configurable (`gemini-2.5-flash`) |
| `brainstorm` | generateContent | `gemini-3-pro-preview` |
| `code_review` | generateContent | `gemini-2.5-pro` |
| `explain` | generateContent | `gemini-3-flash-preview` |
| `search_web` | Google Search grounding | Configurable (`gemini-2.5-flash`) |
| `search_with_thinking` | thinkingConfig | Configurable (`gemini-2.5-flash`) |
| `run_code` | codeExecution tool | Configurable (`gemini-2.5-flash`) |
| `fetch_url` | urlContext tool | Configurable (`gemini-2.5-flash`) |
| `analyze_image` | Vision (inlineData) | Configurable (`gemini-2.5-flash`) |
| `upload_file` | Files API + generateContent | Configurable (`gemini-2.5-flash`) |
| `google_maps` | Google Maps grounding | Configurable (`gemini-2.5-flash`) |
| `generate_image` | Image generation | `gemini-2.5-flash-image` |
| `edit_image` | Image editing | `gemini-2.5-flash-image` |

---

## Development

```bash
npm run dev      # Development mode with hot-reloading
npm run build    # Build for production
npm start        # Start production server
```

## Troubleshooting

**Server won't start:**
- Verify `GEMINI_API_KEY` is set
- Check that the server was built (`npm run build`)
- Ensure Node.js 18+

**Tool not appearing:**
- Verify the path in config is correct and absolute
- Restart Claude Code after changes
- Run `claude mcp list` to check status

**Timeout errors:**
- Thinking and search tools use extended timeouts (3-5x base)
- Increase `GEMINI_TIMEOUT` for slow connections

## Contributing

Pull requests welcome! Please keep it simple and beginner-friendly.

## License

MIT

---

Made for the Claude Code community
