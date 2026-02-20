export function extractSandbox(settings) {
    let enabled = null;
    let allowedDomains = null;
    let allowUnixSockets = null;
    let allowLocalBinding = null;
    let autoAllowBash = null;
    for (const file of settings.files) {
        const sandbox = file.raw.sandbox;
        if (!sandbox)
            continue;
        if (typeof sandbox.enabled === 'boolean') {
            enabled = { value: sandbox.enabled, scope: file.scope, filePath: file.filePath, editable: file.editable };
        }
        if (typeof sandbox.autoAllowBashIfSandboxed === 'boolean') {
            autoAllowBash = { value: sandbox.autoAllowBashIfSandboxed, scope: file.scope, filePath: file.filePath, editable: file.editable };
        }
        const network = sandbox.network;
        if (network) {
            if (Array.isArray(network.allowedDomains)) {
                allowedDomains = { value: network.allowedDomains, scope: file.scope, filePath: file.filePath, editable: file.editable };
            }
            if (Array.isArray(network.allowUnixSockets)) {
                allowUnixSockets = { value: network.allowUnixSockets, scope: file.scope, filePath: file.filePath, editable: file.editable };
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
