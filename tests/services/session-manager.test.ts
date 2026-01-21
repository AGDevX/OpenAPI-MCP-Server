import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SessionManager } from '../../src/services/session-manager.js';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

describe('SessionManager', () => {
	let sessionManager: SessionManager;
	let mockTransport: any;

	beforeEach(() => {
		sessionManager = new SessionManager();
		mockTransport = {
			close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
		};
	});

	describe('add', () => {
		it('should add a transport for a session', () => {
			sessionManager.add('session-1', mockTransport);
			const retrieved = sessionManager.get('session-1');
			expect(retrieved).toBe(mockTransport);
		});

		it('should allow adding multiple transports', () => {
			const mockTransport2: any = {
				close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
			};

			sessionManager.add('session-1', mockTransport);
			sessionManager.add('session-2', mockTransport2);

			expect(sessionManager.get('session-1')).toBe(mockTransport);
			expect(sessionManager.get('session-2')).toBe(mockTransport2);
		});

		it('should overwrite existing transport for same session ID', () => {
			const mockTransport2: any = {
				close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
			};

			sessionManager.add('session-1', mockTransport);
			sessionManager.add('session-1', mockTransport2);

			expect(sessionManager.get('session-1')).toBe(mockTransport2);
		});
	});

	describe('get', () => {
		it('should return undefined for non-existent session', () => {
			const result = sessionManager.get('non-existent');
			expect(result).toBeUndefined();
		});

		it('should return the correct transport for existing session', () => {
			sessionManager.add('session-1', mockTransport);
			const result = sessionManager.get('session-1');
			expect(result).toBe(mockTransport);
		});
	});

	describe('delete', () => {
		it('should remove a transport', () => {
			sessionManager.add('session-1', mockTransport);
			sessionManager.delete('session-1');

			const result = sessionManager.get('session-1');
			expect(result).toBeUndefined();
		});

		it('should not error when deleting non-existent session', () => {
			expect(() => sessionManager.delete('non-existent')).not.toThrow();
		});

		it('should only delete the specified session', () => {
			const mockTransport2: any = {
				close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
			};

			sessionManager.add('session-1', mockTransport);
			sessionManager.add('session-2', mockTransport2);

			sessionManager.delete('session-1');

			expect(sessionManager.get('session-1')).toBeUndefined();
			expect(sessionManager.get('session-2')).toBe(mockTransport2);
		});
	});

	describe('closeAll', () => {
		it('should close all transports', async () => {
			const mockTransport2: any = {
				close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
			};
			const mockTransport3: any = {
				close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
			};

			sessionManager.add('session-1', mockTransport);
			sessionManager.add('session-2', mockTransport2);
			sessionManager.add('session-3', mockTransport3);

			await sessionManager.closeAll();

			expect(mockTransport.close).toHaveBeenCalledTimes(1);
			expect(mockTransport2.close).toHaveBeenCalledTimes(1);
			expect(mockTransport3.close).toHaveBeenCalledTimes(1);
		});

		it('should remove all transports after closing', async () => {
			sessionManager.add('session-1', mockTransport);
			sessionManager.add('session-2', mockTransport);

			await sessionManager.closeAll();

			expect(sessionManager.get('session-1')).toBeUndefined();
			expect(sessionManager.get('session-2')).toBeUndefined();
		});

		it('should continue closing other transports if one fails', async () => {
			const mockTransport2: any = {
				close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
			};

			const mockFailingTransport: any = {
				close: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Close failed'))
			};

			sessionManager.add('session-1', mockFailingTransport);
			sessionManager.add('session-2', mockTransport2);

			// Spy on console.error to suppress output
			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

			await sessionManager.closeAll();

			expect(mockFailingTransport.close).toHaveBeenCalled();
			expect(mockTransport2.close).toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Error closing transport for session'),
				expect.any(Error)
			);

			consoleErrorSpy.mockRestore();
		});

		it('should handle empty session manager', async () => {
			await expect(sessionManager.closeAll()).resolves.not.toThrow();
		});
	});
});
