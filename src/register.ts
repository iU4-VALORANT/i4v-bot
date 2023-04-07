import { REST } from '@discordjs/rest';
import { Routes } from 'discord.js';
import fs from 'node:fs'
import path from'node:path'
import dotenv from 'dotenv'

dotenv.config()
const token = process.env.DISCORD_TOKEN
const clientId = process.env.DISCORD_CLIENT_ID
const guildId = process.argv[2]
if(!clientId) throw new Error('環境変数"DISCORD_CLIENT_ID"がありません')
if(!token) throw new Error('環境変数"DISCORD_TOKEN"がありません')

const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname, './commands')).filter(file => file.endsWith('.js'))

for (const file of commandFiles) {
	const command = require(path.join(__dirname, `./commands/${file}`))
	commands.push(command.data.toJSON())
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.')

    if(guildId){
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      )
    }else{
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      )
    }

		console.log('Successfully reloaded application (/) commands.')
	} catch (error) {
		console.error(error)
	}
})()