import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { OpenApiService } from '../services/open-api-service.js';
import { generateToolInputSchema, generateToolDescription, sanitizeToolName } from '../services/tool-generator.js';
import { SERVER_CONFIG, RESOURCES } from '../config.js';

//-- Factory function to create and configure a new MCP server instance
//-- Dynamically creates tools based on OpenAPI specification
export async function createApiServer(): Promise<McpServer> {
	const openApiService = new OpenApiService();

	//-- Fetch the OpenAPI spec at startup
	try {
		await openApiService.fetchSpec();
	} catch (error) {
		console.error('Failed to fetch OpenAPI spec:', error);
		throw new Error('Cannot start MCP server without valid OpenAPI specification');
	}

	const server = new McpServer({
		name: SERVER_CONFIG.name,
		version: SERVER_CONFIG.version
	});

	//-- Get API info
	const apiInfo = await openApiService.getApiInfo();
	console.log(`Loaded API: ${apiInfo.title} (v${apiInfo.version})`);

	//-- Get all operations from the spec
	const operations = await openApiService.getOperations();
	console.log(`Found ${operations.length} API operations`);

	//-- Dynamically register tools for each operation
	for (const operation of operations) {
		const toolName = sanitizeToolName(operation.operationId);
		const description = generateToolDescription(operation);
		const inputSchema = generateToolInputSchema(operation);

		console.log(`Registering tool: ${toolName} (${operation.method} ${operation.path})`);

		server.registerTool(
			toolName,
			{
				description,
				inputSchema
			},
			async (params: Record<string, any>) => {
				try {
					console.log(`Executing tool: ${toolName}`, params);
					const result = await openApiService.executeOperation(operation, params);

					//-- Format the result as text
					const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

					return {
						content: [
							{
								type: 'text',
								text: resultText
							}
						]
					};
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					console.error(`Error executing ${toolName}:`, errorMessage);

					return {
						content: [
							{
								type: 'text',
								text: `Error executing ${operation.method} ${operation.path}: ${errorMessage}`
							}
						],
						isError: true
					};
				}
			}
		);
	}

	//-- Register server information resource
	server.registerResource(
		RESOURCES.serverInfo.name,
		RESOURCES.serverInfo.uri,
		{
			description: RESOURCES.serverInfo.description,
			mimeType: RESOURCES.serverInfo.mimeType
		},
		async () => {
			const toolsList = operations
				.map((op) => `- ${sanitizeToolName(op.operationId)}: ${op.method} ${op.path}${op.summary ? ' - ' + op.summary : ''}`)
				.join('\n');

			return {
				contents: [
					{
						uri: RESOURCES.serverInfo.uri,
						mimeType: RESOURCES.serverInfo.mimeType,
						text: `OpenAPI MCP Server

API: ${apiInfo.title} (v${apiInfo.version})
${apiInfo.description ? '\n' + apiInfo.description + '\n' : ''}
Base URL: ${openApiService.getBaseUrl()}
Available Operations: ${operations.length}

Tools:
${toolsList}

MCP Server Version: ${SERVER_CONFIG.version}`
					}
				]
			};
		}
	);

	console.log('MCP Server initialization complete');
	return server;
}
