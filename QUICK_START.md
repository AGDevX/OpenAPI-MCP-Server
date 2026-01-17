# Quick Start Guide

## Your MCP Server is Running! 🎉

The Weather Alerts MCP Server is now running in Docker.

### Server Details
- **Endpoint**: http://localhost:3001/mcp
- **Status**: Running in Docker container
- **Container Name**: weather-mcp-server

### Quick Commands

```bash
# View logs
docker-compose logs -f

# Restart server
docker-compose restart

# Stop server
docker-compose down

# Start server
docker-compose up -d

# Rebuild and restart (after code changes)
npm run build && docker-compose up -d --build
```

### Connect Claude Code

Add this to your Claude Code settings (`mcp_settings.json`):

```json
{
  "mcpServers": {
    "weather-alerts": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

**Settings location**:
- Windows: `%APPDATA%\Claude\mcp_settings.json`
- macOS: `~/Library/Application Support/Claude/mcp_settings.json`
- Linux: `~/.config/claude/mcp_settings.json`

After adding the configuration, restart Claude Code.

### Test the Connection

Ask Claude:
- "What are the weather alerts for Texas?"
- "Get me a 3-day forecast for Seattle"

### Documentation

- Full setup guide: `CLAUDE_CODE_SETUP.md`
- Docker details: `DOCKER_SETUP.md`

---

**Note**: Currently running on port **3001** (host) → 3000 (container) because port 3000 was already in use on your system.
