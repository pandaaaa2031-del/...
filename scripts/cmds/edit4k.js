const axios = require("axios");

module.exports = {
  config: {
    name: "edit4k",
    version: "1.0.0",
    author: "Sami Bhai",
    countDown: 5,
    role: 0,
    shortDescription: "Enhance image to 4K quality",
    longDescription: "Enhance image resolution to 4K using AI",
    category: "media",
    guide: {
      en: "{p}4k [reply to an image]"
    }
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

      // Working HD/4K Engine
      const res = await axios.get(`https://api.vyturex.com/upscale?url=${encodeURIComponent(imageUrl)}`);

      if (res.data && (res.data.url || res.data.result)) {
        const enhancedUrl = res.data.url || res.data.result;
        const imageStream = (await axios.get(enhancedUrl, { responseType: "stream" })).data;

        return message.reply({
          body: "✨ সামি ভাইয়ের ৪K এডিটিং সম্পূর্ণ হয়েছে! 🔥",
          attachment: imageStream
        });
      } else {
        return message.reply("❌ সামি ভাই দুঃখিত! এই মুহূর্তে ছবি ৪K করা যাচ্ছে না। অন্য একটি ছবি চেষ্টা করুন।");
      }
    } catch (error) {
      console.error(error);
      return message.reply("❌ সামি ভাইয়ের সিস্টেমে সমস্যা হয়েছে।");
    }
  }
};
          
