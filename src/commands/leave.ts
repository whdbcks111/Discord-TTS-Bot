import { getVoiceConnection } from '@discordjs/voice';
import { SlashCommand } from '../types/slashCommand';
import { Colors, EmbedBuilder, GuildMember, TextChannel } from 'discord.js';
import { ttsConnectionInfo } from '../core';

export const leaveCommand: SlashCommand = {
    name: '퇴장',
    description: '봇이 음성 채널에서 퇴장합니다.',
    options:[

    ],
    execute: async (_, interaction) => {
        
        const conn = getVoiceConnection(interaction.guildId ?? '');if(!interaction.guild) return;
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

        const info = ttsConnectionInfo[voiceChannel.guildId];

        if(info.voiceChannelId !== voiceChannel.id) {
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`**:no_entry_sign: 입장한 음성 채널과 봇이 연결된 음성 채널이 일치하지 않습니다.**`)
                        .setColor(Colors.Red)
                ]
            });
            return;
        }

        if(!conn) {
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`**입장한 음성 채널이 없습니다.**`)
                        .setColor(Colors.Red)
                ]
            });
            return;
        }

        info.ttsURLQueue = [];
        info.audioPlayer?.stop(true);
        info.audioPlayer = null;
        conn.disconnect();

        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`**:mute: 음성 채널에서 퇴장합니다.**`)
                    .setColor(Colors.Aqua)
            ]
        });
    }
};
