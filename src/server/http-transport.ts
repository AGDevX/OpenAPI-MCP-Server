import { randomUUID } from 'node:crypto';
import { Request, Response, Express } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createApiServer } from './mcp-server.js';
import { SessionManager } from '../services/session-manager.js';

//-- Create and configure the Express app with MCP HTTP transport handlers
export function createMcpHttpApp(): Express {
	const app = createMcpExpressApp();
	const sessionManager = new SessionManager();

	//-- Handle POST requests (for initialization and regular requests)
	app.post('/mcp', async (req: Request, res: Response) => {
		const sessionId = req.headers['mcp-session-id'] as string | undefined;

		if (sessionId) {
			console.log(`Received MCP request for session: ${sessionId}`);
		}

		try {
			let transport: StreamableHTTPServerTransport;

			if (sessionId && sessionManager.get(sessionId)) {
				//-- Reuse existing transport
				transport = sessionManager.get(sessionId)!;
			} else if (!sessionId && isInitializeRequest(req.body)) {
				//-- New initialization request
				transport = new StreamableHTTPServerTransport({
					sessionIdGenerator: () => randomUUID(),
					onsessioninitialized: (newSessionId) => {
						console.log(`Session initialized with ID: ${newSessionId}`);
						sessionManager.add(newSessionId, transport);
					}
				});

				//-- Set up onclose handler
				transport.onclose = () => {
					const sid = transport.sessionId;
					if (sid && sessionManager.get(sid)) {
						console.log(`Transport closed for session ${sid}`);
						sessionManager.delete(sid);
					}
				};

				//-- Connect the transport to a new server instance
				const server = await createApiServer();
				await server.connect(transport);
				await transport.handleRequest(req, res, req.body);
				return;
			} else {
				//-- Invalid request
				res.status(400).json({
					jsonrpc: '2.0',
					error: {
						code: -32000,
						message: 'Bad Request: No valid session ID provided'
					},
					id: null
				});
				return;
			}

			//-- Handle the request with existing transport
			await transport.handleRequest(req, res, req.body);
		} catch (error) {
			console.error('Error handling MCP request:', error);
			if (!res.headersSent) {
				res.status(500).json({
					jsonrpc: '2.0',
					error: {
						code: -32603,
						message: 'Internal server error'
					},
					id: null
				});
			}
		}
	});

	//-- Handle GET requests for SSE streams
	app.get('/mcp', async (req: Request, res: Response) => {
		const sessionId = req.headers['mcp-session-id'] as string | undefined;

		if (!sessionId || !sessionManager.get(sessionId)) {
			res.status(400).send('Invalid or missing session ID');
			return;
		}

		console.log(`Establishing SSE stream for session ${sessionId}`);
		const transport = sessionManager.get(sessionId)!;
		await transport.handleRequest(req, res);
	});

	//-- Handle DELETE requests for session termination
	app.delete('/mcp', async (req: Request, res: Response) => {
		const sessionId = req.headers['mcp-session-id'] as string | undefined;

		if (!sessionId || !sessionManager.get(sessionId)) {
			res.status(400).send('Invalid or missing session ID');
			return;
		}

		console.log(`Session termination request for session ${sessionId}`);
		const transport = sessionManager.get(sessionId)!;
		await transport.handleRequest(req, res);
	});

	//-- Graceful shutdown handler
	const shutdown = async () => {
		console.log('Shutting down server...');
		await sessionManager.closeAll();
		process.exit(0);
	};

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);

	return app;
}
