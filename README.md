# AGDevX OpenAPI MCP Server

A Model Context Protocol (MCP) server that dynamically exposes API endpoints from any OpenAPI specification as tools for MCP clients. This allows MCP clients to interact with your .NET Core API (or any OpenAPI-compliant API) by automatically generating tool definitions from your swagger/OpenAPI spec.

MCP clients will automatically:

- Understand which tools to use based on descriptions
- Provide required parameters
- Handle responses and errors
- Format results for you

## Features

- **Dynamic Tool Generation**: Automatically creates MCP tools from OpenAPI specifications
- **Full OpenAPI Support**: Works with OpenAPI 3.0 and 3.1 specifications
- **Parameter Mapping**: Converts OpenAPI parameters (path, query, header, body) to MCP tool inputs
- **Type Safety**: Uses Zod schemas for runtime validation based on OpenAPI types
- **Multi-Environment Support**: Configure multiple API environments (dev, qa, prod) and switch between them per-request
- **Live Spec Refresh**: Update tools without restarting - existing tools automatically use the latest spec, new operations are registered on-the-fly
- **Rate Limiting**: Built-in protection for production APIs with configurable request limits
- **Docker Support**: Easy deployment with Docker and Docker Compose
- **Flexible Configuration**: Environment variables for all settings
- **Error Handling**: Comprehensive error handling and logging

## How It Works

1. **Startup**: The MCP server fetches your OpenAPI specification from the configured URL
2. **Tool Generation**: Each API endpoint becomes an MCP tool with:
   - Tool name derived from the operationId (or auto-generated)
   - Description from the operation summary
   - Input schema converted from OpenAPI parameters and request body
3. **MCP clients can call these tools**: When a tool is called, the server:
   - Validates the input parameters
   - Constructs and executes the HTTP request to your API
   - Returns the response
4. **Responses are formatted** and returned for analysis

## Prerequisites

- Docker Desktop installed and running
- Your MCP Client of choice installed

## Configuration Before Running

All configuration is done via environment variables:

### General Configuration

| Variable                | Required | Default                     | Description                                                  |
| ----------------------- | -------- | --------------------------- | ------------------------------------------------------------ |
| `MCP_SERVER_NAME`       | No       | `agdevx-openapi-mcp-server` | Name of the MCP server                                       |
| `MCP_VERBOSE`           | No       | `false`                     | Enable verbose logging (`true` or `false`)                   |
| `PORT`                  | No       | `3000`                      | Port for the MCP server                                      |
| `API_TIMEOUT`           | No       | `30000`                     | API request timeout in milliseconds                          |
| `SPEC_REFRESH_INTERVAL` | No       | `0`                         | How often to refresh spec (0 = never)                        |
| `RATE_LIMIT_ENABLED`    | No       | `true`                      | Enable/disable rate limiting (`true` or `false`)             |
| `RATE_LIMIT_REQUESTS`   | No       | `10`                        | Maximum number of requests allowed in time window            |
| `RATE_LIMIT_WINDOW_MS`  | No       | `60000`                     | Rate limit time window in milliseconds (default: 60 seconds) |

### Environment Configuration

| Variable              | Required | Default   | Description                                                                                                  |
| --------------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `ENVIRONMENTS`        | Yes      | -         | Comma-separated list of environment names (e.g., `dev,qa,prod` or just `prod`)                               |
| `DEFAULT_ENVIRONMENT` | No       | First     | Default environment to use when not specified                                                                |
| `API_SPEC_URL_{ENV}`  | Yes\*    | -         | URL to fetch the OpenAPI specification document for each environment (e.g., `API_SPEC_URL_DEV`)              |
| `API_BASE_URL_{ENV}`  | No       | From spec | Base URL for making API calls. If not set, uses `servers[0].url` from the spec (e.g., `API_BASE_URL_DEV`)   |

\*Required for each environment listed in `ENVIRONMENTS`

**Note:** `API_BASE_URL_{ENV}` is only needed when you want to override the base URL defined in the OpenAPI spec. Common use case: using a production spec but pointing API calls to a QA or local instance.

### Configuration Examples

**Single Environment (minimal - uses base URL from spec):**

```bash
ENVIRONMENTS=prod
API_SPEC_URL_PROD=https://api.example.com/openapi/v1.json
# No API_BASE_URL_PROD needed - will use servers[0].url from the spec
```

**Single Environment (with override):**

```bash
ENVIRONMENTS=prod
API_SPEC_URL_PROD=https://api.example.com/openapi/v1.json
API_BASE_URL_PROD=https://api.example.com  # Override spec's base URL
```

**Multiple Environments:**

```bash
ENVIRONMENTS=dev,qa,prod
DEFAULT_ENVIRONMENT=dev

API_SPEC_URL_DEV=https://dev-api.example.com/openapi/v1.json
API_BASE_URL_DEV=https://dev-api.example.com

API_SPEC_URL_QA=https://qa-api.example.com/openapi/v1.json
API_BASE_URL_QA=https://qa-api.example.com

API_SPEC_URL_PROD=https://api.example.com/openapi/v1.json
API_BASE_URL_PROD=https://api.example.com
```

**Advanced: Use prod spec but call QA API:**

```bash
ENVIRONMENTS=qa
API_SPEC_URL_QA=https://api.example.com/openapi/v1.json  # Prod spec
API_BASE_URL_QA=https://qa-api.example.com                # But call QA API
```

## Using Pre-Built Docker Images

If you don't want to build locally, you can use pre-built images from Docker Hub or GitHub Container Registry:

### Docker Hub

```bash
# Pull the image
docker pull <dockerhub-username>/agdevx-openapi-mcp-server:latest

# Run with environment variables
docker run -d \
  -p 3001:3000 \
  --env-file .env \
  --name agdevx-openapi-mcp-server \
  <dockerhub-username>/agdevx-openapi-mcp-server:latest
```

### GitHub Container Registry

```bash
# Pull the image
docker pull ghcr.io/agdevx/agdevx-openapi-mcp-server:latest

# Run with environment variables
docker run -d \
  -p 3001:3000 \
  --env-file .env \
  --name agdevx-openapi-mcp-server \
  ghcr.io/agdevx/agdevx-openapi-mcp-server:latest
```

### Using Docker Desktop UI with Pre-Built Image

If you want to run the container using Docker Desktop's graphical interface:

1. **Open Docker Desktop**

2. **Pull the image:**
   - Go to the "Images" tab
   - Click "Pull" and enter: `<dockerhub-username>/agdevx-openapi-mcp-server:latest` or `ghcr.io/agdevx/agdevx-openapi-mcp-server:latest`
   - Click "Pull"

3. **Run the container:**
   - Find the image in the "Images" tab
   - Click the ▶️ (Play/Run) button
   - The "Run a new container" modal will open

4. **Configure the container:**
   - **Container name:** `agdevx-openapi-mcp-server`
   - **Ports:** Click "+" and map `3001` (host) to `3000` (container)
   - **Environment variables:** Click "+" to add each required variable:

     **Required:**
     - `ENVIRONMENTS` = `qa,prod`
     - `API_SPEC_URL_QA` = `https://localhost:7087/openapi/v1.json`
     - `API_BASE_URL_QA` = `https://localhost:7087`
     - `API_SPEC_URL_PROD` = `https://api.example.com/openapi/v1.json`
     - `API_BASE_URL_PROD` = `https://api.example.com`

     **Optional (will use defaults if not set):**
     - `DEFAULT_ENVIRONMENT` = `qa`
     - `MCP_VERBOSE` = `false`
     - `RATE_LIMIT_ENABLED` = `true`
     - `RATE_LIMIT_REQUESTS` = `10`
     - `RATE_LIMIT_WINDOW_MS` = `60000`

5. **Click "Run"**

6. **View logs:**
   - Go to the "Containers" tab
   - Click on your running container
   - Click the "Logs" tab to see output

**Note:** Environment variables must be added manually in the Docker Desktop UI. For easier setup, use docker-compose (see next section).

### Using Pre-Built Image with Docker Compose (Easiest)

Update your `docker-compose.yml` to use the pre-built image instead of building locally:

```yaml
services:
  agdevx-openapi-mcp-server:
    image: ghcr.io/agdevx/agdevx-openapi-mcp-server:latest
    # Remove the 'build: .' line
    ports:
      - '3001:3000'
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    container_name: agdevx-openapi-mcp-server
```

Then run:

```bash
cp .env.example .env
# Edit .env with your settings
docker-compose up -d
```

## Building and Running with Docker

If you want to build the image locally:

### Option 1: Using Docker Compose (Recommended)

1. **Copy the environment file template:**

```bash
cp .env.example .env
```

2. **Edit `.env` with your API configuration:**

```bash
# Required: Comma-separated list of environment names
ENVIRONMENTS=qa,prod

# Required: OpenAPI spec URLs for each environment
API_SPEC_URL_QA=https://localhost:7087/openapi/v1.json
API_SPEC_URL_PROD=https://api.example.com/openapi/v1.json

# Optional: Base URLs for each environment
API_BASE_URL_QA=https://localhost:7087
API_BASE_URL_PROD=https://api.example.com

# Optional: Other settings (see .env.example for full list)
DEFAULT_ENVIRONMENT=qa
MCP_VERBOSE=false
```

3. **Build and start the container:**

```bash
docker-compose up -d
```

4. **View logs:**

```bash
docker-compose logs -f
```

5. **Stop the container:**

```bash
docker-compose down
```

6. **Restart the container:**

```bash
docker-compose restart
```

### Option 1a: Using Docker Desktop UI

If you prefer using Docker Desktop's graphical interface:

1. **Copy and configure `.env` file** as described above

2. **Open Docker Desktop**

3. **Navigate to the Images tab** (if you've published to Docker Hub/GHCR) or **Containers tab** (if building locally)

4. **To build locally:**
   - Open terminal in project directory
   - Run `docker-compose build`
   - The image will appear in Docker Desktop

5. **To run from Docker Desktop:**
   - Click the ▶️ (Play) button next to the image/container
   - Docker Desktop will read your `.env` file automatically
   - View logs in the "Logs" tab
   - Stop/restart using the UI controls

6. **Environment Variables in Docker Desktop:**
   - When running a container, Docker Desktop shows environment variables in the container details
   - You can edit them by clicking "Edit" on the container (while stopped)
   - All variables from your `.env` file will be loaded automatically when using docker-compose

### Option 2: Using Docker CLI

1. **Build the Docker image:**

```bash
docker build -t agdevx-openapi-mcp-server .
```

2. **Run the container with environment variables:**

```bash
docker run -d \
  -p 3001:3000 \
  -e ENVIRONMENTS=qa,prod \
  -e API_SPEC_URL_QA=https://localhost:7087/openapi/v1.json \
  -e API_BASE_URL_QA=https://localhost:7087 \
  -e API_SPEC_URL_PROD=https://api.example.com/openapi/v1.json \
  -e API_BASE_URL_PROD=https://api.example.com \
  -e DEFAULT_ENVIRONMENT=qa \
  --name agdevx-openapi-mcp-server \
  agdevx-openapi-mcp-server
```

**Or use the `.env` file:**

```bash
docker run -d \
  -p 3001:3000 \
  --env-file .env \
  --name agdevx-openapi-mcp-server \
  agdevx-openapi-mcp-server
```

3. View logs:

```bash
docker logs -f agdevx-openapi-mcp-server
```

4. Stop the container:

```bash
docker stop agdevx-openapi-mcp-server
docker rm agdevx-openapi-mcp-server
```

## Verifying the Server

The MCP server should be accessible at:

- **Endpoint**: http://localhost:3001/mcp (Docker Compose default)
- **Internal**: http://localhost:3000/mcp (container port)

Test if it's running:

```bash
curl http://localhost:3001/mcp
```

You should see output indicating the server is running. Check logs to verify your API spec was loaded:

```bash
docker-compose logs -f | grep "Loaded API"
docker-compose logs -f | grep "Registering tool"
```

Run the view logs command and look for these messages in the logs:

```
Loaded API: YourApiName (v1.0.0)
Found X API operations
Registering tool: operationName (GET /path)
MCP Server listening on http://localhost:3000
```

## Stopping the Server

When you're done:

```bash
docker-compose down
```

This stops and removes the container. Your Docker image will remain, so you can quickly start it again with `docker-compose up -d`.

## Installation Methods

This MCP server supports two transport methods:

1. **stdio transport** (Recommended for ease of use) - Run directly with npx, no Docker needed
2. **HTTP transport** - Run as a containerized service with Docker

### Option 1: Using npx (stdio transport)

The easiest way to use this server is with npx. This method:

- Requires no cloning, building, or Docker
- Works directly with Claude Desktop and Claude Code CLI
- Automatically uses stdio transport
- Installs and runs in one command

#### Installation via npx

You can install globally or use npx to run directly:

**Global installation:**

```bash
npm install -g agdevx-openapi-mcp-server
```

**Or use npx directly (no installation needed):**

```bash
npx agdevx-openapi-mcp-server
```

#### Configuration for npx

When using npx, configure your environment variables in your MCP client configuration (see sections below). The server will automatically use stdio transport when run this way.

### Option 2: Using Docker (HTTP transport)

See the "Building and Running with Docker" section above for Docker setup. When a PORT environment variable is set, the server automatically uses HTTP transport.

## Connecting VS Code

VS Code can use MCP servers through its MCP extension. Here's how to configure stdio transport:

### Using stdio transport (with npx)

1. **Locate your VS Code MCP configuration file**:
   - **Windows:** `C:\Users\{YourUsername}\AppData\Roaming\Code\User\mcp.json`
   - **macOS:** `~/Library/Application Support/Code/User/mcp.json`
   - **Linux:** `~/.config/Code/User/mcp.json`

2. **Add your server configuration** to `mcp.json`:

   ```json
   {
     "servers": {
       "agdevx-openapi-mcp-server": {
         "type": "stdio",
         "command": "npx",
         "args": ["agdevx-openapi-mcp-server"],
         "env": {
           "ENVIRONMENTS": "qa,prod",
           "API_SPEC_URL_QA": "https://localhost:7087/openapi/v1.json",
           "API_BASE_URL_QA": "https://localhost:7087",
           "API_SPEC_URL_PROD": "https://api.example.com/openapi/v1.json",
           "API_BASE_URL_PROD": "https://api.example.com",
           "DEFAULT_ENVIRONMENT": "qa",
           "MCP_VERBOSE": "false"
         }
       }
     }
   }
   ```

3. **If you have multiple servers**, add them to the `servers` object:

   ```json
   {
     "servers": {
       "my-first-api": {
         "type": "stdio",
         "command": "npx",
         "args": ["agdevx-openapi-mcp-server"],
         "env": {
           "ENVIRONMENTS": "prod",
           "API_SPEC_URL_PROD": "https://api1.example.com/openapi/v1.json"
         }
       },
       "my-second-api": {
         "type": "stdio",
         "command": "npx",
         "args": ["agdevx-openapi-mcp-server"],
         "env": {
           "ENVIRONMENTS": "prod",
           "API_SPEC_URL_PROD": "https://api2.example.com/openapi/v1.json"
         }
       }
     }
   }
   ```

4. **Reload VS Code**:
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
   - Type "Developer: Reload Window"
   - Press Enter

5. **Verify it's working**:
   - Open the Output panel: `View` → `Output`
   - Select "MCP" from the dropdown menu
   - You should see your server starting up

**Using globally installed package instead of npx:**

If you installed the package globally (`npm install -g agdevx-openapi-mcp-server`), use:

```json
{
  "servers": {
    "agdevx-openapi-mcp-server": {
      "type": "stdio",
      "command": "agdevx-openapi-mcp-server",
      "args": [],
      "env": {
        "ENVIRONMENTS": "prod",
        "API_SPEC_URL_PROD": "https://api.example.com/openapi/v1.json"
      }
    }
  }
}
```

## Connecting Claude Code

Claude Code supports both stdio and HTTP MCP servers. Choose the method that works best for you:

### Using stdio transport (with npx)

**Command line configuration:**

```bash
claude mcp add my-api --scope user -- npx agdevx-openapi-mcp-server
```

Then add the environment variables:

```bash
claude config edit
```

Add to your configuration file:

```json
{
	"mcpServers": {
		"my-api": {
			"command": "npx",
			"args": ["agdevx-openapi-mcp-server"],
			"env": {
				"ENVIRONMENTS": "prod",
				"API_SPEC_URL_PROD": "https://api.example.com/openapi/v1.json",
				"API_BASE_URL_PROD": "https://api.example.com"
			}
		}
	}
}
```

For multiple environments:

```json
{
	"mcpServers": {
		"my-api": {
			"command": "npx",
			"args": ["agdevx-openapi-mcp-server"],
			"env": {
				"ENVIRONMENTS": "dev,qa,prod",
				"DEFAULT_ENVIRONMENT": "dev",
				"API_SPEC_URL_DEV": "https://dev-api.example.com/openapi/v1.json",
				"API_BASE_URL_DEV": "https://dev-api.example.com",
				"API_SPEC_URL_QA": "https://qa-api.example.com/openapi/v1.json",
				"API_BASE_URL_QA": "https://qa-api.example.com",
				"API_SPEC_URL_PROD": "https://api.example.com/openapi/v1.json",
				"API_BASE_URL_PROD": "https://api.example.com"
			}
		}
	}
}
```

### Using HTTP transport (with Docker)

1. **Check your Claude Code settings location** by running:

   ```bash
   claude config show
   ```

2. **To configure by command line**, run:

   ```bash
   claude mcp add --transport http my-api --scope user http://localhost:3001/mcp
   ```

3. **Or manually configure** in your MCP settings file:

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

4. **Restart Claude Code** to pick up the new configuration.

> **Note**: The exact configuration method may vary depending on your Claude Code version. Check the official Claude Code documentation for the most up-to-date instructions.

## Connecting Claude Desktop

Claude Desktop supports both stdio and HTTP MCP servers.

### Using stdio transport (with npx)

1. **Locate your configuration file**:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. **Add the stdio MCP server configuration**:

   **Single environment:**

   ```json
   {
   	"mcpServers": {
   		"my-api": {
   			"command": "npx",
   			"args": ["agdevx-openapi-mcp-server"],
   			"env": {
   				"ENVIRONMENTS": "prod",
   				"API_SPEC_URL_PROD": "https://api.example.com/openapi/v1.json",
   				"API_BASE_URL_PROD": "https://api.example.com"
   			}
   		}
   	}
   }
   ```

   **Multiple environments:**

   ```json
   {
   	"mcpServers": {
   		"my-api": {
   			"command": "npx",
   			"args": ["agdevx-openapi-mcp-server"],
   			"env": {
   				"ENVIRONMENTS": "dev,qa,prod",
   				"DEFAULT_ENVIRONMENT": "dev",
   				"API_SPEC_URL_DEV": "https://dev-api.example.com/openapi/v1.json",
   				"API_BASE_URL_DEV": "https://dev-api.example.com",
   				"API_SPEC_URL_QA": "https://qa-api.example.com/openapi/v1.json",
   				"API_BASE_URL_QA": "https://qa-api.example.com",
   				"API_SPEC_URL_PROD": "https://api.example.com/openapi/v1.json",
   				"API_BASE_URL_PROD": "https://api.example.com"
   			}
   		}
   	}
   }
   ```

3. **Restart Claude Desktop**.

### Using HTTP transport (with Docker)

1. **Locate your configuration file** (same as above)

2. **Add the HTTP MCP server**:

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

3. **Restart Claude Desktop**.

### Testing the Connection

Once connected, Claude will have access to tools generated from your OpenAPI specification.

Ask Claude:

- "What tools are available from my API?"
- "Show me the server information resource"

### Using the Tools

The available tools depend on your OpenAPI specification. Each API endpoint becomes a tool named after its `operationId`. Additionally, a special `refresh_openapi_spec` tool is always available to update the spec.

For example, if your API has these endpoints:

- `GET /api/users` (operationId: `getUsers`)
- `POST /api/users` (operationId: `createUser`)
- `GET /api/users/{id}` (operationId: `getUserById`)

Then you can ask Claude:

- "Get all users from my API"
- "Create a new user with name 'John Doe'"
- "Get user with ID 123"

## Working with Multiple Environments

If you have multiple environments configured (dev, qa, prod), you can switch between them on a per-request basis.

### How It Works

Every API tool includes an optional `environment` parameter. When not specified, the default environment is used. You can:

- Execute the same request in different environments
- Compare responses across environments
- Test in dev, verify in qa, deploy to prod - all without restarting

### Managing Environments

The server provides three tools for environment management:

- **`list_environments`** - View all configured environments and their details
- **`get_current_environment`** - Check which environment is currently default
- **`set_default_environment`** - Change the default environment

### Usage Examples

**List all environments:**

```
You: "List all available environments"

Claude: [Calls list_environments tool]

Configured Environments:

- dev (default): My API v1.0.0 - https://dev-api.example.com (25 operations)
- qa: My API v1.0.0 - https://qa-api.example.com (25 operations)
- prod: My API v1.0.0 - https://api.example.com (25 operations)

Use the "environment" parameter in any tool to specify which environment to use.
```

**Execute a request in a specific environment:**

```
You: "Get all users from the dev environment"

Claude: [Calls getUsers tool with environment: "dev"]
```

**Compare across environments:**

```
You: "Get user with ID 123 from dev, then get the same user from prod"

Claude: [Calls getUserById with environment: "dev", then with environment: "prod"]
```

**Change the default environment:**

```
You: "Set the default environment to prod"

Claude: [Calls set_default_environment with environment: "prod"]

Default environment changed to: prod

API: My API v1.0.0
Base URL: https://api.example.com
Operations: 25
```

### Best Practices

- **Development**: Use dev environment by default for testing
- **Verification**: Switch to qa for verification before production
- **Production**: Explicitly specify `environment: "prod"` for production operations
- **Safety**: Keep prod as a non-default environment to avoid accidental changes

## Refreshing the OpenAPI Spec

The server includes a special `refresh_openapi_spec` tool that allows you to update the OpenAPI specification without restarting the MCP server or your Claude client connection.

### When to Use

Refresh the spec when:

- Your API has been updated with new endpoints
- Existing endpoints have changed (parameters, paths, etc.)
- You want to ensure you're working with the latest API definition

### How to Use

Simply ask Claude:

- "Refresh the OpenAPI spec"
- "Get the latest API specification"
- "Update the API spec"

### What Happens

When you refresh the spec:

1. **Fetches the latest** OpenAPI specification from the configured URL
2. **Updates existing tools** - All existing tools immediately start using the updated operation definitions (paths, parameters, request bodies, etc.)
3. **Registers new operations** - Any new endpoints are automatically registered as new tools
4. **Reports changes** - Returns a summary showing:
   - API title and version
   - Total number of operations
   - How many new operations were added

### Important Notes

- **No restart required** - All changes take effect immediately
- **Existing tools work instantly** - Updated paths and parameters are used on the next tool call
- **New tools are available immediately** - You can start using newly discovered operations right away
- **Tool metadata limitation** - For existing tools, the description and input schema shown to Claude won't update until you restart the connection (but the actual execution uses the latest spec)

### Example

```
You: "Refresh the OpenAPI spec"

Claude: [Calls refresh_openapi_spec tool]

Result: "OpenAPI spec refreshed successfully!

API: My API (v2.0.0)
Total Operations: 25
New Operations Registered: 3

All existing tools have been updated to use the latest spec. New operations are now available."
```

## Rate Limiting

The server includes built-in rate limiting to protect production APIs from being overwhelmed by too many requests.

### How It Works

Rate limiting uses a **sliding window algorithm** that:

1. Tracks all requests within a configurable time window
2. Blocks requests that exceed the maximum allowed
3. Provides clear error messages with retry information
4. Applies globally to all tools (including `refresh_openapi_spec`)

### Configuration

Rate limiting is **enabled by default** with these settings:

- **Max Requests**: 10 requests
- **Time Window**: 60 seconds (1 minute)

You can customize these settings via environment variables:

```bash
RATE_LIMIT_ENABLED=true          # Enable/disable rate limiting
RATE_LIMIT_REQUESTS=10           # Maximum requests per window
RATE_LIMIT_WINDOW_MS=60000       # Time window in milliseconds
```

### Examples

**Allow 200 requests per minute:**

```bash
RATE_LIMIT_REQUESTS=200
RATE_LIMIT_WINDOW_MS=60000
```

**Allow 50 requests per 30 seconds:**

```bash
RATE_LIMIT_REQUESTS=50
RATE_LIMIT_WINDOW_MS=30000
```

**Disable rate limiting (not recommended for production):**

```bash
RATE_LIMIT_ENABLED=false
```

### When Rate Limit is Exceeded

If you exceed the rate limit, the tool will return an error message:

```
Rate limit exceeded. Maximum 10 requests per 60 seconds. Please retry after 15 seconds.
```

The error includes:

- Current rate limit settings
- How long to wait before retrying

### Best Practices

- **Production APIs**: Keep rate limiting enabled
- **Development/Testing**: You can disable it or increase limits
- **Adjust based on API capacity**: Set limits appropriate for your API's capabilities
- **Monitor usage**: Check logs to see if rate limits are being hit frequently

## Troubleshooting

1. **Server won't start - "Cannot start MCP server without valid OpenAPI specification"**:
   This means the server cannot fetch your OpenAPI spec.
   - **Is the URL correct?** Check `API_SPEC_URL` in your `.env` file
   - **Is your API running?** The OpenAPI spec URL must be accessible
   - **Test the URL manually**: `curl https://localhost:7086/openapi/v1.json`
   - **SSL/TLS issues?** If using `https://localhost`, you may need to configure SSL certificate trust

2. **Port already in use**: Change the port mapping in docker-compose.yml:

   ```yaml
   ports:
     - '3002:3000' # Use port 3002 on host instead
   ```

   Then update your MCP client configuration to use the new port and restart the container.

3. **Container won't start**: Check logs with `docker-compose logs -f agdevx-openapi-mcp-server` or `docker logs agdevx-openapi-mcp-server`

4. **Can't connect from Claude Code**: Ensure:
   - Docker container is running (`docker ps | grep agdevx-openapi-mcp-server`)
   - Port 3001 is exposed and accessible (`curl http://localhost:3001/mcp`)
   - You should get a JSON-RPC response (even if it's an error, it means the server is responding).
   - No firewall blocking the connection
   - Using `http://localhost:3001/mcp` as the endpoint
   - Claude Code config has correct URL
   - Claude Code has been restarted

5. **No tools appearing**:
   - **Check the OpenAPI spec is valid**: Ensure your API is exposing a valid OpenAPI 3.0+ specification
   - **Verify operationIds exist**: Each endpoint should have an `operationId` in the spec
   - **Check server logs** for tool registration messages: `docker-compose logs -f | grep "Registering tool"`

6. **Server stopped unexpectedly**

   Restart the container:

   ```bash
   docker-compose restart
   ```

   Or stop and start fresh:

   ```bash
   docker-compose down
   docker-compose up -d
   ```
