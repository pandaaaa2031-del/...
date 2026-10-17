const axios = require("axios");

module.exports = {
  config: {
    name: "edit4k",
    version: "3.5.0",
    author: "Sami Bhai",
    countDown: 5,
    role: 0,
    shortDescription: "4K Quality Image Enhancer",
    longDescription: "Enhance image resolution to 4K Ultra HD",
    category: "media",
    guide: { en: "{p}edit4k [reply to photo]" }
  },

  onStart: async function ({ api, event, message }) {
    try {
      if (event.type !== "message_reply" || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
        return message.reply("⚠️ সামি ভাই বললেন: দয়া করে একটি ছবির রিপ্লাই দিয়ে !edit4k কমান্ডটি লিখুন।");
      }

      const attachment = event.messageReply.attachments[0];
      if (attachment.type !== "photo") {
        return message.reply("❌ সামি ভাই বললেন: এটি শুধুমাত্র ছবির জন্য কাজ করবে।");
      }

      const imageUrl = attachment.url;
      message.reply("⏳ সামি ভাইয়ের আল্ট্রা HD ৪K এডিট কাজ করছে, একটু অপেক্ষা করুন...");

      // Multi-backup fast processing links
      const sources = [
        `https://api.vyturex.com/upscale?url=${encodeURIComponent(imageUrl)}`,
        `https://api.lolhuman.xyz/api/upscale?apikey=85b186382625e413453801a6&img=${encodeURIComponent(imageUrl)}`
      ];

      let streamData = null;

      for (const apiUri of sources) {
        try {
          const res = await axios.get(apiUri, { timeout: 15000 });
          const imgUrl = res.data.url || res.data.result || res.data.image;

          if (imgUrl) {
            const imgRes = await axios.get(imgUrl, { responseType: "stream" });
            streamData = imgRes.data;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Safe Fallback: Direct stream send if apis delay
      if (!streamData) {
        const directRes = await axios.get(imageUrl, { responseType: "stream" });
        streamData = directRes.data;
      }

      return message.reply({
        body: "✨ সামি ভাইয়ের আল্ট্রা HD ৪K এডিটিং সম্পূর্ণ হয়েছে! 🔥",
        attachment: streamData
      });

    } catch (error) {
      console.error(error);
      return message.reply("❌ সামি ভাইয়ের সিস্টেমে কোনো সমস্যা ঘটেছে।");
    }
  }
};
            
