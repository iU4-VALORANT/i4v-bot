import { ActionRowBuilder, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from "discord.js";

export const customId = "example-modal"

export const data = new ModalBuilder()
    .setCustomId(customId)
    .setTitle("Example")
    .addComponents(
        new ActionRowBuilder<ModalActionRowComponentBuilder>()
            .addComponents(
                new TextInputBuilder()
                .setCustomId("example-input")
                .setLabel("Plase type something")
                .setRequired(true)
                .setStyle(TextInputStyle.Short)
            )
    )

export async function execute(interaction: ModalSubmitInteraction){
    const text = interaction.fields.getTextInputValue("example-input")
    interaction.reply(text)
}