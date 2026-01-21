# Testing Guide

This project uses Jest with TypeScript support for unit testing.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are organized in a separate `tests/` directory that mirrors the `src/` structure:

```
tests/
├── config.test.ts                    # Configuration parsing tests
├── services/
│   ├── rate-limiter.test.ts         # Rate limiter logic tests
│   └── tool-generator.test.ts       # Tool name generation tests
└── setup/
    └── validator.test.ts             # URL validation tests
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from '@jest/globals';
import { functionToTest } from '../src/module.js';

describe('module name', () => {
	describe('functionToTest', () => {
		it('should do something', () => {
			const result = functionToTest('input');
			expect(result).toBe('expected');
		});
	});
});
```

**Note:** Test files import from `../src/` or `../../src/` depending on their location in the `tests/` directory hierarchy.

### Testing Async Functions

```typescript
it('should handle async operations', async () => {
	const result = await asyncFunction();
	expect(result).toBeDefined();
});
```

### Testing with Timers

```typescript
import { jest } from '@jest/globals';

it('should handle time-based logic', () => {
	jest.useFakeTimers();

	// Code that uses setTimeout/setInterval
	const callback = jest.fn();
	setTimeout(callback, 1000);

	// Fast-forward time
	jest.advanceTimersByTime(1000);

	expect(callback).toHaveBeenCalled();

	jest.useRealTimers();
});
```

## Test Coverage

The project aims for good test coverage on core business logic:

- **tool-generator.ts**: ~51% coverage (core tool naming logic)
- **rate-limiter.ts**: 100% coverage
- **config.ts**: ~62% coverage (configuration parsing)
- **validator.ts**: Basic error case coverage

Coverage reports are generated in the `coverage/` directory when running `npm run test:coverage`.

## Current Test Focus

Tests currently focus on:

1. **Tool Generation Logic** - Ensuring correct tool names are generated from OpenAPI operations
2. **Rate Limiting** - Verifying sliding window rate limiting works correctly
3. **Configuration** - Checking that environment variables are parsed correctly
4. **Validation** - Testing URL format validation and error handling

## Areas for Future Testing

- Integration tests for the full MCP server
- End-to-end tests with real OpenAPI specs
- More comprehensive mocking for validator tests
- Environment manager tests
- OpenAPI service tests with mock specs

## Notes

- This project uses ES modules (`"type": "module"` in package.json)
- Jest is configured with `ts-jest` for TypeScript support
- Tests run with `--experimental-vm-modules` flag for ESM support
- Some warnings about `isolatedModules` can be safely ignored

## Continuous Integration

Tests should be run as part of the CI/CD pipeline before merging pull requests. Add this to your CI configuration:

```yaml
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage
```
