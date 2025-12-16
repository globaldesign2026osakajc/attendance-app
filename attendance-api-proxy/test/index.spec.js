import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('GAS API Proxy Worker', () => {
	describe('CORS handling', () => {
		it('returns CORS headers for OPTIONS request', async () => {
			const request = new Request('http://example.com/', {
				method: 'OPTIONS'
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			
			expect(response.status).toBe(204);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		});
	});

	describe('proxy requests', () => {
		it('forwards GET requests to GAS API', async () => {
			const request = new Request('http://example.com/?action=getMembers', {
				method: 'GET'
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			
			expect(response.status).toBeGreaterThanOrEqual(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		});

		it('includes CORS headers in response', async () => {
			const request = new Request('http://example.com/', {
				method: 'GET'
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
		});
	});
});
