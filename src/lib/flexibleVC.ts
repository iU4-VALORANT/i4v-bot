import { CategoryChannel, ChannelType, Client, EmbedBuilder, Guild, VoiceBasedChannel, VoiceChannel } from "discord.js";
import Keyv from "keyv"
const keyv = new Keyv('sqlite://keyv.db', { namespace: 'fvc' });

interface FlexibleVCInstance {
    channelId: string,
    recruitEmbed?: string,
}

interface FlexibleVCData {
    name: string,
    guildId: string,
    categoryId: string,
    voiceChannelId: string,
    autoRecruit?: string,
    instances?: FlexibleVCInstance[]
    memberSize?: number,
    maxLength?: number
}

type FlexibleVCOption = Omit<FlexibleVCData, "categoryId" | "voiceChannelId">

type getFVCOptionObject = {
    guildId: string,
    vcId: string,
    categoryId: string
}

type getFVCOption = getFVCOptionObject | Omit<getFVCOptionObject, "categoryId"> | Omit<getFVCOptionObject, "vcId">

export class FlexibleVC {
    public name: string
    public guild: Guild | null
    public readonly guildId: string
    public vc: VoiceChannel | null
    public readonly vcId: string
    public category: CategoryChannel | null
    public readonly categoryId: string
    public autoRecruit?: string
    public instances: FlexibleVCInstance[]
    public memberSize?: number
    public maxLength?: number
    private isInited: boolean

    constructor(public client: Client, data: FlexibleVCData, private log?: boolean) {
        this.isInited = false
        this.name = data.name
        this.guildId = data.guildId
        this.categoryId = data.categoryId
        this.vcId = data.voiceChannelId
        this.autoRecruit = data.autoRecruit
        this.instances = data.instances || []
        this.memberSize = data.memberSize
        this.maxLength = data.maxLength
        const guild = client.guilds.cache.get(data.guildId)
        if (!guild && log) console.error("No guild data")
        this.guild = guild || null
        const vc = client.channels.cache.get(data.voiceChannelId) as VoiceChannel | undefined
        if (!vc && log) console.error("No VoiceChannel data")
        this.vc = vc || null
        const category = client.channels.cache.get(data.categoryId) as CategoryChannel | undefined
        if (!category && log) console.error("No CategoryChannel data")
        this.category = category || null
    }

    async init() {
        if (!this.isInited) return
        this.guild = await this.client.guilds.fetch(this.guildId)
        const vc = await this.client.channels.fetch(this.vcId)
        if (vc?.type !== ChannelType.GuildVoice) throw new Error("Incorrect channel data type")
        this.vc = vc
        this.category = this.vc.parent
        if (this.category === null) throw new Error("Category not found")
        this.isInited = true
    }

    async add() {
        if (!this.isInited) await this.init()
        const category = this.category
        if (!category) throw new Error("error")
        const vc = await category.children.create({
            name: this.name + "-" + String(category.children.cache.size),
            type: ChannelType.GuildVoice,
            userLimit: this.memberSize
        })
        if (this.autoRecruit) {
            const channel = await this.client.channels.fetch(this.autoRecruit)
            if (channel?.isTextBased()) {
                const text = `${this.name} 募集中！（@${this.memberSize? this.memberSize - 1 : "∞"}）`
                const embed = new EmbedBuilder()
                    .setTitle(`募集中：${this.name}`)
                    .setColor(0x00ff44)
                    .addFields({
                        name: "VC",
                        value: `${vc}`,
                        inline: true
                    },
                    {
                        name: "メンバー数",
                        value: `${vc.members.size} / ${this.memberSize? this.memberSize : "∞"}`,
                        inline: true
                    })
                const message = await channel.send({ content: text,embeds: [embed] })
                this.instances.push({
                    channelId: vc.id,
                    recruitEmbed: message.id
                })
            }
        } else {
            this.instances.push({ channelId: vc.id })
        }
        await this.data_update()
        return vc
    }

    async update(vc: VoiceBasedChannel) {
        const instances = this.instances.find(i => i.channelId === vc.id)
        if(!instances || !this.autoRecruit || !instances.recruitEmbed) return false
        let text = ""
        const embed = new EmbedBuilder()
        if(this.memberSize && vc.members.size >= this.memberSize){
            text = `${this.name} 〆`
            embed.setTitle(`満員：${this.name}`)
                .setColor(0xff0000)
                .addFields({
                    name: "VC",
                    value: `${vc}`,
                    inline: true
                },
                {
                    name: "メンバー数",
                    value: `${vc.members.size} / ${this.memberSize}`,
                    inline: true
                })
        }else{
            text = `${this.name} 募集中！（@${this.memberSize? this.memberSize - vc.members.size : "∞"}）`
            embed.setTitle(`募集中：${this.name}`)
                .setColor(0x00ff44)
                .addFields({
                    name: "VC",
                    value: `${vc}`,
                    inline: true
                },
                {
                    name: "メンバー数",
                    value: `${vc.members.size} / ${this.memberSize? this.memberSize : "∞"}`,
                    inline: true
                })
        }

        const channel = await this.client.channels.fetch(this.autoRecruit)
        if (channel?.isTextBased()) {
            const message = await channel.messages.fetch(instances.recruitEmbed)
            await message.edit({content: text,embeds: [embed]})
            return true
        }else{
            return false
        }
    }

    private async data_update() {
        let fvcList = await keyv.get(this.guildId) as Array<FlexibleVCData>
        const thisFvcIndex = fvcList.findIndex(fvc => fvc.voiceChannelId === this.vcId)
        if (thisFvcIndex < 0) throw new Error("No ThisFVCData found");

        fvcList[thisFvcIndex].instances = this.instances
        await keyv.set(this.guildId, fvcList)
    }

    async remove(vcId: string) {
        if (!this.isInited) await this.init()
        const instance = this.instances.find(c => c.channelId === vcId)
        if (!instance) throw new Error("error")
        const category = this.category
        if (!category) throw new Error("error")
        const vc = category.children.cache.get(vcId)
        if (vc?.type !== ChannelType.GuildVoice) return false
        await vc.delete("無人のVCを削除")
        if (this.autoRecruit && instance.recruitEmbed) {
            const channel = await this.client.channels.fetch(this.autoRecruit)
            if (channel?.isTextBased()) {
                const message = await channel.messages.fetch(instance.recruitEmbed)
                const embed = new EmbedBuilder()
                    .setTitle(`通話終了: ${this.name}`)
                    .setColor(0x444)
                if (message.editable) await message.edit({content: "〆", embeds: [embed] })
            }
        }
        this.instances = this.instances.filter(i => i.channelId !== instance.channelId)
        await this.data_update()
        return true
    }

    async delete() {
        if (!this.isInited) await this.init()
        this.vc?.delete()
        this.category?.delete()
        let fvcList = await keyv.get(this.guildId) as Array<FlexibleVCData>
        fvcList.map(fvc => fvc.voiceChannelId === this.vcId ? null : fvc).filter(fcv => fcv !== null)
        await keyv.set(this.guildId, fvcList)
    }

    static async startListening(client: Client) {
        client.on("voiceStateUpdate", async (oldState, newState) => {
            if (newState.channelId) {
                const fvc = await this.get(client, {
                    guildId: newState.guild.id,
                    vcId: newState.channelId
                })
                if (fvc) {
                    const vc = await fvc.add()
                    newState.setChannel(vc)
                }else if(newState.channel?.parentId){
                    const fvc = await this.get(client, {
                        guildId: newState.guild.id,
                        categoryId: newState.channel.parentId
                    })
                    if(fvc){
                        await fvc.update(newState.channel)
                    }
                }
            }
            if (oldState.channel) {
                if (!oldState.channel.parentId) return
                const fvc = await this.get(client, {
                    guildId: oldState.guild.id,
                    categoryId: oldState.channel.parentId
                })
                if (fvc) {
                    if(oldState.channel.members.size === 0){
                        if (oldState.channel.id === fvc.vcId) return
                        await fvc.remove(oldState.channel.id)
                    }else{
                        await fvc.update(oldState.channel)
                    }
                }
            }
        })
    }

    static async create(client: Client, option: FlexibleVCOption) {
        const guild = await client.guilds.fetch(option.guildId)
        const newCategory = await guild.channels.create({
            name: option.name,
            type: ChannelType.GuildCategory
        })
        const newFVC = await newCategory.children.create({
            name: "Create VC - " + option.name,
            type: ChannelType.GuildVoice
        })
        let guildVCList = await keyv.get(guild.id) as Array<FlexibleVCData>
        if (!guildVCList) {
            guildVCList = []
        }
        const data = {
            categoryId: newCategory.id,
            voiceChannelId: newFVC.id,
            ...option
        }
        guildVCList.push(data)
        await keyv.set(guild.id, guildVCList)
        return new FlexibleVC(client, data)
    }

    static async get(client: Client, option: getFVCOption) {
        const fvcList = await keyv.get(option.guildId) as Array<FlexibleVCData>
        if (!fvcList) return null

        let fvcData: FlexibleVCData | undefined = undefined
        if ("vcId" in option) {
            fvcData = fvcList.find(fvc => fvc.voiceChannelId === option.vcId)
        } else if ("categoryId" in option) {
            fvcData = fvcList.find(fvc => fvc.categoryId === option.categoryId)
        }

        if (fvcData) {
            return new FlexibleVC(client, fvcData)
        } else {
            return null
        }
    }
}