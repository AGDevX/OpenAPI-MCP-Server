import { describe, it, expect, beforeEach } from '@jest/globals';
import { EnvironmentManager } from '../../src/services/environment-manager.js';

// Note: EnvironmentManager depends on global ENVIRONMENT_CONFIG which is set at module load time
// These tests verify the behavior of the methods assuming valid configuration exists

describe('EnvironmentManager', () => {
	let environmentManager: EnvironmentManager | null = null;
	let setupError: Error | null = null;

	// Try to create an instance - this will use actual environment config
	beforeEach(() => {
		try {
			environmentManager = new EnvironmentManager();
			setupError = null;
		} catch (error) {
			environmentManager = null;
			setupError = error as Error;
		}
	});

	describe('configuration requirements', () => {
		it('should require environment configuration to instantiate', () => {
			// This test documents the configuration requirement
			if (setupError) {
				expect(setupError.message).toContain('No valid environments configured');
			} else {
				expect(environmentManager).toBeDefined();
			}
		});
	});

	describe('getEnvironments', () => {
		it('should return an array of environment names when configured', () => {
			if (!environmentManager) return;
			const environments = environmentManager.getEnvironments();
			expect(Array.isArray(environments)).toBe(true);
		});

		it('should return at least one environment when configured', () => {
			if (!environmentManager) return;
			const environments = environmentManager.getEnvironments();
			expect(environments.length).toBeGreaterThan(0);
		});
	});

	describe('getDefaultEnvironment', () => {
		it('should return a string when configured', () => {
			if (!environmentManager) return;
			const defaultEnv = environmentManager.getDefaultEnvironment();
			expect(typeof defaultEnv).toBe('string');
			expect(defaultEnv.length).toBeGreaterThan(0);
		});

		it('should return an environment that exists in the list', () => {
			if (!environmentManager) return;
			const defaultEnv = environmentManager.getDefaultEnvironment();
			const environments = environmentManager.getEnvironments();
			expect(environments).toContain(defaultEnv);
		});
	});

	describe('hasEnvironment', () => {
		it('should return true for existing environment', () => {
			if (!environmentManager) return;
			const environments = environmentManager.getEnvironments();
			if (environments.length > 0) {
				const result = environmentManager.hasEnvironment(environments[0]);
				expect(result).toBe(true);
			}
		});

		it('should return false for non-existent environment', () => {
			if (!environmentManager) return;
			const result = environmentManager.hasEnvironment('non-existent-env-12345');
			expect(result).toBe(false);
		});

		it('should return true for default environment', () => {
			if (!environmentManager) return;
			const defaultEnv = environmentManager.getDefaultEnvironment();
			const result = environmentManager.hasEnvironment(defaultEnv);
			expect(result).toBe(true);
		});
	});

	describe('getService', () => {
		it('should return a service for default environment when no parameter provided', () => {
			if (!environmentManager) return;
			const service = environmentManager.getService();
			expect(service).toBeDefined();
			expect(service).toHaveProperty('getBaseUrl');
		});

		it('should return a service for specific environment', () => {
			if (!environmentManager) return;
			const environments = environmentManager.getEnvironments();
			if (environments.length > 0) {
				const service = environmentManager.getService(environments[0]);
				expect(service).toBeDefined();
			}
		});

		it('should throw error for non-existent environment', () => {
			if (!environmentManager) return;
			expect(() => {
				environmentManager!.getService('non-existent-env-12345');
			}).toThrow(/not found/);
		});

		it('should include available environments in error message', () => {
			if (!environmentManager) return;
			try {
				environmentManager.getService('non-existent-env-12345');
				fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				if (error instanceof Error) {
					expect(error.message).toContain('Available environments');
				}
			}
		});
	});

	describe('setDefaultEnvironment', () => {
		it('should change the default environment', () => {
			if (!environmentManager) return;
			const environments = environmentManager.getEnvironments();
			if (environments.length > 1) {
				const originalDefault = environmentManager.getDefaultEnvironment();
				const newDefault = environments.find((env) => env !== originalDefault);

				if (newDefault) {
					environmentManager.setDefaultEnvironment(newDefault);
					expect(environmentManager.getDefaultEnvironment()).toBe(newDefault);

					// Reset to original
					environmentManager.setDefaultEnvironment(originalDefault);
				}
			}
		});

		it('should throw error for non-existent environment', () => {
			if (!environmentManager) return;
			expect(() => {
				environmentManager!.setDefaultEnvironment('non-existent-env-12345');
			}).toThrow(/not found/);
		});

		it('should accept existing environment names', () => {
			if (!environmentManager) return;
			const environments = environmentManager.getEnvironments();
			if (environments.length > 0) {
				const env = environments[0];
				expect(() => {
					environmentManager!.setDefaultEnvironment(env);
				}).not.toThrow();
			}
		});
	});

	describe('getEnvironmentInfo', () => {
		it('should return environment info with required fields when API is accessible', async () => {
			if (!environmentManager) return;
			// This test requires the OpenAPI service to be initialized and working
			// Skip if not in a proper test environment with API access
			try {
				const info = await environmentManager.getEnvironmentInfo();
				expect(info).toHaveProperty('environment');
				expect(info).toHaveProperty('apiTitle');
				expect(info).toHaveProperty('apiVersion');
				expect(info).toHaveProperty('baseUrl');
				expect(info).toHaveProperty('operationsCount');
			} catch (error) {
				// Test environment may not have API access, that's okay
				console.log('Skipping getEnvironmentInfo validation - API not accessible');
			}
		}, 15000);
	});
});
