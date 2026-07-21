# Google Gemini MCP Server

MCP server that brings Google Gemini to Claude Code — text generation, brainstorming, code review, explanations, web search, thinking/reasoning, code execution, URL fetching, image generation/editing/analysis, file upload, and Google Maps grounding. Supports Gemini 2.5/3 and Imagen 4.0 models.

## Quick Start

### Step 1: Get Your API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an account or sign in
3. Generate an API key
4. Copy the key (you'll need it in Step 3)

### Step 2: Install Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Claude Code CLI** - [Installation guide](https://docs.anthropic.com/claude-code)

### Step 3: Install the MCP Server

#### 3.1 Clone the repository

```text
git clone https://github.com/wynandw87/claude-code-gemini-mcp.git
cd claude-code-gemini-mcp
```

#### 3.2 Install dependencies

**macOS / Linux / Windows:**
```text
npm install
```

> **Note:** Dependencies are installed and the server is built automatically in one step.

#### 3.3 Register with Claude Code

Choose your install scope:

| Scope | Flag | Who can use it |
|-------|------|----------------|
| **User** (recommended) | `-s user` | You, in any project |
| **Project** | `-s project` | Anyone who clones this repo |
| **Local** | `-s local` | Only in current directory |

Replace `YOUR_API_KEY` with your actual Google AI API key, and use the full path to `dist/index.js`.

> **Tip:** To get the full path, run this from the cloned directory:
> - macOS/Linux: `echo "$(pwd)/dist/index.js"`
> - Windows: `echo %cd%\dist\index.js`

**macOS / Linux:**
```text
claude mcp add -s user gemini -e GEMINI_API_KEY=YOUR_API_KEY -- node /full/path/to/dist/index.js
```

**Windows (CMD):**
```text
claude mcp add -s user gemini -e "GEMINI_API_KEY=YOUR_API_KEY" -- node "C:\full\path\to\dist\index.js"
```

**Windows (PowerShell):**
```text
claude mcp add -s user gemini -e "GEMINI_API_KEY=YOUR_API_KEY" '--' node "C:\full\path\to\dist\index.js"
```

#### Alternative: Use Setup Scripts

The setup scripts handle dependency installation, building, and registration automatically.

**macOS / Linux:**
```text
chmod +x setup.sh
./setup.sh YOUR_API_KEY
```

**Windows (PowerShell):**
```text
.\setup.ps1 -ApiKey YOUR_API_KEY
```

**Or use the npm helper (if API key is set in environment):**
```text
export GEMINI_API_KEY=YOUR_API_KEY
npm run install:claude
```

### Step 4: Restart Claude Code

Close and reopen Claude Code for the changes to take effect.

### Step 5: Verify Installation

```text
claude mcp list
```

You should see `gemini` listed with a Connected status.

---

## Features

### Text & Reasoning
- **General Queries** (`ask`) - Flexible interface to query any supported Gemini model
- **Brainstorming** (`brainstorm`) - Creative ideation using Gemini 3.1 Pro
- **Code Review** (`code_review`) - Thorough code analysis using Gemini 3.1 Pro
- **Explanations** (`explain`) - Clear concept explanations using Gemini 3.1 Pro
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

---

## Usage

Once installed, use trigger phrases to invoke Gemini:

| Trigger | Tool | Example |
|---------|------|---------|
| `use gemini`, `ask gemini` | Ask | "ask gemini about quantum computing" |
| `gemini review`, `have gemini review` | Code Review | "gemini review this function for security" |
| `gemini brainstorm`, `gemini ideas` | Brainstorm | "gemini brainstorm ideas for authentication" |
| `gemini explain` | Explain | "gemini explain how WebSockets work" |
| `gemini search`, `gemini web search` | Web Search | "gemini search: latest React 19 features" |
| `gemini think` | Thinking | "gemini think: prove sqrt(2) is irrational" |
| `gemini run code`, `gemini calculate` | Run Code | "gemini calculate the first 50 prime numbers" |
| `gemini fetch` | Fetch URL | "gemini fetch and summarize https://example.com" |
| `gemini upload file` | Upload File | "gemini upload ./report.pdf and summarize it" |
| `gemini maps` | Google Maps | "gemini maps: best coffee shops in London" |
| `gemini generate image`, `gemini image` | Generate Image | "gemini generate image of a sunset" |
| `gemini edit image` | Edit Image | "gemini edit image: make the sky more blue" |
| `gemini analyze image`, `gemini vision` | Analyze Image | "gemini analyze image at ./screenshot.png" |

Or ask naturally:

- *"Ask Gemini what it thinks about this approach"*
- *"Have Gemini review this code for security issues"*
- *"Brainstorm with Gemini about scaling strategies"*
- *"Gemini search the web for the latest news on AI"*
- *"Gemini run code to calculate compound interest over 10 years"*
- *"Upload this CSV to Gemini and ask it to summarize the data"*
- *"Gemini generate an image of a futuristic city"*
- *"Gemini describe what's in this screenshot"*

---

## Tool Reference

### search_web

Search the web using Google Search grounding. Returns answers with citations.

**Parameters:**
- `query` (string, required) - The search query or question
- `model` (string, optional) - Model identifier (defaults to `gemini-3.1-pro-preview`, or whatever `GEMINI_DEFAULT_MODEL` is set to)

### search_with_thinking

Query Gemini with extended thinking/reasoning. Shows the model's thought process.

**Parameters:**
- `prompt` (string, required) - The question or problem
- `model` (string, optional) - Model identifier (defaults to `gemini-3.1-pro-preview`, or whatever `GEMINI_DEFAULT_MODEL` is set to)
- `thinking_level` (string, optional) - `"minimal"`, `"low"`, `"medium"`, `"high"` (default: `"high"`). Note: `"minimal"` is only valid on Gemini 3 Flash / 3.1 Flash-Lite; on 3.1 Pro it is silently bumped to `"low"`.
- `thinking_budget` (number, optional) - Token budget for thinking (Gemini 2.5 models only, default: 8192)

### run_code

Execute Python code in Gemini's sandboxed environment.

**Parameters:**
- `prompt` (string, required) - Description of what to compute or analyze
- `model` (string, optional) - Model identifier (defaults to `gemini-3.1-pro-preview`, or whatever `GEMINI_DEFAULT_MODEL` is set to)

**Environment:** Python with NumPy, Pandas, Matplotlib, SciPy pre-installed.

### fetch_url

Fetch and analyze web page content.

**Parameters:**
- `prompt` (string, required) - Question or instruction about the URL content
- `urls` (string[], required) - URLs to fetch and analyze (max 20)
- `model` (string, optional) - Model identifier (defaults to `gemini-3.1-pro-preview`, or whatever `GEMINI_DEFAULT_MODEL` is set to)

### analyze_image

Analyze an image using Gemini's vision capabilities.

**Parameters:**
- `image_path` (string, required) - Absolute path to the image file
- `prompt` (string, optional) - Question about the image (default: "Describe this image in detail")
- `model` (string, optional) - Model identifier (defaults to `gemini-3.1-pro-preview`, or whatever `GEMINI_DEFAULT_MODEL` is set to)

### upload_file

Upload a document for Gemini to analyze. Supports PDF, txt, md, py, js, csv, json, and more.

**Parameters:**
- `file_path` (string, required) - Absolute path to the file to upload
- `query` (string, optional) - Question to ask about the file immediately after upload
- `model` (string, optional) - Model identifier (defaults to `gemini-3.1-pro-preview`, or whatever `GEMINI_DEFAULT_MODEL` is set to)

### google_maps

Location-aware queries using Google Maps grounding.

**Parameters:**
- `query` (string, required) - Location-related query
- `latitude` (number, optional) - Latitude for location context
- `longitude` (number, optional) - Longitude for location context
- `model` (string, optional) - Model identifier (defaults to `gemini-3.1-pro-preview`, or whatever `GEMINI_DEFAULT_MODEL` is set to)

### ask

Query any Gemini model with a custom prompt.

**Parameters:**
- `prompt` (string, required) - The question or instruction
- `model` (string, optional) - Model identifier (defaults to `gemini-3.1-pro-preview`, or whatever `GEMINI_DEFAULT_MODEL` is set to)

### brainstorm

Get creative ideas and brainstorming assistance using Gemini 3.1 Pro.

**Parameters:**
- `topic` (string, required) - The subject to brainstorm about

### code_review

Get thorough code analysis using Gemini 3.1 Pro.

**Parameters:**
- `code` (string, required) - The code to review

### explain

Get clear explanations using Gemini 3.1 Pro.

**Parameters:**
- `concept` (string, required) - What to explain

### generate_image

Generate images from text prompts. Returns the image inline and saves to disk. The default is Nano Banana 2 (`gemini-3.1-flash-image`) for fast, high-quality 4K generation. Use Nano Banana Pro (`gemini-3-pro-image`) when you need maximum quality on complex multi-reference compositions or factually grounded imagery.

**Parameters:**
- `prompt` (string, required) - Image generation prompt
- `model` (string, optional) - Defaults to `gemini-3.1-flash-image` (Nano Banana 2). Options: `gemini-2.5-flash-image` (original Nano Banana), `gemini-3-pro-image` (Nano Banana Pro), `imagen-4.0-generate-001`, `imagen-4.0-fast-generate-001`
- `aspect_ratio` (string, optional) - `"1:1"`, `"2:3"`, `"3:2"`, `"3:4"`, `"4:3"`, `"4:5"`, `"5:4"`, `"9:16"`, `"16:9"`, `"21:9"`, plus narrow formats `"1:4"`, `"4:1"`, `"1:8"`, `"8:1"` (Nano Banana 2 only)
- `resolution` (string, optional) - `"1K"`, `"2K"`, `"4K"` (all Gemini image models); `"512"` (Nano Banana 2 only, fastest)
- `use_search_grounding` (boolean, optional) - Enable Google Search grounding for reference-accurate generation (Nano Banana Pro only)
- `reference_image_paths` (string[], optional) - Absolute paths to reference images for style/content guidance, up to 14 (Nano Banana 2 and Nano Banana Pro)
- `save_path` (string, optional) - Path to save the image, relative to `GEMINI_OUTPUT_DIR`. Paths that escape the output directory are rejected.

### edit_image

Edit an existing image using natural language instructions.

**Parameters:**
- `prompt` (string, required) - Edit instructions
- `image_path` (string, required) - Absolute path to the source image
- `model` (string, optional) - Defaults to `gemini-3.1-flash-image` (Nano Banana 2)
- `aspect_ratio` (string, optional) - Same options as `generate_image` (standard ratios + Nano Banana 2 narrow formats)
- `resolution` (string, optional) - `"1K"`, `"2K"`, `"4K"`; `"512"` on Nano Banana 2 only
- `save_path` (string, optional) - Path to save the edited image, relative to `GEMINI_OUTPUT_DIR`. Paths that escape the output directory are rejected.

---

## Supported Models

### Text Models
| Model | Best For |
|-------|----------|
| `gemini-2.5-flash` | Fast and cost-effective |
| `gemini-2.5-pro` | High-quality reasoning and analysis |
| `gemini-3-flash-preview` | Latest Flash with cutting-edge capabilities |
| `gemini-3.1-pro-preview` | **Default** — maximum quality for complex tasks (replaces `gemini-3-pro-preview`, deprecated but still served) |
| `gemini-3.1-flash-lite` | Cheapest, fastest text option (GA May 2026) |
| `gemini-3.5-flash` | Newest Flash generation — strong reasoning at Flash cost |
| `gemini-pro-latest` | Floating alias — currently `gemini-3.1-pro-preview` |
| `gemini-flash-latest` | Floating alias — currently `gemini-3.5-flash` |
| `gemini-flash-lite-latest` | Floating alias — currently `gemini-3.1-flash-lite` |

### Image Models
| Model | Best For |
|-------|----------|
| `gemini-2.5-flash-image` | Original Nano Banana — fast text+image generation and editing |
| `gemini-3.1-flash-image` | **Default** — Nano Banana 2, efficient successor to Nano Banana; native 4K, up to 14 reference images, narrow aspect ratios, optional thinking |
| `gemini-3-pro-image` | Nano Banana Pro — highest quality, full thinking, search grounding, up to 14 reference images, 4K output |
| `imagen-4.0-generate-001` | High-quality image generation |
| `imagen-4.0-fast-generate-001` | Fast image generation |
| `imagen-4.0-ultra-generate-001` | Highest-fidelity Imagen tier |

The `-preview` ids these GA aliases replaced (`gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview`) are still accepted, as is the `nano-banana-pro-preview` alias.

Options are validated against the resolved model: `512` resolution and the narrow aspect ratios are Nano Banana 2 only, reference images require a Gemini image model (not Imagen), and search grounding is Nano Banana Pro only. An unsupported combination fails locally with a specific message rather than being silently dropped.

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | — | Google AI API key |
| `GEMINI_DEFAULT_MODEL` | No | `gemini-3.1-pro-preview` | Default model for text tools (must be a text model) |
| `GEMINI_TIMEOUT` | No | `60000` | API timeout in ms |
| `GEMINI_OUTPUT_DIR` | No | `./generated-images` | Directory for saved images, and the boundary `save_path` is confined to |
| `GEMINI_ALLOW_UNLISTED_MODELS` | No | `false` | Set to `true` to pass model ids not in the tables above straight through to the API |
| `GEMINI_MAX_FILE_BYTES` | No | `50331648` (48MB) | Ceiling for files read for upload or image analysis |

Model ids are validated against the tables above, so a typo fails fast with the list of valid options instead of surfacing as an API error. When Google ships a model this server does not know about yet, set `GEMINI_ALLOW_UNLISTED_MODELS=true` to skip the check.

#### Where images are written

`GEMINI_OUTPUT_DIR` is both the destination for auto-named images and the security boundary for `save_path`: a `save_path` is resolved relative to it, and any path that escapes it (`../../etc`, or an absolute path elsewhere) is refused. Subdirectories are fine and created on demand — `save_path: "icons/logo.png"` writes to `<output dir>/icons/logo.png`.

The default `./generated-images` is **relative**, so it resolves against the server process's working directory — which for an MCP server is wherever the client launched it, not necessarily your project. Set an absolute path to pin it:

```text
claude mcp add -s user gemini \
  -e GEMINI_API_KEY=YOUR_API_KEY \
  -e GEMINI_OUTPUT_DIR=/Users/you/gemini-images \
  -- node /full/path/to/dist/index.js
```

---

## How It Works

This MCP server uses the official `@google/genai` SDK to communicate with Google Gemini models. It connects to Claude Code via stdio transport.

Every tool response includes a small footer reporting the exact model that handled the request (e.g. `*Model: gemini-3.1-pro-preview*`), making it easy to verify routing and overrides.

**Tools provided:**
| Tool | API Feature | Default Model |
|------|-------------|---------------|
| `ask` | generateContent | Configurable (`gemini-3.1-pro-preview`) |
| `brainstorm` | generateContent | `gemini-3.1-pro-preview` |
| `code_review` | generateContent | `gemini-3.1-pro-preview` |
| `explain` | generateContent | `gemini-3.1-pro-preview` |
| `search_web` | Google Search grounding | Configurable (`gemini-3.1-pro-preview`) |
| `search_with_thinking` | thinkingConfig | Configurable (`gemini-3.1-pro-preview`) |
| `run_code` | codeExecution tool | Configurable (`gemini-3.1-pro-preview`) |
| `fetch_url` | urlContext tool | Configurable (`gemini-3.1-pro-preview`) |
| `analyze_image` | Vision (inlineData) | Configurable (`gemini-3.1-pro-preview`) |
| `upload_file` | Files API + generateContent | Configurable (`gemini-3.1-pro-preview`) |
| `google_maps` | Google Maps grounding | Configurable (`gemini-3.1-pro-preview`) |
| `generate_image` | Image generation | `gemini-3.1-flash-image` |
| `edit_image` | Image editing | `gemini-3.1-flash-image` |

---

## Troubleshooting

### Fix API Key

If you entered the wrong API key, remove and reinstall:

```text
claude mcp remove gemini
```

Then reinstall using the command from Step 3.3 above (use the same scope you originally installed with).

### MCP Server Not Showing Up

Check if the server is installed:

```text
claude mcp list
```

If not listed, follow Step 3 to install it.

### Server Won't Start

1. **Verify your API key** is valid at [Google AI Studio](https://makersuite.google.com/app/apikey)

2. **Check Node.js version** (needs 18+):
   ```text
   node --version
   ```

3. **Ensure the server was built** — if `dist/index.js` is missing, run `npm install` again

### Connection Errors

1. **Check that `dist/index.js` exists** — if not, run `npm install`
2. **Verify the path is absolute** in your `claude mcp add` command
3. **Restart Claude Code** after any configuration changes

### Timeout Errors

- Thinking and search tools use extended timeouts (3-5x base)
- Increase `GEMINI_TIMEOUT` environment variable for slow connections

### View Current Configuration

```text
claude mcp list
```

---

## Contributing

Pull requests welcome! Please keep it simple and beginner-friendly.

## License

MIT

---

Made for the Claude Code community
