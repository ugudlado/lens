import type { SandboxSurface, ScopedItem, SettingsSurface } from '@lens/schema';

export function extractSandbox(settings: SettingsSurface): SandboxSurface {
  let enabled: ScopedItem<boolean> | null = null;
  let allowedDomains: ScopedItem<string[]> | null = null;
  let allowUnixSockets: ScopedItem<string[]> | null = null;
  let allowLocalBinding: ScopedItem<boolean> | null = null;
  let autoAllowBash: ScopedItem<boolean> | null = null;

  for (const file of settings.files) {
    const sandbox = file.raw.sandbox as Record<string, unknown> | undefined;
    if (!sandbox) continue;
    if (typeof sandbox.enabled === 'boolean') {
      enabled = { value: sandbox.enabled, scope: file.scope, filePath: file.filePath, editable: file.editable };
    }
    if (typeof sandbox.autoAllowBashIfSandboxed === 'boolean') {
      autoAllowBash = { value: sandbox.autoAllowBashIfSandboxed, scope: file.scope, filePath: file.filePath, editable: file.editable };
    }
    const network = sandbox.network as Record<string, unknown> | undefined;
    if (network) {
      if (Array.isArray(network.allowedDomains)) {
        allowedDomains = { value: network.allowedDomains as string[], scope: file.scope, filePath: file.filePath, editable: file.editable };
      }
      if (Array.isArray(network.allowUnixSockets)) {
        allowUnixSockets = { value: network.allowUnixSockets as string[], scope: file.scope, filePath: file.filePath, editable: file.editable };
      }
      if (typeof network.allowLocalBinding === 'boolean') {
        allowLocalBinding = { value: network.allowLocalBinding, scope: file.scope, filePath: file.filePath, editable: file.editable };
      }
    }
  }

  return {
    enabled,
    network: { allowedDomains, allowUnixSockets, allowLocalBinding },
    autoAllowBashIfSandboxed: autoAllowBash,
  };
}
