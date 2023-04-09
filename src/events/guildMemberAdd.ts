import { Events, GuildMember } from 'discord.js';
import { sendWelcomeImage } from '../lib/welcomeImage';

module.exports = {
	name: Events.GuildMemberAdd,
	async execute(member: GuildMember) {
        await sendWelcomeImage(member)
	},
};