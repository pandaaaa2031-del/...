const axios = require("axios");

module.exports = {
  config: {
    name: "4k",
    version: "1.0.1",
    author: "Sami Bhai",
    countDown: 5,
    role: 0,
    shortDescription: "Enhance image to 4K quality",
    longDescription: "Enhance image resolution and edit to 4K quality using AI",
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
        return message.reply("❌ সামি ভাই বললেন: এটি ছবির জন্য প্রযোজ্য, অন্য কোনো ফাইলের জন্য নয়।");
      }

      const imageUrl = attachment.url;
      message.reply("⏳ সামি ভাইয়ের ৪K এডিট বোট ছবিটিকে HD/4K কোয়ালিটিতে কনভার্ট করছে, একটু অপেক্ষা করুন...");

      // Updated Working API
      const res = await axios.get(`https://betadash-uploader.onrender.com/upscale?url=${encodeURIComponent(imageUrl)}`);

      if (res.data && res.data.content) {
        const enhancedImgUrl = res.data.content;
        const imageStream = (await axios.get(enhancedImgUrl, { responseType: "stream" })).data;

        return message.reply({
          body: "✨ সামি ভাইয়ের ৪K এডিটিং সম্পূর্ণ হয়েছে! 🔥",
          attachment: imageStream
        });
      } else {
        return message.reply("❌ সামি ভাই দুঃখিত! ছবি ৪K-তে কনভার্ট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      }
    } catch (error) {
      console.error(error);
      return message.reply("❌ সামি ভাইয়ের সিস্টেমে বা API-তে কোনো সমস্যা ঘটেছে।");
    }
  }
};
      
