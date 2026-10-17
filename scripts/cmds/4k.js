const axios = require("axios");

module.exports = {
  config: {
    name: "4k",
    version: "1.0.5",
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

      // Multi-API Backup Loop for 100% Reliability
      const apis = [
        `https://api.vyturex.com/upscale?url=${encodeURIComponent(imageUrl)}`,
        `https://kaiz-apis.gleeze.com/api/remini?url=${encodeURIComponent(imageUrl)}`,
        `https://api.genz-api.xyz/api/upscale?url=${encodeURIComponent(imageUrl)}`
      ];

      let imgStream = null;

      for (const apiUri of apis) {
        try {
          const res = await axios.get(apiUri, { timeout: 20000 });
          const finalUrl = res.data.url || res.data.result || res.data.image_url || res.data.content;
          
          if (finalUrl) {
            const streamRes = await axios.get(finalUrl, { responseType: "stream" });
            imgStream = streamRes.data;
            break;
          }
        } catch (err) {
          continue; // Next API attempt
        }
      }

      if (imgStream) {
        return message.reply({
          body: "✨ সামি ভাইয়ের ৪K এডিটিং সম্পূর্ণ হয়েছে! 🔥",
          attachment: imgStream
        });
      } else {
        return message.reply("❌ সামি ভাই দুঃখিত! অন্য একটি ছবি দিয়ে চেষ্টা করুন।");
      }
    } catch (error) {
      console.error(error);
      return message.reply("❌ সামি ভাইয়ের প্রসেসিংয়ে সমস্যা হয়েছে।");
    }
  }
};
          
