import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extractSandbox } from '../sandbox.js';
import { ConfigScope } from '@lens/schema';
import { setAllowGlobalWrites } from '../utils.js';
import type { SettingsSurface } from '@lens/schema';

const makeSettingsFile = (raw: Record<string, unknown>, scope = ConfigScope.Project) => ({
  scope,
  filePath: '/fake/settings.json',
  editable: true,
  raw,
});

beforeEach(() => {
  setAllowGlobalWrites(false);
});

afterEach(() => {
  setAllowGlobalWrites(false);
});

describe('extractSandbox', () => {
  it('returns all null fields for empty settings', () => {
    const result = extractSandbox({ files: [], effective: {} });
    expect(result.enabled).toBeNull();
    expect(result.network.allowedDomains).toBeNull();
    expect(result.network.allowUnixSockets).toBeNull();
    expect(result.network.allowLocalBinding).toBeNull();
    expect(result.autoAllowBashIfSandboxed).toBeNull();
  });

  it('extracts sandbox.enabled: true with correct scope and filePath', () => {
    const settings: SettingsSurface = {
      files: [makeSettingsFile({ sandbox: { enabled: true } })],
      effective: {},
    };
    const result = extractSandbox(settings);
    expect(result.enabled).not.toBeNull();
    expect(result.enabled!.value).toBe(true);
    expect(result.enabled!.scope).toBe(ConfigScope.Project);
    expect(result.enabled!.filePath).toBe('/fake/settings.json');
  });

  it('extracts sandbox.network.allowedDomains array', () => {
    const domains = ['example.com', 'api.example.org'];
    const settings: SettingsSurface = {
      files: [makeSettingsFile({ sandbox: { network: { allowedDomains: domains } } })],
      effective: {},
    };
    const result = extractSandbox(settings);
    expect(result.network.allowedDomains).not.toBeNull();
    expect(result.network.allowedDomains!.value).toEqual(domains);
  });

  it('extracts sandbox.autoAllowBashIfSandboxed: false', () => {
    const settings: SettingsSurface = {
      files: [makeSettingsFile({ sandbox: { autoAllowBashIfSandboxed: false } })],
      effective: {},
    };
    const result = extractSandbox(settings);
    expect(result.autoAllowBashIfSandboxed).not.toBeNull();
    expect(result.autoAllowBashIfSandboxed!.value).toBe(false);
  });

  it('extracts network.allowUnixSockets and network.allowLocalBinding', () => {
    const sockets = ['/tmp/my.sock'];
    const settings: SettingsSurface = {
      files: [
        makeSettingsFile({
          sandbox: {
            network: {
              allowUnixSockets: sockets,
              allowLocalBinding: true,
            },
          },
        }),
      ],
      effective: {},
    };
    const result = extractSandbox(settings);
    expect(result.network.allowUnixSockets!.value).toEqual(sockets);
    expect(result.network.allowLocalBinding!.value).toBe(true);
  });

  it('uses the last file with sandbox config when multiple files are present', () => {
    const settings: SettingsSurface = {
      files: [
        makeSettingsFile({ sandbox: { enabled: false } }, ConfigScope.Global),
        makeSettingsFile({ sandbox: { enabled: true } }, ConfigScope.Project),
      ],
      effective: {},
    };
    const result = extractSandbox(settings);
    // Last file wins since loop overwrites
    expect(result.enabled!.value).toBe(true);
    expect(result.enabled!.scope).toBe(ConfigScope.Project);
  });
});
