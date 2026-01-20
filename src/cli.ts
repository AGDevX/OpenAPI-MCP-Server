import { Command } from 'commander';
import { startSetup } from './setup/server.js';
import { startServer } from './server.js';

const program = new Command();

//-- Get version from package.json
//-- Note: In production, this would be imported from package.json
//-- For now, we'll hardcode it to match the current version
const VERSION = '0.0.8';

program
	.name('agdevx-openapi-mcp-server')
	.description('MCP Server that dynamically exposes OpenAPI/Swagger specifications as tools')
	.version(VERSION);

//-- Default command: start MCP server
program
	.command('serve', { isDefault: true })
	.description('Start the MCP server (default command)')
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

export async function runCli() {
	await program.parseAsync(process.argv);
}
