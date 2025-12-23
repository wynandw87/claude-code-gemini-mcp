# Skill Development Skill - Design Document

## Overview

A personal skill that provides full guidance for creating skills as plugins in Claude Code. Located at `~/.claude/skills/skill-development/`.

## Trigger Phrases

- "create a skill"
- "make a plugin"
- "write a SKILL.md"
- "skill development"
- "plugin structure"
- "distribute a skill"

## Directory Structure

```
~/.claude/skills/skill-development/
├── SKILL.md                          # Core guidance (~1500 words)
├── references/
│   ├── skill-md-format.md            # SKILL.md anatomy & frontmatter
│   ├── plugin-structure.md           # Plugin packaging & plugin.json
│   ├── progressive-disclosure.md     # Content organization patterns
│   └── distribution.md               # Testing & sharing skills
└── examples/
    ├── minimal-skill.md              # Simplest possible skill
    ├── standard-skill.md             # Skill with references
    └── plugin-manifest.json          # Example plugin.json
```

## SKILL.md Content (~1500 words total)

### Frontmatter

```yaml
---
name: skill-development
description: This skill should be used when the user asks to "create a skill",
  "make a plugin", "write a SKILL.md", "skill development", "plugin structure",
  or "distribute a skill".
version: 1.0.0
---
```

### Content Sections

1. **Overview** (~150 words)
   - What skills are (model-invoked knowledge modules)
   - Skills vs commands vs agents (quick comparison table)

2. **Quick Start Workflow** (~400 words)
   - Step 1: Decide location (personal vs project vs plugin)
   - Step 2: Create directory structure
   - Step 3: Write SKILL.md with frontmatter
   - Step 4: Add references/examples if needed
   - Step 5: Test with Claude Code

3. **Key Principles** (~300 words)
   - Strong triggers (exact phrases in description)
   - Progressive disclosure (lean core, detailed refs)
   - Third-person format for descriptions

4. **Skill Locations** (~200 words)
   - Personal: `~/.claude/skills/`
   - Project: `.claude/skills/`
   - Plugin: `plugin-name/skills/`

5. **Additional Resources** (~100 words)
   - Links to reference files for detailed formats
   - Links to examples

## Reference Files

### `references/skill-md-format.md` (~600 words)

- Complete frontmatter YAML specification
- Required fields (name, description, version)
- Writing effective trigger phrases
- Markdown body structure patterns
- Common mistakes to avoid

### `references/plugin-structure.md` (~700 words)

- Full plugin directory layout
- plugin.json manifest fields (name, version, author, repository, license, keywords)
- Auto-discovery rules for skills/commands/agents
- Using `${CLAUDE_PLUGIN_ROOT}` for portable paths
- Multi-component plugin patterns

### `references/progressive-disclosure.md` (~400 words)

- Why lean SKILL.md matters (context efficiency)
- What goes in core vs references vs examples
- File organization patterns
- Size guidelines (~1500 words core, unlimited refs)

### `references/distribution.md` (~500 words)

- Local testing with `--plugin-dir`
- Sharing via git repository
- API upload (`/v1/skills` endpoints)
- Zip upload for claude.ai
- Versioning strategies

## Example Files

### `examples/minimal-skill.md`

```markdown
---
name: example-minimal
description: This skill should be used when the user asks to "do X" or "help with Y".
version: 1.0.0
---

# Minimal Skill

Core instructions go here. Keep it focused and actionable.
```

### `examples/standard-skill.md`

- Full SKILL.md with all sections
- Demonstrates linking to references
- Shows proper trigger phrase patterns

### `examples/plugin-manifest.json`

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Brief plugin description",
  "author": { "name": "Your Name" },
  "repository": "https://github.com/user/plugin",
  "license": "MIT",
  "keywords": ["category", "domain"]
}
```

## Implementation Notes

- Skill is personal (lives in `~/.claude/skills/`)
- Uses progressive disclosure pattern
- Core SKILL.md kept lean for context efficiency
- Detailed content in references/ for deep dives
- Working examples in examples/ for quick starts
