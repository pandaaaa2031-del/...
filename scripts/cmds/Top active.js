module.exports = {
  config: {
    name: "top",
    version: "1.0.0",
    author: "Sami Bhai",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Top active members list",
      bn: "গ্রুপের শীর্ষ সক্রিয় সদস্যদের তালিকা"
    },
    longDescription: {
      en: "Shows the top active members in the group based on message count.",
      bn: "গ্রুপের মেসেজ গণনার ওপর ভিত্তি করে শীর্ষ সক্রিয় সদস্যদের তালিকা দেখায়।"
    },
    category: "group",
    guide: {
      en: "{pref}top",
      bn: "{pref}top"
    }
  },

  onStart: async function ({ api, event, threadsData, usersData }) {
    const { threadID, senderID } = event;

    try {
      const threadInfo = await threadsData.get(threadID);
      if (!threadInfo || !threadInfo.members) {
        return api.sendMessage("❌ গ্রুপের মেসেজ ডাটা পাওয়া যায়নি!", threadID, event.messageID);
      }

      // সদস্যদের মেসেজ সংখ্যা অনুযায়ী সাজানো (Descending Order)
      const members = threadInfo.members.filter(m => m.count > 0);
      members.sort((a, b) => b.count - a.count);

      if (members.length === 0) {
        return api.sendMessage("গ্ৰুপে এখনও পর্যাপ্ত মেসেজ ডাটা নেই!", threadID, event.messageID);
      }

      let msg = "🏆 𝗧𝗢𝗣 𝗔𝗖𝗧𝗜𝗩𝗘 𝗠𝗘𝗠𝗕𝗘𝗥𝗦 🏆\n";
      msg += "━━━━━━━━━━━━━━━━━━━\n\n";

      const topCount = Math.min(members.length, 10); // সেরা ১০ জন সদস্য

      for (let i = 0; i < topCount; i++) {
        const member = members[i];
        const name = await usersData.getName(member.userID) || "Facebook User";
        
        let medal = "";
        if (i === 0) medal = "🥇 ";
        else if (i === 1) medal = "🥈 ";
        else if (i === 2) medal = "🥉 ";
        else medal = `🔹 ${i + 1}. `;

        msg += `${medal}${name}\n💬 Messages: ${member.count}\n\n`;
      }

      msg += "━━━━━━━━━━━━━━━━━━━\n";
      msg += "👑 Created by: Sami Bhai";

      return api.sendMessage(msg, threadID, event.messageID);

    } catch (error) {
      console.error(error);
      return api.sendMessage("❌ তথ্য লোড করতে সমস্যা হয়েছে!", threadID, event.messageID);
    }
  }
};
