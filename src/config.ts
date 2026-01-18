export const SERVER_CONFIG = {
	name: process.env.MCP_SERVER_NAME || 'openapi-mcp-server',
	version: '1.0.0',
	defaultPort: 3000
};

export const OPENAPI_CONFIG = {
	specUrl: process.env.API_SPEC_URL || '',
	baseUrl: process.env.API_BASE_URL || '',
	timeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
	refreshInterval: parseInt(process.env.SPEC_REFRESH_INTERVAL || '0', 10) //-- 0 means no refresh
};

export const RESOURCES = {
	serverInfo: {
		name: 'Server Information',
		uri: 'api://info',
		description: 'Information about this API MCP server',
		mimeType: 'text/plain' as const
	}
};
