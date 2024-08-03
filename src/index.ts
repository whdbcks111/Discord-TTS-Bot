import dotenv from 'dotenv'
import { Client, GatewayIntentBits } from 'discord.js'
import commands from './commands'
import { VoiceConnectionStatus, createAudioResource, getVoiceConnection } from '@discordjs/voice';
import { createDefaultTTSUserSettings, enqueueTTS, saveAllTTSSettings, ttsConnectionInfo } from './core';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildVoiceStates, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.Guilds
    ]
});

client.on('ready', async () => {
    console.log(`${client.user?.tag}에 로그인하셨습니다!`);

    if(client.application) {
        await client.application.commands.set(commands);
        console.log(`전역 커맨드 등록 완료 : ${commands.length}개`);
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if(oldState.channel && oldState.channel.members.size === 1 && 
        oldState.channel.members.first()!!.user.id === client.user?.id) {
        const voiceConn = getVoiceConnection(oldState.guild.id);
        if(voiceConn) voiceConn.disconnect();
    }
});

client.on('messageCreate', async (msg) => {
    const voiceConn = getVoiceConnection(msg.guildId ?? '');

    if(msg.content === '!cmdreset' && msg.guild) {
        msg.guild.commands.set(commands);
        msg.guild.commands.set([]);
        msg.reply('재설정 완료');
    }

    if(msg.member && !msg.member.user.bot && voiceConn) {
        const info = ttsConnectionInfo[msg.guildId ?? ''];
        if(!info) {
            voiceConn.disconnect();
        }
        else if((msg.channelId === info.textChannelId || info.settings.privateChannelIds.includes(msg.channelId)) && 
            msg.member.voice.channelId === info.voiceChannelId) {
            if(!(msg.member.user.id in info.settings.userSettings)) {
                info.settings.userSettings[msg.member.user.id] = createDefaultTTSUserSettings(info.settings);
            }
            const userSetting = info.settings.userSettings[msg.member.user.id];
            enqueueTTS(msg.cleanContent, voiceConn, info, userSetting);
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if(interaction.isCommand()) {
        const currentCommand = commands.find(({name}) => name === interaction.commandName);

        if(currentCommand) {
            await interaction.deferReply();
            currentCommand.execute(client, interaction);
        }
    }
});

client.on('shardError', e => {
    console.error(e);
});

client.on('error', e => {
    console.error(e);
});

setInterval(async () => {
    console.log('saving...');
    await saveAllTTSSettings();
    console.log('save complete!');
}, 1000 * 60);

client.login(process.env.BOT_TOKEN);