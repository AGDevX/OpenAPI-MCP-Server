#!/usr/bin/env node

//-- Allow self-signed certificates (for development/testing)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { createMcpHttpApp } from './server/http-transport.js';
import { SERVER_CONFIG, OPENAPI_CONFIG } from './config.js';

async function main() {
	console.log('Starting OpenAPI MCP Server...');
	console.log(`Server name: ${SERVER_CONFIG.name}`);

	//-- Validate configuration
	if (!OPENAPI_CONFIG.specUrl) {
		console.error('ERROR: API_SPEC_URL environment variable is required');
		console.error('Please set API_SPEC_URL to your OpenAPI specification URL');
		console.error('Example: API_SPEC_URL=http://localhost:5000/swagger/v1/swagger.json');
		process.exit(1);
	}

	console.log(`OpenAPI Spec URL: ${OPENAPI_CONFIG.specUrl}`);
	if (OPENAPI_CONFIG.baseUrl) {
		console.log(`API Base URL: ${OPENAPI_CONFIG.baseUrl}`);
	}

	const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : SERVER_CONFIG.defaultPort;
	const app = createMcpHttpApp();

	//-- Start the server
	app.listen(PORT, () => {
		console.log(`OpenAPI MCP Server listening on http://localhost:${PORT}`);
		console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
	});
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
