import { createCanvas, registerFont, loadImage } from "canvas";
import path from "node:path"
const snekfetch = require('snekfetch');
import Keyv from "keyv"
import { GuildMember } from "discord.js";
const keyv = new Keyv('sqlite://keyv.db', { namespace: 'wcimg' });

interface ElementPosition {
    x: number
    y: number
    w: number
    h: number
}

interface TextElementData {
    fontFamily: string
    fontWeight: string
    fontSize: {
        min: number,
        max: number
    },
    textAlgen: "left" | "center" | "right",
    color: string,
    bgColor: string,
    pos: ElementPosition,
}

interface IconElementData {
    pos: Omit<ElementPosition, "w" | "h">
    size: number
    circle: boolean
}

interface WelcomeImageData {
    background: string,
    fonts: {
        fontFile: string
        fontFamily: string,
        fontWeight: string
    }[]
    guildName: TextElementData,
    memberName: TextElementData,
    memberIcon: IconElementData
}

const welcomeImageDesign: WelcomeImageData = {
    background: "welcome_image.png",
    fonts: [
        {
            fontFile: "NotoSansJP-Medium.otf",
            fontFamily: "NotoSansJP",
            fontWeight: "medium"
        },
        {
            fontFile: "NotoSansJP-Bold.otf",
            fontFamily: "NotoSansJP",
            fontWeight: "bold"
        }
    ],
    guildName: {
        fontFamily: "NotoSansJP",
        fontWeight: "medium",
        fontSize: {
            min: 32,
            max: 32
        },
        textAlgen: "left",
        color: "#000000",
        bgColor: "#ffffff",
        pos: {
            x: 354,
            y: 188,
            w: 254,
            h: 46
        }
    },
    memberName: {
        fontFamily: "NotoSansJP",
        fontWeight: "bold",
        fontSize: {
            min: 32,
            max: 48
        },
        textAlgen: "left",
        color: "#000000",
        bgColor: "#ffffff",
        pos: {
            x: 256,
            y: 102,
            w: 352,
            h: 70
        }
    },
    memberIcon: {
        pos: {
            x: 32,
            y: 80,
        },
        size: 200,
        circle: true
    }
}

export async function registerSendingChannel(guildId: string, channelId: string) {
    await keyv.set(guildId, channelId)
}

export async function unsubscribeSending(guildId: string) {
    await keyv.delete(guildId)
}

export async function sendWelcomeImage(member: GuildMember) {
    const channelId = await keyv.get(member.guild.id)
    if (!channelId) return false

    const channel = await member.guild.channels.fetch(channelId)
    if (!channel?.isTextBased()) return false

    welcomeImageDesign.fonts.forEach(font=>{
        const fontPath = path.join(__dirname, '../../resources/fonts/' + font.fontFile)
        registerFont(fontPath, { family: font.fontFamily, weight: font.fontWeight })
    })

    const canvas = createCanvas(640, 360);
    const ctx = canvas.getContext('2d');

    //背景画像描画
    const data = await loadImage(path.join(__dirname, '../../resources/images/' + welcomeImageDesign.background))
    ctx.drawImage(data, 0, 0, canvas.width, canvas.height)

    //ユーザーアイコン描画
    const userIconOption = welcomeImageDesign.memberIcon
    const userIconURL = member.displayAvatarURL({ extension: "png", size: 256 })
    const userIconData = await getIconElementImage(userIconURL, userIconOption)
    ctx.drawImage(userIconData, userIconOption.pos.x, userIconOption.pos.y, userIconOption.size, userIconOption.size)

    //ギルド名描画
    const guildNameOption = welcomeImageDesign.guildName
    const guildNameData = await getTextElementImage(member.guild.name, guildNameOption)
    ctx.drawImage(guildNameData, guildNameOption.pos.x, guildNameOption.pos.y, guildNameOption.pos.w, guildNameOption.pos.h)

    //ユーザー名描画
    const memberNameOption = welcomeImageDesign.memberName
    const memberNameData = await getTextElementImage(member.displayName, memberNameOption)
    ctx.drawImage(memberNameData, memberNameOption.pos.x, memberNameOption.pos.y, memberNameOption.pos.w, memberNameOption.pos.h)

    await channel.send({ files: [canvas.toBuffer()] })
    return true
}

async function getTextElementImage(text: string, option : TextElementData) {
    const canvas = createCanvas(option.pos.w, option.pos.h)
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = option.color
    ctx.textAlign = option.textAlgen
    ctx.textBaseline = "top"

    const fill_x = (()=>{
        switch (option.textAlgen) {
            case "left":
                return 0
            case "center":
                return option.pos.w / 2
            case "right":
                return option.pos.w
        }
    })()

    //文字列の長さに応じてサイズを決定
    for (let i = option.fontSize.max; i >= option.fontSize.min; i -= 4) {
        ctx.font = `{${option.fontWeight} ${i}px "${option.fontFamily}", serif`
        if (ctx.measureText(text).width <= option.pos.w){
            
            //文字がはみ出さない場合
            ctx.fillText(text, fill_x, 0)
            const buffer = canvas.toBuffer()
            return await loadImage(buffer)

        }
    }

    //文字がはみ出す場合
    ctx.font = `${option.fontWeight} ${option.fontSize.min}px ${option.fontFamily}, serif`
    ctx.fillText(text, fill_x, 0)

    //グラデーションを描画
    ctx.beginPath()
    let lineargradient = ctx.createLinearGradient(canvas.width - 100, canvas.height / 2, canvas.width, canvas.height / 2)
    lineargradient.addColorStop(0, option.bgColor + "00")
    lineargradient.addColorStop(1, option.bgColor + "ff")
    ctx.fillStyle = lineargradient
    ctx.fillRect(canvas.width - 100, 0, 100, canvas.height)

    const buffer = canvas.toBuffer()
    return await loadImage(buffer)
}

async function getIconElementImage(url: string, option: IconElementData) {
    const canvas = createCanvas(option.size, option.size)
    const ctx = canvas.getContext('2d')

    //ユーザーアイコンを描画
    const { body: iconBuffer } = await snekfetch.get(url)
    const data = await loadImage(iconBuffer)
    ctx.globalCompositeOperation = 'source-over'
    ctx.drawImage(data, 0, 0, canvas.width, canvas.height)

    //円形に切り抜く
    if(option.circle){
        ctx.globalCompositeOperation = 'destination-in'
        ctx.arc(canvas.width / 2, canvas.height / 2, option.size / 2, 0, Math.PI * 2)
        ctx.fill()
    }

    const buffer = canvas.toBuffer()
    return await loadImage(buffer)
}