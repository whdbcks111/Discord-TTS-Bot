import { TTSConnectionMap, TTSSettings, TTSUserSettings, TTSConnection, TTSCache } from './types/core';
import path from 'path';
import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { Gender, createTTS, languageCodes } from './apis/papago-api';
import { AudioPlayerStatus, VoiceConnection, createAudioPlayer } from '@discordjs/voice';
import { createTransformedAudioResource, isValidAudioMultiplier } from './audio/transform';
import * as emoji from 'node-emoji';

export const ttsCache: TTSCache = {};
export const ttsConnectionInfo: TTSConnectionMap = {};

export async function initGuildConnectionInfo(guildId: string) {
    return ttsConnectionInfo[guildId] = {
        textChannelId: null,
        voiceChannelId: null,
        ttsURLQueue: [],
        settings: await loadTTSSettings(guildId),
        audioPlayer: null
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

export async function getTTS(text: string, langCode: string, gender: Gender) {
    const cacheKey = `${langCode}/${gender}/${text}`;

    if(cacheKey in ttsCache) {
        let cached = ttsCache[cacheKey];

        if(Date.now() - cached.createdAt > 1000 * 60 * 60 * 24 * 7) {
            delete ttsCache[cacheKey];
        }
        else {
            return cached.url;
        }
    }

    let ttsURL = await createTTS(text, langCode, gender);
    ttsCache[cacheKey] = {
        url: ttsURL,
        createdAt: Date.now()
    }

    return ttsURL;
}

export async function enqueueTTS(text: string, voiceConn: VoiceConnection, info: TTSConnection, userSetting: TTSUserSettings) {
    const linkPattern = /(https?:\/\/[^ ]+)/g;
    const codeBlockPattern = /```[a-zA-Z]+\n[^]+```/g;

    let langCode = userSetting.language;
    let content = text.replace(linkPattern, 'Link').replace(codeBlockPattern, ' Code Block ').replace(':', ' ');
    
    //content = Array.from(content).map(c => emoji.has(c) ? ` ${(emoji.find(c)?.key ?? '이모지')} ` : c).join('');

    let languageApplied = false;
    for(let codes of languageCodes) {
        for(let code of codes) {
            const keyword = `(${code})`;
            if(content.startsWith(keyword)) {
                langCode = codes[0];
                content = content.slice(keyword.length);
                languageApplied = true;
                break;
            }
        }
        if(languageApplied) break;
    }

    const gender = userSetting.gender;
    const pitch = isValidAudioMultiplier(userSetting.pitch) ? userSetting.pitch : 1;
    const speed = isValidAudioMultiplier(userSetting.speed) ? userSetting.speed : 1;

    const url = await getTTS(content, langCode, gender);
    console.log(`TTS created: ${content}, ${url}`);

    info.ttsURLQueue.push({ url, pitch, speed });

    if(info.ttsURLQueue.length === 1) {
        const player = createAudioPlayer();

        info.audioPlayer = player;

        const playNext = () => {
            const next = info.ttsURLQueue[0];
            if(!next) {
                info.audioPlayer = null;
                return;
            }

            try {
                player.play(createTransformedAudioResource(next.url, next.pitch, next.speed));
            }
            catch(error) {
                console.error('TTS 오디오 변환 준비 오류:', error);
                info.ttsURLQueue.shift();
                playNext();
            }
        };

        player.on('error', error => {
            console.error('TTS 오디오 재생 오류:', error);
        });

        player.on(AudioPlayerStatus.Idle, () => {
            info.ttsURLQueue.shift();
            playNext();
        });

        voiceConn.subscribe(player);
        playNext();
    }
}
