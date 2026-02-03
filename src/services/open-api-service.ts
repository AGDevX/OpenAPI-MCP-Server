import axios, { AxiosInstance } from 'axios';
import https from 'https';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import { logger } from '@utils/logger.js';

import { OPENAPI_CONFIG } from '../config.js';

type OpenAPIDocument = OpenAPIV3.Document | OpenAPIV3_1.Document;
type OperationObject = OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
type ParameterObject = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;

export interface ApiOperation {
	operationId: string;
	method: string;
	path: string;
	summary?: string;
	description?: string;
	parameters: ParameterObject[];
	requestBody?: OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject;
}

//-- Service for fetching and managing OpenAPI specifications
export class OpenApiService {
	private spec: OpenAPIDocument | null = null;
	private apiClient: AxiosInstance;
	private lastFetch: Date | null = null;
	private specUrl: string;
	private baseUrl: string;

	constructor(specUrl: string, baseUrl: string) {
		if (!specUrl) {
			throw new Error(
				'API_SPEC_URL is required.\n\n' + 'Action required: Set API_SPEC_URL_{ENVIRONMENT} in your .env file'
			);
		}

		if (!baseUrl) {
			throw new Error(
				'API_BASE_URL is required.\n\n' + 'Action required: Set API_BASE_URL_{ENVIRONMENT} in your .env file'
			);
		}

		this.specUrl = specUrl;
		this.baseUrl = baseUrl;

		this.apiClient = axios.create({
			timeout: OPENAPI_CONFIG.timeout,
			headers: {
				'Content-Type': 'application/json'
			},
			httpsAgent: new https.Agent()
		});
	}

	//-- Fetch the OpenAPI spec from the configured URL
	async fetchSpec(): Promise<OpenAPIDocument> {
		if (!this.specUrl) {
			throw new Error(
				'API_SPEC_URL is not configured for this environment.\n\n' +
					'Action required:\n' +
					'1. Set API_SPEC_URL_{ENVIRONMENT} in your .env file\n' +
					'2. Example: API_SPEC_URL_DEV=https://dev-api.example.com/openapi/v1.json\n' +
					'3. Restart the MCP server'
			);
		}

		try {
			logger.log(`Fetching OpenAPI spec from: ${this.specUrl}`);
			const response = await axios.get<OpenAPIDocument>(this.specUrl, {
				timeout: OPENAPI_CONFIG.timeout,
				httpsAgent: new https.Agent()
			});

			this.spec = response.data;
			this.lastFetch = new Date();
			logger.log(`OpenAPI spec loaded successfully. Title: ${this.spec.info?.title}, Version: ${this.spec.info?.version}`);

			return this.spec;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				let actionableMessage = `Failed to fetch OpenAPI spec: ${error.message}\n\n`;

				if (error.code === 'ECONNREFUSED') {
					actionableMessage +=
						'Action required:\n' +
						'1. Verify the API server is running\n' +
						'2. Check if the URL is correct in your .env file\n' +
						'3. Ensure there are no firewall or network issues';
				} else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
					actionableMessage +=
						'Action required:\n' +
						'1. Check your network connection\n' +
						'2. Try increasing API_TIMEOUT in your .env file\n' +
						'3. Verify the API server is not overloaded';
				} else if (error.message.includes('certificate')) {
					actionableMessage +=
						'Action required:\n' +
						'1. For self-signed certificates, set NODE_TLS_REJECT_UNAUTHORIZED=0 in your .env\n' +
						'2. Ensure your API has valid SSL certificates\n' +
						'3. Contact your API administrator if certificate issues persist';
				} else if (error.response?.status === 404) {
					actionableMessage +=
						'Action required:\n' +
						'1. Verify the OpenAPI spec URL path is correct\n' +
						'2. Check if the endpoint exists on your API server\n' +
						'3. Confirm the API version in the URL matches your deployment';
				} else if (error.response?.status === 401 || error.response?.status === 403) {
					actionableMessage +=
						'Action required:\n' +
						'1. The OpenAPI spec endpoint requires authentication\n' +
						'2. Configure your API to allow public access to the OpenAPI spec\n' +
						'3. Or contact your API administrator for access';
				} else {
					actionableMessage +=
						'Action required:\n' +
						'1. Verify API_SPEC_URL is correct in your .env file\n' +
						'2. Test the URL in your browser: ' +
						this.specUrl +
						'\n' +
						'3. Check server logs for more details';
				}

				throw new Error(actionableMessage);
			}
			throw error;
		}
	}

	//-- Get the cached spec or fetch if not available
	async getSpec(): Promise<OpenAPIDocument> {
		if (!this.spec) {
			await this.fetchSpec();
		}

		//-- Check if refresh is needed
		if (
			OPENAPI_CONFIG.refreshInterval > 0 &&
			this.lastFetch &&
			Date.now() - this.lastFetch.getTime() > OPENAPI_CONFIG.refreshInterval
		) {
			logger.log('Refreshing OpenAPI spec...');
			await this.fetchSpec();
		}

		return this.spec!;
	}

	//-- Get the base URL for API calls
	//-- This URL is used exclusively for making API calls
	//-- The spec URL is only used for fetching the OpenAPI specification
	getBaseUrl(): string {
		return this.baseUrl;
	}

	//-- Extract all operations from the OpenAPI spec
	async getOperations(): Promise<ApiOperation[]> {
		const spec = await this.getSpec();
		const operations: ApiOperation[] = [];

		if (!spec.paths) {
			return operations;
		}

		for (const [path, pathItem] of Object.entries(spec.paths)) {
			if (!pathItem) continue;

			const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;

			for (const method of methods) {
				const operation = pathItem[method] as OperationObject | undefined;

				if (operation) {
					//-- Get parameters from both operation and path level
					const pathParams = (pathItem.parameters as ParameterObject[]) || [];
					const opParams = (operation.parameters as ParameterObject[]) || [];
					const allParams = [...pathParams, ...opParams];

					operations.push({
						operationId: operation.operationId || `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
						method: method.toUpperCase(),
						path,
						summary: operation.summary,
						description: operation.description,
						parameters: allParams,
						requestBody: operation.requestBody as OpenAPIV3.RequestBodyObject | undefined
					});
				}
			}
		}

		return operations;
	}

	//-- Execute an API call based on operation details
	async executeOperation(operation: ApiOperation, parameters: Record<string, any>): Promise<any> {
		const baseUrl = this.getBaseUrl();
		let url = baseUrl + operation.path;

		//-- Replace path parameters
		const pathParams: Record<string, any> = {};
		const queryParams: Record<string, any> = {};
		const headerParams: Record<string, any> = {};
		let bodyData: any = null;

		//-- Process parameters
		for (const param of operation.parameters) {
			const paramName = param.name;
			const paramValue = parameters[paramName];

			if (paramValue !== undefined) {
				switch (param.in) {
					case 'path':
						pathParams[paramName] = paramValue;
						url = url.replace(`{${paramName}}`, encodeURIComponent(String(paramValue)));
						break;
					case 'query':
						queryParams[paramName] = paramValue;
						break;
					case 'header':
						headerParams[paramName] = paramValue;
						break;
				}
			}
		}

		//-- Handle request body
		if (operation.requestBody && parameters.body) {
			bodyData = parameters.body;
		}

		try {
			logger.log(`Executing ${operation.method} ${url}`);

			const response = await this.apiClient.request({
				method: operation.method,
				url,
				params: queryParams,
				headers: headerParams,
				data: bodyData
			});

			return response.data;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				const status = error.response?.status || 'unknown';
				const statusText = error.response?.statusText || 'unknown';
				const errorData = error.response?.data || error.message;

				let actionableMessage = `API call failed (${status} ${statusText}): ${JSON.stringify(errorData)}\n\n`;

				if (error.code === 'ECONNREFUSED') {
					actionableMessage += 'The API server is not reachable. Verify the API is running and the base URL is correct.';
				} else if (error.code === 'ETIMEDOUT') {
					actionableMessage += 'The API request timed out. The server may be slow or overloaded.';
				} else if (status === 401) {
					actionableMessage += 'Authentication required. Check if your API requires authentication headers or credentials.';
				} else if (status === 403) {
					actionableMessage += 'Access forbidden. You may not have permission to access this endpoint.';
				} else if (status === 404) {
					actionableMessage += 'Endpoint not found. The API path may be incorrect or the endpoint may not exist.';
				} else if (status === 429) {
					actionableMessage += 'Rate limit exceeded. Too many requests were made to the API. Wait before retrying.';
				} else if (status === 500 || status === 502 || status === 503) {
					actionableMessage += 'The API server encountered an error. Check the API server logs for more details.';
				}

				throw new Error(actionableMessage);
			}
			throw error;
		}
	}

	//-- Get API info from spec
	async getApiInfo(): Promise<{ title: string; version: string; description?: string }> {
		const spec = await this.getSpec();
		return {
			title: spec.info?.title || 'Unknown API',
			version: spec.info?.version || 'Unknown',
			description: spec.info?.description
		};
	}

	//-- Get a specific operation by operationId
	async getOperationById(operationId: string): Promise<ApiOperation | null> {
		const operations = await this.getOperations();
		return operations.find((op) => op.operationId === operationId) || null;
	}

	//-- Get the last fetch timestamp
	getLastFetchTime(): Date | null {
		return this.lastFetch;
	}

	//-- Check if environment is reachable by attempting to fetch spec
	async checkReachability(): Promise<boolean> {
		try {
			await axios.get(this.specUrl, {
				timeout: 5000, //-- Quick timeout for health check
				httpsAgent: new https.Agent()
			});
			return true;
		} catch {
			return false;
		}
	}
}
