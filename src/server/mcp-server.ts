import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { OpenApiService } from '../services/open-api-service.js';
import { generateToolInputSchema, generateToolDescription, sanitizeToolName } from '../services/tool-generator.js';
import { SERVER_CONFIG, RESOURCES, RATE_LIMIT_CONFIG } from '../config.js';
import { RateLimiter } from '../services/rate-limiter.js';

//-- Factory function to create and configure a new MCP server instance
//-- Dynamically creates tools based on OpenAPI specification
export async function createApiServer(): Promise<McpServer> {
	const openApiService = new OpenApiService();

	//-- Initialize rate limiter if enabled
	const rateLimiter = RATE_LIMIT_CONFIG.enabled
		? new RateLimiter({
				maxRequests: RATE_LIMIT_CONFIG.maxRequests,
				windowMs: RATE_LIMIT_CONFIG.windowMs
			})
		: null;

	if (rateLimiter) {
		console.log(
			`Rate limiting enabled: ${RATE_LIMIT_CONFIG.maxRequests} requests per ${RATE_LIMIT_CONFIG.windowMs / 1000} seconds`
		);
	} else {
		console.log('Rate limiting disabled');
	}

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

	//-- Track registered operation IDs
	const registeredOperationIds = new Set<string>();

	//-- Helper function to register a tool for an operation
	const registerOperationTool = async (operationId: string) => {
		//-- Get the current operation definition from the service
		const operation = await openApiService.getOperationById(operationId);
		if (!operation) {
			console.warn(`Operation not found: ${operationId}`);
			return;
		}

		const toolName = sanitizeToolName(operationId);
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

					//-- Check rate limit if enabled
					if (rateLimiter) {
						const { allowed, retryAfter } = await rateLimiter.checkLimit();

						if (!allowed) {
							const stats = rateLimiter.getStats();
							throw new Error(
								`Rate limit exceeded. Maximum ${stats.maxRequests} requests per ${stats.windowMs / 1000} seconds. Please retry after ${retryAfter} seconds.`
							);
						}
					}

					//-- Dynamically look up the current operation definition
					const currentOperation = await openApiService.getOperationById(operationId);

					if (!currentOperation) {
						throw new Error(`Operation ${operationId} not found in current spec`);
					}

					const result = await openApiService.executeOperation(currentOperation, params);

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
								text: `Error executing operation: ${errorMessage}`
							}
						],
						isError: true
					};
				}
			}
		);

		registeredOperationIds.add(operationId);
	};

	//-- Register tools for all operations
	for (const operation of operations) {
		await registerOperationTool(operation.operationId);
	}

	//-- Register refresh tool to refetch OpenAPI spec
	server.registerTool(
		'refresh_openapi_spec',
		{
			description: 'Refetch the OpenAPI specification from the configured URL and register any new operations',
			inputSchema: {}
		},
		async () => {
			try {
				console.log('Refreshing OpenAPI spec...');

				//-- Check rate limit if enabled
				if (rateLimiter) {
					const { allowed, retryAfter } = await rateLimiter.checkLimit();

					if (!allowed) {
						const stats = rateLimiter.getStats();
						throw new Error(
							`Rate limit exceeded. Maximum ${stats.maxRequests} requests per ${stats.windowMs / 1000} seconds. Please retry after ${retryAfter} seconds.`
						);
					}
				}

				await openApiService.fetchSpec();

				const newApiInfo = await openApiService.getApiInfo();
				const newOperations = await openApiService.getOperations();

				//-- Register any new operations that weren't previously registered
				let newToolsCount = 0;
				for (const operation of newOperations) {
					if (!registeredOperationIds.has(operation.operationId)) {
						await registerOperationTool(operation.operationId);
						newToolsCount++;
					}
				}

				const message = newToolsCount > 0
					? `OpenAPI spec refreshed successfully!

API: ${newApiInfo.title} (v${newApiInfo.version})
Total Operations: ${newOperations.length}
New Operations Registered: ${newToolsCount}

All existing tools have been updated to use the latest spec. New operations are now available.`
					: `OpenAPI spec refreshed successfully!

API: ${newApiInfo.title} (v${newApiInfo.version})
Total Operations: ${newOperations.length}

All existing tools have been updated to use the latest spec. No new operations were found.`;

				return {
					content: [
						{
							type: 'text',
							text: message
						}
					]
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error('Error refreshing OpenAPI spec:', errorMessage);

				return {
					content: [
						{
							type: 'text',
							text: `Failed to refresh OpenAPI spec: ${errorMessage}`
						}
					],
					isError: true
				};
			}
		}
	);

	//-- Register server information resource
	server.registerResource(
		RESOURCES.serverInfo.name,
		RESOURCES.serverInfo.uri,
		{
			description: RESOURCES.serverInfo.description,
			mimeType: RESOURCES.serverInfo.mimeType
		},
		async () => {
			//-- Get current API info and operations
			const currentApiInfo = await openApiService.getApiInfo();
			const currentOperations = await openApiService.getOperations();

			const operationToolsList = currentOperations
				.map((op) => `- ${sanitizeToolName(op.operationId)}: ${op.method} ${op.path}${op.summary ? ' - ' + op.summary : ''}`)
				.join('\n');

			//-- Add the refresh tool to the list
			const toolsList = `${operationToolsList}
- refresh_openapi_spec: Refetch the OpenAPI specification from the configured URL and register any new operations`;

			return {
				contents: [
					{
						uri: RESOURCES.serverInfo.uri,
						mimeType: RESOURCES.serverInfo.mimeType,
						text: `OpenAPI MCP Server

API: ${currentApiInfo.title} (v${currentApiInfo.version})
${currentApiInfo.description ? '\n' + currentApiInfo.description + '\n' : ''}
Base URL: ${openApiService.getBaseUrl()}
Available Operations: ${currentOperations.length}

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
