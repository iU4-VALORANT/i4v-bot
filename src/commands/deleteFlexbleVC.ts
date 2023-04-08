import { ChannelType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { FlexibleVC } from '../lib/flexibleVC';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fvc-delete')
        .setDescription('フレキシブルVCを削除します')
        .addChannelOption(option =>
            option.setName("ボイスチャンネル")
                .setDescription("削除するフレキシブルVCの入室ボタンを選択")
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true),
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) throw new Error("No GuildId found");

        const vc = interaction.options.getChannel("ボイスチャンネル", true, [ChannelType.GuildVoice])

        const fvc = await FlexibleVC.get(interaction.client, {
            guildId: interaction.guildId,
            vcId: vc.id
        })

        if (fvc) {
            await fvc.delete()
            interaction.reply(`${fvc.name}は正常に削除されました`)
        } else {
            interaction.reply(`${vc}はフレキシブルVCではありません。正しいボイスチャンネルを選択してください。`)
        }
    },
};