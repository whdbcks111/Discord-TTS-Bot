import { Colors, EmbedBuilder, GuildMember, TextChannel } from 'discord.js';
import { initGuildConnectionInfo, ttsConnectionInfo } from '../core';
import { SlashCommand } from '../types/slashCommand';
import { joinVoiceChannel } from '@discordjs/voice';

export const joinCommand: SlashCommand = {
    name: '입장',
    description: '봇이 현재 음성 채널에 입장합니다.',
    options:[

    ],
    execute: async (_, interaction) => {
        if(!interaction.guild) return;
        if(!(interaction.member instanceof GuildMember)) return;
        
        const voiceChannel = interaction.member.voice.channel;

        if(!(interaction.channel instanceof TextChannel)) {
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`**이 명령어는 채팅 채널에서만 사용할 수 있습니다.**`)
                        .setColor(Colors.Red)
                ]
            });
            return;
        }

        if(!voiceChannel) {
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`**:mute: 연결된 음성 채널이 없습니다.**`)
                        .setColor(Colors.Red)
                ]
            });
            return;
        }

        if(!voiceChannel.joinable) {
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`**:no_entry: 해당 음성 채널에 들어갈 권한이 없어 채널에 입장할 수 없습니다.**`)
                        .setColor(Colors.Red)
                ]
            });
            return;
        }

        joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator
        });

        const textChannel = interaction.channel as TextChannel;

        if(!(voiceChannel.guildId in ttsConnectionInfo)) {
            await initGuildConnectionInfo(voiceChannel.guildId);
        }
        const info = ttsConnectionInfo[voiceChannel.guildId];

        info.textChannelId = textChannel.id;
        info.voiceChannelId = voiceChannel.id;

        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`**음성 채널 [:loudspeaker:${voiceChannel.name}]에 입장합니다.**\n` +
                        `이제부터 채팅 채널 \`#${textChannel.name}\`의 메시지를 읽을게요!`)
                    .setColor(Colors.Aqua)
            ]
        });
    }
};