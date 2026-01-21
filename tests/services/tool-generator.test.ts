import { describe, it, expect } from '@jest/globals';
import {
	generateFriendlyToolName,
	generateUniqueToolName,
	generateToolDescription,
	sanitizeToolName
} from '../../src/services/tool-generator.js';
import type { ApiOperation } from '../../src/services/open-api-service.js';

describe('tool-generator', () => {
	describe('sanitizeToolName', () => {
		it('should convert to lowercase', () => {
			expect(sanitizeToolName('CreateUser')).toBe('createuser');
		});

		it('should replace non-alphanumeric characters with underscores', () => {
			expect(sanitizeToolName('create-user@2024')).toBe('create_user_2024');
		});

		it('should remove leading/trailing underscores', () => {
			expect(sanitizeToolName('__create_user__')).toBe('create_user');
		});

		it('should prefix with api_ if starts with number', () => {
			expect(sanitizeToolName('123users')).toBe('api_123users');
		});

		it('should handle kebab-case', () => {
			expect(sanitizeToolName('create-new-user')).toBe('create_new_user');
		});
	});

	describe('generateFriendlyToolName', () => {
		it('should generate get_resource for GET with path param', () => {
			const operation: ApiOperation = {
				operationId: 'getUserById',
				method: 'GET',
				path: '/users/{id}',
				parameters: []
			};
			// Uses friendly operationId when not auto-generated
			expect(generateFriendlyToolName(operation)).toBe('get_user_by_id');
		});

		it('should generate list_resources for GET without path param', () => {
			const operation: ApiOperation = {
				operationId: 'listUsers',
				method: 'GET',
				path: '/users',
				parameters: []
			};
			expect(generateFriendlyToolName(operation)).toBe('list_users');
		});

		it('should generate create_resource for POST', () => {
			const operation: ApiOperation = {
				operationId: 'createUser',
				method: 'POST',
				path: '/users',
				parameters: []
			};
			expect(generateFriendlyToolName(operation)).toBe('create_user');
		});

		it('should generate update_resource for PUT', () => {
			const operation: ApiOperation = {
				operationId: 'updateUser',
				method: 'PUT',
				path: '/users/{id}',
				parameters: []
			};
			expect(generateFriendlyToolName(operation)).toBe('update_user');
		});

		it('should generate patch_resource for PATCH', () => {
			const operation: ApiOperation = {
				operationId: 'patchUser',
				method: 'PATCH',
				path: '/users/{id}',
				parameters: []
			};
			expect(generateFriendlyToolName(operation)).toBe('patch_user');
		});

		it('should generate delete_resource for DELETE', () => {
			const operation: ApiOperation = {
				operationId: 'deleteUser',
				method: 'DELETE',
				path: '/users/{id}',
				parameters: []
			};
			expect(generateFriendlyToolName(operation)).toBe('delete_user');
		});

		it('should use friendly operationId when not auto-generated', () => {
			const operation: ApiOperation = {
				operationId: 'searchActiveUsers',
				method: 'POST',
				path: '/users/search',
				parameters: []
			};
			expect(generateFriendlyToolName(operation)).toBe('search_active_users');
		});

		it('should extract action from path for POST requests', () => {
			const operation: ApiOperation = {
				operationId: 'post_users_activate',
				method: 'POST',
				path: '/users/{id}/activate',
				parameters: []
			};
			expect(generateFriendlyToolName(operation)).toBe('activate_user');
		});

		it('should handle nested resource paths', () => {
			const operation: ApiOperation = {
				operationId: 'getUserOrders',
				method: 'GET',
				path: '/users/{userId}/orders',
				parameters: []
			};
			// Uses friendly operationId
			expect(generateFriendlyToolName(operation)).toBe('get_user_orders');
		});

		it('should handle camelCase action in path', () => {
			const operation: ApiOperation = {
				operationId: 'calculateTax',
				method: 'POST',
				path: '/calculateTax',
				parameters: []
			};
			expect(generateFriendlyToolName(operation)).toBe('calculate_tax');
		});
	});

	describe('generateUniqueToolName', () => {
		it('should append version from path', () => {
			const operation: ApiOperation = {
				operationId: 'getUser',
				method: 'GET',
				path: '/api/v2/users/{id}',
				parameters: []
			};
			const existingOperation: ApiOperation = {
				operationId: 'getUser',
				method: 'GET',
				path: '/api/v1/users/{id}',
				parameters: []
			};
			expect(generateUniqueToolName('get_user', operation, existingOperation)).toBe('get_user_v2');
		});

		it('should use unique path segment', () => {
			const operation: ApiOperation = {
				operationId: 'getUser',
				method: 'GET',
				path: '/admin/users/{id}',
				parameters: []
			};
			const existingOperation: ApiOperation = {
				operationId: 'getUser',
				method: 'GET',
				path: '/users/{id}',
				parameters: []
			};
			expect(generateUniqueToolName('get_user', operation, existingOperation)).toBe('get_user_admin');
		});

		it('should use unique path segment if available', () => {
			const operation: ApiOperation = {
				operationId: 'processUser',
				method: 'POST',
				path: '/users/process',
				parameters: []
			};
			const existingOperation: ApiOperation = {
				operationId: 'processUser',
				method: 'GET',
				path: '/users/processing',
				parameters: []
			};
			const result = generateUniqueToolName('process_user', operation, existingOperation);
			// Should find unique segment "process" or "processing"
			expect(result).toMatch(/process_user_/);
		});

		it('should fallback to _alt suffix', () => {
			const operation: ApiOperation = {
				operationId: 'getUser',
				method: 'GET',
				path: '/users/{id}',
				parameters: []
			};
			const existingOperation: ApiOperation = {
				operationId: 'getUser',
				method: 'GET',
				path: '/users/{id}',
				parameters: []
			};
			expect(generateUniqueToolName('get_user', operation, existingOperation)).toBe('get_user_alt');
		});
	});

	describe('generateToolDescription', () => {
		it('should use summary if available', () => {
			const operation: ApiOperation = {
				operationId: 'getUser',
				method: 'GET',
				path: '/users/{id}',
				summary: 'Retrieve user details',
				parameters: []
			};
			expect(generateToolDescription(operation)).toBe('Retrieve user details');
		});

		it('should use first line of description if no summary', () => {
			const operation: ApiOperation = {
				operationId: 'getUser',
				method: 'GET',
				path: '/users/{id}',
				description: 'Get user information\nAdditional details here',
				parameters: []
			};
			expect(generateToolDescription(operation)).toBe('Get user information');
		});

		it('should generate description from method and path if no summary or description', () => {
			const operation: ApiOperation = {
				operationId: 'getUser',
				method: 'GET',
				path: '/users/{id}',
				parameters: []
			};
			expect(generateToolDescription(operation)).toBe('Get a single user');
		});

		it('should append required parameters', () => {
			const operation: ApiOperation = {
				operationId: 'getUser',
				method: 'GET',
				path: '/users/{id}',
				summary: 'Get user',
				parameters: [
					{
						name: 'id',
						in: 'path',
						required: true,
						schema: { type: 'string' }
					},
					{
						name: 'include',
						in: 'query',
						required: false,
						schema: { type: 'string' }
					}
				]
			};
			expect(generateToolDescription(operation)).toBe('Get user. Requires: id.');
		});

		it('should include body in required parameters', () => {
			const operation: ApiOperation = {
				operationId: 'createUser',
				method: 'POST',
				path: '/users',
				summary: 'Create user',
				parameters: [],
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { type: 'object' }
						}
					}
				}
			};
			expect(generateToolDescription(operation)).toBe('Create user. Requires: body.');
		});
	});
});
