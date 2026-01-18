import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createApiServer } from './mcp-server.js';
import { logger } from '../utils/logger.js';

//-- Create and start the MCP server with stdio transport
export async function startStdioServer(): Promise<void> {
	logger.log('Starting AGDevX OpenAPI MCP Server with stdio transport...');

	try {
		//-- Create the MCP server instance
		const server = await createApiServer();

		//-- Create stdio transport
		const transport = new StdioServerTransport();

		//-- Connect the server to the transport
		await server.connect(transport);

		logger.log('MCP Server ready (stdio transport)');
		logger.log('Waiting for client connection...');
	} catch (error) {
		logger.error('Failed to start stdio server:', error);
		throw error;
	}
}
