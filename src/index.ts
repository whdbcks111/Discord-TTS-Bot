import dotenv from 'dotenv'
import { createTTS } from './apis/papago-api';
import { Client, GatewayIntentBits } from 'discord.js'
import commands from './commands'

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
        console.log(`커맨드 등록 완료 : ${commands.length}개`);
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

client.login(process.env.BOT_TOKEN);