const axios = require("axios");

module.exports = {
  config: {
    name: "profile2",
    aliases: ["user", "info", "me"],
    version: "1.0.0",
    author: "Sami Bhai",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Shows styled profile information",
      bn: "ব্যবহারকারীর সুন্দর প্রোফাইল তথ্য দেখায়"
    },
    longDescription: {
      en: "Displays user profile details including message rank and avatar.",
      bn: "মেসেজ গণনা ও প্রোফাইল ছবিসহ ব্যবহারকারীর বিস্তারিত তথ্য দেখায়।"
    },
    category: "user",
    guide: {
      en: "{pref}profile [@mention / reply]",
      bn: "{pref}profile [@মেনশন / রিপ্লাই]"
    }
  },

  onStart: async function ({ api, event, threadsData, usersData }) {
    const { threadID, messageID, senderID, mentions, type, messageReply } = event;

    try {
      // টার্গেট মেম্বার আইডি বের করা (মেনশন, রিপ্লাই বা নিজের)
      let targetID = senderID;
      if (type === "message_reply") {
        targetID = messageReply.senderID;
      } else if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
      }

      // ব্যবহারকারী ও গ্রুপের তথ্য সংগ্রহ
      const name = await usersData.getName(targetID) || "Facebook User";
      const threadInfo = await threadsData.get(threadID);
      
      let msgCount = 0;
      let rank = "N/A";

      if (threadInfo && threadInfo.members) {
        const members = threadInfo.members.filter(m => m.count > 0);
        members.sort((a, b) => b.count - a.count);
        
        const memberIndex = members.findIndex(m => m.userID === targetID);
        if (memberIndex !== -1) {
          rank = `#${memberIndex + 1} / ${members.length}`;
          msgCount = members[memberIndex].count;
        }
      }

      // সুন্দর সাজানো টেক্সট কার্ড
      const msgText = `🔥 𝗫𝗢𝗦𝗦 𝗨𝗦𝗘𝗥 𝗣𝗥𝗢𝗙𝗜𝗟𝗘 🔥\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 **Name:** ${name}\n` +
        `🆔 **UID:** ${targetID}\n` +
        `💬 **Total Messages:** ${msgCount}\n` +
        `🏆 **Group Rank:** ${rank}\n` +
        `⚡ **Status:** Active Member ✨\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👑 Created by: **Sami Bhai**`;

      // এইচডি প্রোফাইল পিকচার নিয়ে আসা
      const avatarUrl = `https://graph.facebook.com/${targetID}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      const imgStream = (await axios.get(avatarUrl, { responseType: 'stream' })).data;

      return api.sendMessage({
        body: msgText,
        attachment: imgStream,
        mentions: [{ tag: name, id: targetID }]
      }, threadID, messageID);

    } catch (error) {
      console.error(error);
      return api.sendMessage("❌ প্রোফাইল ইনফো লোড করতে সমস্যা হয়েছে!", threadID, messageID);
    }
  }
};
