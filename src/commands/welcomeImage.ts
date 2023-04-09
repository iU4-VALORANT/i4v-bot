import { ChannelType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { FlexibleVC } from '../lib/flexibleVC';
import { unsubscribeSending, registerSendingChannel } from '../lib/welcomeImage';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-image')
        .setDescription('ウェルカム画像の設定')
        .addChannelOption(option =>
            option.setName("テキストチャンネル")
                .setDescription("ウェルカム画像を送るチャンネルを選択（設定を削除する場合は空欄）")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false),
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) throw new Error("No GuildId found");

        const tc = interaction.options.getChannel("テキストチャンネル", false, [ChannelType.GuildText])

        if(tc) {
            await registerSendingChannel(interaction.guildId, tc.id)

            interaction.reply(`${tc.name}へウェルカム画像を投稿します`)
        } else {
            await unsubscribeSending(interaction.guildId)
            interaction.reply("ウェルカム画像をオフにしました")
        }
    },
};