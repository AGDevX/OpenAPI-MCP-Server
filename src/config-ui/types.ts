export type McpClientType = 'vscode' | 'claude-desktop' | 'claude-code';

export interface EnvironmentConfig {
	name: string;
	specUrl: string;
	baseUrl?: string;
}

export interface ValidateUrlRequest {
	url: string;
}

export interface ValidateUrlResponse {
	valid: boolean;
	error?: string;
	spec?: {
		title: string;
		version: string;
		description?: string;
	};
}

export interface DetectedClient {
	type: McpClientType;
	found: boolean;
	path: string;
}

export interface DetectClientResponse {
	clients: DetectedClient[];
}

export interface GetConfigRequest {
	client: McpClientType;
}

export interface GetConfigResponse {
	exists: boolean;
	config?: any;
	path: string;
}

export interface SaveConfigRequest {
	client: McpClientType;
	serverName: string;
	environments: EnvironmentConfig[];
	defaultEnvironment: string;
	autoUpdate: boolean;
}

export interface SaveConfigResponse {
	success: boolean;
	config: any;
	path: string;
	backedUp?: boolean;
	error?: string;
}
