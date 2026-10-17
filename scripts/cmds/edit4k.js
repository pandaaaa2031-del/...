const axios = require("axios");

module.exports = {
  config: {
    name: "edit4k",
    version: "2.1.0",
    author: "Sami Bhai",
    countDown: 5,
    role: 0,
    shortDescription: "Real 4K Image Enhancer",
    longDescription: "Enhance image resolution to Ultra HD 4K",
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
      message.reply("⏳ সামি ভাইয়ের আল্ট্রা HD ৪K এডিট কাজ করছে, একটু অপেক্ষা করুন...");

      // Working Real HD/4K Upscale APIs
      const apis = [
        `https://api.siputzx.my.id/api/tools/remini?url=${encodeURIComponent(imageUrl)}`,
        `https://api.ryzendesu.vip/api/ai/remini?url=${encodeURIComponent(imageUrl)}`,
        `https://itzpire.com/tools/remini?url=${encodeURIComponent(imageUrl)}`
      ];

      let imgBuffer = null;

      for (const apiUri of apis) {
        try {
          const res = await axios.get(apiUri, { responseType: "arraybuffer", timeout: 25000 });
          if (res.data && res.data.byteLength > 100000) { // Ensures enhanced image size is large
            imgBuffer = Buffer.from(res.data);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (imgBuffer) {
        return message.reply({
          body: "✨ সামি ভাইয়ের আল্ট্রা HD ৪K এডিটিং সম্পূর্ণ হয়েছে! 🔥",
          attachment: imgBuffer
        });
      } else {
        return message.reply("❌ সামি ভাই দুঃখিত! ছবিটির ৪K কোয়ালিটি প্রসেস করতে সমস্যা হয়েছে, অন্য ছবি দিয়ে চেষ্টা করুন।");
      }

    } catch (error) {
      console.error(error);
      return message.reply("❌ সামি ভাইয়ের সিস্টেমে সমস্যা হয়েছে।");
    }
  }
};
  
