import path from 'path';
import fs from 'fs';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';

const BACKEND_DIR = 'D:\\Projects\\image-scoring-backend';

export interface IngestTallies {
    copied: number;
    skipped: number;
    errors: number;
}

export interface SpawnIngestOptions {
    sourcePath: string;
    destRoot: string;
    dryRun?: boolean;
    onStdout?: (text: string) => void;
    onStderr?: (text: string) => void;
}

export function getIngestScriptPath(): string {
    return path.join(BACKEND_DIR, 'scripts', 'utils', 'ingest_videos.py');
}

export function tallyIngestLine(line: string, tallies: IngestTallies): void {
    if (line.includes('WOULD COPY:') || line.includes('COPY:')) {
        tallies.copied++;
    }
    if (line.includes('SKIP duplicate:')) {
        tallies.skipped++;
    }
    if (/\bERROR\b/.test(line)) {
        tallies.errors++;
    }
}

export function tallyIngestOutput(text: string, tallies: IngestTallies): void {
    for (const line of text.split('\n')) {
        tallyIngestLine(line, tallies);
    }
}

export function spawnIngestScript(options: SpawnIngestOptions): ChildProcessWithoutNullStreams {
    const scriptPath = getIngestScriptPath();
    if (!fs.existsSync(scriptPath)) {
        throw new Error(`Python ingest script not found at: ${scriptPath}. Check image-scoring-backend path.`);
    }

    const args = [
        scriptPath,
        '--source',
        options.sourcePath,
        '--dest',
        options.destRoot,
    ];
    if (options.dryRun) {
        args.push('--dry-run');
    }

    const pythonProcess = spawn('python', args, {
        cwd: BACKEND_DIR,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    const tallies: IngestTallies = { copied: 0, skipped: 0, errors: 0 };

    pythonProcess.stdout.on('data', (data) => {
        const text = data.toString();
        tallyIngestOutput(text, tallies);
        options.onStdout?.(text);
    });

    pythonProcess.stderr.on('data', (data) => {
        const text = data.toString();
        tallyIngestOutput(text, tallies);
        options.onStderr?.(text);
    });

    (pythonProcess as ChildProcessWithoutNullStreams & { ingestTallies: IngestTallies }).ingestTallies = tallies;

    return pythonProcess;
}

export function getIngestTallies(proc: ChildProcessWithoutNullStreams): IngestTallies {
    return (proc as ChildProcessWithoutNullStreams & { ingestTallies?: IngestTallies }).ingestTallies ?? {
        copied: 0,
        skipped: 0,
        errors: 0,
    };
}
