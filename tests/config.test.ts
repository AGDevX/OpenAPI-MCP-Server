import { describe, it, expect } from '@jest/globals';
import { SERVER_CONFIG, OPENAPI_CONFIG, RATE_LIMIT_CONFIG, RESOURCES } from '../src/config.js';

describe('config', () => {
	describe('SERVER_CONFIG', () => {
		it('should have required fields', () => {
			expect(SERVER_CONFIG).toHaveProperty('name');
			expect(SERVER_CONFIG).toHaveProperty('version');
			expect(SERVER_CONFIG).toHaveProperty('defaultPort');
		});

		it('should have valid server name', () => {
			expect(typeof SERVER_CONFIG.name).toBe('string');
			expect(SERVER_CONFIG.name.length).toBeGreaterThan(0);
		});

		it('should have valid port', () => {
			expect(typeof SERVER_CONFIG.defaultPort).toBe('number');
			expect(SERVER_CONFIG.defaultPort).toBeGreaterThan(0);
		});
	});

	describe('OPENAPI_CONFIG', () => {
		it('should have required fields', () => {
			expect(OPENAPI_CONFIG).toHaveProperty('timeout');
			expect(OPENAPI_CONFIG).toHaveProperty('refreshInterval');
			expect(OPENAPI_CONFIG).toHaveProperty('rejectUnauthorizedTls');
		});

		it('should have valid timeout', () => {
			expect(typeof OPENAPI_CONFIG.timeout).toBe('number');
			expect(OPENAPI_CONFIG.timeout).toBeGreaterThan(0);
		});

		it('should have valid refreshInterval', () => {
			expect(typeof OPENAPI_CONFIG.refreshInterval).toBe('number');
			expect(OPENAPI_CONFIG.refreshInterval).toBeGreaterThanOrEqual(0);
		});

		it('should have valid TLS setting', () => {
			expect(typeof OPENAPI_CONFIG.rejectUnauthorizedTls).toBe('boolean');
		});
	});

	describe('RATE_LIMIT_CONFIG', () => {
		it('should have required fields', () => {
			expect(RATE_LIMIT_CONFIG).toHaveProperty('enabled');
			expect(RATE_LIMIT_CONFIG).toHaveProperty('maxRequests');
			expect(RATE_LIMIT_CONFIG).toHaveProperty('windowMs');
		});

		it('should have valid enabled flag', () => {
			expect(typeof RATE_LIMIT_CONFIG.enabled).toBe('boolean');
		});

		it('should have valid maxRequests', () => {
			expect(typeof RATE_LIMIT_CONFIG.maxRequests).toBe('number');
			expect(RATE_LIMIT_CONFIG.maxRequests).toBeGreaterThan(0);
		});

		it('should have valid windowMs', () => {
			expect(typeof RATE_LIMIT_CONFIG.windowMs).toBe('number');
			expect(RATE_LIMIT_CONFIG.windowMs).toBeGreaterThan(0);
		});
	});

	describe('RESOURCES', () => {
		it('should have serverInfo resource', () => {
			expect(RESOURCES).toHaveProperty('serverInfo');
			expect(RESOURCES.serverInfo).toHaveProperty('name');
			expect(RESOURCES.serverInfo).toHaveProperty('uri');
			expect(RESOURCES.serverInfo).toHaveProperty('description');
			expect(RESOURCES.serverInfo).toHaveProperty('mimeType');
		});

		it('should have valid serverInfo URI', () => {
			expect(RESOURCES.serverInfo.uri).toMatch(/^api:\/\//);
		});

		it('should have valid mimeType', () => {
			expect(RESOURCES.serverInfo.mimeType).toBe('text/plain');
		});
	});
});
