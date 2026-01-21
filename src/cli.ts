import { Command } from 'commander';
import { createRequire } from 'module';

import { startSetup } from '@setup/server.js';

import { startServer } from './server.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');
const VERSION = packageJson.version;

const program = new Command();

program
	.name('agdevx-openapi-mcp-server')
	.description('MCP Server that dynamically exposes OpenAPI/Swagger specifications as tools')
	.version(VERSION);

//-- Serve command: start MCP server
program
	.command('serve')
	.description('Start the MCP server')
	.action(async () => {
		await startServer();
	});

//-- Setup command
program
	.command('setup')
	.description('Launch the web-based setup wizard')
	.option('-p, --port <port>', 'Port to run the setup wizard on', '3000')
	.option('--no-open', 'Do not automatically open the browser')
	.action(async (options) => {
		const port = parseInt(options.port, 10);
		const openBrowser = options.open !== false;

		await startSetup({
			port,
			openBrowser
		});
	});

//-- Default action when no command is specified
program.action(async () => {
	await startServer();
});

export async function runCli() {
	await program.parseAsync(process.argv);
}
