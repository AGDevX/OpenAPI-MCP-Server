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
	'calculate',
	'cancel',
	'capture',
	'certify',
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
	'enable',
	'enqueue',
	'enroll',
	'execute',
	'export',
	'filter',
	'find',
	'generate',
	'get',
	'import',
	'insert',
	'invoke',
	'link',
	'log',
	'lookup',
	'make',
	'merge',
	'move',
	'process',
	'query',
	'queue',
	'refresh',
	'register',
	'reject',
	'remove',
	'reset',
	'resolve',
	'restore',
	'run',
	'save',
	'search',
	'send',
	'set',
	'stage',
	'submit',
	'suggest',
	'sync',
	'transfer',
	'trigger',
	'unarchive',
	'update',
	'upload',
	'upsert',
	'validate',
	'verify',
	'waive'
];

//-- Extract action word from path (e.g., /users/search, /calculate, /items/{id}/activate)
function extractActionFromPath(path: string): string | null {
	//-- Split path and get segments without parameters
	const segments = path
		.split('/')
		.filter((s) => s.length > 0 && !s.startsWith('{'))
		.map((s) => s.toLowerCase());

	//-- Check each segment for known action words
	for (const segment of segments) {
		if (ACTION_WORDS.includes(segment)) {
			return segment;
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
function extractResourceName(path: string): string {
	//-- Remove path parameters like {id}, {userId}, etc.
	const cleanPath = path.replace(/\{[^}]+\}/g, '');

	//-- Split by / and get the last meaningful segment
	let segments = cleanPath.split('/').filter((s) => s.length > 0 && s !== 'api' && !s.match(/^v\d+$/));

	if (segments.length === 0) {
		return 'resource';
	}

	//-- Remove known action words from the end to get the resource
	const lastSegment = segments[segments.length - 1].toLowerCase();
	if (ACTION_WORDS.includes(lastSegment)) {
		//-- If the last segment is an action word, try to get the previous segment as the resource
		if (segments.length > 1) {
			segments = segments.slice(0, -1);
		} else {
			//-- Path is just an action (e.g., /api/v1/calculate)
			return lastSegment;
		}
	}

	//-- Get the last segment and singularize if needed
	let resource = segments[segments.length - 1];

	//-- Simple singularization (remove trailing 's' for common cases)
	if (resource.endsWith('ies')) {
		resource = resource.slice(0, -3) + 'y'; //-- categories → category
	} else if (resource.endsWith('es') && resource.length > 2) {
		resource = resource.slice(0, -2); //-- addresses → address
	} else if (resource.endsWith('s') && resource.length > 1) {
		resource = resource.slice(0, -1); //-- users → user
	}

	return resource;
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

//-- Convert camelCase or PascalCase to snake_case
function camelToSnakeCase(str: string): string {
	//-- Insert underscore before uppercase letters (except at start)
	const snake = str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

	//-- Clean up any double underscores or leading/trailing underscores
	return snake.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
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
