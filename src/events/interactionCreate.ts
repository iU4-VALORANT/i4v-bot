import { ButtonInteraction, Client, Collection, CommandInteraction, Events, Interaction, ModalSubmitInteraction, SlashCommandBuilder } from "discord.js";
import fs from 'node:fs'
import path from 'node:path'

//ボタンを収集
type Button = {
    customId: string,
    execute: (i: ButtonInteraction)=>Promise<void>
}

const buttons = new Collection<string, Button>()
const buttonsPath = path.join(__dirname, '../components/buttons')
const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'))

for (const file of buttonFiles) {
    const filePath = path.join(buttonsPath, file)
    const button = require(filePath)
    buttons.set(button.customId, button)
}

//モーダルを収集
type Modal = {
    customId: string,
    execute: (i: ModalSubmitInteraction)=>Promise<void>
}

const modals = new Collection<string, Modal>()
const modalsPath = path.join(__dirname, '../components/modals')
const modalFiles = fs.readdirSync(modalsPath).filter(file => file.endsWith('.js'))

for (const file of modalFiles) {
    const filePath = path.join(modalsPath, file)
    const modal = require(filePath)
    modals.set(modal.customId, modal)
}

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction: Interaction & {client: Client & {commands: Collection<string, {data: SlashCommandBuilder, execute: (interaction: CommandInteraction)=>any}>}}) {
		if (interaction.isChatInputCommand()){
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
    
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}`);
                console.error(error);
            }
        }else if(interaction.isButton()){
            const button = buttons.get(interaction.customId)

            if(!button) return

            try {
                await button.execute(interaction)
            } catch (error) {
                console.error(`Error executing ${interaction.customId}`)
                console.error(error)
            }
        }else if(interaction.isModalSubmit()){
            const modal = modals.get(interaction.customId)

            if(!modal) return

            try {
                await modal.execute(interaction)
            } catch (error) {
                console.error(`Error executing ${interaction.customId}`)
                console.error(error)
            }
        }
	},
};