import { ApplicationCommandOptionType, ChannelType, Colors, EmbedBuilder, GuildMember, PermissionFlagsBits, TextChannel } from 'discord.js';
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

        const genderString = String(interaction.options.get('성별')?.value ?? '');
        
        let detectedGender = detectGender(genderString);
        if(detectedGender === 'other') {
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`**입력하신 성별은 키워드로 등록되어 있지 않습니다.**`)
                        .setColor(Colors.Red)
                ]
            });
            return;
        }

        info.settings.userSettings[interaction.user.id].gender = detectedGender;

        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`**${interaction.member.displayName}님의 TTS 목소리가 ${detectedGender == 'male' ? '**\`남성\`**:male_sign:' : '**\`여성\`**:female_sign:'} 목소리로 변경되었습니다.**`)
                    .setColor(Colors.Aqua)
            ]
        });
    }
};

function convertToLanguageCode(langName: string) {
    return (languageCodes.find(code => code[1] == langName) ?? [null])[0];
}
function convertToLanguageEmoji(langCode: string) {
    return ({
        'auto': ':robot:',
        'ko': ':flag_kr:',
        'en': ':flag_us:',
        'jp': ':flag_jp:',
        'zh_cn': ':flag_cn:',
        'zh_tw': ':flag_tw:',
        'es': ':flag_es:',
        'fr': ':flag_fr:',
        'de': ':flag_de:',
        'ru': ':flag_ru:',
    })[langCode];
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

        const langString = String(interaction.options.get('언어')?.value ?? '');
        const langCode = convertToLanguageCode(langString);
        if(langCode === null) {
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`**입력하신 언어명은 등록되어 있지 않습니다.**`)
                        .setColor(Colors.Red)
                ]
            });
            return;
        }

        info.settings.userSettings[interaction.user.id].language = langCode;

        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`**${interaction.member.displayName}님의 TTS 언어가 ${langString}${convertToLanguageEmoji(langCode) ?? ''}(으)로 변경되었습니다.**`)
                    .setColor(Colors.Aqua)
            ]
        });
    }
};


export const togglePrivateChannelCommand: SlashCommand = {
    name: '채널',
    description: '전용 채널 목록에 채널을 추가하거나, 목록에서 채널을 삭제합니다.\n' + 
        '채널을 입력하지 않을 시 명령어를 입력한 채널로 인식합니다.',
    options:[
        {
            required: false,
            name: '채널',
            description: `추가할 음성 채널입니다.`,
            type: ApplicationCommandOptionType.Channel,
            channelTypes: [ChannelType.GuildText]
        }
    ],
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
    execute: async (client, interaction) => {
        if(!interaction.guild) return;
        if(!(interaction.member instanceof GuildMember)) return;

        const info = ttsConnectionInfo[interaction.guildId ?? ''] ?? await initGuildConnectionInfo(interaction.guildId ?? '');
        const targetChannelId = interaction.options.get('채널')?.value ?? interaction.channelId;
        
        if(typeof targetChannelId !== 'string') {
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`**해당하는 채널이 존재하지 않습니다.**`)
                        .setColor(Colors.Red)
                ]
            });
            return;
        }

        if(info.settings.privateChannelIds.includes(targetChannelId)) {
            info.settings.privateChannelIds.splice(info.settings.privateChannelIds.indexOf(targetChannelId), 1);
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`**채팅 채널 **\`#${(await client.channels.fetch(targetChannelId) as TextChannel).name}\`**(이)가 전용 채널에서 삭제되었습니다.**`)
                        .setColor(Colors.Aqua)
                ]
            });
        }
        else {
            info.settings.privateChannelIds.push(targetChannelId);
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`**채팅 채널 **\`#${(await client.channels.fetch(targetChannelId) as TextChannel).name}\`**(이)가 전용 채널에 추가되었습니다.**`)
                        .setColor(Colors.Aqua)
                ]
            });
        }
    }
};

export const seePrivateChannelsCommand: SlashCommand = {
    name: '전용채널목록',
    description: '전용 채널 목록을 확인할 수 있습니다.',
    options:[],
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
    execute: async (client, interaction) => {
        if(!interaction.guild) return;
        if(!(interaction.member instanceof GuildMember)) return;

        const info = ttsConnectionInfo[interaction.guildId ?? ''] ?? await initGuildConnectionInfo(interaction.guildId ?? '');
        const channelNames = [];

        for(let id of info.settings.privateChannelIds) {
            channelNames.push((await client.channels.fetch(id) as TextChannel).name);
        }

        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`**전용 채널 목록**\n` + 
                        (channelNames.length === 0 ? '없음' : channelNames.map(name => `- \`#${name}\``).join('\n'))
                    )
                    .setColor(Colors.Aqua)
            ] 
        });
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
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`**피치 범위를 초과했습니다.** (0 ~ 2)`)
                        .setColor(Colors.Red)
                ]
            });
            return;
        }

        info.settings.userSettings[interaction.user.id].pitch = pitch;
        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`**${interaction.user.displayName}님의 피치:musical_keyboard:가 **\`${pitch.toFixed(1)}\`**(으)로 변경되었습니다.**`)
                    .setColor(Colors.Aqua)
            ]
        });
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
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`**유효 속도 범위를 초과했습니다.** (0 ~ 2)`)
                        .setColor(Colors.Red)
                ]
            });
            return;
        }

        info.settings.userSettings[interaction.user.id].speed = speed;

        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`**${interaction.user.displayName}님의 음성 속도:loud_sound:가 **\`${speed.toFixed(1)}\`**(으)로 변경되었습니다.**`)
                    .setColor(Colors.Aqua)
            ]
        });
    }
};
