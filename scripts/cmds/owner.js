const fs = require("fs-extra");
const request = require("request");
const path = require("path");

module.exports = {
  config: {
    name: "owner",
    version: "1.3.0",
    author: "Mᴏʜᴀᴍᴍᴀᴅ Aᴋᴀsʜ",
    role: 0,
    shortDescription: "Owner information with image",
    category: "Information",
    guide: {
      en: "owner"
    }
  },

  onStart: async function ({ api, event }) {
    const ownerText = 
`╭─ 👑 Oᴡɴᴇʀ Iɴғᴏ 👑 ─╮
│ 👤 Nᴀᴍᴇ       : SAMI BHAI
│ 🧸 Nɪᴄᴋ       : 𝐗𝐒𝐘 SAMI
│ 🎂 Aɢᴇ        : 21+
│ 💘 Rᴇʟᴀᴛɪᴏɴ : KEW NAI😭
│ 🎓 Pʀᴏғᴇssɪᴏɴ : 𝗦𝗧𝗨𝗗𝗘𝗡𝗧
│ 📚 Eᴅᴜᴄᴀᴛɪᴏɴ : HONOURS 2ND
│ 🏡 Lᴏᴄᴀᴛɪᴏɴ : DHAKA, GULSHAN 
├─ 🔗 Cᴏɴᴛᴀᴄᴛ ─╮
│ 📘 Facebook  : Sami Ahmed 
│ 💬 Messenger: https://m.me/sami.ahmed.721296
│ 📞 WhatsApp  : wa.me/01823713382
╰────────────────╯`;

    const cacheDir = path.join(__dirname, "cache");
    const imgPath = path.join(cacheDir, "owner.jpg");

    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const imgLink = "https://files.catbox.moe/bg781r.jpg";

    const send = () => {
      api.sendMessage(
        {
          body: ownerText,
          attachment: fs.createReadStream(imgPath)
        },
        event.threadID,
        () => fs.unlinkSync(imgPath),
        event.messageID
      );
    };

    request(encodeURI(imgLink))
      .pipe(fs.createWriteStream(imgPath))
      .on("close", send);
  }
};
