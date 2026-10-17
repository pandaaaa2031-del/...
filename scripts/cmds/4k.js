const axios = require("axios");

module.exports = {
  config: {
    name: "4k",
    version: "1.0.4",
    author: "Sami Bhai",
    countDown: 5,
    role: 0,
    shortDescription: "4K Image Enhancer",
    longDescription: "Enhance image resolution to 4K quality",
    category: "media",
    guide: { en: "{p}4k [reply to photo]" }
  },

  onStart: async function ({ api, event, message }) {
    try {
      if (event.type !== "message_reply" || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
        return message.reply("⚠️ সামি ভাই বললেন: দয়া করে একটি ছবির রিপ্লাই দিয়ে 4k কমান্ডটি লিখুন।");
      }

      const attachment = event.messageReply.attachments[0];
      if (attachment.type !== "photo") {
        return message.reply("❌ সামি ভাই বললেন: এটি শুধুমাত্র ছবির জন্য কাজ করবে।");
      }

      const imageUrl = attachment.url;
      message.reply("⏳ সামি ভাইয়ের ৪K এডিট বোট কাজ করছে, একটু অপেক্ষা করুন...");

      // Working Upscale API
      const response = await axios.get(`https://api.siputzx.my.id/api/tools/remini?url=${encodeURIComponent(imageUrl)}`, {
        responseType: "arraybuffer"
      });

      if (response.data) {
        return message.reply({
          body: "✨ সামি ভাইয়ের ৪K এডিটিং সম্পূর্ণ হয়েছে! 🔥",
          attachment: Buffer.from(response.data)
        });
      } else {
        return message.reply("❌ সামি ভাই দুঃখিত! এই মুহূর্তে ছবিটি ৪K করা সম্ভব হয়নি।");
      }
    } catch (error) {
      console.error(error);
      return message.reply("❌ সামি ভাইয়ের সার্ভার বা API-তে সমস্যা হয়েছে। অন্য একটি ছবি চেষ্টা করুন।");
    }
  }
};
        
