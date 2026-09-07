# Chat: API Gateway Security Architecture
Date: 2026-03-15

User: We need to finalize the rate limiting configuration for the public API gateway.
Assistant: We agreed on a sliding window rate limiter of 100 requests per minute per IP using Redis. Token bucket was rejected due to burst concurrency spikes.
User: What was the fallback if Redis becomes unavailable?
Assistant: If Redis is unreachable, the gateway falls back to local in-memory token buckets with strict 20 req/min limits.
