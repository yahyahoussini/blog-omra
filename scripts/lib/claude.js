// Claude API access for the automation (official Node SDK). The model id comes only from CLAUDE_MODEL.
import Anthropic from '@anthropic-ai/sdk';
import { getModel } from '../../engine/lib/model.js';
import { hasEnv } from './common.js';

// Why the API cannot be used in this run, or null. Scripts skip (exit 0) instead of failing on this.
export function apiUnavailable(env = process.env) {
  const missing = ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL'].filter(k => !hasEnv(k, env));
  return missing.length ? `${missing.join(' and ')} not set` : null;
}

export class FatalApiError extends Error {}   // stop the whole run (credentials, bad request, model not found, rate limit after retries)
export class SkipTopicError extends Error {}  // this topic only (refusal, truncated output)

export function makeClient(env = process.env) {
  // The SDK retries 408/409/429/5xx and connection errors with backoff; 4 retries for a nightly batch job.
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 4, timeout: 15 * 60 * 1000 });
}

/**
 * One request. The system prompt is sent as a cached block (identical for every call of a run).
 * @returns {{ text:string, content:object[], usage:object, stopReason:string }}
 */
export async function callClaude(client, { system, messages, maxTokens = 32000, effort = null, format = null, env = process.env }) {
  const params = {
    model: getModel(env),
    max_tokens: maxTokens,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages,
  };
  const outputConfig = {};
  if (effort) outputConfig.effort = effort;
  if (format) outputConfig.format = format;
  if (Object.keys(outputConfig).length) params.output_config = outputConfig;

  let msg;
  try {
    // Streaming avoids HTTP timeouts on long drafts; finalMessage() returns the complete response.
    msg = await client.messages.stream(params).finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new FatalApiError(`Claude API credentials rejected (${e.status}): check ANTHROPIC_API_KEY`);
    if (e instanceof Anthropic.NotFoundError) throw new FatalApiError(`Claude API 404: is CLAUDE_MODEL a valid model id? (${e.message})`);
    if (e instanceof Anthropic.BadRequestError) throw new FatalApiError(`Claude API rejected the request (400): ${e.message}`);
    if (e instanceof Anthropic.RateLimitError) throw new FatalApiError('Claude API rate limit still hit after retries: stopping this run');
    if (e instanceof Anthropic.APIConnectionError) throw new FatalApiError(`Claude API unreachable after retries: ${e.message}`);
    if (e instanceof Anthropic.APIError) throw new FatalApiError(`Claude API error ${e.status ?? ''}: ${e.message}`);
    throw e;
  }
  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return { text, content: msg.content, usage: msg.usage || {}, stopReason: msg.stop_reason };
}

// Turns a stop reason into a topic-level error (usage is still counted by the caller).
export function checkStop(res) {
  if (res.stopReason === 'refusal') throw new SkipTopicError('the model declined this request (stop_reason: refusal)');
  if (res.stopReason === 'max_tokens') throw new SkipTopicError('output truncated (stop_reason: max_tokens): raise claude.max_tokens in config/cadence.json');
}
