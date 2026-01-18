#!/usr/bin/env node

//-- Allow self-signed certificates (for development/testing)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { createMcpHttpApp } from './server/http-transport.js';
import { startStdioServer } from './server/stdio-transport.js';
import { SERVER_CONFIG, ENVIRONMENT_CONFIG } from './config.js';
import { logger } from './utils/logger.js';

//-- Determine which transport to use
function getTransport(): 'stdio' | 'http' {
	//-- Explicit transport setting
	const transportEnv = process.env.TRANSPORT?.toLowerCase();
	if (transportEnv === 'stdio' || transportEnv === 'http') {
		return transportEnv;
	}

	//-- Auto-detect: if PORT is set, use HTTP; otherwise use stdio
	if (process.env.PORT) {
		return 'http';
	}

	//-- Default to stdio for npm/npx usage
	return 'stdio';
}

async function main() {
	const transport = getTransport();

	logger.log('Starting AGDevX OpenAPI MCP Server...');
	logger.log(`Server name: ${SERVER_CONFIG.name}`);
	logger.log(`Transport: ${transport}`);

	//-- Validate configuration
	if (ENVIRONMENT_CONFIG.environments.length === 0) {
		logger.error('ERROR: No API environments configured');
		logger.error('');
		logger.error('Please configure at least one environment:');
		logger.error('');
		logger.error('Example - Single environment:');
		logger.error('  ENVIRONMENTS=prod');
		logger.error('  API_SPEC_URL_PROD=https://api.example.com/openapi/v1.json');
		logger.error('');
		logger.error('Example - Multiple environments:');
		logger.error('  ENVIRONMENTS=dev,qa,prod');
		logger.error('  DEFAULT_ENVIRONMENT=dev');
		logger.error('  API_SPEC_URL_DEV=https://dev-api.example.com/openapi/v1.json');
		logger.error('  API_SPEC_URL_QA=https://qa-api.example.com/openapi/v1.json');
		logger.error('  API_SPEC_URL_PROD=https://api.example.com/openapi/v1.json');
		process.exit(1);
	}

	//-- Log environment configuration
	logger.log(`Configured environments: ${ENVIRONMENT_CONFIG.environments.join(', ')}`);
	logger.log(`Default environment: ${ENVIRONMENT_CONFIG.defaultEnvironment}`);
	for (const env of ENVIRONMENT_CONFIG.environments) {
		const config = ENVIRONMENT_CONFIG.configs[env];
		logger.log(`  ${env}: ${config.specUrl}`);
	}

	//-- Start server with appropriate transport
	if (transport === 'stdio') {
		await startStdioServer();
	} else {
		const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : SERVER_CONFIG.defaultPort;
		const app = createMcpHttpApp();

		//-- Start the HTTP server
		app.listen(PORT, () => {
			logger.log(`AGDevX OpenAPI MCP Server listening on http://localhost:${PORT}`);
			logger.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
		});
	}
}

main().catch((error) => {
	logger.error('Fatal error:', error);
	process.exit(1);
});
