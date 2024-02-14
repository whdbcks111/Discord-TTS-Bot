import { getVoiceConnection } from '@discordjs/voice';
import { SlashCommand } from '../types/slashCommand';
import { Colors, EmbedBuilder } from 'discord.js';

export const leaveCommand: SlashCommand = {
    name: '퇴장',
    description: '봇이 음성 채널에서 퇴장합니다.',
    options:[

    ],
    execute: async (_, interaction) => {
        
        const conn = getVoiceConnection(interaction.guildId ?? '');

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