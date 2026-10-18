const https = require("https");
const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "gan2",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Developer",
    description: "YouTube theke gan khuje audio pathay",
    commandCategory: "media",
    usages: "[ganer nam]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const songName = args.join(" ");

    if (!songName) {
        return api.sendMessage("❌ Onugroh kore ganer nam likhun.\nUdahoron: !gan Tum Hi Ho", threadID, messageID);
    }

    api.sendMessage(`🔍 "${songName}" gan ti khoja hochhe...`, threadID, messageID);

    const apiUrl = `https://api.popcat.xyz/v2/ytplay?q=${encodeURIComponent(songName)}`;

    https.get(apiUrl, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
            try {
                const songData = JSON.parse(data);
                if (!songData || !songData.url) {
                    return api.sendMessage("❌ Dukhito, gan ti khuje paowa jayni.", threadID, messageID);
                }

                const cacheDir = path.join(__dirname, "cache");
                if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

                const cachePath = path.join(cacheDir, `${Date.now()}_gan.mp3`);
                const file = fs.createWriteStream(cachePath);

                https.get(songData.url, (stream) => {
                    stream.pipe(file);
                    file.on("finish", () => {
                        file.close(() => {
                            api.sendMessage({
                                body: `🎶 **Ganer Nam:** ${songData.title || songName}`,
                                attachment: fs.createReadStream(cachePath)
                            }, threadID, () => {
                                if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
                            }, messageID);
                        });
                    });
                }).on("error", () => {
                    api.sendMessage("❌ Download korte somossa hoyeche.", threadID, messageID);
                });

            } catch (err) {
                api.sendMessage("❌ Server response err!", threadID, messageID);
            }
        });
    }).on("error", () => {
        api.sendMessage("❌ API request fail!", threadID, messageID);
    });
};
