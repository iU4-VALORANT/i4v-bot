import { CategoryChannel, ChannelType, Client, Guild, PermissionFlagsBits, VoiceChannel } from "discord.js";
import Keyv from "keyv"
const keyv = new Keyv('sqlite://test.db');

interface FlexibleVCData{
    name: string,
    guildId: string,
    categoryId: string,
    voiceChannelId: string,
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

export class FlexibleVC{
    public name: string
    public guild: Guild | null
    public guildId: string
    public vc: VoiceChannel | null
    public vcId: string
    public category: CategoryChannel | null
    public categoryId: string
    public memberSize? :number
    public maxLength?: number
    private isInited: boolean

    constructor(public client: Client, data: FlexibleVCData, private log?: boolean){
        this.isInited = false
        this.name = data.name
        this.guildId = data.guildId
        this.categoryId = data.categoryId
        this.vcId = data.voiceChannelId
        this.memberSize = data.memberSize
        this.maxLength = data.maxLength
        const guild = client.guilds.cache.get(data.guildId)
        if(!guild && log) console.error("No guild data")
        this.guild = guild || null
        const vc = client.channels.cache.get(data.voiceChannelId) as VoiceChannel | undefined
        if(!vc && log) console.error("No VoiceChannel data")
        this.vc = vc || null
        const category = client.channels.cache.get(data.categoryId) as CategoryChannel | undefined
        if(!category && log) console.error("No CategoryChannel data")
        this.category = category || null
    }

    async init(){
        this.guild = await this.client.guilds.fetch(this.guildId)
        const vc = await this.client.channels.fetch(this.vcId)
        if(vc?.type !== ChannelType.GuildVoice) throw new Error("Incorrect channel data type")
        this.vc = vc
        this.category = this.vc.parent
        if(this.category === null) throw new Error("Category not found")
        this.isInited = true
    }

    async add(){
        if(!this.isInited) await this.init()
        const category = this.category
        if(!category) throw new Error("error")
        const vc = await category.children.create({
            name: this.name + "-" + String(category.children.cache.size),
            type: ChannelType.GuildVoice,
            userLimit: this.memberSize
        })
        return vc
    }

    async remove(vcId: string){
        if(!this.isInited) await this.init()
        const category = this.category
        if(!category) throw new Error("error")
        const vc = category.children.cache.get(vcId)
        if(vc?.type !== ChannelType.GuildVoice) return false
        await vc.delete("無人のVCを削除")
        return true
    }

    async delete(){
        if(!this.isInited) await this.init()
        this.vc?.delete()
        this.category?.delete()
        let fvcList = await keyv.get(this.guildId) as Array<FlexibleVCData>
        fvcList.map(fvc => fvc.voiceChannelId === this.vcId ? null : fvc).filter(fcv => fcv !== null)
        await keyv.set(this.guildId, fvcList)
    }

    static async startListening(client: Client){
        client.on("voiceStateUpdate", async (oldState, newState)=>{
            if(newState.channelId){
                const fvc = await this.get(client, {
                    guildId: newState.guild.id,
                    vcId: newState.channelId
                })
                if(fvc){
                    const vc = await fvc.add()
                    newState.setChannel(vc)
                }
            }
            if(oldState.channel && oldState.channel.members.size === 0){
                if(!oldState.channel.parentId) return
                const fvc = await this.get(client, {
                    guildId: oldState.guild.id,
                    categoryId: oldState.channel.parentId
                })
                if(fvc){
                    if(oldState.channel.id === fvc.vcId) return
                    await fvc.remove(oldState.channel.id)
                }
            }
        })
    }

    static async create(client: Client, option: FlexibleVCOption){
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
        if(!guildVCList){
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

    static async get(client: Client, option: getFVCOption){
        const fvcList = await keyv.get(option.guildId) as Array<FlexibleVCData>
        if(!fvcList) return null

        let fvcData: FlexibleVCData | undefined = undefined
        if("vcId" in option){
            fvcData = fvcList.find(fvc => fvc.voiceChannelId === option.vcId)
        }else if("categoryId" in option){
            fvcData = fvcList.find(fvc => fvc.categoryId === option.categoryId)
        }

        if(fvcData){
            return new FlexibleVC(client, fvcData)
        }else{
            return null
        }
    }
}