import axios from 'axios';
import https from 'https';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import type { ValidateUrlResponse } from './types.js';

type OpenAPIDocument = OpenAPIV3.Document | OpenAPIV3_1.Document;

const VALIDATION_TIMEOUT = 10000; //-- 10 seconds

//-- Validate OpenAPI spec URL by fetching and parsing
export async function validateOpenApiUrl(url: string): Promise<ValidateUrlResponse> {
	//-- Basic URL format validation
	try {
		new URL(url);
	} catch {
		return {
			valid: false,
			error: 'Invalid URL format'
		};
	}

	//-- Try to fetch the OpenAPI spec
	try {
		const response = await axios.get<OpenAPIDocument>(url, {
			timeout: VALIDATION_TIMEOUT,
			httpsAgent: new https.Agent({
				rejectUnauthorized: false //-- Allow self-signed certificates
			}),
			headers: {
				Accept: 'application/json'
			}
		});

		const spec = response.data;

		//-- Validate it's an OpenAPI spec
		//-- Check for openapi field (OpenAPI 3.x) or swagger field (OpenAPI 2.x/Swagger)
		if (!spec.openapi && !(spec as any).swagger) {
			return {
				valid: false,
				error: 'URL does not return an OpenAPI/Swagger specification'
			};
		}

		//-- Extract spec info
		const title = spec.info?.title || 'Unknown API';
		const version = spec.info?.version || 'Unknown';
		const description = spec.info?.description;

		return {
			valid: true,
			spec: {
				title,
				version,
				description
			}
		};
	} catch (error) {
		if (axios.isAxiosError(error)) {
			if (error.code === 'ECONNREFUSED') {
				return {
					valid: false,
					error: 'Connection refused - check if the URL is correct and the server is running'
				};
			}

			if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
				return {
					valid: false,
					error: 'Connection timeout - the server is not responding'
				};
			}

			if (error.response) {
				return {
					valid: false,
					error: `HTTP ${error.response.status}: ${error.response.statusText}`
				};
			}

			if (error.request) {
				return {
					valid: false,
					error: 'No response from server - check your internet connection and VPN'
				};
			}

			return {
				valid: false,
				error: error.message
			};
		}

		return {
			valid: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred'
		};
	}
}
