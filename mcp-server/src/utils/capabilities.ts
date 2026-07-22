import { resolveDevApiUrl } from "./config.js";
import { assertLocalHttpUrl } from "./localNetwork.js";

/**
 * Base URL for Chrome DevTools HTTP (Electron remote debugging).
 */
export function getCdpBaseUrl(): string {
    const full = process.env.ELECTRON_CDP_URL?.trim();
    if (full) {
        return assertLocalHttpUrl(full, "ELECTRON_CDP_URL");
    }
    const port =
        process.env.ELECTRON_REMOTE_DEBUGGING_PORT?.trim() ||
        process.env.ELECTRON_CDP_PORT?.trim() ||
        "9222";
    if (!/^\d+$/.test(port)) {
        return "http://127.0.0.1:9222";
    }
    return `http://127.0.0.1:${port}`;
}

export async function probeDevApi(): Promise<{
    reachable: boolean;
    base_url: string;
    error?: string;
}> {
    const base_url = await resolveDevApiUrl();
    try {
        const ping = await fetch(`${base_url}/gallery-api/ping`, {
            signal: AbortSignal.timeout(3000),
        });
        if (!ping.ok) {
            return { reachable: false, base_url, error: `ping HTTP ${ping.status}` };
        }
        const db = await fetch(`${base_url}/gallery-api/db/check-connection`, {
            signal: AbortSignal.timeout(3000),
        });
        if (!db.ok) {
            return { reachable: false, base_url, error: `db check HTTP ${db.status}` };
        }
        return { reachable: true, base_url };
    } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        return { reachable: false, base_url, error };
    }
}

export async function probeElectronCdp(): Promise<{
    reachable: boolean;
    cdp_url: string;
    target_count?: number;
    error?: string;
}> {
    const cdp_url = getCdpBaseUrl();
    try {
        const resp = await fetch(`${cdp_url}/json`, { signal: AbortSignal.timeout(3000) });
        if (!resp.ok) {
            return { reachable: false, cdp_url, error: `HTTP ${resp.status} ${resp.statusText}` };
        }
        const targets = (await resp.json()) as unknown;
        const target_count = Array.isArray(targets) ? targets.length : 0;
        return { reachable: true, cdp_url, target_count };
    } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        return { reachable: false, cdp_url, error };
    }
}

export async function collectVideoStatus(): Promise<Record<string, unknown>> {
    const [dev_api, electron_cdp] = await Promise.all([probeDevApi(), probeElectronCdp()]);
    return {
        dev_api,
        electron_cdp,
        hints: {
            api_tools: dev_api.reachable
                ? "api_* tools should work against the dev Express server (npm run server or npm run dev)."
                : "Start the dev server (npm run dev:web or npm run dev) for api_* tools.",
            cdp_tools: electron_cdp.reachable
                ? "cdp_* tools should work (Electron dev + remote debugging)."
                : "Run npm run dev with remote debugging (default port 9222) for cdp_* tools.",
        },
    };
}
