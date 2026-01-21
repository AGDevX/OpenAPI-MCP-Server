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
├── config.test.ts                           # Configuration parsing tests
├── services/
│   ├── environment-manager.test.ts          # Environment configuration tests
│   ├── open-api-service.test.ts             # OpenAPI service tests
│   ├── rate-limiter.test.ts                 # Rate limiter logic tests
│   ├── session-manager.test.ts              # Session management tests
│   └── tool-generator.test.ts               # Tool name generation tests
└── setup/
    ├── config-manager.test.ts               # MCP client config management tests
    └── validator.test.ts                    # URL validation tests
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

### Advanced Module Mocking

For testing modules that depend on Node.js built-ins (fs, os, etc.), use `jest.unstable_mockModule`:

```typescript
// Mock modules BEFORE importing the module under test
jest.unstable_mockModule('fs/promises', () => ({
	default: {
		readFile: jest.fn(),
		writeFile: jest.fn()
	}
}));

// Import mocked modules
const fsMock = (await import('fs/promises')).default;

// Import the module under test
const { functionToTest } = await import('../../src/module.js');

// Now you can control the mock behavior in tests
fsMock.readFile.mockResolvedValue('data');
```

**Important:** When testing cross-platform path logic on Windows, normalize paths for comparison:

```typescript
function normalizePath(p: string): string {
	return p.replace(/\\/g, '/');
}

expect(normalizePath(result)).toBe('/expected/path');
```

## Test Coverage

The project has comprehensive test coverage on core business logic:

- **tool-generator.ts**: ~51% coverage (core tool naming logic with 26 tests)
- **rate-limiter.ts**: 100% coverage (12 tests)
- **config.ts**: ~62% coverage (11 tests)
- **validator.ts**: Basic error case coverage (5 tests)
- **session-manager.ts**: Core functionality coverage (11 tests)
- **environment-manager.ts**: Environment handling tests (14 tests)
- **open-api-service.ts**: Constructor and URL validation (15 tests)
- **config-manager.ts**: MCP client config management (29 tests)

**Total: 131 tests across 8 test suites**

Coverage reports are generated in the `coverage/` directory when running `npm run test:coverage`.

## Current Test Focus

Tests currently focus on:

1. **Tool Generation Logic** - Ensuring correct tool names are generated from OpenAPI operations
2. **Rate Limiting** - Verifying sliding window rate limiting works correctly
3. **Configuration** - Checking that environment variables are parsed correctly
4. **Validation** - Testing URL format validation and error handling
5. **Session Management** - Testing transport lifecycle management and cleanup
6. **Environment Management** - Testing multi-environment configuration handling
7. **OpenAPI Service** - Testing service initialization and URL handling
8. **Config Manager** - Testing MCP client configuration file management across platforms

## Areas for Future Testing

- Integration tests for the full MCP server
- End-to-end tests with real OpenAPI specs
- More comprehensive mocking for validator tests with API responses
- OpenAPI service tests with mock OpenAPI specifications
- Server initialization and tool registration tests

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
