
"use strict";

const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

const DATA_DIR = path.join(__dirname, "dark_data");
const DB_FILE = path.join(DATA_DIR, "players.json");
const TEMP_DIR = path.join(DATA_DIR, "images");

for (const dir of [DATA_DIR, TEMP_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveDB(db) {
  const temp = DB_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(db, null, 2));
  fs.renameSync(temp, DB_FILE);
}

function getPlayer(id) {
  const db = loadDB();

  if (!db[id]) {
    db[id] = {
      name: "Player",
      coins: 25000,
      energy: 100,
      maxEnergy: 100,
      xp: 0,
      level: 1,
      love: {},
      gifts: 0,
      dates: 0,
      kisses: 0,
      hugs: 0,
      lastDaily: null,
      achievements: []
    };
    saveDB(db);
  }

  return db[id];
}

function updatePlayer(id, player) {
  const db = loadDB();
  db[id] = player;
  saveDB(db);
}

const GIRLS = {
  maya: {
    name: "Maya",
    age: 22,
    hair: "#211326",
    dress: "#ed176d",
    eye: "#5c263c",
    personality: "Romantic and sweet",
    greeting: "আহা... তুমি এসেছো! ❤️"
  },
  luna: {
    name: "Luna",
    age: 23,
    hair: "#30204f",
    dress: "#7547df",
    eye: "#34205c",
    personality: "Shy and mysterious",
    greeting: "তোমাকে আবার দেখে ভালো লাগছে! 💜"
  },
  sakura: {
    name: "Sakura",
    age: 21,
    hair: "#6a263b",
    dress: "#fa739f",
    eye: "#79344c",
    personality: "Cheerful and playful",
    greeting: "ইয়েই! তুমি চলে এসেছো! 🌸"
  }
};

function rounded(ctx, x, y, w, h, r, color, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function heart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 30, size / 30);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-35, -12, -22, -35, 0, -17);
  ctx.bezierCurveTo(22, -35, 35, -12, 0, 10);
  ctx.fill();
  ctx.restore();
}

function text(ctx, value, x, y, size, color = "#fff", bold = false) {
  ctx.font = `${bold ? "bold " : ""}${size}px sans-serif`;
  ctx.fillStyle = color;
  ctx.fillText(String(value), x, y);
}

function drawCharacter(ctx, girl, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Hair behind face
  ctx.fillStyle = girl.hair;
  ctx.beginPath();
  ctx.ellipse(0, 115, 170, 205, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair strands
  ctx.beginPath();
  ctx.moveTo(-125, 50);
  ctx.quadraticCurveTo(-190, 210, -110, 370);
  ctx.lineTo(-65, 300);
  ctx.lineTo(-65, 65);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(125, 50);
  ctx.quadraticCurveTo(190, 210, 110, 370);
  ctx.lineTo(65, 300);
  ctx.lineTo(65, 65);
  ctx.fill();

  // Neck
  ctx.fillStyle = "#e9a987";
  ctx.fillRect(-35, 250, 70, 90);

  // Body
  ctx.fillStyle = girl.dress;
  ctx.beginPath();
  ctx.moveTo(-45, 305);
  ctx.quadraticCurveTo(-180, 295, -205, 500);
  ctx.lineTo(-165, 680);
  ctx.quadraticCurveTo(0, 720, 165, 680);
  ctx.lineTo(205, 500);
  ctx.quadraticCurveTo(180, 295, 45, 305);
  ctx.closePath();
  ctx.fill();

  // Face
  ctx.fillStyle = "#f3bc9a";
  ctx.beginPath();
  ctx.ellipse(0, 155, 125, 155, 0, 0, Math.PI * 2);
  ctx.fill();

  // Front hair
  ctx.fillStyle = girl.hair;
  ctx.beginPath();
  ctx.moveTo(-125, 115);
  ctx.quadraticCurveTo(-135, -50, 0, -45);
  ctx.quadraticCurveTo(145, -50, 125, 115);
  ctx.quadraticCurveTo(55, 45, 0, 80);
  ctx.quadraticCurveTo(-75, 40, -125, 115);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-48, 160, 25, 19, 0, 0, Math.PI * 2);
  ctx.ellipse(48, 160, 25, 19, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = girl.eye;
  ctx.beginPath();
  ctx.arc(-48, 160, 12, 0, Math.PI * 2);
  ctx.arc(48, 160, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-44, 155, 5, 0, Math.PI * 2);
  ctx.arc(52, 155, 5, 0, Math.PI * 2);
  ctx.fill();

  // Nose and smile
  ctx.strokeStyle = "#9c5262";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 185);
  ctx.lineTo(-4, 205);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 220, 30, 0.15, Math.PI - 0.15);
  ctx.stroke();

  // Rose accessory
  ctx.fillStyle = "#e91e63";
  ctx.beginPath();
  ctx.arc(105, 30, 25, 0, Math.PI * 2);
  ctx.arc(125, 45, 20, 0, Math.PI * 2);
  ctx.arc(85, 45, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawScreen(player, girlKey, scene = "home", messageText = "") {
  const W = 1200;
  const H = 750;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const girl = GIRLS[girlKey] || GIRLS.maya;
  const love = player.love[girlKey] || 0;

  // Night background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#100b28");
  bg.addColorStop(0.5, "#251052");
  bg.addColorStop(1, "#090d26");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Moon and city
  ctx.fillStyle = "#f7eaff";
  ctx.beginPath();
  ctx.arc(850, 115, 48, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 25; i++) {
    const x = i * 50;
    const height = 80 + (i * 37 % 150);
    ctx.fillStyle = "#171936";
    ctx.fillRect(x, 390 - height, 42, height);

    for (let j = 0; j < 5; j++) {
      ctx.fillStyle = "#d38bff";
      ctx.fillRect(x + 9, 410 - height + j * 24, 8, 10);
    }
  }

  // Bedroom floor
  ctx.fillStyle = "#24143d";
  ctx.fillRect(0, 535, W, 215);

  // Bed
  rounded(ctx, 70, 460, 520, 220, 28, "#35204f", "#a53cce");
  rounded(ctx, 85, 450, 490, 100, 22, "#b45b9b");
  rounded(ctx, 105, 475, 180, 75, 18, "#f6a2cf");

  // Decorative hearts
  for (let i = 0; i < 15; i++) {
    heart(ctx, (i * 83) % W, 70 + (i * 47) % 400, 15, "#f24bba");
  }

  // Main artwork
  drawCharacter(ctx, girl, 530, 35, 0.86);

  // Logo
  text(ctx, "Dark", 25, 65, 45, "#c99aff", true);
  text(ctx, "Desire", 25, 110, 45, "#ff43c6", true);
  text(ctx, "v1.0.0 | By Si Fat", 25, 140, 17);

  // Player card
  rounded(ctx, 350, 12, 300, 105, 20, "rgba(12,7,30,0.9)", "#a43cdb");
  text(ctx, "Player: " + player.name, 370, 45, 22, "#fff", true);
  text(ctx, "Level: " + player.level, 370, 75, 19);
  text(ctx, "XP: " + player.xp, 370, 100, 16, "#e7a8ff");

  // Currency card
  rounded(ctx, 680, 15, 230, 55, 15, "#160c30", "#8e36db");
  text(ctx, "🪙 " + player.coins, 700, 51, 23, "#ffd65c", true);

  rounded(ctx, 925, 15, 240, 55, 15, "#160c30", "#8e36db");
  text(ctx, "❤️ " + player.energy + "/" + player.maxEnergy, 945, 51, 22);

  // Action panel
  rounded(ctx, 850, 170, 325, 400, 22, "rgba(12,4,27,0.94)", "#ec2dbb");
  text(ctx, "♥ Choose Your Action", 875, 210, 24, "#ff50c7", true);

  const actions = [
    ["1", "Kiss her", "+10 Love"],
    ["2", "Talk to her", "Learn about her"],
    ["3", "Give Gift", "+20 Love"],
    ["4", "Go to Date", "-10 Energy"],
    ["5", "Hug her", "+15 Love"]
  ];

  actions.forEach((a, i) => {
    const y = 230 + i * 65;
    rounded(
      ctx, 870, y, 285, 55, 13,
      i === 0 ? "#c71983" : "#421578",
      "#d84dff"
    );
    text(ctx, a[0] + ". " + a[1], 888, y + 25, 19, "#fff", true);
    text(ctx, a[2], 888, y + 46, 14, "#ead4ff");
  });

  // Bottom dialogue
  rounded(ctx, 20, 600, 1160, 130, 20, "rgba(12,4,26,0.96)", "#ed2dbb");
  text(ctx, girl.name + "  ♥  Love: " + love, 50, 635, 25, "#ff54c9", true);

  const dialogue = messageText || girl.greeting;
  ctx.font = "22px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(dialogue.slice(0, 75), 50, 680);

  text(ctx, "Reply with 1, 2, 3, 4 or 5", 50, 715, 16, "#e7caff");

  // Outer border
  ctx.strokeStyle = "#ff35cb";
  ctx.lineWidth = 4;
  ctx.strokeRect(5, 5, W - 10, H - 10);

  return canvas.toBuffer("image/png");
}

async function sendGame(api, threadID, playerID, girlKey, dialogue = "") {
  const player = getPlayer(playerID);
  const girl = GIRLS[girlKey] || GIRLS.maya;

  const buffer = drawScreen(player, girlKey, "home", dialogue);

  const file = path.join(
    TEMP_DIR,
    `dark_${Date.now()}_${Math.floor(Math.random() * 99999)}.png`
  );

  fs.writeFileSync(file, buffer);

  const stream = fs.createReadStream(file);

  api.sendMessage(
    {
      body: "",
      attachment: stream
    },
    threadID,
    (err, info) => {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (e) {}

      if (err) {
        console.error("[DARK SEND ERROR]", err);
        return api.sendMessage(
          "❌ Image পাঠানো যায়নি। GoatBot attachment API পরীক্ষা করো।",
          threadID
        );
      }

      if (info && info.messageID && global.GoatBot?.onReply) {
        global.GoatBot.onReply.set(info.messageID, {
          name: "dark",
          author: playerID,
          girlKey,
          messageID: info.messageID
        });
      }
    }
  );
}

function addXP(player, amount) {
  player.xp += amount;

  while (player.xp >= player.level * 500) {
    player.xp -= player.level * 500;
    player.level++;
    player.coins += 500;
  }
}

function addLove(player, girlKey, amount) {
  player.love[girlKey] = Math.min(
    100,
    (player.love[girlKey] || 0) + amount
  );
}

module.exports = {
  config: {
    name: "dark",
    version: "1.0.0",
    author: "Si Fat",
    countDown: 3,
    role: 0,
    shortDescription: "Dark Desire Anime Game",
    longDescription: "Premium Anime Dating Simulator",
    category: "game",
    guide: "{pn} [maya/luna/sakura/girls/shop/daily/stats]"
  },

  onStart: async function ({ api, event, args }) {
    try {
      const id = event.senderID;
      const threadID = event.threadID;
      const player = getPlayer(id);

      player.name = player.name || "Player";

      const cmd = (args[0] || "home").toLowerCase();

      if (cmd === "maya" || cmd === "luna" || cmd === "sakura") {
        return sendGame(api, threadID, id, cmd);
      }

      if (cmd === "girls") {
        return api.sendMessage(
          "💗 DARK DESIRE — GIRLS\n\n" +
          "1. Maya — Romantic ❤️\n" +
          "2. Luna — Mysterious 💜\n" +
          "3. Sakura — Cheerful 🌸\n\n" +
          "Choose: dark maya / dark luna / dark sakura",
          threadID
        );
      }

      if (cmd === "stats") {
        return api.sendMessage(
          "🎮 YOUR PLAYER PROFILE\n\n" +
          "👤 Player: " + player.name + "\n" +
          "⭐ Level: " + player.level + "\n" +
          "✨ XP: " + player.xp + "\n" +
          "🪙 Coins: " + player.coins + "\n" +
          "⚡ Energy: " + player.energy + "/" + player.maxEnergy + "\n" +
          "💋 Kisses: " + player.kisses + "\n" +
          "🤗 Hugs: " + player.hugs + "\n" +
          "🎁 Gifts: " + player.gifts + "\n" +
          "💕 Dates: " + player.dates,
          threadID
        );
      }

      if (cmd === "shop") {
        return api.sendMessage(
          "🛍️ DARK DESIRE SHOP\n\n" +
          "1. Rose Bouquet — 500 Coins\n" +
          "2. Chocolate Box — 300 Coins\n" +
          "3. Diamond Necklace — 1500 Coins\n\n" +
          "Buy: dark buy 1 / 2 / 3",
          threadID
        );
      }

      if (cmd === "buy") {
        const item = Number(args[1]);

        const items = {
          1: { name: "Rose Bouquet", price: 500, love: 20 },
          2: { name: "Chocolate Box", price: 300, love: 10 },
          3: { name: "Diamond Necklace", price: 1500, love: 35 }
        };

        const gift = items[item];

        if (!gift) {
          return api.sendMessage("❌ সঠিক Item নির্বাচন করো: 1, 2, 3", threadID);
        }

        if (player.coins < gift.price) {
          return api.sendMessage("❌ তোমার পর্যাপ্ত Coins নেই!", threadID);
        }

        player.coins -= gift.price;
        player.gifts++;
        addLove(player, "maya", gift.love);
        addXP(player, 30);
        updatePlayer(id, player);

        return sendGame(
          api,
          threadID,
          id,
          "maya",
          "Maya: ওয়াও! এত সুন্দর Gift! অনেক ধন্যবাদ! 🎁❤️"
        );
      }

      if (cmd === "daily") {
        const today = new Date().toISOString().slice(0, 10);

        if (player.lastDaily === today) {
          return api.sendMessage(
            "❌ আজকের Daily Reward ইতিমধ্যে নিয়েছো!",
            threadID
          );
        }

        player.lastDaily = today;
        player.coins += 1000;
        player.energy = player.maxEnergy;
        addXP(player, 100);
        updatePlayer(id, player);

        return api.sendMessage(
          "🎁 DAILY REWARD CLAIMED!\n\n" +
          "🪙 +1000 Coins\n" +
          "⚡ Energy Fully Restored\n" +
          "⭐ +100 XP",
          threadID
        );
      }

      if (cmd === "achievements") {
        return api.sendMessage(
          "🏆 ACHIEVEMENTS\n\n" +
          "💋 First Kiss: " + (player.kisses > 0 ? "✅" : "🔒") + "\n" +
          "🎁 First Gift: " + (player.gifts > 0 ? "✅" : "🔒") + "\n" +
          "🤗 First Hug: " + (player.hugs > 0 ? "✅" : "🔒") + "\n" +
          "💕 First Date: " + (player.dates > 0 ? "✅" : "🔒") + "\n" +
          "⭐ Level 5: " + (player.level >= 5 ? "✅" : "🔒"),
          threadID
        );
      }

      if (cmd === "help") {
        return api.sendMessage(
          "🌹 DARK DESIRE COMMANDS\n\n" +
          "dark — Start Game\n" +
          "dark girls — Character List\n" +
          "dark maya — Play with Maya\n" +
          "dark luna — Play with Luna\n" +
          "dark sakura — Play with Sakura\n" +
          "dark shop — Shop\n" +
          "dark buy 1 — Buy Gift\n" +
          "dark daily — Daily Reward\n" +
          "dark stats — Player Stats\n" +
          "dark achievements — Achievements",
          threadID
        );
      }

      return sendGame(api, threadID, id, "maya");

    } catch (error) {
      console.error("[DARK START ERROR]", error);
      return api.sendMessage(
        "❌ Game Error: " + String(error.message || error).slice(0, 300),
        event.threadID
      );
    }
  },

  onReply: async function ({ api, event, Reply }) {
    try {
      if (event.senderID !== Reply.author) {
        return api.sendMessage(
          "❌ এই Game Session অন্য Player-এর!",
          event.threadID
        );
      }

      const id = event.senderID;
      const threadID = event.threadID;
      const player = getPlayer(id);
      const girlKey = Reply.girlKey || "maya";
      const girl = GIRLS[girlKey] || GIRLS.maya;

      const choice = String(event.body || "").trim().toLowerCase();

      let dialogue = "";

      if (choice === "1" || choice === "kiss") {
        if (player.energy < 5) {
          return api.sendMessage(
            "⚡ তোমার Energy কম! Daily Reward নাও: dark daily",
            threadID
          );
        }

        player.energy -= 5;
        player.kisses++;
        addLove(player, girlKey, 10);
        addXP(player, 30);

        dialogue = girl.name + ": উম্মাহ! তুমি সত্যিই মিষ্টি! 💋❤️";
      }

      else if (choice === "2" || choice === "talk") {
        addXP(player, 15);

        const talks = {
          maya: "Maya: আমি রাতে চাঁদ দেখতে খুব ভালোবাসি। 🌙",
          luna: "Luna: আমার সবচেয়ে প্রিয় জায়গা হলো শান্ত বাগান। 💜",
          sakura: "Sakura: আমি ফুল আর Chocolate খুব পছন্দ করি! 🌸"
        };

        dialogue = talks[girlKey];
      }

      else if (choice === "3" || choice === "gift") {
        if (player.coins < 300) {
          return api.sendMessage(
            "🪙 Gift কেনার জন্য কমপক্ষে 300 Coins লাগবে। dark shop",
            threadID
          );
        }

        player.coins -= 300;
        player.gifts++;
        addLove(player, girlKey, 20);
        addXP(player, 30);

        dialogue = girl.name + ": আমার জন্য Gift! তুমি অসাধারণ! 🎁💕";
      }

      else if (choice === "4" || choice === "date") {
        if (player.energy < 10) {
          return api.sendMessage(
            "⚡ Date-এর জন্য 10 Energy প্রয়োজন!",
            threadID
          );
        }

        player.energy -= 10;
        player.dates++;
        addLove(player, girlKey, 15);
        addXP(player, 50);

        dialogue = girl.name + ": আজকের Date সত্যিই সুন্দর ছিল! 🌹";
      }

      else if (choice === "5" || choice === "hug") {
        if (player.energy < 3) {
          return api.sendMessage(
            "⚡ তোমার Energy কম! dark daily ব্যবহার করো।",
            threadID
          );
        }

        player.energy -= 3;
        player.hugs++;
        addLove(player, girlKey, 15);
        addXP(player, 25);

        dialogue = girl.name + ": তোমার Hug খুব সুন্দর! 🤗❤️";
      }

      else {
        return api.sendMessage(
          "❌ 1 থেকে 5-এর মধ্যে একটি নম্বর Reply করো।",
          threadID
        );
      }

      updatePlayer(id, player);

      return sendGame(api, threadID, id, girlKey, dialogue);

    } catch (error) {
      console.error("[DARK REPLY ERROR]", error);

      return api.sendMessage(
        "❌ Action Error: " + String(error.message || error).slice(0, 300),
        event.threadID
      );
    }
  }
};
