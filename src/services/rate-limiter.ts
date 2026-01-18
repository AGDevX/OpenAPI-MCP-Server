export interface RateLimiterConfig {
	maxRequests: number;
	windowMs: number;
}

//-- Simple global rate limiter using sliding window
export class RateLimiter {
	private requests: number[] = [];
	private maxRequests: number;
	private windowMs: number;

	constructor(config: RateLimiterConfig) {
		this.maxRequests = config.maxRequests;
		this.windowMs = config.windowMs;
	}

	//-- Check if request is allowed and record it
	async checkLimit(): Promise<{ allowed: boolean; retryAfter?: number }> {
		const now = Date.now();

		//-- Remove requests outside the current window
		this.requests = this.requests.filter((timestamp) => now - timestamp < this.windowMs);

		//-- Check if under limit
		if (this.requests.length < this.maxRequests) {
			this.requests.push(now);
			return { allowed: true };
		}

		//-- Calculate when the oldest request will expire
		const oldestRequest = this.requests[0];
		const retryAfter = Math.ceil((oldestRequest + this.windowMs - now) / 1000);

		return { allowed: false, retryAfter };
	}

	//-- Get current usage statistics
	getStats(): { currentRequests: number; maxRequests: number; windowMs: number } {
		const now = Date.now();
		this.requests = this.requests.filter((timestamp) => now - timestamp < this.windowMs);

		return {
			currentRequests: this.requests.length,
			maxRequests: this.maxRequests,
			windowMs: this.windowMs
		};
	}

	//-- Reset the rate limiter (useful for testing)
	reset(): void {
		this.requests = [];
	}
}
