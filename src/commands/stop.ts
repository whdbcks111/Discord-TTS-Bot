import { Colors, EmbedBuilder, GuildMember, TextChannel } from 'discord.js';
import { initGuildConnectionInfo, ttsConnectionInfo } from '../core';
import { SlashCommand } from '../types/slashCommand';
import { getVoiceConnection, joinVoiceChannel } from '@discordjs/voice';

export const stopCommand: SlashCommand = {
    name: '정지',
    description: '봇이 읽고 있던 TTS 메시지를 종료합니다.',
    options:[

    ],
    execute: async (_, interaction) => {
        if(!interaction.guild) return;
        if(!(interaction.member instanceof GuildMember)) return;
        
        const voiceChannel = interaction.member.voice.channel;
        const conn = getVoiceConnection(interaction.guildId ?? '');

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

        if(info.audioPlayer === null) {
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`**:mute: 봇이 음성 채팅을 출력하고 있지 않습니다.**`)
                        .setColor(Colors.Red)
                ]
            });
            return;
        }

        info.audioPlayer.stop();
        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`**읽고 있던 메시지를 종료합니다.**`)
                    .setColor(Colors.Aqua)
            ]
        });
    }
};