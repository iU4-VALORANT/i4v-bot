import { ChannelType, ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { FlexibleVC } from '../lib/flexibleVC';
import { unsubscribeSending, registerSendingChannel, sendWelcomeImage } from '../lib/welcomeImage';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-welcome-image')
        .setDescription('ウェルカム画像のテスト'),
    async execute(interaction: ChatInputCommandInteraction) {
        if(!(interaction.member instanceof GuildMember)) return
        await sendWelcomeImage(interaction.member)
        await interaction.reply("ウェルカム画像を送信しました")
    },
};