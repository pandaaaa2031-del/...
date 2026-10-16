module.exports = {
  config: {
    name: "spy",
    version: "1.0",
    author: "Shanto",
    countDown: 5,
    role: 2, // শুধু Owner (Bot Admin)
    shortDescription: "User এর সম্পূর্ণ তথ্য বের করে",
    longDescription: "কোনো ইউজারের Facebook ID, নাম, প্রোফাইল লিংক সহ সব তথ্য দেখায়",
    category: "owner",
    guide: {
      en: "{pn} @user\n{pn} reply করে লিখুন\n{pn} <uid>"
    }
  },

  onStart: async function ({ message, args, event, api, usersData }) {
    const { threadID, senderID, mentions, messageReply, type } = event;

    // 🔒 Owner ছাড়া কেউ ব্যবহার করতে পারবে না
    const OWNER_ID = "61595411632306"; // ⚠️ এখানে আপনার Facebook UID বসান
    
    const globalAdmins = (global.GoatBot.config.adminBot || []).map(String);
    const isAdmin = globalAdmins.includes(String(senderID));
    const isOwner = String(senderID) === String(OWNER_ID);

    if (!isAdmin && !isOwner) {
      return message.reply("⛔ এই কমান্ডটি শুধুমাত্র Owner ব্যবহার করতে পারবেন।");
    }

    // Target user বের করা
    let targetID = null;

    // ১. Mention করা হলে
    if (Object.keys(mentions || {}).length > 0) {
      targetID = Object.keys(mentions)[0];
    }
    // ২. Reply করা হলে
    else if (type === "message_reply" && messageReply) {
      targetID = messageReply.senderID;
    }
    // ৩. UID দিলে
    else if (args[0] && /^\d+$/.test(args[0])) {
      targetID = args[0];
    }

    if (!targetID) {
      return message.reply(
        "📖 𝗨𝘀𝗮𝗴𝗲:\n" +
        "• .spy @user — মেনশন করে\n" +
        "• .spy — কারো মেসেজে reply করে\n" +
        "• .spy <uid> — সরাসরি UID দিয়ে"
      );
    }

    // Loading message
    const loadingMsg = await message.reply("🕵️ Spying... তথ্য সংগ্রহ করা হচ্ছে...");

    try {
      // User info আনা
      let userInfo;
      try {
        userInfo = await api.getUserInfo(targetID);
      } catch (e) {
        userInfo = null;
      }

      const user = userInfo ? userInfo[targetID] : null;
      const userData = await usersData.get(targetID);

      // Thread info (গ্রুপে আছে কিনা চেক)
      let threadInfo = null;
      try {
        threadInfo = await api.getThreadInfo(threadID);
      } catch (e) {}

      // Nickname বের করা
      let nickname = "N/A";
      if (threadInfo && threadInfo.nicknames) {
        nickname = threadInfo.nicknames[targetID] || "N/A";
      }

      // Admin কিনা চেক
      let isGroupAdmin = false;
      if (threadInfo && threadInfo.adminIDs) {
        isGroupAdmin = threadInfo.adminIDs.some(
          (a) => String(a.id) === String(targetID)
        );
      }

      // Gender
      let gender = "N/A";
      if (user && user.gender !== undefined) {
        gender = user.gender === 1 ? "👧 Female" : user.gender === 2 ? "👦 Male" : "❓ Unknown";
      }

      // Birthday
      let birthday = "🔒 Private";
      if (user && user.isBirthdayVisible === true && user.birthday) {
        birthday = `${user.birthday.day}/${user.birthday.month}`;
      }

      // Relationship
      let relationship = "🔒 Private";
      if (user && user.relationshipStatus) {
        const relMap = {
          1: "💔 Single",
          2: "💕 In a Relationship",
          3: "💍 Married",
          4: "💔 Divorced",
          5: "❤️ In a Relationship (Complicated)"
        };
        relationship = relMap[user.relationshipStatus] || "❓ Unknown";
      }

      // Message count (আপনার আগের কমান্ড থেকে)
      let threadData = await usersData.get(targetID);
      const msgCount = threadData?.data?.messageCount || 0;

      // Profile URL
      const profileURL = `https://facebook.com/${targetID}`;
      const messengerURL = `https://m.me/${targetID}`;

      // Final message
      let msg = `🕵️ 𝗦𝗣𝗬 𝗥𝗘𝗣𝗢𝗥𝗧\n`;
      msg += `━━━━━━━━━━━━━━━━━━\n\n`;
      msg += `👤 𝗡𝗮𝗺𝗲: ${user?.name || userData?.name || "Unknown"}\n`;
      msg += `🆔 𝗨𝗜𝗗: ${targetID}\n`;
      msg += `📛 𝗡𝗶𝗰𝗸𝗻𝗮𝗺𝗲: ${nickname}\n`;
      msg += `⚧ 𝗚𝗲𝗻𝗱𝗲𝗿: ${gender}\n`;
      msg += `🎂 𝗕𝗶𝗿𝘁𝗵𝗱𝗮𝘆: ${birthday}\n`;
      msg += `💑 𝗥𝗲𝗹𝗮𝘁𝗶𝗼𝗻𝘀𝗵𝗶𝗽: ${relationship}\n\n`;
      msg += `━━━━━━━━━━━━━━━━━━\n`;
      msg += `👑 𝗚𝗿𝗼𝘂𝗽 𝗔𝗱𝗺𝗶𝗻: ${isGroupAdmin ? "✅ Yes" : "❌ No"}\n`;
      msg += `💬 𝗠𝗲𝘀𝘀𝗮𝗴𝗲𝘀: ${msgCount}\n`;
      msg += `🤖 𝗕𝗼𝘁 𝗔𝗱𝗺𝗶𝗻: ${globalAdmins.includes(String(targetID)) ? "✅ Yes" : "❌ No"}\n\n`;
      msg += `━━━━━━━━━━━━━━━━━━\n`;
      msg += `🔗 𝗣𝗿𝗼𝗳𝗶𝗹𝗲: ${profileURL}\n`;
      msg += `💬 𝗠𝗲𝘀𝘀𝗲𝗻𝗴𝗲𝗿: ${messengerURL}`;

      // Loading message ডিলিট
      try {
        await api.unsendMessage(loadingMsg.messageID);
      } catch (e) {}

      // Avatar থাকলে অ্যাভাটার সহ পাঠানো
      if (user?.thumbSrc) {
        const axios = require("axios");
        const fs = require("fs-extra");
        const path = require("path");

        const avatarPath = path.join(__dirname, "cache", `spy_${targetID}.jpg`);
        const res = await axios.get(user.thumbSrc, { responseType: "arraybuffer" });
        fs.writeFileSync(avatarPath, Buffer.from(res.data));

        return message.reply({
          body: msg,
          attachment: fs.createReadStream(avatarPath)
        });
      }

      return message.reply(msg);

    } catch (error) {
      console.log("Spy command error:", error);
      try {
        await api.unsendMessage(loadingMsg.messageID);
      } catch (e) {}
      return message.reply("❌ Error: " + error.message);
    }
  }
};
