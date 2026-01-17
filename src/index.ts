#!/usr/bin/env node
/**
 * Weather Alerts MCP Server
 * Provides weather alert information and forecasts for US locations
 */

import { createMcpHttpApp } from './server/httpTransport.js';
import { SERVER_CONFIG } from './config.js';

async function main() {
	console.log('Starting Weather Alerts MCP Server...');

	const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : SERVER_CONFIG.defaultPort;
	const app = createMcpHttpApp();

	// Start the server
	app.listen(PORT, () => {
		console.log(`Weather Alerts MCP Server listening on http://localhost:${PORT}`);
		console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
	});
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
