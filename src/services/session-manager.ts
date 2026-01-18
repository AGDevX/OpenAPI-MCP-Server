import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export class SessionManager {
	private transports: Record<string, StreamableHTTPServerTransport> = {};

	add(sessionId: string, transport: StreamableHTTPServerTransport): void {
		this.transports[sessionId] = transport;
	}

	get(sessionId: string): StreamableHTTPServerTransport | undefined {
		return this.transports[sessionId];
	}

	delete(sessionId: string): void {
		delete this.transports[sessionId];
	}

	async closeAll(): Promise<void> {
		for (const sessionId in this.transports) {
			try {
				await this.transports[sessionId].close();
				delete this.transports[sessionId];
			} catch (error) {
				console.error(`Error closing transport for session ${sessionId}:`, error);
			}
		}
	}
}
