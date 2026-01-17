/**
 * Server configuration
 */

export const SERVER_CONFIG = {
	name: 'weather-alerts',
	version: '1.0.0',
	defaultPort: 3000
};

export const RESOURCES = {
	serverInfo: {
		name: 'Server Information',
		uri: 'weather://info',
		description: 'Information about this weather server',
		mimeType: 'text/plain' as const
	}
};
