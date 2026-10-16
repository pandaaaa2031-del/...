!cmd install owner.js const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "owner",
    version: "1.0",
    author: "𝐗𝐒𝐘 𝐒𝐇𝐀𝐍𝐓𝐎",
    countDown: 5,
    role: 0,
    shortDescription: "Show owner info",
    longDescription: "Show owner information",
    category: "info",
    guide: "{pn}",
    aliases: ["infoowner", "ownerinfo"]
  },

  onStart: async function ({ message }) {
    const ownerInfo = `
╭─ 👑 Oᴡɴᴇʀ Iɴғᴏ 👑 ─╮
│ 👤 Nᴀᴍᴇ : 𝗦𝗔𝗠𝗜 𝗕𝗛𝗔𝗜
│ 🧸 Nɪᴄᴋ : 𝐗𝐒𝐘 𝗦𝗔𝗠𝗜
│ 🎂 Aɢᴇ : 𝟮𝟭+
│ 💘 Rᴇʟᴀᴛɪᴏɴ : 𝗞𝗘𝗪 𝗡𝗔𝗜😢
│ 🎓 Pʀᴏғᴇssɪᴏɴ : 𝗦𝗧𝗨𝗗𝗘𝗡𝗧
│ 📚 Eᴅᴜᴄᴀᴛɪᴏɴ : 𝗛𝗢𝗡𝗢𝗨𝗥𝗦 𝟮𝗡𝗗
│ 🏡 Lᴏᴄᴀᴛɪᴏɴ : 𝗗𝗛𝗔𝗞𝗔 - 𝗚𝗨𝗟𝗦𝗛𝗔𝗡
├─ 🔗 Cᴏɴᴛᴀᴄᴛ ─╮
│ 📘 Facebook :  SAMI AHMED 
│ 💬 Messenger: https://m.me/sami.ahmed.721296
│ 📞 WhatsApp : wa.me/01823714382
╰────────────────`;

    const imgUrl = "https://files.catbox.moe/w06hy7.jpg";
    const imgPath = path.join(__dirname, "cache", "owner.jpg");

    try {
      const res = await axios.get(imgUrl, { responseType: "arraybuffer" });
      await fs.ensureDir(path.dirname(imgPath));
      await fs.writeFile(imgPath, res.data);

      return message.reply({
        body: ownerInfo,
        attachment: fs.createReadStream(imgPath)
      });
    } catch {
      return message.reply(ownerInfo);
    }
  }
};
