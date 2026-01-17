import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { WeatherServiceImpl } from '../services/weatherService.js';
import { SERVER_CONFIG, RESOURCES } from '../config.js';

/**
 * Factory function to create and configure a new MCP server instance
 */
export function createWeatherServer(): McpServer {
	const weatherService = new WeatherServiceImpl();
	const server = new McpServer({
		name: SERVER_CONFIG.name,
		version: SERVER_CONFIG.version
	});

	// Register weather alerts tool
	server.registerTool(
		'get_weather_alerts',
		{
			description: 'Get weather alerts for a US state',
			inputSchema: {
				state: z.string().describe('Two-letter US state code (e.g., CA, NY, TX)')
			}
		},
		async ({ state }) => {
			const result = weatherService.getWeatherAlerts(state);
			console.log(`Fetched weather alerts for: ${state}`);

			return {
				content: [
					{
						type: 'text',
						text: result
					}
				]
			};
		}
	);

	// Register weather forecast tool
	server.registerTool(
		'get_forecast',
		{
			description: 'Get weather forecast for a city',
			inputSchema: {
				city: z.string().describe('City name'),
				days: z.number().optional().default(3).describe('Number of days to forecast (default: 3)')
			}
		},
		async ({ city, days }) => {
			const result = weatherService.getForecast(city, days ?? 3);
			console.log(`Fetched ${days ?? 3}-day forecast for: ${city}`);

			return {
				content: [
					{
						type: 'text',
						text: result
					}
				]
			};
		}
	);

	// Register server information resource
	server.registerResource(
		RESOURCES.serverInfo.name,
		RESOURCES.serverInfo.uri,
		{
			description: RESOURCES.serverInfo.description,
			mimeType: RESOURCES.serverInfo.mimeType
		},
		async () => {
			return {
				contents: [
					{
						uri: RESOURCES.serverInfo.uri,
						mimeType: RESOURCES.serverInfo.mimeType,
						text: `Weather Alerts MCP Server

This server provides weather information including:
- Real-time weather alerts by US state
- Multi-day weather forecasts for cities

Data sources: Mock data (replace with real API in production)
Version: ${SERVER_CONFIG.version}`
					}
				]
			};
		}
	);

	return server;
}
