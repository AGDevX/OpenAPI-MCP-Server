/**
 * Simple logger that respects stdio transport mode
 *
 * In stdio mode:
 * - stdout is reserved exclusively for JSON-RPC communication between MCP client and server
 * - ALL logs (info, debug, warnings, errors) must go to stderr using console.error()
 * - Note: console.error() doesn't mean "error level" - it means "write to stderr stream"
 * - MCP clients display stderr output in their logs/output window for diagnostics
 *
 * Set MCP_VERBOSE=true to see detailed logs, otherwise only errors are shown
 */

const isStdioMode = process.env.TRANSPORT !== 'http' && !process.env.PORT;
const isVerbose = process.env.MCP_VERBOSE === 'true';

export const logger = {
	log: (...args: any[]) => {
		if (isVerbose) {
			if (isStdioMode) {
				// In stdio mode, use console.error() to write to stderr (not stdout)
				console.error(...args);
			} else {
				console.log(...args);
			}
		}
	},

	error: (...args: any[]) => {
		// Always output errors to stderr regardless of mode or verbosity
		console.error(...args);
	},

	warn: (...args: any[]) => {
		if (isVerbose) {
			// Warnings also go to stderr in stdio mode
			console.error(...args);
		}
	}
};
