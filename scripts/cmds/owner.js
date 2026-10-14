const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const axios = require('axios');

module.exports = {
  config: {
    name: "owner",
    aliases: ["owner", "own"],
    version: "2.8",
    author: "NIROB",
    countDown: 5,
    role: 0,
    shortDescription: {
      vi: "",
      en: "Sends information about the bot and admin."
    },
    longDescription: {
      vi: "",
      en: "Sends information about the bot and admin with an image."
    },
    category: "Information",
    guide: {
      en: "{pn}"
    },
    envConfig: {}
  },

  onStart: async function ({ message }) {
    await this.sendInfo(message);
  },

  onChat: async function ({ event, message }) {
    if (event.body && event.body.toLowerCase() === "info") {
      await this.sendInfo(message);
    }
  },

  sendInfo: async function (message) {
    const cachePath = path.join(__dirname, 'cache', 'owner_img.jpg');

    try {
      const botName = "𝗧𝗢𝗡𝗡𝗜 𝗕𝗢𝗧";
      const botPrefix = "/";
      const authorName = "𝐒𝐀𝐌𝐈 𝐀𝐇𝐌𝐄𝐃";
      const authorFB = "https://facebook.com/hatake.kakashi.NN";
      const authorInsta = "U.R.GAY";
      const status = "𝚂𝚒𝚗𝚐𝚕𝚎";
      
      // Direct Imgur Image URL
      const imageUrl = "https://i.imgur.com/f775wuO.jpeg"; 

      const now = moment().tz('Asia/Dhaka');
      const time = now.format('hh:mm:ss A');
      const date = now.format('DD/MM/YYYY');

      const uptime = process.uptime();
      const seconds = Math.floor(uptime % 60);
      const minutes = Math.floor((uptime / 60) % 60);
      const hours = Math.floor((uptime / (60 * 60)) % 24);
      const days = Math.floor(uptime / (60 * 60 * 24));
      const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

      const responseText = 
`░▒▓█ 🤖 BOT & OWNER SYSTEM INFO █▓▒░

 ┌─[ 👑 ADMIN INFO ]
 ├─► 👤 Name       : ${authorName}
 ├─► 📘 Facebook   : ${authorFB}
 ├─► 📸 Instagram  : ${authorInsta}
 └─► 💖 Status     : 𝚂𝚒𝚗𝚐𝚕𝚎

 ┌─[ ⚡ BOT SYSTEM ]
 ├─► 🤖 Bot Name   : ${botName}
 ├─► ⚙️ Prefix     : [ ${botPrefix} ]
 ├─► ⏰ Time       : ${time}
 ├─► 📅 Date       : ${date}
 └─► ⏳ Uptime     : ${uptimeString}

░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░`;

      // Cache folder check & create
      const cacheDir = path.join(__dirname, 'cache');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      // Download image with stream headers
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      const writer = fs.createWriteStream(cachePath);
      response.data.pipe(writer);

      writer.on('finish', async () => {
        await message.reply({
          body: responseText,
          attachment: fs.createReadStream(cachePath)
        });
        // Delete temporary cache image
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      });

      writer.on('error', async (err) => {
        console.error("Stream error:", err);
        await message.reply(responseText);
      });

    } catch (err) {
      console.error("❌ Error in owner command:", err);
      // Fallback response if image fails
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      return message.reply("❌ Error occurred while sending owner info.");
    }
  }
};
