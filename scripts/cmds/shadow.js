
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

// ================= CONFIG =================

const DATA_FILE = path.join(__dirname, "shadow_war_data.json");
const CACHE_DIR = path.join(__dirname, "shadow_cache");

const MAX_HP = 300;
const HEAL_AMOUNT = 35;
const SECOND_WIND_HP = 50;

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// ================= DATABASE =================

function loadDatabase() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

      if (data && data.games) {
        return data;
      }
    }
  } catch (error) {
    console.error("Shadow database error:", error);
  }

  return { games: {} };
}

let database = loadDatabase();

function saveDatabase() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(database, null, 2)
    );
  } catch (error) {
    console.error("Shadow save error:", error);
  }
}

function makeCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function getGameByThread(threadID) {
  return Object.values(database.games).find(game =>
    game.status === "waiting" ||
    (
      game.status === "active" &&
      (
        game.player1.threadID === threadID ||
        game.player2?.threadID === threadID
      )
    )
  );
}

function getPlayer(game, userID) {
  if (game.player1.userID === userID) return game.player1;

  if (game.player2 && game.player2.userID === userID) {
    return game.player2;
  }

  return null;
}

function getOpponent(game, userID) {
  if (game.player1.userID === userID) return game.player2;
  if (game.player2?.userID === userID) return game.player1;
  return null;
}

// ================= MOVES =================

const MOVE_CODES = {
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

// ================= MESSENGER =================

function sendText(api, threadID, message) {
  return new Promise(resolve => {
    api.sendMessage(message, threadID, error => {
      if (error) {
        console.error("Shadow text send error:", error);
      }
      resolve(!error);
    });
  });
}

function sendImage(api, threadID, imagePath, message) {
  return new Promise(resolve => {
    try {
      api.sendMessage(
        {
          body: message,
          attachment: fs.createReadStream(imagePath)
        },
        threadID,
        error => {
          if (error) {
            console.error("Shadow image send error:", error);
          }
          resolve(!error);
        }
      );
    } catch (error) {
      console.error("Shadow image error:", error);
      resolve(false);
    }
  });
}

// ================= CANVAS =================

function drawBar(ctx, x, y, width, height, hp, maxHP) {
  ctx.fillStyle = "#25253b";
  ctx.fillRect(x, y, width, height);

  const percent = Math.max(0, Math.min(1, hp / maxHP));

  ctx.fillStyle = hp > 100 ? "#19d88b" : "#ff536d";
  ctx.fillRect(x, y, width * percent, height);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
}

function makeBattleImage(game, result) {
  const canvas = createCanvas(1000, 700);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 1000, 700);
  bg.addColorStop(0, "#080817");
  bg.addColorStop(0.5, "#28113c");
  bg.addColorStop(1, "#080817");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1000, 700);

  // Background particles
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.arc(
      (i * 137) % 1000,
      (i * 83) % 700,
      2 + (i % 3),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.textAlign = "center";

  // Title
  ctx.fillStyle = "#ffca58";
  ctx.font = "bold 52px Arial";
  ctx.fillText("SHADOW WAR", 500, 70);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Arial";
  ctx.fillText("ROUND " + result.round, 500, 120);

  // Players
  ctx.fillStyle = "#54caff";
  ctx.font = "bold 35px Arial";
  ctx.fillText("PLAYER 1", 250, 190);

  ctx.fillStyle = "#ff6685";
  ctx.fillText("PLAYER 2", 750, 190);

  // HP
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 25px Arial";

  ctx.fillText(
    "HP: " + game.player1.hp + "/" + MAX_HP,
    250,
    235
  );

  ctx.fillText(
    "HP: " + game.player2.hp + "/" + MAX_HP,
    750,
    235
  );

  drawBar(ctx, 90, 255, 320, 30, game.player1.hp, MAX_HP);
  drawBar(ctx, 590, 255, 320, 30, game.player2.hp, MAX_HP);

  // VS
  ctx.fillStyle = "#ffca58";
  ctx.font = "bold 75px Arial";
  ctx.fillText("VS", 500, 385);

  // Moves
  ctx.fillStyle = "#54caff";
  ctx.font = "bold 27px Arial";
  ctx.fillText(
    MOVE_EMOJI[result.move1] + " " + MOVE_NAMES[result.move1],
    250,
    345
  );

  ctx.fillStyle = "#ff6685";
  ctx.fillText(
    MOVE_EMOJI[result.move2] + " " + MOVE_NAMES[result.move2],
    750,
    345
  );

  // Damage
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 27px Arial";
  ctx.fillText("DAMAGE RECEIVED", 500, 455);

  ctx.fillStyle = "#54caff";
  ctx.fillText("-" + result.damage1 + " HP", 250, 500);

  ctx.fillStyle = "#ff6685";
  ctx.fillText("-" + result.damage2 + " HP", 750, 500);

  // Healing
  ctx.fillStyle = "#51f3a2";
  ctx.font = "bold 22px Arial";

  ctx.fillText(
    result.heal1 > 0 ? "+" + result.heal1 + " HEAL" : "",
    250,
    540
  );

  ctx.fillText(
    result.heal2 > 0 ? "+" + result.heal2 + " HEAL" : "",
    750,
    540
  );

  // Special messages
  ctx.fillStyle = "#ffca58";
  ctx.font = "bold 25px Arial";
  ctx.fillText(result.message, 500, 605);

  ctx.fillStyle = "#aaaaaa";
  ctx.font = "18px Arial";
  ctx.fillText("SECRET MOVES • CROSS GROUP BATTLE", 500, 665);

  const imagePath = path.join(
    CACHE_DIR,
    "shadow_" + game.code + "_" + result.round + "_" + Date.now() + ".png"
  );

  fs.writeFileSync(imagePath, canvas.toBuffer("image/png"));

  return imagePath;
}

// ================= DAMAGE SYSTEM =================

function calculateAttack(move, enemyMove) {
  const baseDamage = {
    kick: 17,
    punch: 13,
    fire: 23,
    thunder: 28
  };

  if (!baseDamage[move]) {
    return { damage: 0, critical: false };
  }

  let damage = baseDamage[move] + Math.floor(Math.random() * 9);

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

  const rawDamage1 = attack2.damage;
  const rawDamage2 = attack1.damage;

  // Actual damage received
  const damage1 = Math.min(game.player1.hp, rawDamage1);
  const damage2 = Math.min(game.player2.hp, rawDamage2);

  game.player1.hp = Math.max(0, game.player1.hp - rawDamage1);
  game.player2.hp = Math.max(0, game.player2.hp - rawDamage2);

  let comeback1 = false;
  let comeback2 = false;

  // Second Wind
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

  // Healing after damage
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

  if (attack1.critical || attack2.critical) {
    message = "💥 CRITICAL HIT!";
  }

  if (comeback1 && comeback2) {
    message = "🔥 BOTH PLAYERS USED SECOND WIND!";
  } else if (comeback1) {
    message = "🔥 PLAYER 1 SECOND WIND! COMEBACK!";
  } else if (comeback2) {
    message = "🔥 PLAYER 2 SECOND WIND! COMEBACK!";
  } else if (move1 === "heal" || move2 === "heal") {
    message = "❤️ HEALING POWER ACTIVATED!";
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

  // Winner check
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

// ================= BROADCAST RESULT =================

async function broadcastResult(api, game, result) {
  let imagePath = null;

  try {
    imagePath = makeBattleImage(game, result);

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
      "💥 Player 1 damage received: " + result.damage1 + " HP\n" +
      "💥 Player 2 damage received: " + result.damage2 + " HP\n\n" +
      "❤️ Player 1 HP: " + game.player1.hp + "/" + MAX_HP + "\n" +
      "❤️ Player 2 HP: " + game.player2.hp + "/" + MAX_HP + "\n\n" +
      (result.heal1 ? "💚 Player 1 healed: +" + result.heal1 + " HP\n" : "") +
      (result.heal2 ? "💚 Player 2 healed: +" + result.heal2 + " HP\n" : "") +
      "\n✨ " + result.message +
      ending;

    // Same result image in both groups
    const results = await Promise.all([
      sendImage(api, game.player1.threadID, imagePath, message),
      sendImage(api, game.player2.threadID, imagePath, message)
    ]);

    if (!results[0] || !results[1]) {
      console.error("Shadow: One or more result messages failed.");
    }

  } catch (error) {
    console.error("Shadow broadcast error:", error);

    const fallback =
      "⚔️ ROUND " + result.round + "\n\n" +
      "Player 1: " + MOVE_NAMES[result.move1] + "\n" +
      "Player 2: " + MOVE_NAMES[result.move2] + "\n" +
      "Player 1 damage: " + result.damage1 + " HP\n" +
      "Player 2 damage: " + result.damage2 + " HP\n" +
      "Player 1 HP: " + game.player1.hp + "/" + MAX_HP + "\n" +
      "Player 2 HP: " + game.player2.hp + "/" + MAX_HP + "\n\n" +
      result.message;

    await Promise.all([
      sendText(api, game.player1.threadID, fallback),
      sendText(api, game.player2.threadID, fallback)
    ]);
  } finally {
    saveDatabase();

    if (imagePath) {
      setTimeout(() => {
        try {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (error) {}
      }, 120000);
    }
  }
}

// ================= COMMAND =================

module.exports = {
  config: {
    name: "shadow",
    aliases: ["shadowwar", "sw"],
    version: "2.0.0",
    author: "Shadow War",
    countDown: 3,
    role: 0,
    shortDescription: "Secret Cross Group Fight",
    longDescription: "Play a secret attack battle across two Messenger groups.",
    category: "games",
    guide:
      "{pn} create - Create a battle\n" +
      "{pn} join CODE - Join from another group\n" +
      "{pn} s1-s6 - Secret attack\n" +
      "{pn} status - Check HP\n" +
      "{pn} quit - End battle"
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const userID = event.senderID;
    const action = (args[0] || "help").toLowerCase();

    // HELP
    if (action === "help") {
      return sendText(
        api,
        threadID,
        "⚔️ SHADOW WAR V2\n\n" +
        "1️⃣ shadow create - Create Battle\n" +
        "2️⃣ shadow join CODE - Join Battle\n\n" +
        "🎮 SECRET ATTACK LIST\n\n" +
        "s1 = 🦵 Kick\n" +
        "s2 = 👊 Punch\n" +
        "s3 = 🔥 Fire Attack\n" +
        "s4 = 🛡️ Defense\n" +
        "s5 = ❤️ Heal\n" +
        "s6 = ⚡ Thunder\n\n" +
        "Other commands:\n" +
        "shadow status\n" +
        "shadow quit\n\n" +
        "🔒 চাল গোপন থাকবে। দুজন চাল দেওয়ার পর Result প্রকাশ হবে।"
      );
    }

    // CREATE
    if (action === "create") {
      if (getGameByThread(threadID)) {
        return sendText(api, threadID, "❌ এই গ্রুপে আগে থেকেই একটি Battle আছে!");
      }

      let code = makeCode();

      while (database.games[code]) {
        code = makeCode();
      }

      database.games[code] = {
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

      saveDatabase();

      return sendText(
        api,
        threadID,
        "⚔️ SHADOW WAR CREATED!\n\n" +
        "🔐 Battle Code: " + code + "\n\n" +
        "এখন অন্য গ্রুপ থেকে প্রতিপক্ষকে Join করতে বলো:\n\n" +
        "shadow join " + code + "\n\n" +
        "⚠️ দুই গ্রুপেই Bot থাকতে হবে।"
      );
    }

    // JOIN
    if (action === "join") {
      const code = (args[1] || "").toUpperCase();
      const game = database.games[code];

      if (!game || game.status !== "waiting") {
        return sendText(api, threadID, "❌ Battle Code ভুল অথবা Battle শুরু হয়ে গেছে!");
      }

      if (game.player1.threadID === threadID) {
        return sendText(api, threadID, "❌ অন্য Messenger গ্রুপ থেকে Join করো!");
      }

      if (game.player1.userID === userID) {
        return sendText(api, threadID, "❌ নিজের Battle-এ Join করা যাবে না!");
      }

      if (getGameByThread(threadID)) {
        return sendText(api, threadID, "❌ এই গ্রুপে আগে থেকেই একটি Battle চলছে!");
      }

      game.player2 = {
        userID,
        threadID,
        hp: MAX_HP,
        move: null,
        secondWind: true
      };

      game.status = "active";
      saveDatabase();

      const startMessage =
        "🔥 SHADOW WAR STARTED!\n\n" +
        "🔵 Player 1: Ready!\n" +
        "🔴 Player 2: Ready!\n\n" +
        "❤️ Both HP: " + MAX_HP + "\n" +
        "🔥 Second Wind: Available\n\n" +
        "🎮 Attack List:\n" +
        "s1 = Kick\n" +
        "s2 = Punch\n" +
        "s3 = Fire\n" +
        "s4 = Defense\n" +
        "s5 = Heal\n" +
        "s6 = Thunder\n\n" +
        "🔒 Secret Move System Active!\n" +
        "দুজন চাল দেওয়ার পর Result প্রকাশ হবে।";

      await Promise.all([
        sendText(api, game.player1.threadID, startMessage),
        sendText(api, game.player2.threadID, startMessage)
      ]);

      return;
    }

    // FIND ACTIVE GAME
    const game = getGameByThread(threadID);

    if (!game || game.status !== "active") {
      return sendText(
        api,
        threadID,
        "❌ এই গ্রুপে কোনো Active Battle নেই!\n\nshadow create দিয়ে নতুন Battle শুরু করো।"
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
        "🔵 Player 1 HP: " + game.player1.hp + "/" + MAX_HP + "\n" +
        "🔴 Player 2 HP: " + game.player2.hp + "/" + MAX_HP + "\n\n" +
        "🎯 Round: " + game.round + "\n" +
        "🔒 Your move: " + (player.move ? "Submitted" : "Not submitted") + "\n" +
        "⚔️ Opponent move: " + (opponent.move ? "Submitted (Hidden)" : "Waiting") + "\n\n" +
        "🔥 Your Second Wind: " + (player.secondWind ? "Available" : "Used")
      );
    }

    // QUIT
    if (action === "quit") {
      game.status = "finished";
      saveDatabase();

      await Promise.all([
        sendText(api, game.player1.threadID, "🛑 SHADOW WAR বন্ধ করা হয়েছে!"),
        sendText(api, game.player2.threadID, "🛑 SHADOW WAR বন্ধ করা হয়েছে!")
      ]);

      return;
    }

    // NUMBERED ATTACK
    if (!MOVE_CODES[action]) {
      return sendText(
        api,
        threadID,
        "❌ ভুল Attack Number!\n\n" +
        "s1 = 🦵 Kick\n" +
        "s2 = 👊 Punch\n" +
        "s3 = 🔥 Fire\n" +
        "s4 = 🛡️ Defense\n" +
        "s5 = ❤️ Heal\n" +
        "s6 = ⚡ Thunder"
      );
    }

    if (player.move) {
      return sendText(
        api,
        threadID,
        "⏳ তোমার এই Round-এর চাল জমা হয়েছে!\nপ্রতিপক্ষের চালের জন্য অপেক্ষা করো।"
      );
    }

    // Store secret move
    player.move = MOVE_CODES[action];
    saveDatabase();

    // Opponent has not played yet
    if (!opponent.move) {
      await sendText(
        api,
        threadID,
        "🔒 SECRET MOVE SUBMITTED!\n\n" +
        "✅ তোমার চাল গোপনে জমা হয়েছে।\n" +
        "⚠️ তোমার প্রতিপক্ষের চালের অপেক্ষা করো..."
      );

      await sendText(
        api,
        opponent.threadID,
        "⚠️ তোমার প্রতিপক্ষ একটি Secret Move দিয়েছে!\n\n" +
        "এখন তোমার চাল দাও:\n" +
        "s1 / s2 / s3 / s4 / s5 / s6\n\n" +
        "🔒 প্রতিপক্ষের চাল এখনো গোপন আছে!"
      );

      return;
    }

    // BOTH MOVES SUBMITTED
    const result = resolveRound(game);
    saveDatabase();

    await broadcastResult(api, game, result);

    // Next round
    if (game.status !== "finished") {
      const nextMessage =
        "🔄 NEXT ROUND STARTED!\n\n" +
        "🎯 Round: " + game.round + "\n" +
        "❤️ Player 1 HP: " + game.player1.hp + "/" + MAX_HP + "\n" +
        "❤️ Player 2 HP: " + game.player2.hp + "/" + MAX_HP + "\n\n" +
        "🎮 এবার Secret Attack দাও:\n" +
        "s1 / s2 / s3 / s4 / s5 / s6\n\n" +
        "🔒 তোমার চাল গোপন থাকবে!";

      await Promise.all([
        sendText(api, game.player1.threadID, nextMessage),
        sendText(api, game.player2.threadID, nextMessage)
      ]);
    }
  }
};
