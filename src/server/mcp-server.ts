import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EnvironmentManager } from '../services/environment-manager.js';
import { generateToolInputSchema, generateToolDescription, sanitizeToolName } from '../services/tool-generator.js';
import { SERVER_CONFIG, RESOURCES, RATE_LIMIT_CONFIG } from '../config.js';
import { RateLimiter } from '../services/rate-limiter.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

//-- Factory function to create and configure a new MCP server instance
//-- Dynamically creates tools based on OpenAPI specification
export async function createApiServer(): Promise<McpServer> {
	const environmentManager = new EnvironmentManager();

	//-- Initialize rate limiter if enabled
	const rateLimiter = RATE_LIMIT_CONFIG.enabled
		? new RateLimiter({
				maxRequests: RATE_LIMIT_CONFIG.maxRequests,
				windowMs: RATE_LIMIT_CONFIG.windowMs
			})
		: null;

	if (rateLimiter) {
		logger.always(`Rate limiting enabled: ${RATE_LIMIT_CONFIG.maxRequests} requests per ${RATE_LIMIT_CONFIG.windowMs / 1000} seconds`);
	} else {
		logger.always('Rate limiting disabled');
	}

	//-- Initialize all environments (fetch OpenAPI specs)
	try {
		await environmentManager.initializeAll();
	} catch (error) {
		logger.error('Failed to initialize environments:', error);
		throw new Error(
			'Cannot start MCP server without valid OpenAPI specifications.\n\n' +
				'Common issues:\n' +
				'1. API_SPEC_URL not configured - Set API_SPEC_URL_{ENVIRONMENT} in your .env file\n' +
				'2. API server not running - Start your API server first\n' +
				'3. URL is incorrect - Verify the OpenAPI spec URL is accessible\n' +
				'4. Self-signed certificates - Set NODE_TLS_REJECT_UNAUTHORIZED=0 for development\n\n' +
				'See the error above for specific details.'
		);
	}

	const server = new McpServer({
		name: SERVER_CONFIG.name,
		version: SERVER_CONFIG.version
	});

	//-- Get API info from default environment
	const defaultService = environmentManager.getService();
	const apiInfo = await defaultService.getApiInfo();
	logger.always(`Default environment API: ${apiInfo.title} (v${apiInfo.version})`);

	//-- Get all operations from the default environment spec
	const operations = await defaultService.getOperations();
	logger.always(`Found ${operations.length} API operations`);

	//-- Track registered operation IDs
	const registeredOperationIds = new Set<string>();

	//-- Helper function to register a tool for an operation
	const registerOperationTool = async (operationId: string) => {
		//-- Get the current operation definition from the default service
		const operation = await defaultService.getOperationById(operationId);
		if (!operation) {
			logger.warn(`Operation not found: ${operationId}`);
			return;
		}

		const toolName = sanitizeToolName(operationId);
		const description = generateToolDescription(operation);
		const inputSchema = generateToolInputSchema(operation);

		//-- Add environment parameter to the schema
		const environmentEnum = environmentManager.getEnvironments();
		inputSchema.environment = z
			.enum(environmentEnum as [string, ...string[]])
			.optional()
			.describe(
				`Environment to execute the operation in. Available: ${environmentEnum.join(', ')}. Default: ${environmentManager.getDefaultEnvironment()}`
			);

		logger.log(`Registering tool: ${toolName} (${operation.method} ${operation.path})`);

		server.registerTool(
			toolName,
			{
				description,
				inputSchema
			},
			async (params: Record<string, any>) => {
				try {
					//-- Extract environment parameter
					const environment = params.environment as string | undefined;
					const targetEnv = environment || environmentManager.getDefaultEnvironment();

					logger.log(`Executing tool: ${toolName} in environment: ${targetEnv}`, params);

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

					//-- Get service for the target environment
					const service = environmentManager.getService(targetEnv);

					//-- Dynamically look up the current operation definition
					const currentOperation = await service.getOperationById(operationId);

					if (!currentOperation) {
						throw new Error(
							`Operation "${operationId}" not found in current spec for environment "${targetEnv}".\n\n` +
								`This could happen if:\n` +
								`1. The API operation was removed from the OpenAPI spec\n` +
								`2. The spec was updated without refreshing the MCP server\n\n` +
								`Action required: Run the "refresh_openapi_spec" tool to update available operations.`
						);
					}

					//-- Remove environment from params before execution
					const { environment: _, ...apiParams } = params;

					const result = await service.executeOperation(currentOperation, apiParams);

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
					logger.error(`Error executing ${toolName}:`, errorMessage);

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
	const environmentEnum = environmentManager.getEnvironments();
	server.registerTool(
		'refresh_openapi_spec',
		{
			description: 'Refetch the OpenAPI specification from the configured URL and register any new operations',
			inputSchema: {
				environment: z
					.enum(environmentEnum as [string, ...string[]])
					.optional()
					.describe(
						`Environment to refresh. Available: ${environmentEnum.join(', ')}. Default: ${environmentManager.getDefaultEnvironment()}`
					)
			}
		},
		async (params: Record<string, any>) => {
			try {
				const environment = (params.environment as string | undefined) || environmentManager.getDefaultEnvironment();
				logger.log(`Refreshing OpenAPI spec for environment: ${environment}...`);

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

				const service = environmentManager.getService(environment);
				await service.fetchSpec();

				const newApiInfo = await service.getApiInfo();
				const newOperations = await service.getOperations();

				//-- Register any new operations that weren't previously registered
				let newToolsCount = 0;
				for (const operation of newOperations) {
					if (!registeredOperationIds.has(operation.operationId)) {
						await registerOperationTool(operation.operationId);
						newToolsCount++;
					}
				}

				const message =
					newToolsCount > 0
						? `OpenAPI spec refreshed successfully for environment "${environment}"!

API: ${newApiInfo.title} (v${newApiInfo.version})
Total Operations: ${newOperations.length}
New Operations Registered: ${newToolsCount}

All existing tools have been updated to use the latest spec. New operations are now available.`
						: `OpenAPI spec refreshed successfully for environment "${environment}"!

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
				logger.error('Error refreshing OpenAPI spec:', errorMessage);

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

	//-- Register environment management tools
	server.registerTool(
		'list_environments',
		{
			description: 'List all configured API environments',
			inputSchema: {}
		},
		async () => {
			try {
				const environments = environmentManager.getEnvironments();
				const defaultEnv = environmentManager.getDefaultEnvironment();

				const envDetails: string[] = [];

				for (const env of environments) {
					const info = await environmentManager.getEnvironmentInfo(env);
					const isDefault = env === defaultEnv ? ' (default)' : '';
					envDetails.push(
						`- ${env}${isDefault}: ${info.apiTitle} v${info.apiVersion} - ${info.baseUrl} (${info.operationsCount} operations)`
					);
				}

				return {
					content: [
						{
							type: 'text',
							text: `Configured Environments:\n\n${envDetails.join('\n')}\n\nUse the "environment" parameter in any tool to specify which environment to use.`
						}
					]
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: 'text', text: `Error listing environments: ${errorMessage}` }],
					isError: true
				};
			}
		}
	);

	server.registerTool(
		'get_current_environment',
		{
			description: 'Get the current default environment',
			inputSchema: {}
		},
		async () => {
			try {
				const defaultEnv = environmentManager.getDefaultEnvironment();
				const info = await environmentManager.getEnvironmentInfo(defaultEnv);

				return {
					content: [
						{
							type: 'text',
							text: `Current default environment: ${defaultEnv}\n\nAPI: ${info.apiTitle} v${info.apiVersion}\nBase URL: ${info.baseUrl}\nOperations: ${info.operationsCount}`
						}
					]
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: 'text', text: `Error getting current environment: ${errorMessage}` }],
					isError: true
				};
			}
		}
	);

	server.registerTool(
		'set_default_environment',
		{
			description: 'Set the default environment for API operations',
			inputSchema: {
				environment: z.enum(environmentEnum as [string, ...string[]]).describe('Environment to set as default')
			}
		},
		async (params: Record<string, any>) => {
			try {
				const environment = params.environment as string;
				environmentManager.setDefaultEnvironment(environment);

				const info = await environmentManager.getEnvironmentInfo(environment);

				return {
					content: [
						{
							type: 'text',
							text: `Default environment changed to: ${environment}\n\nAPI: ${info.apiTitle} v${info.apiVersion}\nBase URL: ${info.baseUrl}\nOperations: ${info.operationsCount}`
						}
					]
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: 'text', text: `Error setting default environment: ${errorMessage}` }],
					isError: true
				};
			}
		}
	);

	//-- Register server status/health check tool
	server.registerTool(
		'check_server_status',
		{
			description: 'Check server health and status including environment reachability, rate limits, and tool availability',
			inputSchema: {}
		},
		async () => {
			try {
				const environments = environmentManager.getEnvironments();
				const statusParts: string[] = [];

				//-- Check environment status and reachability
				const envStatuses: string[] = [];
				for (const env of environments) {
					try {
						const service = environmentManager.getService(env);
						const isReachable = await service.checkReachability();
						const symbol = isReachable ? '✓' : '✗ unreachable';
						envStatuses.push(`${env}${symbol}`);
					} catch {
						envStatuses.push(`${env}✗ unreachable`);
					}
				}
				statusParts.push(`Environments: ${environments.length} (${envStatuses.join(', ')})`);

				//-- Rate limit status
				if (rateLimiter) {
					const stats = rateLimiter.getStats();
					const resetTime = Math.ceil((stats.windowMs - (Date.now() % stats.windowMs)) / 1000);
					statusParts.push(`Rate Limit: ${stats.currentRequests}/${stats.maxRequests} requests used (resets in ${resetTime}s)`);
				} else {
					statusParts.push('Rate Limit: Disabled');
				}

				//-- Tools available (operation tools + 5 management tools)
				const managementToolsCount = 5; //-- refresh_openapi_spec, list_environments, get_current_environment, set_default_environment, check_server_status
				const totalTools = registeredOperationIds.size + managementToolsCount;
				statusParts.push(`Tools Available: ${totalTools}`);

				//-- Last spec refresh time
				const defaultService = environmentManager.getService();
				const lastFetch = defaultService.getLastFetchTime();
				if (lastFetch) {
					const minutesAgo = Math.floor((Date.now() - lastFetch.getTime()) / 60000);
					const timeAgo = minutesAgo === 0 ? 'just now' : minutesAgo === 1 ? '1 minute ago' : `${minutesAgo} minutes ago`;
					statusParts.push(`Last Spec Refresh: ${timeAgo}`);
				} else {
					statusParts.push('Last Spec Refresh: Never');
				}

				return {
					content: [
						{
							type: 'text',
							text: statusParts.join('\n')
						}
					]
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: 'text', text: `Error checking server status: ${errorMessage}` }],
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
			//-- Get current API info and operations from default environment
			const currentService = environmentManager.getService();
			const currentApiInfo = await currentService.getApiInfo();
			const currentOperations = await currentService.getOperations();

			const operationToolsList = currentOperations
				.map((op) => `- ${sanitizeToolName(op.operationId)}: ${op.method} ${op.path}${op.summary ? ' - ' + op.summary : ''}`)
				.join('\n');

			//-- Add management tools to the list
			const managementTools = `
- refresh_openapi_spec: Refetch the OpenAPI specification from the configured URL and register any new operations
- list_environments: List all configured API environments
- get_current_environment: Get the current default environment
- set_default_environment: Set the default environment for API operations
- check_server_status: Check server health and status including environment reachability, rate limits, and tool availability`;

			const toolsList = `${operationToolsList}${managementTools}`;

			const environments = environmentManager.getEnvironments();
			const defaultEnv = environmentManager.getDefaultEnvironment();
			const environmentsList = environments.map((env) => (env === defaultEnv ? `${env} (default)` : env)).join(', ');

			return {
				contents: [
					{
						uri: RESOURCES.serverInfo.uri,
						mimeType: RESOURCES.serverInfo.mimeType,
						text: `AGDevX OpenAPI MCP Server

API: ${currentApiInfo.title} (v${currentApiInfo.version})
${currentApiInfo.description ? '\n' + currentApiInfo.description + '\n' : ''}
Base URL: ${currentService.getBaseUrl()}
Available Operations: ${currentOperations.length}

Environments: ${environmentsList}

Tools:
${toolsList}

MCP Server Version: ${SERVER_CONFIG.version}`
					}
				]
			};
		}
	);

	logger.always('MCP Server initialization complete');
	return server;
}
