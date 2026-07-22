import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { assertLocalHttpUrl } from "./localNetwork.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");
const CONFIG_PATH = path.join(PROJECT_ROOT, "config.json");

export interface AppConfig {
    libraryRoot?: string;
    expressPort?: number;
}

let cachedConfig: AppConfig | null = null;
let configMtime = 0;

export async function readConfig(): Promise<AppConfig> {
    try {
        const stat = await fs.stat(CONFIG_PATH);
        if (cachedConfig !== null && stat.mtimeMs === configMtime) {
            return cachedConfig;
        }
        const raw = await fs.readFile(CONFIG_PATH, "utf-8");
        cachedConfig = JSON.parse(raw) as AppConfig;
        configMtime = stat.mtimeMs;
        return cachedConfig;
    } catch {
        return {};
    }
}

export function getConfigPath(): string {
    return CONFIG_PATH;
}

export function getProjectRoot(): string {
    return PROJECT_ROOT;
}

/**
 * Dev Express API base URL (npm run server / npm run dev).
 */
export async function resolveDevApiUrl(): Promise<string> {
    const config = await readConfig();
    const port =
        typeof config.expressPort === "number" && config.expressPort > 0
            ? config.expressPort
            : 3002;
    return assertLocalHttpUrl(`http://127.0.0.1:${port}`, "Dev API base URL");
}
