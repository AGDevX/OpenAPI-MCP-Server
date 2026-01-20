#!/usr/bin/env node

import { OPENAPI_CONFIG } from './config.js';
import { runCli } from './cli.js';
import { startServer } from './server.js';
import { logger } from './utils/logger.js';

//-- Configure TLS certificate verification based on user settings
//-- Default: true (secure) - reject unauthorized certificates
//-- Set NODE_TLS_REJECT_UNAUTHORIZED=0 in .env to disable for development/testing with self-signed certs
if (!OPENAPI_CONFIG.rejectUnauthorizedTls) {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
	logger.warn('TLS certificate verification is DISABLED. This should only be used for development/testing.');
}

//-- Main entry point
//-- If CLI arguments are provided (beyond node and script name), use CLI
//-- Otherwise, start MCP server directly (backward compatibility)
async function main() {
	//-- Check if we have CLI arguments
	//-- process.argv: [node, script, ...args]
	//-- If length > 2, user provided arguments
	const hasCliArgs = process.argv.length > 2;

	if (hasCliArgs) {
		//-- Run CLI (handles commands like 'setup', 'serve', '--help', etc.)
		await runCli();
	} else {
		//-- No arguments: start MCP server directly (original behavior)
		await startServer();
	}
}

main().catch((error) => {
	logger.error('Fatal error:', error);
	process.exit(1);
});
