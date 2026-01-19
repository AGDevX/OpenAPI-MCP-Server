import { Command } from 'commander';
import { startConfigUI } from './config-ui/server.js';
import { startServer } from './server.js';

const program = new Command();

//-- Get version from package.json
//-- Note: In production, this would be imported from package.json
//-- For now, we'll hardcode it to match the current version
const VERSION = '0.0.2';

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

//-- Config UI command
program
	.command('config-ui')
	.description('Launch the web-based configuration UI')
	.option('-p, --port <port>', 'Port to run the config UI on', '3000')
	.option('--no-open', 'Do not automatically open the browser')
	.action(async (options) => {
		const port = parseInt(options.port, 10);
		const openBrowser = options.open !== false;

		await startConfigUI({
			port,
			openBrowser
		});
	});

export async function runCli() {
	await program.parseAsync(process.argv);
}
