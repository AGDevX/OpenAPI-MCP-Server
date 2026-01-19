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
			error: 'Invalid URL format. Please enter a complete URL (e.g., https://api.example.com/openapi/v1.json)'
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
				error: 'URL does not return a valid OpenAPI/Swagger specification. Ensure the URL points to an OpenAPI JSON or YAML file.'
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
				const status = error.response.status;
				let message = `HTTP ${status}: ${error.response.statusText}`;

				if (status === 404) {
					message += '. The OpenAPI spec was not found at this URL. Check the path is correct.';
				} else if (status === 401 || status === 403) {
					message += '. Authentication required. The spec endpoint may require credentials.';
				} else if (status === 500 || status === 502 || status === 503) {
					message += '. The server encountered an error. Try again later or contact the API administrator.';
				}

				return {
					valid: false,
					error: message
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
