const fs = require("fs-extra");
const axios = require("axios");

module.exports = {
  config: {
    name: "pair",
    aliases: ["love", "couple", "match"],
    version: "1.0.0",
    author: "Sami Bhai",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Random love pair matching",
      bn: "গ্রুপ থেকে সেরা লাভ পেয়ার তৈরি করবে"
    },
    longDescription: {
      en: "Selects two random group members and calculates their love percentage.",
      bn: "গ্রুপ থেকে দৈবচয়ন ভিত্তিতে ২ জনকে বেছে নিয়ে ভালোবাসার শতকরা হার দেখাবে।"
    },
    category: "fun",
    guide: {
      en: "{pref}pair",
      bn: "{pref}pair"
    }
  },

  onStart: async function ({ api, event, threadsData, usersData }) {
    const { threadID, messageID } = event;

    try {
      const threadInfo = await threadsData.get(threadID);
      if (!threadInfo || !threadInfo.members || threadInfo.members.length < 2) {
        return api.sendMessage("❌ পেয়ার তৈরি করার জন্য গ্রুপে অন্তত ২ জন সদস্য থাকা প্রয়োজন!", threadID, messageID);
      }

      // ফিল্টার করে র্যান্ডম ২ জন মেম্বার সিলেক্ট করা
      const memberIDs = threadInfo.members.map(m => m.userID);
      const randomIndex1 = Math.floor(Math.random() * memberIDs.length);
      let randomIndex2 = Math.floor(Math.random() * memberIDs.length);

      while (randomIndex1 === randomIndex2) {
        randomIndex2 = Math.floor(Math.random() * memberIDs.length);
      }

      const id1 = memberIDs[randomIndex1];
      const id2 = memberIDs[randomIndex2];

      const name1 = await usersData.getName(id1) || "Facebook User";
      const name2 = await usersData.getName(id2) || "Facebook User";

      // ৫০% থেকে ১০০% এর মধ্যে র্যান্ডম লাভ পার্সেন্টেজ
      const lovePercentage = Math.floor(Math.random() * 51) + 50;

      // বিভিন্ন রোমান্টিক মেসেজ
      let statusText = "";
      if (lovePercentage >= 90) statusText = "💖 সেরা জুটি! এদের ভালোবাসা অমর হয়ে থাকবে!";
      else if (lovePercentage >= 75) statusText = "💕 অসাধারণ মানিয়েছে ২ জনকে!";
      else statusText = "💌 চেষ্টা চালিয়ে যাও, ভবিষ্যৎ ভালো!";

      const msgText = `✨ 𝗥𝗔𝗡𝗗𝗢𝗠 𝗟𝗢𝗩𝗘 𝗣𝗔𝗜𝗥 ✨\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `👩‍❤️‍👨 **${name1}**  ❌  **${name2}**\n\n` +
        `📊 𝗟𝗼𝘃𝗲 𝗣𝗲𝗿𝗰𝗲𝗻𝘁𝗮𝗴𝗲: **${lovePercentage}%**\n` +
        `📝 **Status:** ${statusText}\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👑 Created by: **Sami Bhai**`;

      // দুইজনের প্রোফাইল পিকচার ডাউনলোড করে একসাথে অ্যাটাচ করা (যদি এপিআই সাপোর্ট করে)
      const path1 = __dirname + `/cache/avatar1.png`;
      const path2 = __dirname + `/cache/avatar2.png`;

      try {
        const img1 = (await axios.get(`https://graph.facebook.com/${id1}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: 'arraybuffer' })).data;
        fs.writeFileSync(path1, Buffer.from(img1, 'utf-8'));

        const img2 = (await axios.get(`https://graph.facebook.com/${id2}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: 'arraybuffer' })).data;
        fs.writeFileSync(path2, Buffer.from(img2, 'utf-8'));

        const attachments = [fs.createReadStream(path1), fs.createReadStream(path2)];

        return api.sendMessage({
          body: msgText,
          attachment: attachments,
          mentions: [
            { tag: name1, id: id1 },
            { tag: name2, id: id2 }
          ]
        }, threadID, () => {
          if (fs.existsSync(path1)) fs.unlinkSync(path1);
          if (fs.existsSync(path2)) fs.unlinkSync(path2);
        }, messageID);

      } catch (e) {
        // ছবি পেতে সমস্যা হলে শুধু টেক্সট মেসেজ পাঠাবে
        return api.sendMessage({
          body: msgText,
          mentions: [
            { tag: name1, id: id1 },
            { tag: name2, id: id2 }
          ]
        }, threadID, messageID);
      }

    } catch (error) {
      console.error(error);
      return api.sendMessage("❌ লাভ পেয়ার তৈরি করতে সমস্যা হয়েছে!", threadID, messageID);
    }
  }
};
