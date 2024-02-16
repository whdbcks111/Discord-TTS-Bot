import { Gender } from "../apis/papago-api"

export type TTSCache = {
    [key: string]: TTSInfo
}

export type TTSInfo = {
    url: string,
    createdAt: number
}

export type TTSConnectionMap = {
    [key: string]: TTSConnection
}

export type TTSConnection = {
    textChannelId: string | null,
    voiceChannelId: string | null,
    ttsURLQueue: string[],
    settings: TTSSettings
};

export type TTSUserSettings = {
    gender: Gender,
    language: string,
    pitch: number,
    speed: number
}

export type TTSSettings = {
    userSettings: {
        [key: string]: TTSUserSettings
    },
    privateChannelIds: string[]
    defaultGender: Gender
    defaultPitch: number,
    defaultSpeed: number,
    defaultLanguage: string
}