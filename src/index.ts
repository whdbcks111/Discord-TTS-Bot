import dotenv from 'dotenv'
import { convertTTSMessage, createTTS, languageCodes } from './apis/papago-api';
import { Client, GatewayIntentBits } from 'discord.js'
import commands from './commands'
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection } from '@discordjs/voice';
import { createDefaultTTSUserSettings, saveAllTTSSettings, ttsConnectionInfo } from './core';

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
        msg.reply('재설정 완료')
    }

    if(msg.member && !msg.member.user.bot && voiceConn) {
        const info = ttsConnectionInfo[msg.guildId ?? ''];
        if(!info) {
            voiceConn.disconnect();
        }
        else if((msg.channelId === info.textChannelId || info.settings.privateChannelIds.includes(msg.channelId)) && msg.member.voice.channelId === info.voiceChannelId) {
            if(!(msg.member.user.id in info.settings.userSettings)) {
                info.settings.userSettings[msg.member.user.id] = createDefaultTTSUserSettings(info.settings);
            }
            const userSetting = info.settings.userSettings[msg.member.user.id];
            const linkPattern = /(https?:\/\/[^ ]+)/g;
            let langCode = userSetting.language;
            let content = msg.cleanContent.replace(linkPattern, 'Link');
            let languageApplied = false;
            for(let codes of languageCodes) {
                for(let code of codes) {
                    const keyword = `(${code})`;
                    if(content.startsWith(keyword)) {
                        langCode = codes[0];
                        content = content.slice(keyword.length);
                        languageApplied = true;
                        break;
                    }
                }
                if(languageApplied) break;
            }
            const url = await createTTS(content, langCode, userSetting.gender, 1, userSetting.pitch, userSetting.speed);

            info.ttsURLQueue.push(url);

            if(info.ttsURLQueue.length === 1) {
                const resource = createAudioResource(url);
                const player = createAudioPlayer();
                
                player.play(resource);
                voiceConn.subscribe(player);

                player.on('stateChange', (oldState, newState) => {
                    if(newState.status !== AudioPlayerStatus.Playing && 
                        newState.status !== AudioPlayerStatus.Buffering) {
                        info.ttsURLQueue.shift();
                        if(info.ttsURLQueue.length > 0) {
                            const next = createAudioResource(info.ttsURLQueue[0] ?? '');
                            player.play(next);
                        }
                    } 
                });
            }
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