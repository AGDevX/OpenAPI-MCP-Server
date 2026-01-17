# Docker Setup Guide

## Prerequisites
- Docker Desktop installed and running
- Project built (`npm run build` already executed)

## Building and Running with Docker

### Option 1: Using Docker Compose (Recommended)

1. Build and start the container:
```bash
docker-compose up -d
```

2. View logs:
```bash
docker-compose logs -f
```

3. Stop the container:
```bash
docker-compose down
```

### Option 2: Using Docker CLI

1. Build the Docker image:
```bash
docker build -t weather-mcp-server .
```

2. Run the container:
```bash
docker run -d -p 3000:3000 --name weather-mcp-server weather-mcp-server
```

3. View logs:
```bash
docker logs -f weather-mcp-server
```

4. Stop the container:
```bash
docker stop weather-mcp-server
docker rm weather-mcp-server
```

## Verifying the Server

The MCP server should be accessible at:
- **Endpoint**: http://localhost:3000/mcp

Test if it's running:
```bash
curl http://localhost:3000/mcp
```

## Connecting Claude Code

Claude Code needs to be configured to connect to the HTTP MCP server. Add the following to your Claude Code settings:

### For Claude Desktop (claude_desktop_config.json):

```json
{
  "mcpServers": {
    "weather-alerts": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### For Claude Code CLI:

Add to your MCP settings file (`~/.config/claude/mcp_settings.json` or similar):

```json
{
  "mcpServers": {
    "weather-alerts": {
      "url": "http://localhost:3000/mcp",
      "transport": "http"
    }
  }
}
```

## Troubleshooting

1. **Port already in use**: Change the port mapping in docker-compose.yml:
   ```yaml
   ports:
     - "8080:3000"  # Use port 8080 on host instead
   ```

2. **Container won't start**: Check logs with `docker-compose logs` or `docker logs weather-mcp-server`

3. **Can't connect from Claude Code**: Ensure:
   - Docker container is running
   - Port 3000 is exposed and accessible
   - No firewall blocking the connection
   - Using `http://localhost:3000/mcp` as the endpoint
