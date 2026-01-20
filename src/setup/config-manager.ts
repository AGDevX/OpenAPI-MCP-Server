import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { McpClientType, EnvironmentConfig } from './types.js';
import { generateConfig } from './templates.js';

//-- Get platform-specific config file path for MCP clients
export function getConfigPath(clientType: McpClientType): string {
	const platform = process.platform;
	const homeDir = os.homedir();
	const appData = process.env.APPDATA || '';

	const paths: Record<McpClientType, Record<string, string>> = {
		vscode: {
			win32: path.join(appData, 'Code', 'User', 'mcp.json'),
			darwin: path.join(homeDir, '.config', 'Code', 'User', 'mcp.json'),
			linux: path.join(homeDir, '.config', 'Code', 'User', 'mcp.json')
		},
		'claude-desktop': {
			win32: path.join(appData, 'Claude', 'claude_desktop_config.json'),
			darwin: path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
			linux: path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json')
		},
		'claude-code': {
			win32: path.join(homeDir, 'claude.json'),
			darwin: path.join(homeDir, 'claude.json'),
			linux: path.join(homeDir, 'claude.json')
		}
	};

	const platformPath = paths[clientType]?.[platform];
	if (!platformPath) {
		throw new Error(
			`Unsupported platform: ${platform} for client: ${clientType}.\n\n` +
				`This MCP server currently supports Windows, macOS, and Linux.\n` +
				`If you're running on a supported platform but seeing this error, please report it as a bug.`
		);
	}

	return platformPath;
}

//-- Check if a config file exists
export async function configExists(clientType: McpClientType): Promise<boolean> {
	try {
		const configPath = getConfigPath(clientType);
		await fs.access(configPath);
		return true;
	} catch {
		return false;
	}
}

//-- Read existing config file
export async function readConfig(clientType: McpClientType): Promise<any | null> {
	try {
		const configPath = getConfigPath(clientType);
		const content = await fs.readFile(configPath, 'utf-8');
		return JSON.parse(content);
	} catch (error) {
		return null;
	}
}

//-- Create backup of config file
async function createBackup(configPath: string): Promise<boolean> {
	try {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const backupPath = `${configPath}.backup.${timestamp}`;
		await fs.copyFile(configPath, backupPath);
		return true;
	} catch {
		return false;
	}
}

//-- Merge new server config into existing config
function mergeConfig(existingConfig: any, newConfig: any, clientType: McpClientType): any {
	//-- For VS Code, merge into "servers" property
	if (clientType === 'vscode') {
		return {
			...existingConfig,
			servers: {
				...(existingConfig.servers || {}),
				...newConfig.servers
			}
		};
	}

	//-- For Claude Desktop and Claude Code, merge into "mcpServers" property
	return {
		...existingConfig,
		mcpServers: {
			...(existingConfig.mcpServers || {}),
			...newConfig.mcpServers
		}
	};
}

//-- Write config file with backup
export async function writeConfig(
	clientType: McpClientType,
	serverName: string,
	environments: EnvironmentConfig[],
	defaultEnvironment: string
): Promise<{ success: boolean; path: string; backedUp?: boolean; error?: string }> {
	try {
		const configPath = getConfigPath(clientType);
		const newConfig = generateConfig(clientType, serverName, environments, defaultEnvironment);

		//-- Ensure parent directory exists
		const parentDir = path.dirname(configPath);
		await fs.mkdir(parentDir, { recursive: true });

		//-- Read existing config if it exists
		const exists = await configExists(clientType);
		let backedUp = false;

		if (exists) {
			//-- Create backup
			backedUp = await createBackup(configPath);

			//-- Read and merge existing config
			const existingConfig = await readConfig(clientType);
			if (existingConfig) {
				const mergedConfig = mergeConfig(existingConfig, newConfig, clientType);
				await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
				return { success: true, path: configPath, backedUp };
			}
		}

		//-- Write new config
		await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
		return { success: true, path: configPath, backedUp };
	} catch (error) {
		const configPath = getConfigPath(clientType);
		return {
			success: false,
			path: configPath,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

//-- Detect which MCP clients are installed (config files exist)
export async function detectClients(): Promise<Array<{ type: McpClientType; found: boolean; path: string }>> {
	const clientTypes: McpClientType[] = ['vscode', 'claude-desktop', 'claude-code'];
	const results = [];

	for (const clientType of clientTypes) {
		const configPath = getConfigPath(clientType);
		const found = await configExists(clientType);
		results.push({ type: clientType, found, path: configPath });
	}

	return results;
}
