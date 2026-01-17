# Project Structure

The codebase has been refactored into a modular structure for better maintainability and separation of concerns.

## Directory Structure

```
src/
├── data/
│   └── mockData.ts          # Mock weather data constants
├── services/
│   └── weatherService.ts    # Weather service interface and implementation
├── server/
│   ├── mcpServer.ts         # MCP server factory and tool/resource registration
│   └── httpTransport.ts     # HTTP transport and Express app setup
├── config.ts                # Server configuration constants
└── index.ts                 # Main entry point
```

## Module Descriptions

### `src/index.ts`
**Main Entry Point**
- Bootstraps the application
- Starts the HTTP server
- Minimal code - just initialization

### `src/config.ts`
**Configuration**
- Server metadata (name, version, default port)
- Resource definitions
- Centralized configuration for easy updates

### `src/data/mockData.ts`
**Mock Data**
- Weather alerts data by state
- In production, this would be replaced with API calls
- Easy to swap out for real data sources

### `src/services/weatherService.ts`
**Business Logic**
- `WeatherService` interface defining the contract
- `WeatherServiceImpl` implementing the weather data fetching
- Contains methods:
  - `getWeatherAlerts(state)` - Get alerts for a US state
  - `getForecast(city, days)` - Get multi-day forecast

### `src/server/mcpServer.ts`
**MCP Server Factory**
- `createWeatherServer()` factory function
- Registers all MCP tools:
  - `get_weather_alerts` - Weather alerts tool
  - `get_forecast` - Weather forecast tool
- Registers MCP resources:
  - `weather://info` - Server information resource
- Handles tool callbacks and response formatting

### `src/server/httpTransport.ts`
**HTTP Transport Layer**
- `SessionManager` class for managing client sessions
- `createMcpHttpApp()` creates configured Express app
- Handles HTTP endpoints:
  - `POST /mcp` - Initialization and requests
  - `GET /mcp` - SSE streams
  - `DELETE /mcp` - Session termination
- Manages transport lifecycle and cleanup
- Graceful shutdown handling

## Benefits of This Structure

### 1. **Separation of Concerns**
- Data layer separate from business logic
- Transport layer separate from MCP server logic
- Configuration centralized

### 2. **Maintainability**
- Each file has a single, clear responsibility
- Easy to locate and update specific functionality
- Small, focused modules

### 3. **Testability**
- Services can be unit tested independently
- Mock data can be easily swapped
- Transport layer can be tested separately from business logic

### 4. **Scalability**
- Easy to add new tools (add to `mcpServer.ts`)
- Easy to add new data sources (add to `services/`)
- Easy to switch transports (add new file in `server/`)

### 5. **Reusability**
- `WeatherService` interface can have multiple implementations
- Server factory can be reused in tests
- HTTP transport setup is reusable for other MCP servers

## Adding New Features

### Adding a New Tool

1. Add the tool logic to `src/services/weatherService.ts`
2. Register it in `src/server/mcpServer.ts`

Example:
```typescript
// In weatherService.ts
getHurricaneTracking(region: string): string {
  // Implementation
}

// In mcpServer.ts
server.registerTool('get_hurricane_tracking', { ... }, async ({ region }) => {
  const result = weatherService.getHurricaneTracking(region);
  return { content: [{ type: 'text', text: result }] };
});
```

### Adding a New Resource

1. Add resource definition to `src/config.ts`
2. Register it in `src/server/mcpServer.ts`

### Switching from Mock to Real API

1. Create new implementation in `src/services/weatherService.ts`
2. Replace `MOCK_ALERTS` with API calls
3. No changes needed elsewhere

### Adding a Different Transport (e.g., WebSocket)

1. Create `src/server/wsTransport.ts`
2. Implement WebSocket handlers
3. Update `src/index.ts` to use new transport

## Code Flow

```
index.ts
  └─> config.ts (loads configuration)
  └─> httpTransport.ts (creates Express app)
      └─> mcpServer.ts (creates MCP server instance)
          └─> weatherService.ts (business logic)
              └─> mockData.ts (data source)
```

## Best Practices

1. **Keep index.ts minimal** - Only application bootstrapping
2. **One responsibility per file** - Services do business logic, transport does HTTP
3. **Use interfaces** - Makes swapping implementations easy
4. **Centralize configuration** - Don't hardcode values
5. **Separate data from logic** - Mock data in its own file
