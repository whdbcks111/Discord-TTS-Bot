import { ApplicationCommandOptionType } from 'discord.js';
import { SlashCommand } from '../types/slashCommand';
import { joinVoiceChannel } from '@discordjs/voice';

export const echo: SlashCommand = {
    name: '입장',
    description: '봇이 현재 음성 채널에 입장합니다.',
    options:[

    ],
    execute: async (_, interaction) => {
        if(!interaction.guild) return;

        const member = interaction.guild.members.cache.get(interaction.user.id);
        const voiceChannel = member?.voice.channel;

        if(!voiceChannel) {
            await interaction.followUp({
                ephemeral: true,
                content: `연결된 음성 채널이 없습니다!`
            });
            return;
        }

        joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator
        });

        await interaction.followUp({
            ephemeral: true,
            content: `음성 채널에 입장합니다.`
        });
    }
};