const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "sing",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Developer",
    description: "YouTube theke gan khuje audio hisebe pathay",
    commandCategory: "media",
    usages: "[ganer nam]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const songName = args.join(" ");

    if (!songName) {
        return api.sendMessage("❌ Onugroh kore kono ganer nam likhun.\nUdahoron: !sing Tum Hi Ho", threadID, messageID);
    }

    api.sendMessage(`🔍 "${songName}" gan ti khoja hochhe, ektu opekkha korun...`, threadID, messageID);

    try {
        const res = await axios.get(`https://api.popcat.xyz/v2/ytplay?q=${encodeURIComponent(songName)}`);
        
        if (!res.data || !res.data.url) {
            return api.sendMessage("❌ Dukhito, gan ti khuje paowa jayni.", threadID, messageID);
        }

        const songData = res.data;
        const cacheDir = path.join(__dirname, "cache");

        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        const cachePath = path.join(cacheDir, `${Date.now()}_sing.mp3`);

        const audioStream = await axios({
            method: "get",
            url: songData.url,
            responseType: "stream"
        });

        const writer = fs.createWriteStream(cachePath);
        audioStream.data.pipe(writer);

        writer.on("finish", () => {
            api.sendMessage({
                body: `🎶 **Ganer Nam:** ${songData.title || songName}\n👤 **Channel:** ${songData.channel || "YouTube"}`,
                attachment: fs.createReadStream(cachePath)
            }, threadID, () => {
                if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
            }, messageID);
        });

        writer.on("error", (err) => {
            console.error(err);
            api.sendMessage("❌ Gan download korte somossa hoyeche.", threadID, messageID);
        });

    } catch (error) {
        console.error(error);
        api.sendMessage("❌ Server-e somossa hochhe, pore abar chesta korun.", threadID, messageID);
    }
};
                            
