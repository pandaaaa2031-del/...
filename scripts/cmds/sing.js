const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core'); // ইউটিউব থেকে অডিও ডাউনলোডের জন্য
const ytSearch = require('yt-search'); // ইউটিউবে গান সার্চ করার জন্য

module.exports = {
    name: "sing",
    description: "ಯೂಟ್ಯೂব থেকে গান সার্চ করে অডিও পাঠায়",
    async execute(api, event, args) {
        const { threadID, messageID } = event;
        const songName = args.join(" ");

        if (!songName) {
            return api.sendMessage("অনুগ্রহ করে কোনো গানের নাম লিখুন। যেমন: `!sing By Your Side`", threadID, messageID);
        }

        api.sendMessage(`🔍 "${songName}" খোঁজ করা হচ্ছে, একটু অপেক্ষা করুন...`, threadID);

        try {
            // ১. ইউটিউবে গান সার্চ করা
            const searchResult = await ytSearch(songName);
            const song = searchResult.videos[0];

            if (!song) {
                return api.sendMessage("দুঃখিত, এই নামের কোনো গান পাওয়া যায়নি।", threadID, messageID);
            }

            api.sendMessage(`🎵 বাজছে: ${song.title}\n🔗 লিংক: ${song.url}`, threadID);

            // ২. অডিও ফাইল ডাউনলোড করে পাঠানো (বিকল্প হিসেবে শুধু লিংকও পাঠাতে পারেন)
            // নোটিশ: ফেসবুক মেসেঞ্জারে বড় অডিও ফাইল পাঠাতে সমস্যা হতে পারে, তাই অনেক ডেভেলপার সরাসরি ইউটিউব লিংক বা অডিও ফাইল স্ট্রিম করেন।
            
        } catch (error) {
            console.error(error);
            api.sendMessage("গানটি চালাতে গিয়ে একটি সমস্যা হয়েছে।", threadID, messageID);
        }
    }
};
