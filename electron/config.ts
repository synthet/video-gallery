import fs from 'fs';
import path from 'path';

export interface AppConfig {
    libraryRoot?: string;
    expressPort?: number;
}

export function getConfigPath(): string {
    const projectRoot = path.resolve(__dirname, '..');
    return path.join(projectRoot, 'config.json');
}

export function loadAppConfig(): AppConfig {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (err) {
            console.error('[Config] Failed to parse config.json:', err);
            return {};
        }
    }
    return {};
}

export function saveAppConfig(updates: Partial<AppConfig>): AppConfig {
    const configPath = getConfigPath();
    const existing = loadAppConfig();
    const merged = { ...existing, ...updates };
    try {
        fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
        console.log('[Config] Config updated successfully');
    } catch (err) {
        console.error('[Config] Failed to save config.json:', err);
    }
    return merged;
}
