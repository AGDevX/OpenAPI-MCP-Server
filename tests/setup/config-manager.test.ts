import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import type { McpClientType, EnvironmentConfig } from '../../src/setup/types.js';

// Mock modules before importing the module under test
jest.unstable_mockModule('fs/promises', () => ({
	default: {
		access: jest.fn(),
		readFile: jest.fn(),
		writeFile: jest.fn(),
		copyFile: jest.fn(),
		mkdir: jest.fn()
	}
}));

jest.unstable_mockModule('os', () => ({
	default: {
		homedir: jest.fn(() => '/home/testuser')
	}
}));

// Import mocked modules
const fsMock = (await import('fs/promises')).default as any;
const osMock = (await import('os')).default as any;

// Import the module under test
const { getConfigPath, configExists, readConfig, writeConfig, detectClients } = await import(
	'../../src/setup/config-manager.js'
);

// Helper function to normalize paths for cross-platform testing
function normalizePath(p: string): string {
	return p.replace(/\\/g, '/');
}

describe('ConfigManager', () => {
	const originalPlatform = process.platform;
	const originalAppData = process.env.APPDATA;

	beforeEach(() => {
		// Reset all mocks before each test
		jest.clearAllMocks();
	});

	afterEach(() => {
		// Restore original values
		Object.defineProperty(process, 'platform', { value: originalPlatform });
		if (originalAppData !== undefined) {
			process.env.APPDATA = originalAppData;
		} else {
			delete process.env.APPDATA;
		}
	});

	describe('getConfigPath', () => {
		it('should return correct path for VS Code on Windows', () => {
			Object.defineProperty(process, 'platform', { value: 'win32' });
			process.env.APPDATA = 'C:\\Users\\TestUser\\AppData\\Roaming';

			const result = getConfigPath('vscode');
			expect(result).toBe('C:\\Users\\TestUser\\AppData\\Roaming\\Code\\User\\mcp.json');
		});

		it('should return correct path for VS Code on macOS', () => {
			Object.defineProperty(process, 'platform', { value: 'darwin' });
			osMock.homedir.mockReturnValue('/Users/testuser');

			const result = getConfigPath('vscode');
			expect(normalizePath(result)).toBe('/Users/testuser/.config/Code/User/mcp.json');
		});

		it('should return correct path for VS Code on Linux', () => {
			Object.defineProperty(process, 'platform', { value: 'linux' });
			osMock.homedir.mockReturnValue('/home/testuser');

			const result = getConfigPath('vscode');
			expect(normalizePath(result)).toBe('/home/testuser/.config/Code/User/mcp.json');
		});

		it('should return correct path for Claude Desktop on Windows', () => {
			Object.defineProperty(process, 'platform', { value: 'win32' });
			process.env.APPDATA = 'C:\\Users\\TestUser\\AppData\\Roaming';

			const result = getConfigPath('claude-desktop');
			expect(result).toBe('C:\\Users\\TestUser\\AppData\\Roaming\\Claude\\claude_desktop_config.json');
		});

		it('should return correct path for Claude Desktop on macOS', () => {
			Object.defineProperty(process, 'platform', { value: 'darwin' });
			osMock.homedir.mockReturnValue('/Users/testuser');

			const result = getConfigPath('claude-desktop');
			expect(normalizePath(result)).toBe('/Users/testuser/Library/Application Support/Claude/claude_desktop_config.json');
		});

		it('should return correct path for Claude Desktop on Linux', () => {
			Object.defineProperty(process, 'platform', { value: 'linux' });
			osMock.homedir.mockReturnValue('/home/testuser');

			const result = getConfigPath('claude-desktop');
			expect(normalizePath(result)).toBe('/home/testuser/.config/Claude/claude_desktop_config.json');
		});

		it('should return correct path for Claude Code on all platforms', () => {
			osMock.homedir.mockReturnValue('/home/testuser');

			// Test all platforms return same path for claude-code
			const platforms = ['win32', 'darwin', 'linux'];
			platforms.forEach((platform) => {
				Object.defineProperty(process, 'platform', { value: platform });
				const result = getConfigPath('claude-code');
				expect(normalizePath(result)).toBe('/home/testuser/.claude.json');
			});
		});

		it('should throw error for unsupported platform', () => {
			Object.defineProperty(process, 'platform', { value: 'freebsd' });

			expect(() => getConfigPath('vscode')).toThrow(/Unsupported platform/);
		});

		it('should include helpful error message for unsupported platform', () => {
			Object.defineProperty(process, 'platform', { value: 'aix' });

			try {
				getConfigPath('claude-desktop');
				fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				if (error instanceof Error) {
					expect(error.message).toContain('Unsupported platform');
					expect(error.message).toContain('aix');
					expect(error.message).toContain('claude-desktop');
				}
			}
		});
	});

	describe('configExists', () => {
		it('should return true if config file exists', async () => {
			Object.defineProperty(process, 'platform', { value: 'linux' });
			fsMock.access.mockResolvedValue(undefined);

			const result = await configExists('vscode');
			expect(result).toBe(true);
			const callArg = fsMock.access.mock.calls[0][0];
			expect(normalizePath(callArg)).toBe('/home/testuser/.config/Code/User/mcp.json');
		});

		it('should return false if config file does not exist', async () => {
			Object.defineProperty(process, 'platform', { value: 'linux' });
			fsMock.access.mockRejectedValue(new Error('ENOENT'));

			const result = await configExists('vscode');
			expect(result).toBe(false);
		});

		it('should return false on any access error', async () => {
			Object.defineProperty(process, 'platform', { value: 'linux' });
			fsMock.access.mockRejectedValue(new Error('Permission denied'));

			const result = await configExists('claude-desktop');
			expect(result).toBe(false);
		});
	});

	describe('readConfig', () => {
		it('should read and parse config file', async () => {
			Object.defineProperty(process, 'platform', { value: 'linux' });
			const mockConfig = { servers: { test: {} } };
			fsMock.readFile.mockResolvedValue(JSON.stringify(mockConfig));

			const result = await readConfig('vscode');
			expect(result).toEqual(mockConfig);
			const callArg = fsMock.readFile.mock.calls[0][0];
			expect(normalizePath(callArg)).toBe('/home/testuser/.config/Code/User/mcp.json');
		});

		it('should return null if config file does not exist', async () => {
			Object.defineProperty(process, 'platform', { value: 'linux' });
			fsMock.readFile.mockRejectedValue(new Error('ENOENT'));

			const result = await readConfig('vscode');
			expect(result).toBeNull();
		});

		it('should return null if config file is invalid JSON', async () => {
			Object.defineProperty(process, 'platform', { value: 'linux' });
			fsMock.readFile.mockResolvedValue('invalid json {{{');

			const result = await readConfig('claude-desktop');
			expect(result).toBeNull();
		});

		it('should return null on read error', async () => {
			Object.defineProperty(process, 'platform', { value: 'linux' });
			fsMock.readFile.mockRejectedValue(new Error('Permission denied'));

			const result = await readConfig('claude-code');
			expect(result).toBeNull();
		});
	});

	describe('writeConfig', () => {
		const mockEnvironments: EnvironmentConfig[] = [
			{ name: 'dev', specUrl: 'https://api.dev.com/openapi.json', baseUrl: 'https://api.dev.com' }
		];

		beforeEach(() => {
			Object.defineProperty(process, 'platform', { value: 'linux' });
			fsMock.mkdir.mockResolvedValue(undefined);
			fsMock.writeFile.mockResolvedValue(undefined);
			fsMock.copyFile.mockResolvedValue(undefined);
			fsMock.access.mockRejectedValue(new Error('ENOENT')); // Default: file doesn't exist
		});

		it('should write new config file when none exists', async () => {
			const result = await writeConfig('vscode', 'test-server', mockEnvironments, 'dev');

			expect(result.success).toBe(true);
			expect(normalizePath(result.path)).toBe('/home/testuser/.config/Code/User/mcp.json');
			expect(result.backedUp).toBe(false);
			expect(fsMock.mkdir).toHaveBeenCalled();
			expect(fsMock.writeFile).toHaveBeenCalled();
		});

		it('should create parent directory if it does not exist', async () => {
			await writeConfig('claude-desktop', 'test-server', mockEnvironments, 'dev');

			const callArg = fsMock.mkdir.mock.calls[0][0];
			expect(normalizePath(callArg)).toContain('.config/Claude');
			expect(fsMock.mkdir.mock.calls[0][1]).toEqual({ recursive: true });
		});

		it('should create backup when overwriting existing config', async () => {
			fsMock.access.mockResolvedValue(undefined); // File exists
			fsMock.readFile.mockResolvedValue(JSON.stringify({ servers: { existing: {} } }));

			const result = await writeConfig('vscode', 'test-server', mockEnvironments, 'dev');

			expect(result.success).toBe(true);
			expect(result.backedUp).toBe(true);
			expect(fsMock.copyFile).toHaveBeenCalled();
		});

		it('should merge with existing VS Code config', async () => {
			fsMock.access.mockResolvedValue(undefined);
			const existingConfig = {
				servers: { 'existing-server': { command: 'test' } }
			};
			fsMock.readFile.mockResolvedValue(JSON.stringify(existingConfig));

			await writeConfig('vscode', 'test-server', mockEnvironments, 'dev');

			const writeCall = fsMock.writeFile.mock.calls[0];
			const writtenConfig = JSON.parse(writeCall[1] as string);
			expect(writtenConfig.servers).toHaveProperty('existing-server');
			expect(writtenConfig.servers).toHaveProperty('test-server');
		});

		it('should merge with existing Claude Desktop config', async () => {
			fsMock.access.mockResolvedValue(undefined);
			const existingConfig = {
				mcpServers: { 'existing-server': { command: 'test' } }
			};
			fsMock.readFile.mockResolvedValue(JSON.stringify(existingConfig));

			await writeConfig('claude-desktop', 'test-server', mockEnvironments, 'dev');

			const writeCall = fsMock.writeFile.mock.calls[0];
			const writtenConfig = JSON.parse(writeCall[1] as string);
			expect(writtenConfig.mcpServers).toHaveProperty('existing-server');
			expect(writtenConfig.mcpServers).toHaveProperty('test-server');
		});

		it('should merge with existing Claude Code config', async () => {
			fsMock.access.mockResolvedValue(undefined);
			const existingConfig = {
				mcpServers: { 'existing-server': { command: 'test' } }
			};
			fsMock.readFile.mockResolvedValue(JSON.stringify(existingConfig));

			await writeConfig('claude-code', 'test-server', mockEnvironments, 'dev');

			const writeCall = fsMock.writeFile.mock.calls[0];
			const writtenConfig = JSON.parse(writeCall[1] as string);
			expect(writtenConfig.mcpServers).toHaveProperty('existing-server');
			expect(writtenConfig.mcpServers).toHaveProperty('test-server');
		});

		it('should handle backup failure gracefully', async () => {
			fsMock.access.mockResolvedValue(undefined);
			fsMock.readFile.mockResolvedValue(JSON.stringify({ servers: {} }));
			fsMock.copyFile.mockRejectedValue(new Error('Backup failed'));

			const result = await writeConfig('vscode', 'test-server', mockEnvironments, 'dev');

			expect(result.success).toBe(true);
			expect(result.backedUp).toBe(false);
		});

		it('should return error on write failure', async () => {
			fsMock.writeFile.mockRejectedValue(new Error('Permission denied'));

			const result = await writeConfig('vscode', 'test-server', mockEnvironments, 'dev');

			expect(result.success).toBe(false);
			expect(result.error).toContain('Permission denied');
		});

		it('should write config even if backup fails', async () => {
			fsMock.access.mockResolvedValue(undefined);
			fsMock.readFile.mockResolvedValue(JSON.stringify({ servers: {} }));
			fsMock.copyFile.mockRejectedValue(new Error('Backup failed'));

			const result = await writeConfig('vscode', 'test-server', mockEnvironments, 'dev');

			expect(result.success).toBe(true);
			expect(fsMock.writeFile).toHaveBeenCalled();
		});
	});

	describe('detectClients', () => {
		beforeEach(() => {
			Object.defineProperty(process, 'platform', { value: 'linux' });
		});

		it('should detect all installed clients', async () => {
			fsMock.access.mockResolvedValue(undefined); // All exist

			const result = await detectClients();

			expect(result).toHaveLength(3);
			expect(result.every((r) => r.found)).toBe(true);
			expect(result.map((r) => r.type)).toEqual(['vscode', 'claude-desktop', 'claude-code']);
		});

		it('should detect no clients when none are installed', async () => {
			fsMock.access.mockRejectedValue(new Error('ENOENT')); // None exist

			const result = await detectClients();

			expect(result).toHaveLength(3);
			expect(result.every((r) => !r.found)).toBe(true);
		});

		it('should detect partial client installation', async () => {
			// VS Code exists, others don't
			fsMock.access.mockImplementation((path: any) => {
				if (typeof path === 'string' && path.includes('Code')) {
					return Promise.resolve(undefined);
				}
				return Promise.reject(new Error('ENOENT'));
			});

			const result = await detectClients();

			const vscodeResult = result.find((r) => r.type === 'vscode');
			const claudeDesktopResult = result.find((r) => r.type === 'claude-desktop');
			const claudeCodeResult = result.find((r) => r.type === 'claude-code');

			expect(vscodeResult?.found).toBe(true);
			expect(claudeDesktopResult?.found).toBe(false);
			expect(claudeCodeResult?.found).toBe(false);
		});

		it('should return correct paths for all clients', async () => {
			fsMock.access.mockRejectedValue(new Error('ENOENT'));

			const result = await detectClients();

			expect(result.every((r) => r.path)).toBe(true);
			expect(result.every((r) => typeof r.path === 'string')).toBe(true);
		});
	});
});
