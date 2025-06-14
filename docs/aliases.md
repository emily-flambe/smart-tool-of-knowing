# Useful Shell Aliases

## Claude Code Aliases

### claude-log
Starts Claude Code with automatic logging instructions:

```bash
alias claude-log='claude "Read CLAUDE.md instructions and update conversation-log.md as we chat"'
```

**Usage:** `claude-log`

**What it does:**
- Starts Claude Code normally
- Automatically sends the logging instruction as the first message
- Ensures Claude reads project context from CLAUDE.md
- Maintains conversation history in conversation-log.md

**Setup:**
Add this alias to your `~/.bashrc` or `~/.zshrc` file, then reload your shell or run `source ~/.bashrc`/`source ~/.zshrc`.

This helps maintain conversation continuity across Claude Code sessions by ensuring logging instructions are followed consistently.