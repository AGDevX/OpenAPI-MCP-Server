import { z } from 'zod';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { ApiOperation } from './open-api-service.js';

type ParameterObject = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;
type SchemaObject = OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject;

//-- Convert OpenAPI schema type to Zod schema
function schemaToZod(schema: SchemaObject | undefined, isRequired: boolean = false): z.ZodTypeAny {
	if (!schema) {
		return z.any().optional();
	}

	let zodSchema: z.ZodTypeAny;

	//-- Handle different schema types
	switch (schema.type) {
		case 'string':
			if (schema.enum && schema.enum.length >= 2) {
				zodSchema = z.enum(schema.enum as [string, ...string[]]);
			} else if (schema.enum && schema.enum.length === 1) {
				zodSchema = z.literal(schema.enum[0] as string);
			} else {
				zodSchema = z.string();
			}
			break;

		case 'number':
		case 'integer':
			zodSchema = z.number();
			if (schema.minimum !== undefined) {
				zodSchema = (zodSchema as z.ZodNumber).min(schema.minimum);
			}
			if (schema.maximum !== undefined) {
				zodSchema = (zodSchema as z.ZodNumber).max(schema.maximum);
			}
			break;

		case 'boolean':
			zodSchema = z.boolean();
			break;

		case 'array':
			const itemSchema = schema.items ? schemaToZod(schema.items as SchemaObject, true) : z.any();
			zodSchema = z.array(itemSchema);
			if (schema.minItems !== undefined) {
				zodSchema = (zodSchema as z.ZodArray<any>).min(schema.minItems);
			}
			if (schema.maxItems !== undefined) {
				zodSchema = (zodSchema as z.ZodArray<any>).max(schema.maxItems);
			}
			break;

		case 'object':
			if (schema.properties) {
				const shape: Record<string, z.ZodTypeAny> = {};
				const required = schema.required || [];

				for (const [propName, propSchema] of Object.entries(schema.properties)) {
					const isReq = required.includes(propName);
					shape[propName] = schemaToZod(propSchema as SchemaObject, isReq);
				}

				zodSchema = z.object(shape);
			} else {
				zodSchema = z.record(z.string(), z.any());
			}
			break;

		default:
			zodSchema = z.any();
	}

	//-- Add description if available
	if (schema.description) {
		zodSchema = zodSchema.describe(schema.description);
	}

	//-- Make optional if not required
	if (!isRequired) {
		zodSchema = zodSchema.optional();
	}

	return zodSchema;
}

//-- Convert OpenAPI parameter to Zod schema
function parameterToZod(param: ParameterObject): z.ZodTypeAny {
	const isRequired = param.required === true;
	const schema = param.schema as SchemaObject | undefined;

	let zodSchema = schemaToZod(schema, isRequired);

	//-- Override description with parameter description if available
	const description = param.description || schema?.description || `${param.name} parameter`;
	zodSchema = zodSchema.describe(description);

	return zodSchema;
}

//-- Generate tool input schema from OpenAPI operation parameters
export function generateToolInputSchema(operation: ApiOperation): Record<string, z.ZodTypeAny> {
	const schema: Record<string, z.ZodTypeAny> = {};

	//-- Add parameters to schema
	for (const param of operation.parameters) {
		schema[param.name] = parameterToZod(param);
	}

	//-- Handle request body
	if (operation.requestBody && 'content' in operation.requestBody) {
		const content = operation.requestBody.content;
		const jsonContent = content['application/json'];

		if (jsonContent && jsonContent.schema) {
			const bodySchema = schemaToZod(jsonContent.schema as SchemaObject, operation.requestBody.required === true);

			const description = operation.requestBody.description || 'Request body';
			schema.body = bodySchema.describe(description);
		}
	}

	return schema;
}

//-- Generate tool description from OpenAPI operation
export function generateToolDescription(operation: ApiOperation): string {
	const parts: string[] = [];

	//-- Main description
	if (operation.summary) {
		parts.push(operation.summary);
	} else if (operation.description) {
		//-- Use first line of description as summary
		const firstLine = operation.description.split('\n')[0];
		parts.push(firstLine);
	} else {
		//-- Fallback: Generate description from method and path
		const friendlyAction = getFriendlyAction(operation.method, operation.path);
		parts.push(friendlyAction);
	}

	//-- Add required parameters info
	const requiredParams = operation.parameters.filter((p) => p.required === true);
	const hasRequiredBody = operation.requestBody && 'required' in operation.requestBody && operation.requestBody.required === true;

	if (requiredParams.length > 0 || hasRequiredBody) {
		const paramNames = requiredParams.map((p) => p.name);
		if (hasRequiredBody) {
			paramNames.push('body');
		}
		//-- Ensure first part ends with period before adding "Requires"
		if (parts.length > 0 && !parts[0].endsWith('.')) {
			parts[0] = parts[0] + '.';
		}
		parts.push(`Requires: ${paramNames.join(', ')}.`);
	}

	return parts.join(' ');
}

//-- Common action words found in API paths
const ACTION_WORDS = [
	'activate',
	'add',
	'approve',
	'archive',
	'associate',
	'calculate',
	'cancel',
	'capture',
	'certify',
	'change',
	'check',
	'cleanse',
	'compute',
	'confirm',
	'create',
	'deactivate',
	'delete',
	'disable',
	'dismiss',
	'download',
	'edit',
	'email',
	'enable',
	'enqueue',
	'enroll',
	'execute',
	'export',
	'filter',
	'find',
	'fulfill',
	'generate',
	'get',
	'import',
	'insert',
	'invoke',
	'link',
	'list',
	'log',
	'lookup',
	'make',
	'merge',
	'move',
	'persist',
	'pledge',
	'print',
	'process',
	'publish',
	'query',
	'queue',
	'receive',
	'refresh',
	'register',
	'reject',
	'remove',
	'reprint',
	'request',
	'reset',
	'resend',
	'resolve',
	'restore',
	'run',
	'save',
	'search',
	'send',
	'set',
	'stage',
	'stay',
	'submit',
	'suggest',
	'sync',
	'transfer',
	'trigger',
	'unarchive',
	'undo',
	'unlink',
	'update',
	'upload',
	'upsert',
	'validate',
	'verify',
	'waive'
];

//-- Split a camelCase or PascalCase string into words
function splitCamelCase(str: string): string[] {
	//-- Insert spaces before uppercase letters, then split
	return str
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
		.split(/\s+/)
		.map((s) => s.toLowerCase());
}

//-- Extract action word from path (e.g., /users/search, /calculate, /items/{id}/activate)
//-- Also handles non-RESTful paths like /getUser, /calculate-tax, /SearchItems
function extractActionFromPath(path: string): string | null {
	//-- Split path and get segments without parameters
	const segments = path.split('/').filter((s) => s.length > 0 && !s.startsWith('{'));

	//-- Check each segment for known action words
	for (const segment of segments) {
		const lowerSegment = segment.toLowerCase();

		//-- 1. Check exact match (e.g., "search", "calculate")
		if (ACTION_WORDS.includes(lowerSegment)) {
			return lowerSegment;
		}

		//-- 2. Check kebab-case (e.g., "calculate-tax" → ["calculate", "tax"])
		if (segment.includes('-')) {
			const kebabParts = segment.split('-').map((s) => s.toLowerCase());
			for (const part of kebabParts) {
				if (ACTION_WORDS.includes(part)) {
					return part;
				}
			}
		}

		//-- 3. Check camelCase/PascalCase (e.g., "searchItems" → ["search", "items"])
		const camelWords = splitCamelCase(segment);
		for (const word of camelWords) {
			if (ACTION_WORDS.includes(word)) {
				return word;
			}
		}

		//-- 4. Check if segment starts with action word (e.g., "searching", "calculated")
		for (const action of ACTION_WORDS) {
			if (lowerSegment.startsWith(action)) {
				return action;
			}
		}
	}

	return null;
}

//-- Get friendly action description from method and path
function getFriendlyAction(method: string, path: string): string {
	const upperMethod = method.toUpperCase();
	const resource = extractResourceName(path);
	const action = extractActionFromPath(path);

	switch (upperMethod) {
		case 'GET':
			return path.includes('{') ? `Get a single ${resource}` : `List ${resource}s`;
		case 'POST':
			//-- Check if path contains an action word
			if (action) {
				//-- If resource is the same as action, path is just an action (e.g., /calculate)
				if (resource === action) {
					return action.charAt(0).toUpperCase() + action.slice(1);
				}
				return `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`;
			}
			//-- Default to "create" only for base resource paths without actions
			return `Create a new ${resource}`;
		case 'PUT':
		case 'PATCH':
			return `Update a ${resource}`;
		case 'DELETE':
			return `Delete a ${resource}`;
		default:
			return `${method} ${path}`;
	}
}

//-- Extract resource name from path (e.g., /api/v1/users/{id} → "user")
//-- Also handles non-RESTful paths like /searchItems → "items", /calculate-tax → "tax"
function extractResourceName(path: string): string {
	//-- Remove path parameters like {id}, {userId}, etc.
	const cleanPath = path.replace(/\{[^}]+\}/g, '');

	//-- Split by / and get the last meaningful segment
	let segments = cleanPath.split('/').filter((s) => s.length > 0 && s !== 'api' && !s.match(/^v\d+$/));

	if (segments.length === 0) {
		return 'resource';
	}

	let resource = segments[segments.length - 1];

	//-- 1. Check if last segment is an exact action word
	const lastSegmentLower = resource.toLowerCase();
	if (ACTION_WORDS.includes(lastSegmentLower)) {
		//-- If the last segment is an action word, try to get the previous segment as the resource
		if (segments.length > 1) {
			resource = segments[segments.length - 2];
		} else {
			//-- Path is just an action (e.g., /api/v1/calculate)
			return lastSegmentLower;
		}
	}

	//-- 2. Handle kebab-case (e.g., "calculate-tax" → "tax", "search-products" → "products")
	if (resource.includes('-')) {
		const kebabParts = resource.split('-');
		//-- Check if first part is an action word
		if (ACTION_WORDS.includes(kebabParts[0].toLowerCase())) {
			//-- Remove action and join the rest
			resource = kebabParts.slice(1).join('-');
		}
	}

	//-- 3. Handle camelCase/PascalCase (e.g., "searchItems" → "items", "GetUser" → "user")
	const camelWords = splitCamelCase(resource);
	if (camelWords.length > 1) {
		//-- Check if first word is an action
		if (ACTION_WORDS.includes(camelWords[0])) {
			//-- Remove action and join the rest
			resource = camelWords.slice(1).join('');
		}
	}

	//-- 4. Simple singularization (remove trailing 's' for common cases)
	const lowerResource = resource.toLowerCase();
	if (lowerResource.endsWith('ies')) {
		resource = resource.slice(0, -3) + 'y'; //-- categories → category
	} else if (lowerResource.endsWith('es') && resource.length > 2) {
		resource = resource.slice(0, -2); //-- addresses → address
	} else if (lowerResource.endsWith('s') && resource.length > 1) {
		resource = resource.slice(0, -1); //-- users → user
	}

	return resource.toLowerCase();
}

//-- Generate a friendly tool name from operation details
export function generateFriendlyToolName(operation: ApiOperation): string {
	//-- If operationId exists and looks friendly (not auto-generated), use it
	const operationId = operation.operationId;

	//-- Check if operationId looks auto-generated (contains method_path pattern)
	const isAutoGenerated =
		!operationId ||
		operationId.toLowerCase().startsWith(operation.method.toLowerCase() + '_') ||
		operationId.includes('api_v') ||
		/^(get|post|put|patch|delete)_.*_/.test(operationId.toLowerCase());

	if (!isAutoGenerated) {
		//-- operationId looks manually created, convert from camelCase to snake_case
		return camelToSnakeCase(operationId);
	}

	//-- Generate friendly name from method + path
	const method = operation.method.toUpperCase();
	const resource = extractResourceName(operation.path);
	const hasPathParam = operation.path.includes('{');
	const action = extractActionFromPath(operation.path);

	let friendlyName = '';

	switch (method) {
		case 'GET':
			friendlyName = hasPathParam ? `get_${resource}` : `list_${resource}s`;
			break;
		case 'POST':
			//-- Use action word if found in path (e.g., /users/search → search_users)
			if (action) {
				//-- If resource is the same as action, path is just an action (e.g., /calculate)
				if (resource === action) {
					friendlyName = action;
				} else {
					friendlyName = `${action}_${resource}`;
				}
			} else {
				//-- Default to "create" for base resource paths
				friendlyName = `create_${resource}`;
			}
			break;
		case 'PUT':
			friendlyName = `update_${resource}`;
			break;
		case 'PATCH':
			friendlyName = `patch_${resource}`;
			break;
		case 'DELETE':
			friendlyName = `delete_${resource}`;
			break;
		default:
			friendlyName = `${method.toLowerCase()}_${resource}`;
	}

	return sanitizeToolName(friendlyName);
}

//-- Convert camelCase, PascalCase, or kebab-case to snake_case
function camelToSnakeCase(str: string): string {
	//-- First, convert hyphens to underscores (kebab-case → snake_case)
	let result = str.replace(/-/g, '_');

	//-- Insert underscore before uppercase letters (except at start)
	result = result.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

	//-- Clean up any double underscores or leading/trailing underscores
	return result.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

//-- Extract version identifier from a path (e.g., /api/v1/users -> v1, /v2/items -> v2)
function extractVersionFromPath(path: string): string | null {
	//-- Match common version patterns: v1, v2, v3, v1.0, v2.1, etc.
	const versionMatch = path.match(/\/(v\d+(?:\.\d+)?)\//i);
	if (versionMatch) {
		return versionMatch[1].toLowerCase();
	}
	return null;
}

//-- Extract unique path segments that differentiate this path from others
function extractUniquePathSegments(path: string): string[] {
	return path
		.split('/')
		.filter((segment) => {
			//-- Filter out common/generic segments
			const lower = segment.toLowerCase();
			return (
				segment.length > 0 &&
				!segment.startsWith('{') && //-- Skip path parameters
				lower !== 'api' &&
				lower !== 'apis' &&
				!lower.match(/^v\d+$/) //-- Skip simple version numbers (captured separately)
			);
		})
		.map((s) => s.toLowerCase());
}

//-- Generate a unique tool name by adding a meaningful suffix based on operation differences
export function generateUniqueToolName(baseName: string, operation: ApiOperation, existingOperation: ApiOperation): string {
	//-- Strategy 1: Check for version differences in paths
	const version = extractVersionFromPath(operation.path);
	const existingVersion = extractVersionFromPath(existingOperation.path);

	if (version && existingVersion && version !== existingVersion) {
		return `${baseName}_${version}`;
	} else if (version) {
		return `${baseName}_${version}`;
	}

	//-- Strategy 2: Use operationId if it's different and looks meaningful
	if (
		operation.operationId &&
		existingOperation.operationId &&
		operation.operationId !== existingOperation.operationId
	) {
		//-- Extract last part of operationId if it's camelCase/PascalCase
		const operationIdParts = splitCamelCase(operation.operationId);
		if (operationIdParts.length > 0) {
			const uniquePart = operationIdParts[operationIdParts.length - 1];
			if (uniquePart && uniquePart !== baseName.split('_').pop()) {
				return `${baseName}_${uniquePart}`;
			}
		}
	}

	//-- Strategy 3: Find unique path segments
	const segments = extractUniquePathSegments(operation.path);
	const existingSegments = extractUniquePathSegments(existingOperation.path);

	//-- Find segments that exist in one but not the other
	for (const segment of segments) {
		if (!existingSegments.includes(segment) && segment !== baseName.split('_').pop()) {
			return `${baseName}_${segment}`;
		}
	}

	//-- Strategy 4: Include HTTP method if paths are different but names collide
	if (operation.path !== existingOperation.path) {
		const method = operation.method.toLowerCase();
		return `${baseName}_${method}`;
	}

	//-- Fallback: Use numeric suffix
	return `${baseName}_alt`;
}

//-- Sanitize operation ID to be a valid tool name
export function sanitizeToolName(operationId: string): string {
	//-- Replace non-alphanumeric characters with underscores
	let name = operationId.replace(/[^a-zA-Z0-9_]/g, '_');

	// Remove leading/trailing underscores
	name = name.replace(/^_+|_+$/g, '');

	//-- Ensure it doesn't start with a number
	if (/^\d/.test(name)) {
		name = 'api_' + name;
	}

	//-- Convert to lowercase for consistency
	name = name.toLowerCase();

	return name;
}
