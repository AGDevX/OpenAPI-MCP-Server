#!/usr/bin/env node

//-- Allow self-signed certificates (for development/testing)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { runCli } from './cli.js';
import { startServer } from './server.js';
import { logger } from './utils/logger.js';

//-- Main entry point
//-- If CLI arguments are provided (beyond node and script name), use CLI
//-- Otherwise, start MCP server directly (backward compatibility)
async function main() {
	//-- Check if we have CLI arguments
	//-- process.argv: [node, script, ...args]
	//-- If length > 2, user provided arguments
	const hasCliArgs = process.argv.length > 2;

	if (hasCliArgs) {
		//-- Run CLI (handles commands like 'config-ui', 'serve', '--help', etc.)
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
