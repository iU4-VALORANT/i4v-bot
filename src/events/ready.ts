import { Client, Events } from 'discord.js';
import { FlexibleVC } from '../lib/flexibleVC';

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client: Client) {
		console.log(`Ready! Logged in as ${client.user?.tag}`);
        
        FlexibleVC.startListening(client)
	},
};