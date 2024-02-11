import { ApplicationCommandOptionType, GuildMember, TextChannel } from 'discord.js';
import { createDefaultTTSUserSettings, initGuildConnectionInfo, ttsConnectionInfo } from '../core';
import { SlashCommand } from '../types/slashCommand';
import { Gender, languageCodes } from '../apis/papago-api';

function detectGender(genderStr: string): Gender | 'other' {
    
    switch(genderStr) {
        case '남성':
        case '남':
        case '남자':
        case 'male':
            return 'male';
        case '여성':
        case '여':
        case '여자':
        case 'female':
            return 'female';
        default:
            return 'other';
    }
}

export const setGenderCommand: SlashCommand = {
    name: '성별',
    description: '개인 TTS 성별을 설정합니다.',
    options:[
        {
            required: true,
            name: '성별',
            description: '입력한 성별로 TTS 목소리를 변경합니다. (남자, 여자, male, female)',
            type: ApplicationCommandOptionType.String
        }
    ],
    execute: async (_, interaction) => {
        if(!interaction.guild) return;
        if(!(interaction.member instanceof GuildMember)) return;

        const info = ttsConnectionInfo[interaction.guildId ?? ''] ?? await initGuildConnectionInfo(interaction.guildId ?? '');

        if(!(interaction.user.id in info.settings.userSettings)) {
            info.settings.userSettings[interaction.user.id] = createDefaultTTSUserSettings(info.settings);
        }

        let gender: Gender = info.settings.defaultGender;
        const genderString = String(interaction.options.get('성별')?.value ?? '');
        
        let detectedGender = detectGender(genderString);
        if(detectedGender === 'other') {
            await interaction.followUp(`입력하신 성별은 키워드로 등록되어 있지 않습니다.`);
            return;
        }

        info.settings.userSettings[interaction.user.id].gender = detectedGender;

        await interaction.followUp(`'${interaction.user.displayName}'님의 TTS 목소리가 ${detectedGender == 'male' ? '남성' : '여성'} 목소리로 변경되었습니다.`);
    }
};

function convertToLanguageCode(langName: string) {
    return (languageCodes.find(code => code[1] == langName) ?? [null])[0];
}


export const setLanguageCommand: SlashCommand = {
    name: '언어',
    description: '개인 TTS 음성 언어를 설정합니다.',
    options:[
        {
            required: true,
            name: '언어',
            description: `입력한 언어로 TTS 목소리를 변경합니다. (${languageCodes.map(code => code[1]).join(', ')})`,
            type: ApplicationCommandOptionType.String
        }
    ],
    execute: async (_, interaction) => {
        if(!interaction.guild) return;
        if(!(interaction.member instanceof GuildMember)) return;

        const info = ttsConnectionInfo[interaction.guildId ?? ''] ?? await initGuildConnectionInfo(interaction.guildId ?? '');

        if(!(interaction.user.id in info.settings.userSettings)) {
            info.settings.userSettings[interaction.user.id] = createDefaultTTSUserSettings(info.settings);
        }

        let lang = info.settings.defaultLanguage;
        const langString = String(interaction.options.get('언어')?.value ?? '');
        
        const langCode = convertToLanguageCode(langString);
        if(langCode === null) {
            await interaction.followUp(`입력하신 언어명은 등록되어 있지 않습니다.`);
            return;
        }

        info.settings.userSettings[interaction.user.id].language = langCode;

        await interaction.followUp(`'${interaction.user.displayName}'님의 TTS 언어가 ${langString}(으)로 변경되었습니다.`);
    }
};

export const setPitchCommand: SlashCommand = {
    name: '피치',
    description: '개인 TTS 음성 피치(음높이)를 설정합니다.',
    options:[
        {
            required: true,
            name: '피치',
            description: `TTS의 피치를 입력한 값으로 설정합니다. (0 ~ 2)`,
            type: ApplicationCommandOptionType.Number
        }
    ],
    execute: async (_, interaction) => {
        if(!interaction.guild) return;
        if(!(interaction.member instanceof GuildMember)) return;

        const info = ttsConnectionInfo[interaction.guildId ?? ''] ?? await initGuildConnectionInfo(interaction.guildId ?? '');

        if(!(interaction.user.id in info.settings.userSettings)) {
            info.settings.userSettings[interaction.user.id] = createDefaultTTSUserSettings(info.settings);
        }

        const pitch = interaction.options.get('피치')!!.value as number;
        
        if(pitch < 0 || pitch > 2) {
            await interaction.followUp(`피치 범위를 초과했습니다. (0 ~ 2)`);
            return;
        }

        info.settings.userSettings[interaction.user.id].pitch = pitch;

        await interaction.followUp(`'${interaction.user.displayName}'님의 피치(음높이) 값이 ${pitch.toFixed(1)}(으)로 변경되었습니다.`);
    }
};


export const setSpeedCommand: SlashCommand = {
    name: '속도',
    description: '개인 TTS 음성 말하기 속도를 설정합니다.',
    options:[
        {
            required: true,
            name: '속도',
            description: `TTS의 속도를 입력한 값으로 설정합니다. (0 ~ 2)`,
            type: ApplicationCommandOptionType.Number
        }
    ],
    execute: async (_, interaction) => {
        if(!interaction.guild) return;
        if(!(interaction.member instanceof GuildMember)) return;

        const info = ttsConnectionInfo[interaction.guildId ?? ''] ?? await initGuildConnectionInfo(interaction.guildId ?? '');

        if(!(interaction.user.id in info.settings.userSettings)) {
            info.settings.userSettings[interaction.user.id] = createDefaultTTSUserSettings(info.settings);
        }

        const speed = interaction.options.get('속도')!!.value as number;
        
        if(speed < 0 || speed > 2) {
            await interaction.followUp(`유효 속도 범위를 초과했습니다. (0 ~ 2)`);
            return;
        }

        info.settings.userSettings[interaction.user.id].speed = speed;

        await interaction.followUp(`'${interaction.user.displayName}'님의 음성 속도가 ${speed.toFixed(1)}(으)로 변경되었습니다.`);
    }
};
