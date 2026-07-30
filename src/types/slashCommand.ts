import { ChatInputApplicationCommandData, ChatInputCommandInteraction, Client } from "discord.js";

export type SlashCommand = ChatInputApplicationCommandData &  {
    execute: (client: Client, interaction: ChatInputCommandInteraction) => void;
}
