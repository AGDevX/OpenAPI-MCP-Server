# AGDevX OpenAPI MCP Server

Turn any OpenAPI specification into MCP tools for AI assistants. Point it at your API's OpenAPI/Swagger spec, and your assistant can instantly interact with your API.

## Features

- **Dynamic Tool Generation** - Automatically creates MCP tools from OpenAPI 3.0/3.1 specifications
- **Multi-Environment Support** - Switch between dev, qa, and prod environments per-request
- **Live Spec Refresh** - Update tools without restarting
- **Rate Limiting** - Built-in protection with configurable request limits
- **Two Transport Methods** - stdio (easiest) or HTTP (Docker)
- **Easy Setup Wizard** - Web-based wizard for non-technical users

## Quick Start: Setup Wizard

The easiest way to configure this server is through the web-based setup wizard:

```bash
npx agdevx-openapi-mcp-server setup
```

This launches a browser-based wizard that:
1. Guides you through entering your API details
2. Tests your OpenAPI spec URLs to verify they work
3. Auto-detects which MCP clients you have installed
4. Automatically updates your config file (with backup) or shows you what to copy

**Features:**
- Visual multi-step wizard
- Real-time URL validation
- Support for multiple environments (dev, qa, prod)
- Auto-detects VS Code, Claude Desktop, and Claude Code
- Safe auto-update with backups or manual copy option

**Options:**
```bash
# Custom port
npx agdevx-openapi-mcp-server setup --port 3001

# Don't auto-open browser
npx agdevx-openapi-mcp-server setup --no-open
```

After configuring, restart your MCP client and the server will be available.

## Manual Configuration

Configure via environment variables. When using npx, set these in your MCP client config. When using Docker, set them in `.env` file.

### Required Settings

```bash
# Define your environments (comma-separated)
ENVIRONMENTS=prod

# OpenAPI spec URL for each environment
API_SPEC_URL_PROD=https://api.example.com/openapi/v1.json

# Optional: Base URL override (defaults to spec's servers[0].url)
API_BASE_URL_PROD=https://api.example.com
```

### Multiple Environments

```bash
ENVIRONMENTS=dev,qa,prod
DEFAULT_ENVIRONMENT=dev

API_SPEC_URL_DEV=https://dev-api.example.com/openapi/v1.json
API_SPEC_URL_QA=https://qa-api.example.com/openapi/v1.json
API_SPEC_URL_PROD=https://api.example.com/openapi/v1.json
```

### Optional Settings

| Variable                        | Default                     | Description                                                                      |
| ------------------------------- | --------------------------- | -------------------------------------------------------------------------------- |
| `MCP_SERVER_NAME`               | `agdevx-openapi-mcp-server` | Give a custom name to the server (e.g., account-api)                            |
| `MCP_VERBOSE`                   | `false`                     | Enable verbose logging                                                           |
| `PORT`                          | `3000`                      | Port for HTTP transport (Docker)                                                 |
| `API_TIMEOUT`                   | `30000`                     | API request timeout (ms)                                                         |
| `NODE_TLS_REJECT_UNAUTHORIZED`  | `1` (enabled)               | TLS certificate verification. Set to `0` to disable for self-signed certs (dev) |
| `RATE_LIMIT_ENABLED`            | `true`                      | Enable rate limiting                                                             |
| `RATE_LIMIT_REQUESTS`           | `10`                        | Max requests per window                                                          |
| `RATE_LIMIT_WINDOW_MS`          | `60000`                     | Rate limit window (ms)                                                           |

See `.env.example` for all available options.

## Docker Setup (Optional)

### Using Pre-Built Images

```bash
# Docker Hub
docker pull agdevx/agdevx-openapi-mcp-server:latest

# Run with docker-compose
docker-compose up -d
```

### Building Locally

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Verifying Docker Deployment

```bash
# Test the endpoint
curl http://localhost:3001/mcp

# Check logs for successful startup
docker-compose logs -f | grep "initialized successfully"
```

## Client Setup

### VS Code

Edit your VS Code MCP config file (`mcp.json`):

- **Windows:** `%APPDATA%\Code\User\mcp.json`
- **macOS/Linux:** `~/.config/Code/User/mcp.json`

```json
{
	"servers": {
		"my-api": {
			"type": "stdio",
			"command": "npx",
			"args": ["agdevx-openapi-mcp-server"],
			"env": {
				"ENVIRONMENTS": "prod",
				"API_SPEC_URL_PROD": "https://api.example.com/openapi/v1.json"
			}
		}
	}
}
```

Reload VS Code: `Ctrl+Shift+P` → "Developer: Reload Window"

### Claude Desktop

Edit your Claude Desktop config:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
	"mcpServers": {
		"my-api": {
			"command": "npx",
			"args": ["agdevx-openapi-mcp-server"],
			"env": {
				"ENVIRONMENTS": "prod",
				"API_SPEC_URL_PROD": "https://api.example.com/openapi/v1.json"
			}
		}
	}
}
```

Restart Claude Desktop.

### Claude Code

```bash
# Add the server
claude mcp add my-api --scope user -- npx agdevx-openapi-mcp-server

# Edit config to add environment variables
claude config edit
```

Add to config file:

```json
{
	"mcpServers": {
		"my-api": {
			"command": "npx",
			"args": ["agdevx-openapi-mcp-server"],
			"env": {
				"ENVIRONMENTS": "prod",
				"API_SPEC_URL_PROD": "https://api.example.com/openapi/v1.json"
			}
		}
	}
}
```

### Docker (HTTP Transport)

For any client, if using Docker instead of npx:

```json
{
	"mcpServers": {
		"my-api": {
			"url": "http://localhost:3001/mcp",
			"transport": "http"
		}
	}
}
```

### Testing

Ask Claude:

- "What tools are available from my API?"
- "Get all users from my API"
- "List all available environments"
- "Check server status"

## Features

### Multiple Environments

Every API tool includes an optional `environment` parameter. Switch between environments per-request:

```
# List environments
"List all available environments"

# Use specific environment
"Get account information from the dev environment"

# Compare across environments
"Get user 123 from dev, then from prod"

# See differences between environments
"What's the difference between the APIs running in dev and qa?"

# Change default environment
"Set the default environment to qa"
```

**Management tools:**

- `list_environments` - View all configured environments
- `get_current_environment` - Check current default
- `set_default_environment` - Change default
- `check_server_status` - Health check with environment reachability, rate limits, and tool counts

### Refresh Spec Without Restarting

Update your API spec on-the-fly when your API changes:

```
"Refresh the OpenAPI spec"
```

This:

- Fetches the latest spec
- Updates existing tools immediately
- Registers new operations
- No restart required

### Rate Limiting

Built-in protection with sliding window algorithm:

- Default: 10 requests per 60 seconds
- Configurable via environment variables
- Clear error messages with retry timing

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000
```

### Server Status & Health Check

Monitor server health and status with the `check_server_status` tool:

```
"Check server status"
```

This provides:

- **Environment Status**: Shows which environments are reachable with ✓/✗ indicators
- **Rate Limit Usage**: Current request count vs. limit with time until reset
- **Available Tools**: Total count of API operations and management tools
- **Last Spec Refresh**: Time since the OpenAPI spec was last fetched

Example output:
```
Environments: 2 (prod✓, dev✗ unreachable)
Rate Limit: 3/10 requests used (resets in 45s)
Tools Available: 15
Last Spec Refresh: 2 minutes ago
```

Use this to:
- Verify all environments are accessible
- Monitor rate limit usage before making bulk API calls
- Confirm spec refreshes are working
- Check total available tools after updates

## Troubleshooting

### Server Won't Start

**"Cannot start MCP server without valid OpenAPI specification"**

- Verify `API_SPEC_URL` is correct in `.env` or client config
- Test URL manually: `curl https://api.example.com/openapi/v1.json`
- Ensure API is running and accessible
- For self-signed certificates (dev/testing), set `NODE_TLS_REJECT_UNAUTHORIZED=0` in your environment variables

### Docker Issues

**Port already in use:**

```yaml
# Change in docker-compose.yml
ports:
  - '3002:3000' # Use different port
```

**Container won't start:**

```bash
# Check logs
docker-compose logs -f
```

**Can't connect from client:**

```bash
# Verify container is running
docker ps | grep agdevx-openapi-mcp-server

# Test endpoint
curl http://localhost:3001/mcp
```

### No Tools Appearing

- Verify OpenAPI spec is valid (OpenAPI 3.0+)
- Ensure endpoints have `operationId` in spec
- Check logs: `docker-compose logs -f | grep "initialized successfully"`
- Restart client application

### General Issues

**Restart the server:**

```bash
docker-compose restart
# or
docker-compose down && docker-compose up -d
```

**Enable verbose logging:**

```bash
MCP_VERBOSE=true
```

## Feature enhancements

- Whitelists and blacklists: Only allow specific endpoints to be called, or explicitly prevent specific endpoints to be called.
