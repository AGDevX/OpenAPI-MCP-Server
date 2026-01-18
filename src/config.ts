const THIRTY_SECONDS_IN_MS = '30000';
const SIXTY_SECONDS_IN_MS = '60000';

export const SERVER_CONFIG = {
	name: process.env.MCP_SERVER_NAME || 'agdevx-openapi-mcp-server',
	version: '1.0.0',
	defaultPort: 3000
};

//-- Parse environment configuration
function parseEnvironmentConfig() {
	const environmentsStr = process.env.ENVIRONMENTS || '';
	const environments = environmentsStr
		.split(',')
		.map((e) => e.trim())
		.filter((e) => e.length > 0);

	//-- If no environments configured, return empty
	if (environments.length === 0) {
		return {
			environments: [],
			defaultEnvironment: '',
			configs: {}
		};
	}

	//-- Parse configuration for each environment
	const configs: Record<string, { specUrl: string; baseUrl: string }> = {};

	for (const env of environments) {
		const envUpper = env.toUpperCase();
		const specUrl = process.env[`API_SPEC_URL_${envUpper}`] || '';
		const baseUrl = process.env[`API_BASE_URL_${envUpper}`] || '';

		configs[env] = {
			specUrl,
			baseUrl
		};
	}

	const defaultEnvironment = process.env.DEFAULT_ENVIRONMENT || environments[0];

	return {
		environments,
		defaultEnvironment,
		configs
	};
}

export const ENVIRONMENT_CONFIG = parseEnvironmentConfig();

export const OPENAPI_CONFIG = {
	timeout: parseInt(process.env.API_TIMEOUT || THIRTY_SECONDS_IN_MS, 10),
	refreshInterval: parseInt(process.env.SPEC_REFRESH_INTERVAL || '0', 10) //-- 0 means no refresh
};

export const RATE_LIMIT_CONFIG = {
	enabled: process.env.RATE_LIMIT_ENABLED !== 'false', //-- Default: true
	maxRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '10', 10),
	windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || SIXTY_SECONDS_IN_MS, 10) //-- Default: 60 seconds
};

export const RESOURCES = {
	serverInfo: {
		name: 'Server Information',
		uri: 'api://info',
		description: 'Information about this API MCP server',
		mimeType: 'text/plain' as const
	}
};
