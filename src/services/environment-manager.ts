import { OpenApiService } from './open-api-service.js';
import { ENVIRONMENT_CONFIG, OPENAPI_CONFIG } from '../config.js';
import { logger } from '../utils/logger.js';

//-- Manages multiple OpenAPI service instances for different environments
export class EnvironmentManager {
	private services: Map<string, OpenApiService> = new Map();
	private defaultEnvironment: string;
	private environments: string[];

	constructor() {
		this.environments = ENVIRONMENT_CONFIG.environments;
		this.defaultEnvironment = ENVIRONMENT_CONFIG.defaultEnvironment;

		//-- Initialize OpenApiService for each environment
		for (const env of this.environments) {
			const config = ENVIRONMENT_CONFIG.configs[env];

			if (!config || !config.specUrl) {
				logger.warn(`Environment ${env} is missing API_SPEC_URL configuration, skipping...`);
				continue;
			}

			const service = new OpenApiService(config.specUrl, config.baseUrl);
			this.services.set(env, service);
		}

		if (this.services.size === 0) {
			throw new Error(
				'No valid environments configured.\n\n' +
					'Action required:\n' +
					'1. Set ENVIRONMENTS in your .env file (e.g., ENVIRONMENTS=prod)\n' +
					'2. Set API_SPEC_URL for each environment (e.g., API_SPEC_URL_PROD=https://api.example.com/openapi/v1.json)\n' +
					'3. Restart the MCP server\n\n' +
					'See .env.example for configuration examples.'
			);
		}

		logger.always(`Configured environments: ${Array.from(this.services.keys()).join(', ')}`);
		logger.always(`Default environment: ${this.defaultEnvironment}`);
	}

	//-- Initialize all environments (fetch specs)
	async initializeAll(): Promise<void> {
		logger.always('Initializing all environments...');

		const promises: Promise<void>[] = [];

		for (const [env, service] of this.services) {
			promises.push(
				service
					.fetchSpec()
					.then(() => {
						logger.log(`✓ Environment "${env}" initialized successfully`);
					})
					.catch((error) => {
						logger.error(`✗ Failed to initialize environment "${env}":`, error.message);
						const troubleshooting = error.message.includes('ECONNREFUSED')
							? 'Check if the API server is running and accessible'
							: error.message.includes('certificate')
								? 'For self-signed certificates, set NODE_TLS_REJECT_UNAUTHORIZED=0 in your .env file'
								: error.message.includes('timeout')
									? 'The server is taking too long to respond. Check your API_TIMEOUT setting or network connection'
									: 'Verify the API_SPEC_URL is correct and the endpoint returns a valid OpenAPI specification';

						throw new Error(`Failed to initialize environment "${env}": ${error.message}\n\n` + `Action required: ${troubleshooting}`);
					})
			);
		}

		await Promise.all(promises);
		logger.always('All environments initialized successfully');
	}

	//-- Get service for a specific environment
	getService(environment?: string): OpenApiService {
		const env = environment || this.defaultEnvironment;

		const service = this.services.get(env);
		if (!service) {
			throw new Error(
				`Environment "${env}" not found.\n\n` +
					`Available environments: ${this.getEnvironments().join(', ')}\n\n` +
					`Action required: Use one of the available environments, or add "${env}" to your ENVIRONMENTS configuration.`
			);
		}

		return service;
	}

	//-- Get list of all configured environments
	getEnvironments(): string[] {
		return Array.from(this.services.keys());
	}

	//-- Get the default environment name
	getDefaultEnvironment(): string {
		return this.defaultEnvironment;
	}

	//-- Check if an environment exists
	hasEnvironment(environment: string): boolean {
		return this.services.has(environment);
	}

	//-- Set the default environment
	setDefaultEnvironment(environment: string): void {
		if (!this.hasEnvironment(environment)) {
			throw new Error(
				`Environment "${environment}" not found.\n\n` +
					`Available environments: ${this.getEnvironments().join(', ')}\n\n` +
					`Action required: Choose one of the available environments.`
			);
		}

		this.defaultEnvironment = environment;
		logger.log(`Default environment changed to: ${environment}`);
	}

	//-- Get environment info
	async getEnvironmentInfo(environment?: string): Promise<{
		environment: string;
		apiTitle: string;
		apiVersion: string;
		baseUrl: string;
		operationsCount: number;
	}> {
		const env = environment || this.defaultEnvironment;
		const service = this.getService(env);

		const apiInfo = await service.getApiInfo();
		const operations = await service.getOperations();

		return {
			environment: env,
			apiTitle: apiInfo.title,
			apiVersion: apiInfo.version,
			baseUrl: service.getBaseUrl(),
			operationsCount: operations.length
		};
	}
}
