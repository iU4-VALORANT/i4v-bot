import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { FlexibleVC } from '../lib/flexibleVC';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('fvc-create')
		.setDescription('フレキシブルVCを作成します')
        .addStringOption(option => 
            option.setName("カテゴリー名")
                .setDescription("カテゴリーの名前を入力")
                .setRequired(true)
        )
        .addNumberOption(option => 
            option.setName("定員")
                .setDescription("ボイスチャンネルに参加できる人数")
                .setMaxValue(99)
                .setRequired(false)
        )
        .addNumberOption(option => 
            option.setName("最大チャンネル数")
                .setDescription("作成できるチャンネル数の上限")
                .setMaxValue(99)
                .setRequired(false)
        ),
	async execute(interaction: ChatInputCommandInteraction) {
        if(!interaction.guildId) throw new Error("No GuildId found");
        
        const name = interaction.options.getString("カテゴリー名", true)
        const memberSize = interaction.options.getNumber("定員")
        const maxLength = interaction.options.getNumber("最大チャンネル数")

        const fvc = await FlexibleVC.create(interaction.client, {
            name: name,
            guildId: interaction.guildId,
            memberSize: memberSize || undefined,
            maxLength: maxLength || undefined
        })

        await fvc.init()

        interaction.reply(`${name}を作成しました。${fvc.vc}を押すことで通話を開始できます。`)
	},
};