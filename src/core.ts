import { TTSConnectionInfo, TTSSettings, TTSUserSettings } from './types/core';
import path from 'path';
import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { Gender } from './apis/papago-api';

export const ttsConnectionInfo: TTSConnectionInfo = {};

export async function initGuildConnectionInfo(guildId: string) {
    return ttsConnectionInfo[guildId] = {
        textChannelId: null,
        voiceChannelId: null,
        ttsURLQueue: [],
        settings: await loadTTSSettings(guildId)
    };
}

export function getTTSSettingsPath(guildId: string) {
    return path.join(__dirname, process.env.TTS_SETTINGS_PATH ?? '', guildId + '.json');
}

export function createDefaultTTSSettings(): TTSSettings {
    return {
        defaultGender: 'female',
        defaultLanguage: 'auto',
        defaultPitch: 1,
        defaultSpeed: 1,
        userSettings: {},
        privateChannelIds: []
    };
}

export function createDefaultTTSUserSettings(settings: TTSSettings): TTSUserSettings {
    return {
        gender: settings.defaultGender,
        language: settings.defaultLanguage,
        pitch: settings.defaultPitch,
        speed: settings.defaultSpeed
    }
}

export async function loadTTSSettings(guildId: string) {
    const filePath = getTTSSettingsPath(guildId);
    let settings = createDefaultTTSSettings();

    if(!existsSync(filePath) || (await stat(filePath)).isDirectory()) return settings;

    const json = (await readFile(filePath)).toString();

    try {
        let savedSettings = JSON.parse(json) as TTSSettings;
        settings = savedSettings;
    }
    catch(e) {
        console.error(e);
    }

    return settings;
}

export async function saveTTSSettings(guildId: string) {
    if(!ttsConnectionInfo[guildId]) return;

    const filePath = getTTSSettingsPath(guildId);
    const dirPath = path.dirname(filePath);

    if(!existsSync(dirPath)) await mkdir(dirPath, { recursive: true });
    
    await writeFile(filePath, JSON.stringify(ttsConnectionInfo[guildId].settings, null, 4));
}

export async function saveAllTTSSettings() {
    let promises: Promise<void>[] = [];
    for(let guildId in ttsConnectionInfo) {
        promises.push(saveTTSSettings(guildId));
    }
    await Promise.all(promises);
}