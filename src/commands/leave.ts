import { getVoiceConnection } from '@discordjs/voice';
import { SlashCommand } from '../types/slashCommand';

export const leaveCommand: SlashCommand = {
    name: '퇴장',
    description: '봇이 음성 채널에서 퇴장합니다.',
    options:[

    ],
    execute: async (_, interaction) => {
        
        const conn = getVoiceConnection(interaction.guildId ?? '');

        if(!conn) {
            await interaction.followUp({
                ephemeral: true,
                content: `입장한 음성 채널이 없습니다.`
            });
            return;
        }

        conn.disconnect();
        await interaction.followUp({
            ephemeral: true,
            content: `음성 채널에서 퇴장합니다.`
        });
    }
};