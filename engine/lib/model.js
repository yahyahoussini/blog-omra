// The AI model id is never hardcoded: it comes from the CLAUDE_MODEL environment variable.
export function getModel(env = process.env) {
  const model = env.CLAUDE_MODEL?.trim();
  if (!model) throw new Error('CLAUDE_MODEL is not set. Set it in the environment (GitHub secret / .env); no model id is stored in the repo.');
  return model;
}
