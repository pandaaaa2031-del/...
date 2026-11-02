const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

const DATA_DIR = path.join(__dirname, "ft_data");
const DB_FILE = path.join(DATA_DIR, "database.json");
const CACHE_DIR = path.join(DATA_DIR, "cache");

const MAX_HP = 300;
const FUSION_MIN_HP = 200;
const FUSION_COST = 30;
const MOVE_NAMES = {
  "1": "POWER PUNCH",
  "2": "HIGH KICK",
  "3": "ENERGY BLAST",
  "4": "SHADOW STRIKE",
  "12": "DRAGON FIST",
  "13": "THUNDER BREAK",
  "14": "PHANTOM KICK",
  "23": "INFERNO BURST",
  "24": "DARK STORM",
  "34": "ULTIMATE CRASH"
};

const BASIC_MOVES = ["1", "2", "3", "4"];
const FUSION_MOVES = ["12", "13", "14", "23", "24", "34"];

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { games: {}, players: {} };
    }
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return {
      games: data.games || {},
      players: data.players || {}
    };
  } catch (err) {
    console.error("[FT] Database load error:", err);
    return { games: {}, players: {} };
  }
}

let db = loadDB();

function saveDB() {
  try {
    const tempFile = DB_FILE + ".tmp";
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2));
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error("[FT] Database save error:", err);
  }
}

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = "";
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (db.games[code]);
  return code;
}

function getPlayerStats(id) {
  if (!db.players[id]) {
    db.players[id] = {
      name: "Unknown",
      wins: 0,
      losses: 0,
      draws: 0,
      battles: 0,
      damage: 0,
      streak: 0,
      bestStreak: 0
    };
  }
  return db.players[id];
}

function getUserName(api, id) {
  return new Promise(resolve => {
    try {
      api.getUserInfo(id, (err, info) => {
        if (err || !info) return resolve("Unknown Player");
        const user = info[id] || info;
        resolve(user.name || user.firstName || "Unknown Player");
      });
    } catch (e) {
      resolve("Unknown Player");
    }
  });
}

function findPlayerGame(userID) {
  return Object.values(db.games).find(game =>
    game.status === "active" &&
    game.players.some(player => player.id === userID)
  );
}

function findWaitingGame(userID) {
  return Object.values(db.games).find(game =>
    game.status === "waiting" &&
    game.players.some(player => player.id === userID)
  );
}

function getGameByThread(threadID) {
  return Object.values(db.games).find(game =>
    game.status !== "finished" &&
    game.players.some(player => player.threadID === threadID)
  );
}

function getPlayer(game, userID) {
  return game.players.find(player => player.id === userID);
}

function createPlayer(id, name, threadID) {
  return {
    id: String(id),
    name: name || "Unknown Player",
    threadID: String(threadID),
    hp: MAX_HP,
    move: null,
    lastMove: null,
    damage: 0,
    dodges: 0,
    stunned: false,
    rageUsed: false
  };
}

function getPlayerLabel(player) {
  return `${player.name}\nFacebook ID: ${player.id}`;
}

function send(api, threadID, body, attachment) {
  return new Promise(resolve => {
    try {
      if (attachment) {
        api.sendMessage(
          { body, attachment: fs.createReadStream(attachment) },
          threadID,
          err => resolve(!err)
        );
      } else {
        api.sendMessage(body, threadID, err => resolve(!err));
      }
    } catch (e) {
      console.error("[FT] Send error:", e);
      resolve(false);
    }
  });
}

async function broadcast(api, game, body, imagePath) {
  const threadIDs = [...new Set(game.players.map(p => p.threadID))];
  for (const threadID of threadIDs) {
    await send(api, threadID, body, imagePath);
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isFusion(move) {
  return FUSION_MOVES.includes(String(move));
}

function validateMove(move) {
  move = String(move || "").trim();
  return BASIC_MOVES.includes(move) || FUSION_MOVES.includes(move);
}

function getMoveDamage(move) {
  const damages = {
    "1": 28,
    "2": 32,
    "3": 30,
    "4": 35,
    "12": 58,
    "13": 62,
    "14": 60,
    "23": 64,
    "24": 66,
    "34": 70
  };
  return damages[String(move)] || 0;
}

function getMoveEmoji(move) {
  const emojis = {
    "1": "👊",
    "2": "🦵",
    "3": "⚡",
    "4": "🌑",
    "12": "🐉",
    "13": "⚡",
    "14": "💥",
    "23": "🔥",
    "24": "🌪️",
    "34": "☄️"
  };
  return emojis[String(move)] || "⚔️";
}

function updatePlayerStats(winner, loser, draw) {
  if (draw) {
    for (const player of draw) {
      const stats = getPlayerStats(player.id);
      stats.name = player.name;
      stats.battles++;
      stats.draws++;
      stats.streak = 0;
    }
  } else {
    const winStats = getPlayerStats(winner.id);
    const loseStats = getPlayerStats(loser.id);

    winStats.name = winner.name;
    loseStats.name = loser.name;

    winStats.battles++;
    winStats.wins++;
    winStats.streak++;
    winStats.bestStreak = Math.max(winStats.bestStreak, winStats.streak);

    loseStats.battles++;
    loseStats.losses++;
    loseStats.streak = 0;

    winStats.damage += winner.damage;
    loseStats.damage += loser.damage;
  }
  saveDB();
}

function drawBattleImage(game, lastAction) {
  const canvas = createCanvas(1100, 620);
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 1100, 620);
  gradient.addColorStop(0, "#10152f");
  gradient.addColorStop(0.5, "#26133d");
  gradient.addColorStop(1, "#071b32");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1100, 620);

  ctx.fillStyle = "rgba(255,255,255,0.07)";
  for (let i = 0; i < 35; i++) {
    ctx.beginPath();
    ctx.arc(randomInt(0, 1100), randomInt(0, 620), randomInt(2, 5), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px Arial";
  ctx.fillText("FIGHT ARENA", 550, 65);

  ctx.font = "bold 30px Arial";
  ctx.fillStyle = "#64eaff";
  ctx.fillText(game.players[0].name.slice(0, 18), 280, 140);
  ctx.fillStyle = "#ff7777";
  ctx.fillText(game.players[1].name.slice(0, 18), 820, 140);

  function drawFighter(x, y, color, flip, hp, name) {
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);

    ctx.shadowColor = color;
    ctx.shadowBlur = 25;
    ctx.fillStyle = color;

    // Head
    ctx.beginPath();
    ctx.arc(0, -100, 42, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.lineWidth = 30;
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -55);
    ctx.lineTo(0, 45);
    ctx.stroke();

    // Arms
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(0, -35);
    ctx.lineTo(-55, 0);
    ctx.moveTo(0, -35);
    ctx.lineTo(55, -5);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(0, 45);
    ctx.lineTo(-40, 105);
    ctx.moveTo(0, 45);
    ctx.lineTo(45, 105);
    ctx.stroke();

    ctx.restore();

    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 23px Arial";
    ctx.fillText(name.slice(0, 18), x, y + 155);

    ctx.fillStyle = "#333333";
    ctx.fillRect(x - 115, y + 170, 230, 20);
    ctx.fillStyle = hp > 100 ? "#35e879" : hp > 40 ? "#ffcc44" : "#ff4444";
    ctx.fillRect(x - 115, y + 170, 230 * Math.max(0, hp) / MAX_HP, 20);
    ctx.font = "bold 18px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${Math.max(0, hp)} / ${MAX_HP} HP`, x, y + 215);
  }

  drawFighter(280, 340, "#35d9ff", false,
    game.players[0].hp, game.players[0].name);
  drawFighter(820, 340, "#ff526d", true,
    game.players[1].hp, game.players[1].name);

  ctx.textAlign = "center";
  ctx.font = "bold 34px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(lastAction || "READY TO FIGHT", 550, 570);

  const file = path.join(CACHE_DIR, `ft_${game.code}_${Date.now()}.png`);
  fs.writeFileSync(file, canvas.toBuffer("image/png"));
  return file;
}
async function finishGame(api, game, winner, loser, draw) {
  game.status = "finished";

  if (draw) {
    updatePlayerStats(null, null, game.players);
  } else {
    updatePlayerStats(winner, loser, null);
  }

  const imagePath = drawBattleImage(game, "BATTLE FINISHED!");

  let result;
  if (draw) {
    result =
      `🤝 BATTLE DRAW!\n\n` +
      `Player 1: ${getPlayerLabel(game.players[0])}\n` +
      `Player 2: ${getPlayerLabel(game.players[1])}\n\n` +
      `দুজনের HP শেষ!`;
  } else {
    result =
      `🏆 WINNER: ${winner.name}\n` +
      `Facebook ID: ${winner.id}\n\n` +
      `💀 DEFEATED: ${loser.name}\n` +
      `Facebook ID: ${loser.id}\n\n` +
      `❤️ Winner HP: ${winner.hp}\n` +
      `⚔️ Total Damage: ${winner.damage}\n\n` +
      `🔥 Battle শেষ!`;
  }

  await broadcast(api, game, result, imagePath);

  delete db.games[game.code];
  saveDB();

  setTimeout(() => {
    try {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    } catch (e) {}
  }, 60000);
}

async function resolveRound(api, game) {
  if (!game || game.status !== "active") return;

  const p1 = game.players[0];
  const p2 = game.players[1];

  if (!p1.move || !p2.move) return;

  const move1 = p1.move;
  const move2 = p2.move;

  let damage1 = getMoveDamage(move1);
  let damage2 = getMoveDamage(move2);

  let effects = [];

  // Fusion cost was deducted when the move was submitted.
  if (isFusion(move1)) effects.push(`🔥 ${p1.name} used ${MOVE_NAMES[move1]}!`);
  else effects.push(`${getMoveEmoji(move1)} ${p1.name} used ${MOVE_NAMES[move1]}!`);

  if (isFusion(move2)) effects.push(`🔥 ${p2.name} used ${MOVE_NAMES[move2]}!`);
  else effects.push(`${getMoveEmoji(move2)} ${p2.name} used ${MOVE_NAMES[move2]}!`);

  // Critical hit
  if (Math.random() < 0.15) {
    damage1 = Math.round(damage1 * 1.5);
    effects.push(`💥 ${p1.name} landed a CRITICAL HIT!`);
  }

  if (Math.random() < 0.15) {
    damage2 = Math.round(damage2 * 1.5);
    effects.push(`💥 ${p2.name} landed a CRITICAL HIT!`);
  }

  // Random guard
  if (Math.random() < 0.12) {
    damage1 = Math.round(damage1 * 0.5);
    effects.push(`🛡️ ${p2.name} blocked some damage!`);
  }

  if (Math.random() < 0.12) {
    damage2 = Math.round(damage2 * 0.5);
    effects.push(`🛡️ ${p1.name} blocked some damage!`);
  }

  // Apply damage simultaneously
  p2.hp = Math.max(0, p2.hp - damage1);
  p1.hp = Math.max(0, p1.hp - damage2);

  p1.damage += damage2;
  p2.damage += damage1;

  effects.push("");
  effects.push(`❤️ ${p1.name}: ${p1.hp} HP`);
  effects.push(`❤️ ${p2.name}: ${p2.hp} HP`);

  game.round++;
  p1.lastMove = move1;
  p2.lastMove = move2;
  p1.move = null;
  p2.move = null;

  const imagePath = drawBattleImage(
    game,
    `ROUND ${game.round} - ${MOVE_NAMES[move1]} VS ${MOVE_NAMES[move2]}`
  );

  await broadcast(
    api,
    game,
    `⚔️ ROUND ${game.round}\n\n${effects.join("\n")}\n\n` +
    `পরের Attack দিতে 1, 2, 3, 4 অথবা Fusion দিতে 12, 13, 14, 23, 24, 34 পাঠাও।`,
    imagePath
  );

  setTimeout(() => {
    try {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    } catch (e) {}
  }, 60000);

  saveDB();

  if (p1.hp <= 0 && p2.hp <= 0) {
    return finishGame(api, game, null, null, true);
  }

  if (p1.hp <= 0) {
    return finishGame(api, game, p2, p1, false);
  }

  if (p2.hp <= 0) {
    return finishGame(api, game, p1, p2, false);
  }
}

async function submitMove(api, game, player, move) {
  move = String(move);

  if (!validateMove(move)) return;

  if (player.move) {
    return send(
      api,
      player.threadID,
      "⏳ তোমার এই Round-এর Attack আগেই জমা হয়েছে। Opponent-এর জন্য অপেক্ষা করো।"
    );
  }

  if (isFusion(move)) {
    if (player.hp < FUSION_MIN_HP) {
      return send(
        api,
        player.threadID,
        `❌ Fusion ব্যবহার করতে কমপক্ষে ${FUSION_MIN_HP} HP লাগবে।\nতোমার HP: ${player.hp}`
      );
    }

    if (player.hp - FUSION_COST <= 0) {
      return send(api, player.threadID, "❌ Fusion ব্যবহারের জন্য পর্যাপ্ত HP নেই।");
    }

    player.hp -= FUSION_COST;
  }

  player.move = move;
  saveDB();

  const opponent = game.players.find(p => p.id !== player.id);

  if (!opponent.move) {
    return send(
      api,
      player.threadID,
      `✅ তোমার Attack জমা হয়েছে: ${MOVE_NAMES[move]}\n` +
      `⏳ Opponent-এর Attack-এর জন্য অপেক্ষা করো।`
    );
  }

  await resolveRound(api, game);
}

module.exports = {
  config: {
    name: "ft",
    version: "2.0.0",
    author: "Si Fat",
    countDown: 3,
    role: 0,
    shortDescription: "Cross-group fighting game",
    longDescription: "Cross-group battle with attacks, fusion and ranking",
    category: "game",
    guide: {
      en:
        "{pn} create\n" +
        "{pn} join CODE\n" +
        "{pn} status\n" +
        "{pn} stats\n" +
        "{pn} top\n" +
        "{pn} quit"
    }
  },

  onStart: async function ({ api, event, args }) {
    const threadID = String(event.threadID);
    const userID = String(event.senderID);
    const action = String(args[0] || "").toLowerCase();

    if (action === "create") {
      if (findPlayerGame(userID) || findWaitingGame(userID)) {
        return api.sendMessage(
          "❌ তুমি ইতিমধ্যে একটি Battle-এ আছো।",
          threadID
        );
      }

      if (getGameByThread(threadID)) {
        return api.sendMessage(
          "❌ এই গ্রুপে ইতিমধ্যে একটি Battle চলছে বা অপেক্ষায় আছে।",
          threadID
        );
      }

      const name = await getUserName(api, userID);
      const code = makeCode();

      db.games[code] = {
        code,
        status: "waiting",
        round: 0,
        createdAt: Date.now(),
        players: [
          createPlayer(userID, name, threadID)
        ]
      };

      getPlayerStats(userID).name = name;
      saveDB();

      // Only the join code is sent.
      return api.sendMessage(code, threadID);
    }

    if (action === "join") {
      const code = String(args[1] || "").toUpperCase().trim();
      const game = db.games[code];

      if (!code || !game || game.status !== "waiting") {
        return api.sendMessage("❌ এই Join Code সঠিক নয় অথবা Battle আর অপেক্ষায় নেই।", threadID);
      }

      if (game.players.length !== 1) {
        return api.sendMessage("❌ এই Battle-এ আর Join করা যাবে না।", threadID);
      }

      if (game.players[0].id === userID) {
        return api.sendMessage("❌ নিজের Battle-এ Join করা যাবে না।", threadID);
      }

      if (findPlayerGame(userID) || findWaitingGame(userID)) {
        return api.sendMessage("❌ তুমি ইতিমধ্যে অন্য একটি Battle-এ আছো।", threadID);
      }

      if (getGameByThread(threadID)) {
        return api.sendMessage("❌ এই গ্রুপে ইতিমধ্যে একটি Battle চলছে।", threadID);
      }

      const name = await getUserName(api, userID);

      game.players.push(createPlayer(userID, name, threadID));
      game.status = "active";
      game.round = 0;

      getPlayerStats(userID).name = name;
      saveDB();

      const intro =
        `⚔️ BATTLE STARTED!\n\n` +
        `👤 PLAYER 1\n${getPlayerLabel(game.players[0])}\n\n` +
        `👤 PLAYER 2\n${getPlayerLabel(game.players[1])}\n\n` +
        `❤️ দুজনের HP: ${MAX_HP}\n\n` +
        `🔥 Basic Attack: 1, 2, 3, 4\n` +
        `💥 Fusion: 12, 13, 14, 23, 24, 34\n` +
        `Fusion করতে কমপক্ষে ${FUSION_MIN_HP} HP লাগবে এবং প্রতি ব্যবহারে ${FUSION_COST} HP খরচ হবে।\n\n` +
        `প্রথম Round শুরু! Attack পাঠাও।`;

      const imagePath = drawBattleImage(game, "BATTLE START!");

      await broadcast(api, game, intro, imagePath);

      setTimeout(() => {
        try {
          if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        } catch (e) {}
      }, 60000);

      return;
    }

    if (action === "status") {
      const game = findPlayerGame(userID) || findWaitingGame(userID);

      if (!game) {
        return api.sendMessage("❌ তুমি কোনো Battle-এ নেই।", threadID);
      }

      const players = game.players.map((p, i) =>
        `${i + 1}. ${p.name} (ID: ${p.id})\nHP: ${p.hp}/${MAX_HP}`
      ).join("\n\n");

      return api.sendMessage(
        `⚔️ Battle: ${game.code}\nStatus: ${game.status}\nRound: ${game.round}\n\n${players}`,
        threadID
      );
    }

    if (action === "stats") {
      const stats = getPlayerStats(userID);
      return api.sendMessage(
        `📊 YOUR FIGHT STATS\n\n` +
        `Name: ${stats.name}\n` +
        `Facebook ID: ${userID}\n` +
        `🏆 Wins: ${stats.wins}\n` +
        `💀 Losses: ${stats.losses}\n` +
        `🤝 Draws: ${stats.draws}\n` +
        `⚔️ Battles: ${stats.battles}\n` +
        `💥 Damage: ${stats.damage}\n` +
        `🔥 Current Streak: ${stats.streak}\n` +
        `👑 Best Streak: ${stats.bestStreak}`,
        threadID
      );
    }

    if (action === "top") {
      const top = Object.entries(db.players)
        .sort((a, b) => b[1].wins - a[1].wins)
        .slice(0, 10);

      if (!top.length) {
        return api.sendMessage("এখনো কোনো Ranking তৈরি হয়নি।", threadID);
      }

      const text = top.map(([id, p], i) =>
        `${i + 1}. ${p.name}\nWins: ${p.wins} | Losses: ${p.losses}\nID: ${id}`
      ).join("\n\n");

      return api.sendMessage(`🏆 TOP 10 FIGHTERS\n\n${text}`, threadID);
    }

    if (action === "quit") {
      const game = findPlayerGame(userID) || findWaitingGame(userID);

      if (!game) {
        return api.sendMessage("❌ তুমি কোনো Battle-এ নেই।", threadID);
      }

      const quitter = getPlayer(game, userID);

      if (game.status === "waiting") {
        delete db.games[game.code];
        saveDB();
        return api.sendMessage("✅ তোমার Waiting Battle বাতিল করা হয়েছে।", threadID);
      }

      const winner = game.players.find(p => p.id !== userID);

      await finishGame(api, game, winner, quitter, false);
      return;
    }

    return api.sendMessage(
      "⚔️ FT FIGHTING GAME\n\n" +
      "ft create - নতুন Battle তৈরি\n" +
      "ft join CODE - Join করা\n" +
      "ft status - Battle Status\n" +
      "ft stats - নিজের Stats\n" +
      "ft top - Top Fighters\n" +
      "ft quit - Battle ছাড়তে\n\n" +
      "Attack: 1, 2, 3, 4\n" +
      "Fusion: 12, 13, 14, 23, 24, 34",
      threadID
    );
  },

  onChat: async function ({ api, event }) {
    try {
      if (!event || !event.senderID || !event.threadID) return;

      const userID = String(event.senderID);
      const threadID = String(event.threadID);
      const body = String(event.body || "").trim();

      // Only accept exact move numbers.
      if (!validateMove(body)) return;

      const game = findPlayerGame(userID);
      if (!game || game.status !== "active") return;

      const player = getPlayer(game, userID);
      if (!player || player.threadID !== threadID) return;

      await submitMove(api, game, player, body);
    } catch (err) {
      console.error("[FT] onChat error:", err);
    }
  }
};
