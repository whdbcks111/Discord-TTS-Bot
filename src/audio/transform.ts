import { spawn } from 'node:child_process';
import { createAudioResource, StreamType } from '@discordjs/voice';
import ffmpegPath from 'ffmpeg-static';

const OUTPUT_SAMPLE_RATE = 48_000;
const MIN_PITCH_STAGE = 0.5;
const MAX_PITCH_STAGE = 2;
const MIN_TEMPO_STAGE = 0.5;
const MAX_TEMPO_STAGE = 100;
const FLOAT_TOLERANCE = 1e-10;

export function isValidAudioMultiplier(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function formatFilterNumber(value: number) {
    return Number(value.toPrecision(12)).toString();
}

function buildPitchFilters(pitch: number) {
    const filters: string[] = [`aresample=${OUTPUT_SAMPLE_RATE}`];
    let remainingLog = Math.log(pitch);
    const maxStageLog = Math.log(MAX_PITCH_STAGE);
    const minStageLog = Math.log(MIN_PITCH_STAGE);

    while(remainingLog > maxStageLog + FLOAT_TOLERANCE) {
        filters.push(
            `asetrate=${OUTPUT_SAMPLE_RATE * MAX_PITCH_STAGE}`,
            `aresample=${OUTPUT_SAMPLE_RATE}`
        );
        remainingLog -= maxStageLog;
    }

    while(remainingLog < minStageLog - FLOAT_TOLERANCE) {
        filters.push(
            `asetrate=${OUTPUT_SAMPLE_RATE * MIN_PITCH_STAGE}`,
            `aresample=${OUTPUT_SAMPLE_RATE}`
        );
        remainingLog -= minStageLog;
    }

    const finalStage = Math.exp(remainingLog);
    if(Math.abs(finalStage - 1) > FLOAT_TOLERANCE) {
        filters.push(
            `asetrate=${Math.max(1, Math.round(OUTPUT_SAMPLE_RATE * finalStage))}`,
            `aresample=${OUTPUT_SAMPLE_RATE}`
        );
    }

    return filters;
}

function buildTempoFilters(tempoLog: number) {
    const filters: string[] = [];
    const maxStageLog = Math.log(MAX_TEMPO_STAGE);
    const minStageLog = Math.log(MIN_TEMPO_STAGE);

    while(tempoLog > maxStageLog + FLOAT_TOLERANCE) {
        filters.push(`atempo=${MAX_TEMPO_STAGE}`);
        tempoLog -= maxStageLog;
    }

    while(tempoLog < minStageLog - FLOAT_TOLERANCE) {
        filters.push(`atempo=${MIN_TEMPO_STAGE}`);
        tempoLog -= minStageLog;
    }

    const finalStage = Math.exp(tempoLog);
    if(Math.abs(finalStage - 1) > FLOAT_TOLERANCE) {
        filters.push(`atempo=${formatFilterNumber(finalStage)}`);
    }

    return filters;
}

export function buildAudioFilter(pitch: number, speed: number) {
    if(!isValidAudioMultiplier(pitch) || !isValidAudioMultiplier(speed)) {
        throw new RangeError('피치와 속도는 0보다 큰 유한한 숫자여야 합니다.');
    }

    if(pitch === 1 && speed === 1) return 'anull';

    const filters = pitch === 1 ? [] : buildPitchFilters(pitch);

    // Changing the sample rate also changes playback speed. Compensate for
    // that change before applying the independently requested speed.
    const tempoLog = Math.log(speed) - Math.log(pitch);
    filters.push(...buildTempoFilters(tempoLog));

    return filters.length > 0 ? filters.join(',') : 'anull';
}

export function createTransformedAudioResource(url: string, pitch: number, speed: number) {
    if(!ffmpegPath) {
        throw new Error('ffmpeg-static 실행 파일을 찾을 수 없습니다.');
    }

    const ffmpeg = spawn(ffmpegPath, [
        '-nostdin',
        '-hide_banner',
        '-loglevel', 'error',
        '-i', url,
        '-vn',
        '-af', buildAudioFilter(pitch, speed),
        '-c:a', 'libopus',
        '-application', 'voip',
        '-frame_duration', '20',
        '-f', 'ogg',
        'pipe:1'
    ], {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';
    ffmpeg.stderr.setEncoding('utf8');
    ffmpeg.stderr.on('data', chunk => {
        stderr = (stderr + chunk).slice(-2_000);
    });

    ffmpeg.once('error', error => {
        ffmpeg.stdout.destroy(error);
    });

    ffmpeg.once('close', code => {
        if(code !== 0 && !ffmpeg.stdout.destroyed) {
            ffmpeg.stdout.destroy(new Error(
                `FFmpeg 오디오 변환 실패 (종료 코드 ${code}): ${stderr.trim()}`
            ));
        }
    });

    ffmpeg.stdout.once('close', () => {
        if(ffmpeg.exitCode === null && ffmpeg.signalCode === null) {
            ffmpeg.kill();
        }
    });

    return createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.OggOpus
    });
}
