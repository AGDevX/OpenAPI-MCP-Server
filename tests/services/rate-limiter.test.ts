import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RateLimiter } from '../../src/services/rate-limiter.js';

describe('RateLimiter', () => {
	let rateLimiter: RateLimiter;

	beforeEach(() => {
		rateLimiter = new RateLimiter({
			maxRequests: 3,
			windowMs: 1000
		});
	});

	describe('checkLimit', () => {
		it('should allow requests under the limit', async () => {
			const result1 = await rateLimiter.checkLimit();
			const result2 = await rateLimiter.checkLimit();
			const result3 = await rateLimiter.checkLimit();

			expect(result1.allowed).toBe(true);
			expect(result2.allowed).toBe(true);
			expect(result3.allowed).toBe(true);
		});

		it('should block requests over the limit', async () => {
			// Fill up the limit
			await rateLimiter.checkLimit();
			await rateLimiter.checkLimit();
			await rateLimiter.checkLimit();

			// This should be blocked
			const result = await rateLimiter.checkLimit();
			expect(result.allowed).toBe(false);
			expect(result.retryAfter).toBeGreaterThan(0);
		});

		it('should allow requests after the window expires', async () => {
			// Mock timer
			jest.useFakeTimers();

			// Fill up the limit
			await rateLimiter.checkLimit();
			await rateLimiter.checkLimit();
			await rateLimiter.checkLimit();

			// This should be blocked
			const blockedResult = await rateLimiter.checkLimit();
			expect(blockedResult.allowed).toBe(false);

			// Advance time beyond the window
			jest.advanceTimersByTime(1100);

			// This should now be allowed
			const allowedResult = await rateLimiter.checkLimit();
			expect(allowedResult.allowed).toBe(true);

			jest.useRealTimers();
		});

		it('should calculate correct retryAfter value', async () => {
			jest.useFakeTimers();
			const startTime = Date.now();
			jest.setSystemTime(startTime);

			// Fill up the limit
			await rateLimiter.checkLimit();
			await rateLimiter.checkLimit();
			await rateLimiter.checkLimit();

			// Try one more request
			const result = await rateLimiter.checkLimit();
			expect(result.allowed).toBe(false);
			expect(result.retryAfter).toBeLessThanOrEqual(1);

			jest.useRealTimers();
		});
	});

	describe('getStats', () => {
		it('should return correct statistics', async () => {
			await rateLimiter.checkLimit();
			await rateLimiter.checkLimit();

			const stats = rateLimiter.getStats();
			expect(stats.currentRequests).toBe(2);
			expect(stats.maxRequests).toBe(3);
			expect(stats.windowMs).toBe(1000);
		});

		it('should exclude expired requests from statistics', async () => {
			jest.useFakeTimers();

			await rateLimiter.checkLimit();
			await rateLimiter.checkLimit();

			// Advance time beyond the window
			jest.advanceTimersByTime(1100);

			const stats = rateLimiter.getStats();
			expect(stats.currentRequests).toBe(0);

			jest.useRealTimers();
		});
	});

	describe('reset', () => {
		it('should clear all requests', async () => {
			await rateLimiter.checkLimit();
			await rateLimiter.checkLimit();
			await rateLimiter.checkLimit();

			rateLimiter.reset();

			const stats = rateLimiter.getStats();
			expect(stats.currentRequests).toBe(0);

			// Should allow new requests after reset
			const result = await rateLimiter.checkLimit();
			expect(result.allowed).toBe(true);
		});
	});

	describe('sliding window behavior', () => {
		it('should implement sliding window correctly', async () => {
			jest.useFakeTimers();
			const startTime = Date.now();
			jest.setSystemTime(startTime);

			// T=0: Add 3 requests
			await rateLimiter.checkLimit();
			await rateLimiter.checkLimit();
			await rateLimiter.checkLimit();

			// T=0: Should be blocked
			const blocked1 = await rateLimiter.checkLimit();
			expect(blocked1.allowed).toBe(false);

			// T=600: Still blocked (oldest request at T=0)
			jest.advanceTimersByTime(600);
			const blocked2 = await rateLimiter.checkLimit();
			expect(blocked2.allowed).toBe(false);

			// T=1100: Oldest request expired, should be allowed
			jest.advanceTimersByTime(500);
			const allowed = await rateLimiter.checkLimit();
			expect(allowed.allowed).toBe(true);

			jest.useRealTimers();
		});
	});

	describe('different configurations', () => {
		it('should respect custom maxRequests', async () => {
			const customLimiter = new RateLimiter({
				maxRequests: 5,
				windowMs: 1000
			});

			// Should allow 5 requests
			for (let i = 0; i < 5; i++) {
				const result = await customLimiter.checkLimit();
				expect(result.allowed).toBe(true);
			}

			// 6th should be blocked
			const result = await customLimiter.checkLimit();
			expect(result.allowed).toBe(false);
		});

		it('should respect custom windowMs', async () => {
			jest.useFakeTimers();

			const customLimiter = new RateLimiter({
				maxRequests: 2,
				windowMs: 5000 // 5 seconds
			});

			await customLimiter.checkLimit();
			await customLimiter.checkLimit();

			// Should be blocked
			const blocked = await customLimiter.checkLimit();
			expect(blocked.allowed).toBe(false);

			// After 3 seconds, still blocked
			jest.advanceTimersByTime(3000);
			const stillBlocked = await customLimiter.checkLimit();
			expect(stillBlocked.allowed).toBe(false);

			// After 5+ seconds, should be allowed
			jest.advanceTimersByTime(2100);
			const allowed = await customLimiter.checkLimit();
			expect(allowed.allowed).toBe(true);

			jest.useRealTimers();
		});
	});
});
