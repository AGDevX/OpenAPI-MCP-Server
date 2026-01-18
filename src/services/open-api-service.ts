import axios, { AxiosInstance } from 'axios';
import https from 'https';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
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

	constructor() {
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
		if (!OPENAPI_CONFIG.specUrl) {
			throw new Error('API_SPEC_URL environment variable is not configured');
		}

		try {
			console.log(`Fetching OpenAPI spec from: ${OPENAPI_CONFIG.specUrl}`);
			const response = await axios.get<OpenAPIDocument>(OPENAPI_CONFIG.specUrl, {
				timeout: OPENAPI_CONFIG.timeout,
				httpsAgent: new https.Agent()
			});

			this.spec = response.data;
			this.lastFetch = new Date();
			console.log(`OpenAPI spec loaded successfully. Title: ${this.spec.info?.title}, Version: ${this.spec.info?.version}`);

			return this.spec;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				throw new Error(`Failed to fetch OpenAPI spec: ${error.message}`);
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
		if (OPENAPI_CONFIG.refreshInterval > 0 && this.lastFetch && Date.now() - this.lastFetch.getTime() > OPENAPI_CONFIG.refreshInterval) {
			console.log('Refreshing OpenAPI spec...');
			await this.fetchSpec();
		}

		return this.spec!;
	}

	//-- Get the base URL for API calls
	getBaseUrl(): string {
		if (OPENAPI_CONFIG.baseUrl) {
			return OPENAPI_CONFIG.baseUrl;
		}

		//-- Try to extract from spec
		if (this.spec) {
			if ('servers' in this.spec && this.spec.servers && this.spec.servers.length > 0) {
				return this.spec.servers[0].url;
			}
		}

		throw new Error('API_BASE_URL not configured and no servers found in OpenAPI spec');
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
			console.log(`Executing ${operation.method} ${url}`);

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

				throw new Error(`API call failed (${status} ${statusText}): ${JSON.stringify(errorData)}`);
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
}
