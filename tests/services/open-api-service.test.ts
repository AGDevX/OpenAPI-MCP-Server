import { describe, it, expect, beforeEach } from '@jest/globals';
import { OpenApiService } from '../../src/services/open-api-service.js';
import type { ApiOperation } from '../../src/services/open-api-service.js';

describe('OpenApiService', () => {
	describe('constructor', () => {
		it('should create service with valid URLs', () => {
			const service = new OpenApiService('https://api.example.com/openapi.json', 'https://api.example.com');
			expect(service).toBeDefined();
			expect(service.getBaseUrl()).toBe('https://api.example.com');
		});

		it('should throw error if specUrl is missing', () => {
			expect(() => {
				new OpenApiService('', 'https://api.example.com');
			}).toThrow(/API_SPEC_URL is required/);
		});

		it('should throw error if baseUrl is missing', () => {
			expect(() => {
				new OpenApiService('https://api.example.com/openapi.json', '');
			}).toThrow(/API_BASE_URL is required/);
		});

		it('should throw error if both URLs are missing', () => {
			expect(() => {
				new OpenApiService('', '');
			}).toThrow();
		});
	});

	describe('getBaseUrl', () => {
		it('should return the configured base URL', () => {
			const baseUrl = 'https://api.example.com';
			const service = new OpenApiService('https://api.example.com/openapi.json', baseUrl);
			expect(service.getBaseUrl()).toBe(baseUrl);
		});

		it('should return exact URL without modification', () => {
			const baseUrl = 'https://api.example.com:8080/v1';
			const service = new OpenApiService('https://api.example.com/openapi.json', baseUrl);
			expect(service.getBaseUrl()).toBe(baseUrl);
		});
	});

	describe('URL handling', () => {
		it('should accept HTTP URLs', () => {
			const service = new OpenApiService('http://localhost:3000/openapi.json', 'http://localhost:3000');
			expect(service.getBaseUrl()).toBe('http://localhost:3000');
		});

		it('should accept HTTPS URLs', () => {
			const service = new OpenApiService('https://api.example.com/openapi.json', 'https://api.example.com');
			expect(service.getBaseUrl()).toBe('https://api.example.com');
		});

		it('should handle URLs with ports', () => {
			const service = new OpenApiService('https://api.example.com:8443/openapi.json', 'https://api.example.com:8443');
			expect(service.getBaseUrl()).toBe('https://api.example.com:8443');
		});

		it('should handle URLs with paths', () => {
			const service = new OpenApiService('https://api.example.com/v1/openapi.json', 'https://api.example.com/v1');
			expect(service.getBaseUrl()).toBe('https://api.example.com/v1');
		});
	});

	// Note: Testing fetchSpec, getSpec, getOperations, and executeOperation would require
	// either mocking axios or having a real API available. These are better suited for
	// integration tests. The following are basic structure tests:

	describe('method signatures', () => {
		let service: OpenApiService;

		beforeEach(() => {
			service = new OpenApiService('https://api.example.com/openapi.json', 'https://api.example.com');
		});

		it('should have fetchSpec method', () => {
			expect(typeof service.fetchSpec).toBe('function');
		});

		it('should have getSpec method', () => {
			expect(typeof service.getSpec).toBe('function');
		});

		it('should have getOperations method', () => {
			expect(typeof service.getOperations).toBe('function');
		});

		it('should have getApiInfo method', () => {
			expect(typeof service.getApiInfo).toBe('function');
		});

		it('should have getOperationById method', () => {
			expect(typeof service.getOperationById).toBe('function');
		});

		it('should have executeOperation method', () => {
			expect(typeof service.executeOperation).toBe('function');
		});

		it('should have checkReachability method', () => {
			expect(typeof service.checkReachability).toBe('function');
		});

		it('should have getLastFetchTime method', () => {
			expect(typeof service.getLastFetchTime).toBe('function');
		});
	});

	describe('getLastFetchTime', () => {
		it('should return null before any fetch', () => {
			const service = new OpenApiService('https://api.example.com/openapi.json', 'https://api.example.com');
			expect(service.getLastFetchTime()).toBeNull();
		});
	});

	describe('error messages', () => {
		it('should provide actionable error for missing spec URL', () => {
			try {
				new OpenApiService('', 'https://api.example.com');
				fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				if (error instanceof Error) {
					expect(error.message).toContain('Action required');
					expect(error.message).toContain('API_SPEC_URL');
				}
			}
		});

		it('should provide actionable error for missing base URL', () => {
			try {
				new OpenApiService('https://api.example.com/openapi.json', '');
				fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				if (error instanceof Error) {
					expect(error.message).toContain('Action required');
					expect(error.message).toContain('API_BASE_URL');
				}
			}
		});
	});
});
