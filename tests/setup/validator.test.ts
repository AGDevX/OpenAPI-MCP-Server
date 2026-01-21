import { describe, it, expect } from '@jest/globals';
import { validateOpenApiUrl } from '../../src/setup/validator.js';

describe('validator', () => {
	describe('validateOpenApiUrl', () => {
		it('should reject invalid URL format', async () => {
			const result = await validateOpenApiUrl('not-a-valid-url');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Invalid URL format');
		});

		it('should reject empty string', async () => {
			const result = await validateOpenApiUrl('');
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should reject URL with invalid protocol', async () => {
			const result = await validateOpenApiUrl('ftp://invalid.com/spec.json');
			// This should attempt to fetch and likely fail with connection error
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should handle non-existent domain', async () => {
			const result = await validateOpenApiUrl('https://this-domain-definitely-does-not-exist-12345.com/spec.json');
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		}, 15000);

		it('should return error for URL without protocol', async () => {
			const result = await validateOpenApiUrl('example.com/spec.json');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Invalid URL format');
		});

		// Note: Testing successful validation would require either:
		// 1. A real OpenAPI endpoint (unreliable for tests)
		// 2. Proper ESM mocking (complex with current setup)
		// 3. A local test server (adds test complexity)
		// For now, we test error cases which are more critical for user experience
	});
});
