import { ModelProviderType } from '@lens/schema';
import type { ModelsSurface, ModelProvider, ScopedItem } from '@lens/schema';

export async function scanModels(effectiveSettings: Record<string, ScopedItem<unknown>>): Promise<ModelsSurface> {
  const providers: ModelProvider[] = [];

  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  providers.push({
    name: 'Anthropic', type: ModelProviderType.Anthropic, available: hasAnthropicKey,
    models: hasAnthropicKey ? [
      { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    ] : [],
    configSource: 'ANTHROPIC_API_KEY',
  });

  try {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = (await res.json()) as { models?: Array<{ name: string; details?: { family?: string } }> };
      providers.push({
        name: 'Ollama', type: ModelProviderType.Ollama, available: true,
        models: (data.models || []).map((m) => ({ id: m.name, label: m.name, detail: m.details?.family })),
        configSource: baseUrl,
      });
    } else { throw new Error('not ok'); }
  } catch {
    providers.push({
      name: 'Ollama', type: ModelProviderType.Ollama, available: false, models: [],
      configSource: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    });
  }

  providers.push({
    name: 'AWS Bedrock', type: ModelProviderType.Bedrock,
    available: !!process.env.ANTHROPIC_BEDROCK_BASE_URL || !!process.env.AWS_REGION,
    models: [], configSource: 'ANTHROPIC_BEDROCK_BASE_URL / AWS_REGION',
  });

  providers.push({
    name: 'Google Vertex', type: ModelProviderType.Vertex,
    available: !!process.env.ANTHROPIC_VERTEX_PROJECT_ID,
    models: [], configSource: 'ANTHROPIC_VERTEX_PROJECT_ID',
  });

  const defaultModel = effectiveSettings.model ? (effectiveSettings.model as ScopedItem<string>) : null;
  return { providers, defaultModel };
}
