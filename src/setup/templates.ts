import type { EnvironmentConfig, McpClientType } from './types.js';

//-- Generate environment variables object for MCP client config
export function generateEnvironmentVars(
	environments: EnvironmentConfig[],
	defaultEnvironment: string
): Record<string, string> {
	const envVars: Record<string, string> = {};

	//-- ENVIRONMENTS list
	envVars.ENVIRONMENTS = environments.map((e) => e.name).join(',');

	//-- DEFAULT_ENVIRONMENT
	if (defaultEnvironment) {
		envVars.DEFAULT_ENVIRONMENT = defaultEnvironment;
	}

	//-- Per-environment URLs
	for (const env of environments) {
		const envUpper = env.name.toUpperCase();
		envVars[`API_SPEC_URL_${envUpper}`] = env.specUrl;

		if (env.baseUrl) {
			envVars[`API_BASE_URL_${envUpper}`] = env.baseUrl;
		}
	}

	return envVars;
}

//-- Generate config for VS Code (mcp.json)
export function generateVSCodeConfig(serverName: string, environments: EnvironmentConfig[], defaultEnvironment: string) {
	const envVars = generateEnvironmentVars(environments, defaultEnvironment);

	return {
		servers: {
			[serverName]: {
				type: 'stdio',
				command: 'npx',
				args: ['agdevx-openapi-mcp-server'],
				env: envVars
			}
		}
	};
}

//-- Generate config for Claude Desktop (claude_desktop_config.json)
export function generateClaudeDesktopConfig(
	serverName: string,
	environments: EnvironmentConfig[],
	defaultEnvironment: string
) {
	const envVars = generateEnvironmentVars(environments, defaultEnvironment);

	return {
		mcpServers: {
			[serverName]: {
				command: 'npx',
				args: ['agdevx-openapi-mcp-server'],
				env: envVars
			}
		}
	};
}

//-- Generate config for Claude Code (config.json)
export function generateClaudeCodeConfig(
	serverName: string,
	environments: EnvironmentConfig[],
	defaultEnvironment: string
) {
	const envVars = generateEnvironmentVars(environments, defaultEnvironment);

	return {
		mcpServers: {
			[serverName]: {
				command: 'npx',
				args: ['agdevx-openapi-mcp-server'],
				env: envVars
			}
		}
	};
}

//-- Generate config based on client type
export function generateConfig(
	clientType: McpClientType,
	serverName: string,
	environments: EnvironmentConfig[],
	defaultEnvironment: string
): any {
	switch (clientType) {
		case 'vscode':
			return generateVSCodeConfig(serverName, environments, defaultEnvironment);
		case 'claude-desktop':
			return generateClaudeDesktopConfig(serverName, environments, defaultEnvironment);
		case 'claude-code':
			return generateClaudeCodeConfig(serverName, environments, defaultEnvironment);
		default:
			throw new Error(`Unknown client type: ${clientType}`);
	}
}
