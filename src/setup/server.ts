import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';
import { validateOpenApiUrl } from './validator.js';
import { detectClients, readConfig, writeConfig, getConfigPath } from './config-manager.js';
import { generateConfig } from './templates.js';
import type {
	ValidateUrlRequest,
	GetConfigRequest,
	SaveConfigRequest,
	McpClientType,
	SaveConfigResponse
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SetupOptions {
	port?: number;
	openBrowser?: boolean;
}

//-- Create and configure Express app for setup
export function createSetupApp(): express.Application {
	const app = express();

	//-- Middleware
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	//-- CORS for local development
	app.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-Type');
		next();
	});

	//-- Serve UI HTML file
	app.get('/', (req, res) => {
		res.sendFile(path.join(__dirname, 'ui.html'));
	});

	//-- API: Validate OpenAPI URL
	app.post('/api/validate-url', async (req, res) => {
		try {
			const { url } = req.body as ValidateUrlRequest;

			if (!url) {
				return res.status(400).json({ error: 'URL is required' });
			}

			const result = await validateOpenApiUrl(url);
			res.json(result);
		} catch (error) {
			res.status(500).json({
				valid: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	});

	//-- API: Detect installed MCP clients
	app.get('/api/detect-client', async (req, res) => {
		try {
			const clients = await detectClients();
			res.json({ clients });
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	});

	//-- API: Get existing config for a client
	app.get('/api/config', async (req, res) => {
		try {
			const { client } = req.query as { client?: string };

			if (!client || !['vscode', 'claude-desktop', 'claude-code'].includes(client)) {
				return res.status(400).json({ error: 'Valid client parameter is required' });
			}

			const clientType = client as McpClientType;
			const configPath = getConfigPath(clientType);
			const config = await readConfig(clientType);

			res.json({
				exists: config !== null,
				config: config || undefined,
				path: configPath
			});
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	});

	//-- API: Save configuration
	app.post('/api/save-config', async (req, res) => {
		try {
			const { client, serverName, environments, defaultEnvironment, autoUpdate } = req.body as SaveConfigRequest;

			//-- Validate inputs
			if (!client || !['vscode', 'claude-desktop', 'claude-code'].includes(client)) {
				return res.status(400).json({ success: false, error: 'Valid client is required' });
			}

			if (!serverName || serverName.trim().length === 0) {
				return res.status(400).json({ success: false, error: 'Server name is required' });
			}

			if (!environments || environments.length === 0) {
				return res.status(400).json({ success: false, error: 'At least one environment is required' });
			}

			if (!defaultEnvironment || defaultEnvironment.trim().length === 0) {
				return res.status(400).json({ success: false, error: 'Default environment is required' });
			}

			//-- Validate environment names
			for (const env of environments) {
				if (!env.name || !env.specUrl) {
					return res.status(400).json({
						success: false,
						error: 'Each environment must have a name and spec URL'
					});
				}

				//-- Validate environment name format (alphanumeric, dash, underscore only)
				if (!/^[a-zA-Z0-9_-]+$/.test(env.name)) {
					return res.status(400).json({
						success: false,
						error: `Invalid environment name "${env.name}". Use only letters, numbers, dashes, and underscores.`
					});
				}
			}

			//-- Validate server name format
			if (!/^[a-zA-Z0-9_-]+$/.test(serverName)) {
				return res.status(400).json({
					success: false,
					error: 'Invalid server name. Use only letters, numbers, dashes, and underscores.'
				});
			}

			const clientType = client as McpClientType;

			//-- If autoUpdate is true, write to config file
			if (autoUpdate) {
				const result = await writeConfig(clientType, serverName, environments, defaultEnvironment);

				if (!result.success) {
					//-- Fall back to manual mode if write fails
					const config = generateConfig(clientType, serverName, environments, defaultEnvironment);
					return res.json({
						success: false,
						config,
						path: result.path,
						error: `Could not write to config file: ${result.error}. Please copy the configuration manually.`
					} as SaveConfigResponse);
				}

				return res.json(result as SaveConfigResponse);
			}

			//-- Manual mode: just return the config
			const config = generateConfig(clientType, serverName, environments, defaultEnvironment);
			const configPath = getConfigPath(clientType);

			res.json({
				success: true,
				config,
				path: configPath
			} as SaveConfigResponse);
		} catch (error) {
			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			} as SaveConfigResponse);
		}
	});

	return app;
}

//-- Start setup server
export async function startSetup(options: SetupOptions = {}): Promise<void> {
	const port = options.port || 3000;
	const openBrowser = options.openBrowser !== false; //-- Default: true

	const app = createSetupApp();

	return new Promise((resolve) => {
		const server = app.listen(port, async () => {
			const url = `http://localhost:${port}`;

			console.log('');
			console.log('🚀 AGDevX OpenAPI MCP Server - Setup Wizard');
			console.log('');
			console.log(`   Open your browser to: ${url}`);
			console.log('');
			console.log('   Press Ctrl+C to stop');
			console.log('');

			//-- Auto-open browser
			if (openBrowser) {
				try {
					await open(url);
				} catch (error) {
					console.log('   Could not open browser automatically. Please open the URL manually.');
				}
			}

			resolve();
		});

		//-- Handle shutdown gracefully
		process.on('SIGINT', () => {
			console.log('\n\nShutting down...');
			server.close(() => {
				process.exit(0);
			});
		});
	});
}
