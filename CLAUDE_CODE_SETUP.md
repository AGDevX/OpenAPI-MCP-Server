# Connecting Claude Code to Your Dockerized MCP Server

## Server is Running!

Your Weather Alerts MCP Server is now running in Docker at:
- **Host URL**: http://localhost:3001/mcp
- **Container Internal**: http://localhost:3000/mcp

## Connecting Claude Code

Claude Code supports HTTP MCP servers. Here's how to connect:

### Method 1: Using Claude Code Settings File

1. **Locate your Claude Code settings directory**:
   - Windows: `%APPDATA%\Claude\`
   - macOS: `~/Library/Application Support/Claude/`
   - Linux: `~/.config/claude/`

2. **Create or edit `mcp_settings.json`**:
   ```json
   {
     "mcpServers": {
       "weather-alerts": {
         "url": "http://localhost:3001/mcp"
       }
     }
   }
   ```

3. **Restart Claude Code** to pick up the new configuration.

### Method 2: Using Claude Desktop

If using Claude Desktop instead of Claude Code CLI:

1. **Locate your configuration file**:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. **Add the HTTP MCP server**:
   ```json
   {
     "mcpServers": {
       "weather-alerts": {
         "url": "http://localhost:3001/mcp"
       }
     }
   }
   ```

3. **Restart Claude Desktop**.

### Method 3: Command Line Flag (if supported)

Some versions of Claude Code may support command-line configuration:

```bash
claude --mcp-server weather-alerts=http://localhost:3001/mcp
```

## Testing the Connection

Once connected, you should be able to use the weather tools in Claude Code:

1. **Ask Claude**: "What are the weather alerts for California?"
2. **Ask Claude**: "Get me a 5-day forecast for New York"
3. **Ask Claude**: "Read the weather server information resource"

The available tools are:
- `get_weather_alerts` - Get weather alerts for a US state (use 2-letter state code)
- `get_forecast` - Get weather forecast for a city

## Troubleshooting

### Claude Code can't connect to the server

1. **Check if Docker container is running**:
   ```bash
   docker ps | grep weather-mcp-server
   ```

2. **Check container logs**:
   ```bash
   docker-compose logs -f weather-mcp-server
   ```

3. **Verify the endpoint is accessible**:
   ```bash
   curl http://localhost:3001/mcp
   ```
   You should get a JSON-RPC response (even if it's an error, it means the server is responding).

4. **Check firewall settings**: Ensure localhost connections on port 3001 are allowed.

### Server stopped unexpectedly

Restart the container:
```bash
docker-compose restart
```

Or stop and start fresh:
```bash
docker-compose down
docker-compose up -d
```

### Want to use a different port?

Edit `docker-compose.yml` and change the port mapping:
```yaml
ports:
  - "YOUR_PORT:3000"  # Change YOUR_PORT to desired port
```

Then update your Claude Code configuration to use the new port.

## Stopping the Server

When you're done:
```bash
docker-compose down
```

This stops and removes the container. Your Docker image will remain, so you can quickly start it again with `docker-compose up -d`.

## Additional Information

- **Server logs**: `docker-compose logs -f weather-mcp-server`
- **Server status**: `docker-compose ps`
- **Rebuild after code changes**: `npm run build && docker-compose up -d --build`
