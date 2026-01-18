const THIRTY_SECONDS_IN_MS = '30000';
const SIXTY_SECONDS_IN_MS = '60000';

export const SERVER_CONFIG = {
	name: process.env.MCP_SERVER_NAME || 'openapi-mcp-server',
	version: '1.0.0',
	defaultPort: 3000
};

export const OPENAPI_CONFIG = {
	specUrl: process.env.API_SPEC_URL || '',
	baseUrl: process.env.API_BASE_URL || '',
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
