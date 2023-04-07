import { ButtonInteraction } from "discord.js";

module.exports = {
    customId: "example-button",
    async execute(interaction: ButtonInteraction){
        interaction.reply("hello, world!")
    }
}