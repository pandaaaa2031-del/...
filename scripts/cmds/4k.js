const axios = require("axios");

module.exports = {
  config: {
    name: "4k",
    version: "1.0.2",
    author: "Sami Bhai",
    countDown: 5,
    role: 0,
    shortDescription: "Enhance image to 4K quality",
    longDescription: "Enhance image resolution using AI",
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

      // Backup APIs List
      const apis = [
        `https://betadash-uploader.onrender.com/upscale?url=${encodeURIComponent(imageUrl)}`,
        `https://api.vyturex.com/upscale?url=${encodeURIComponent(imageUrl)}`,
        `https://nams.live/upscale.php?url=${encodeURIComponent(imageUrl)}`
      ];

      let enhancedImgUrl = null;

      for (const url of apis) {
        try {
          const res = await axios.get(url, { timeout: 15000 });
          if (res.data && (res.data.content || res.data.result || res.data.url)) {
            enhancedImgUrl = res.data.content || res.data.result || res.data.url;
            break; // Working API found, exit loop
          }
        } catch (e) {
          continue; // Try next API if this one fails
        }
      }

      if (enhancedImgUrl) {
        const imageStream = (await axios.get(enhancedImgUrl, { responseType: "stream" })).data;
        return message.reply({
          body: "✨ সামি ভাইয়ের ৪K এডিটিং সম্পূর্ণ হয়েছে! 🔥",
          attachment: imageStream
        });
      } else {
        return message.reply("❌ সামি ভাই দুঃখিত! এই মুহূর্তে সার্ভার বিজি থাকায় ছবি ৪K করা যাচ্ছে না। কিছুক্ষণ পর চেষ্টা করুন।");
      }
    } catch (error) {
      console.error(error);
      return message.reply("❌ সামি ভাইয়ের সিস্টেমে কোনো সমস্যা ঘটেছে।");
    }
  }
};
      
