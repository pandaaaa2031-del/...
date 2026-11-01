
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

// ========================================
// SHADOW WAR V5
// ========================================

const DATA_FILE = path.join(__dirname, "shadow_war_data.json");
const CACHE_DIR = path.join(__dirname, "shadow_cache");

const MAX_HP = 300;
const HEAL_AMOUNT = 35;
const SECOND_WIND_HP = 50;

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// ========================================
// DATABASE
// ========================================

function loadDB() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      if (data && data.games) return data;
    }
  } catch (e) {
    console.error("Shadow DB error:", e);
  }

  return { games: {} };
}

let db = loadDB();

function saveDB() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("Shadow save error:", e);
  }
}

function makeCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function groupHasGame(threadID) {
  return Object.values(db.games).some(game =>
    (game.status === "waiting" || game.status === "active") &&
    (
      game.player1?.threadID === threadID ||
      game.player2?.threadID === threadID
    )
  );
}

function getActiveGame(threadID) {
  return Object.values(db.games).find(game =>
    game.status === "active" &&
    (
      game.player1?.threadID === threadID ||
      game.player2?.threadID === threadID
    )
  );
}

function getPlayer(game, userID) {
  if (game.player1.userID === userID) return game.player1;
  if (game.player2?.userID === userID) return game.player2;
  return null;
}

function getOpponent(game, userID) {
  if (game.player1.userID === userID) return game.player2;
  if (game.player2?.userID === userID) return game.player1;
  return null;
}

// ========================================
// MOVES
// ========================================

const MOVES = {
  s1: "kick",
  s2: "punch",
  s3: "fire",
  s4: "defend",
  s5: "heal",
  s6: "thunder"
};

const MOVE_NAMES = {
  kick: "KICK",
  punch: "PUNCH",
  fire: "FIRE ATTACK",
  defend: "DEFENSE",
  heal: "HEAL",
  thunder: "THUNDER"
};

const MOVE_EMOJI = {
  kick: "🦵",
  punch: "👊",
  fire: "🔥",
  defend: "🛡️",
  heal: "❤️",
  thunder: "⚡"
};

function moveHelp() {
  return (
    "🎮 SHADOW WAR ATTACK LIST\n\n" +
    "s1 = 🦵 Kick\n" +
    "s2 = 👊 Punch\n" +
    "s3 = 🔥 Fire Attack\n" +
    "s4 = 🛡️ Defense\n" +
    "s5 = ❤️ Heal\n" +
    "s6 = ⚡ Thunder\n\n" +
    "শুধু s1 থেকে s6 লিখলেই হবে!"
  );
}

// ========================================
// MESSENGER FUNCTIONS
// ========================================

function sendText(api, threadID, message) {
  return new Promise(resolve => {
    api.sendMessage(message, threadID, error => {
      if (error) console.error("Shadow send error:", error);
      resolve(!error);
    });
  });
}

function sendImage(api, threadID, imagePath, message) {
  return new Promise(resolve => {
    try {
      const stream = fs.createReadStream(imagePath);

      stream.on("error", error => {
        console.error("Shadow stream error:", error);
      });

      api.sendMessage(
        {
          body: message,
          attachment: stream
        },
        threadID,
        error => {
          if (error) console.error("Shadow image send error:", error);
          resolve(!error);
        }
      );
    } catch (error) {
      console.error("Shadow image error:", error);
      resolve(false);
    }
  });
}

// ========================================
// CANVAS IMAGE
// ========================================

function drawBar(ctx, x, y, width, height, hp) {
  ctx.fillStyle = "#292940";
  ctx.fillRect(x, y, width, height);

  const percent = Math.max(0, Math.min(1, hp / MAX_HP));

  ctx.fillStyle = hp > 100 ? "#20d88b" : "#ff526c";
  ctx.fillRect(x, y, width * percent, height);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
}

function createBattleImage(game, result) {
  const canvas = createCanvas(1000, 700);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 1000, 700);
  bg.addColorStop(0, "#080817");
  bg.addColorStop(0.5, "#29123e");
  bg.addColorStop(1, "#080817");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1000, 700);

  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.arc((i * 137) % 1000, (i * 83) % 700, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "center";

  ctx.fillStyle = "#ffca58";
  ctx.font = "bold 52px Arial";
  ctx.fillText("SHADOW WAR", 500, 70);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Arial";
  ctx.fillText("ROUND " + result.round, 500, 120);

  ctx.fillStyle = "#54caff";
  ctx.font = "bold 34px Arial";
  ctx.fillText("PLAYER 1", 250, 190);

  ctx.fillStyle = "#ff6685";
  ctx.fillText("PLAYER 2", 750, 190);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px Arial";

  ctx.fillText(
    "HP: " + game.player1.hp + "/" + MAX_HP,
    250, 235
  );

  ctx.fillText(
    "HP: " + game.player2.hp + "/" + MAX_HP,
    750, 235
  );

  drawBar(ctx, 90, 255, 320, 30, game.player1.hp);
  drawBar(ctx, 590, 255, 320, 30, game.player2.hp);

  ctx.fillStyle = "#ffca58";
  ctx.font = "bold 75px Arial";
  ctx.fillText("VS", 500, 390);

  ctx.fillStyle = "#54caff";
  ctx.font = "bold 26px Arial";
  ctx.fillText(
    MOVE_EMOJI[result.move1] + " " + MOVE_NAMES[result.move1],
    250, 345
  );

  ctx.fillStyle = "#ff6685";
  ctx.fillText(
    MOVE_EMOJI[result.move2] + " " + MOVE_NAMES[result.move2],
    750, 345
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 27px Arial";
  ctx.fillText("DAMAGE RECEIVED", 500, 460);

  ctx.fillStyle = "#54caff";
  ctx.fillText("-" + result.damage1 + " HP", 250, 510);

  ctx.fillStyle = "#ff6685";
  ctx.fillText("-" + result.damage2 + " HP", 750, 510);

  ctx.fillStyle = "#51f3a2";
  ctx.font = "bold 22px Arial";

  if (result.heal1) {
    ctx.fillText("+" + result.heal1 + " HEAL", 250, 550);
  }

  if (result.heal2) {
    ctx.fillText("+" + result.heal2 + " HEAL", 750, 550);
  }

  ctx.fillStyle = "#ffca58";
  ctx.font = "bold 24px Arial";
  ctx.fillText(result.message, 500, 610);

  ctx.fillStyle = "#aaaaaa";
  ctx.font = "18px Arial";
  ctx.fillText("SECRET MOVES • CROSS GROUP BATTLE", 500, 670);

  const file = path.join(
    CACHE_DIR,
    "battle_" + game.code + "_" + result.round + "_" + Date.now() + ".png"
  );

  fs.writeFileSync(file, canvas.toBuffer("image/png"));
  return file;
}

// ========================================
// DAMAGE SYSTEM
// ========================================

function calculateAttack(move, enemyMove) {
  const damageList = {
    kick: 17,
    punch: 13,
    fire: 23,
    thunder: 28
  };

  if (!damageList[move]) {
    return { damage: 0, critical: false };
  }

  let damage = damageList[move] + Math.floor(Math.random() * 9);
  const critical = Math.random() < 0.10;

  if (critical) {
    damage = Math.floor(damage * 1.5);
  }

  if (enemyMove === "defend") {
    damage = Math.floor(damage * 0.35);
  }

  return { damage, critical };
}

function resolveRound(game) {
  const move1 = game.player1.move;
  const move2 = game.player2.move;

  const attack1 = calculateAttack(move1, move2);
  const attack2 = calculateAttack(move2, move1);

  const damage1 = Math.min(game.player1.hp, attack2.damage);
  const damage2 = Math.min(game.player2.hp, attack1.damage);

  game.player1.hp = Math.max(0, game.player1.hp - attack2.damage);
  game.player2.hp = Math.max(0, game.player2.hp - attack1.damage);

  let comeback1 = false;
  let comeback2 = false;

  if (game.player1.hp <= 0 && game.player1.secondWind) {
    game.player1.hp = SECOND_WIND_HP;
    game.player1.secondWind = false;
    comeback1 = true;
  }

  if (game.player2.hp <= 0 && game.player2.secondWind) {
    game.player2.hp = SECOND_WIND_HP;
    game.player2.secondWind = false;
    comeback2 = true;
  }

  let heal1 = 0;
  let heal2 = 0;

  if (move1 === "heal" && game.player1.hp > 0) {
    heal1 = Math.min(HEAL_AMOUNT, MAX_HP - game.player1.hp);
    game.player1.hp += heal1;
  }

  if (move2 === "heal" && game.player2.hp > 0) {
    heal2 = Math.min(HEAL_AMOUNT, MAX_HP - game.player2.hp);
    game.player2.hp += heal2;
  }

  let message = "⚔️ BATTLE CONTINUES!";

  if (comeback1 && comeback2) {
    message = "🔥 BOTH PLAYERS SECOND WIND!";
  } else if (comeback1) {
    message = "🔥 PLAYER 1 COMEBACK!";
  } else if (comeback2) {
    message = "🔥 PLAYER 2 COMEBACK!";
  } else if (attack1.critical || attack2.critical) {
    message = "💥 CRITICAL HIT!";
  } else if (move1 === "heal" || move2 === "heal") {
    message = "❤️ HEALING ACTIVATED!";
  } else if (move1 === "defend" || move2 === "defend") {
    message = "🛡️ DEFENSE ACTIVATED!";
  }

  const result = {
    round: game.round,
    move1,
    move2,
    damage1,
    damage2,
    heal1,
    heal2,
    message
  };

  game.player1.move = null;
  game.player2.move = null;
  game.round++;

  if (game.player1.hp <= 0 && game.player2.hp <= 0) {
    game.status = "finished";
    result.message = "🤝 BATTLE DRAW!";
  } else if (game.player1.hp <= 0) {
    game.status = "finished";
    result.message = "🏆 PLAYER 2 WINS!";
  } else if (game.player2.hp <= 0) {
    game.status = "finished";
    result.message = "🏆 PLAYER 1 WINS!";
  }

  return result;
}

// ========================================
// SEND RESULT TO BOTH GROUPS
// ========================================

async function broadcastResult(api, game, result) {
  let imagePath;

  let ending = "";

  if (game.status === "finished") {
    if (game.player1.hp <= 0 && game.player2.hp <= 0) {
      ending = "\n\n🤝 BATTLE DRAW!";
    } else if (game.player1.hp <= 0) {
      ending = "\n\n🏆 PLAYER 2 WINS!";
    } else {
      ending = "\n\n🏆 PLAYER 1 WINS!";
    }
  }

  const message =
    "⚔️ SHADOW WAR - ROUND " + result.round + "\n\n" +
    "🔵 Player 1: " + MOVE_NAMES[result.move1] + "\n" +
    "🔴 Player 2: " + MOVE_NAMES[result.move2] + "\n\n" +
    "💥 Player 1 Damage: " + result.damage1 + " HP\n" +
    "💥 Player 2 Damage: " + result.damage2 + " HP\n\n" +
    "❤️ Player 1 HP: " + game.player1.hp + "/" + MAX_HP + "\n" +
    "❤️ Player 2 HP: " + game.player2.hp + "/" + MAX_HP + "\n\n" +
    (result.heal1 ? "💚 Player 1 healed: +" + result.heal1 + " HP\n" : "") +
    (result.heal2 ? "💚 Player 2 healed: +" + result.heal2 + " HP\n" : "") +
    "\n✨ " + result.message + ending;

  try {
    imagePath = createBattleImage(game, result);

    await Promise.all([
      sendImage(api, game.player1.threadID, imagePath, message),
      sendImage(api, game.player2.threadID, imagePath, message)
    ]);
  } catch (error) {
    console.error("Shadow broadcast error:", error);

    await Promise.all([
      sendText(api, game.player1.threadID, message),
      sendText(api, game.player2.threadID, message)
    ]);
  } finally {
    saveDB();

    if (imagePath) {
      setTimeout(() => {
        try {
          if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        } catch (e) {}
      }, 120000);
    }
  }
}

// ========================================
// MAIN HANDLER
// ========================================

async function handleAction(api, event, input) {
  const threadID = event.threadID;
  const userID = event.senderID;

  let action = String(input || "").trim();

  // If the user sends only the battle code,
  // convert it into a join action.
  const directCode = action.toUpperCase();

  if (/^[A-Z0-9]{5}$/.test(directCode) && db.games[directCode]) {
    action = "join " + directCode;
  } else {
    action = action.toLowerCase();
  }

  // ====================================
  // CREATE
  // ====================================

  if (action === "create") {
    if (groupHasGame(threadID)) {
      return sendText(api, threadID, "❌ এই গ্রুপে আগে থেকেই Battle আছে!");
    }

    let code = makeCode();

    while (db.games[code]) {
      code = makeCode();
    }

    db.games[code] = {
      code,
      status: "waiting",
      round: 1,

      player1: {
        userID,
        threadID,
        hp: MAX_HP,
        move: null,
        secondWind: true
      },

      player2: null,
      createdAt: Date.now()
    };

    saveDB();

    // Only the code is sent. No extra text.
    return sendText(api, threadID, code);
  }

  // ====================================
  // JOIN
  // ====================================

  if (action.startsWith("join ")) {
    const code = action.split(/\s+/)[1]?.toUpperCase();
    const game = db.games[code];

    if (!code || !game || game.status !== "waiting") {
      return sendText(api, threadID, "❌ ভুল Code অথবা Battle আর Join করা যাবে না!");
    }

    if (game.player1.threadID === threadID) {
      return sendText(api, threadID, "❌ অন্য গ্রুপ থেকে এই Code দিতে হবে!");
    }

    if (game.player1.userID === userID) {
      return sendText(api, threadID, "❌ নিজের Battle-এ Join করা যাবে না!");
    }

    if (groupHasGame(threadID)) {
      return sendText(api, threadID, "❌ এই গ্রুপে আগে থেকেই একটি Battle আছে!");
    }

    game.player2 = {
      userID,
      threadID,
      hp: MAX_HP,
      move: null,
      secondWind: true
    };

    game.status = "active";
    saveDB();

    const startMessage =
      "🎉 JOINING SUCCESSFUL!\n\n" +
      "⚔️ SHADOW WAR STARTED!\n\n" +
      "🔵 PLAYER 1: READY\n" +
      "🔴 PLAYER 2: READY\n\n" +
      "❤️ BOTH HP: " + MAX_HP + "\n" +
      "🔥 SECOND WIND: AVAILABLE\n\n" +
      moveHelp() + "\n\n" +
      "🔒 SECRET MOVE SYSTEM ACTIVE!";

    await Promise.all([
      sendText(api, game.player1.threadID, startMessage),
      sendText(api, game.player2.threadID, startMessage)
    ]);

    return;
  }

  // ====================================
  // ACTIVE GAME
  // ====================================

  const game = getActiveGame(threadID);

  if (!game) {
    return sendText(
      api,
      threadID,
      "❌ এই গ্রুপে Active Battle নেই!\n\nনতুন Battle: shadow create"
    );
  }

  const player = getPlayer(game, userID);

  if (!player || player.threadID !== threadID) {
    return sendText(api, threadID, "❌ তুমি এই Battle-এর Player নও!");
  }

  const opponent = getOpponent(game, userID);

  // STATUS
  if (action === "status") {
    return sendText(
      api,
      threadID,
      "⚔️ SHADOW WAR STATUS\n\n" +
      "🔵 PLAYER 1 HP: " + game.player1.hp + "/" + MAX_HP + "\n" +
      "🔴 PLAYER 2 HP: " + game.player2.hp + "/" + MAX_HP + "\n\n" +
      "🎯 ROUND: " + game.round + "\n" +
      "🔒 YOUR MOVE: " + (player.move ? "SUBMITTED" : "WAITING") + "\n" +
      "⚔️ OPPONENT MOVE: " + (opponent.move ? "SUBMITTED (HIDDEN)" : "WAITING") + "\n" +
      "🔥 SECOND WIND: " + (player.secondWind ? "AVAILABLE" : "USED")
    );
  }

  // QUIT
  if (action === "quit") {
    game.status = "finished";
    saveDB();

    await Promise.all([
      sendText(api, game.player1.threadID, "🛑 SHADOW WAR বন্ধ করা হয়েছে!"),
      sendText(api, game.player2.threadID, "🛑 SHADOW WAR বন্ধ করা হয়েছে!")
    ]);

    return;
  }

  // ====================================
  // SECRET MOVE
  // ====================================

  if (!Object.prototype.hasOwnProperty.call(MOVES, action)) {
    return sendText(api, threadID, moveHelp());
  }

  if (player.move) {
    return sendText(
      api,
      threadID,
      "⏳ তোমার চাল আগেই জমা হয়েছে!\nপ্রতিপক্ষের চালের অপেক্ষা করো।"
    );
  }

  player.move = MOVES[action];
  saveDB();

  // Opponent has not submitted
  if (!opponent.move) {
    await sendText(
      api,
      threadID,
      "🔒 SECRET MOVE SUBMITTED!\n\n" +
      "✅ তোমার চাল গোপনে জমা হয়েছে।\n" +
      "⏳ প্রতিপক্ষের চালের অপেক্ষা করো..."
    );

    await sendText(
      api,
      opponent.threadID,
      "⚠️ তোমার প্রতিপক্ষ একটি Secret Move দিয়েছে!\n\n" +
      "এখন শুধু s1 / s2 / s3 / s4 / s5 / s6 লিখে চাল দাও।\n" +
      "🔒 প্রতিপক্ষের চাল গোপন আছে!"
    );

    return;
  }

  // Both players submitted
  const result = resolveRound(game);
  saveDB();

  await broadcastResult(api, game, result);

  // Next round
  if (game.status === "active") {
    const nextMessage =
      "🔄 NEXT ROUND STARTED!\n\n" +
      "🎯 ROUND: " + game.round + "\n" +
      "❤️ PLAYER 1 HP: " + game.player1.hp + "/" + MAX_HP + "\n" +
      "❤️ PLAYER 2 HP: " + game.player2.hp + "/" + MAX_HP + "\n\n" +
      "শুধু s1 / s2 / s3 / s4 / s5 / s6 লিখো।\n" +
      "🔒 তোমার চাল গোপন থাকবে!";

    await Promise.all([
      sendText(api, game.player1.threadID, nextMessage),
      sendText(api, game.player2.threadID, nextMessage)
    ]);
  }
}

// ========================================
// GOATBOT COMMAND MODULE
// ========================================

module.exports = {
  config: {
    name: "shadow",
    aliases: ["shadowwar", "sw"],
    version: "5.0.0",
    author: "Shadow War",
    countDown: 2,
    role: 0,
    shortDescription: "Cross Group Secret Fight",
    longDescription: "Play a secret battle between two Messenger groups.",
    category: "games",
    guide:
      "{pn} create\n" +
      "Send the 5-character code in another group to join.\n" +
      "s1 / s2 / s3 / s4 / s5 / s6\n" +
      "{pn} status\n" +
      "{pn} quit"
  },

  // PREFIX COMMANDS
  onStart: async function ({ api, event, args }) {
    const action = (args || []).join(" ").trim();

    return handleAction(api, event, action || "help");
  },

  // BARE TEXT: CODE OR s1-s6
  onChat: async function ({ api, event }) {
    if (!event || !event.body || !event.senderID || !event.threadID) {
      return;
    }

    const message = event.body.trim();

    if (!message) return;

    const lower = message.toLowerCase();

    // Secret attacks
    if (Object.prototype.hasOwnProperty.call(MOVES, lower)) {
      return handleAction(api, event, lower);
    }

    // Join by sending only the exact code
    const code = message.toUpperCase();

    if (/^[A-Z0-9]{5}$/.test(code) && db.games[code]) {
      return handleAction(api, event, code);
    }
  }
};
