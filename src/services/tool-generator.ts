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

	if (operation.summary) {
		parts.push(operation.summary);
	} else if (operation.description) {
		//-- Use first line of description as summary
		const firstLine = operation.description.split('\n')[0];
		parts.push(firstLine);
	} else {
		//-- Fallback to method and path
		parts.push(`${operation.method} ${operation.path}`);
	}

	return parts.join(' ');
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
