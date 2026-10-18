const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "sing",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Developer",
    description: "ইউটিউব থেকে গান খুঁজে অডিও হিসেবে পাঠায়",
    commandCategory: "media",
    usages: "[গানের নাম]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const songName = args.join(" ");

    if (!songName) {
        return api.sendMessage("❌ অনুগ্রহ করে কোনো গানের নাম লিখুন।\nউদাহরণ: !sing Tum Hi Ho", threadID, messageID);
    }

    api.sendMessage(`🔍 "${songName}" গানটি খোঁজা হচ্ছে, একটু অপেক্ষা করুন...`, threadID, messageID);

    try {
        const res = await axios.get(`https://api.popcat.xyz/v2/ytplay?q=${encodeURIComponent(songName)}`);
        
        if (!res.data || !res.data.url) {
            return api.sendMessage("❌ দুঃখিত, গানটি খুঁজে পাওয়া যায়নি।", threadID, messageID);
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
                body: `🎶 **গানের নাম:** ${songData.title || songName}\n👤 **চ্যানেল:** ${songData.channel || "YouTube"}`,
                attachment: fs.createReadStream(cachePath)
            }, threadID, () => {
                if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
            }, messageID);
        });

        writer.on("error", (err) => {
            console.error(err);
            api.sendMessage("❌ গান ডাউনলোড করতে সমস্যা হয়েছে।", threadID, messageID);
        });

    } catch (error) {
        console.error(error);
        api.sendMessage("❌ সার্ভারে সমস্যা হচ্ছে, পরে আবার চেষ্টা করুন।", threadID, messageID);
    }
};
          
