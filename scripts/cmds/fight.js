const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

// ============================================================
// FIGHT — PREMIUM CROSS-GROUP FIGHTING GAME
// Uses existing canvas package only.
// ============================================================

const DATA_FILE = path.join(__dirname, "fight_data.json");
const CACHE_DIR = path.join(__dirname, "fight_cache");

const MAX_HP = 300;
const HEAL_AMOUNT = 35;
const SECOND_WIND_HP = 50;
const FRAME_COUNT = 18;

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// ------------------------- DATABASE -------------------------

function loadDB() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      if (parsed && parsed.games) {
        if (!parsed.players) parsed.players = {};
        return parsed;
      }
    }
  } catch (error) {
    console.error("FIGHT database load error:", error);
  }
  return { games: {}, players: {} };
}

const db = loadDB();

function saveDB() {
  try {
    const temp = DATA_FILE + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(db, null, 2));
    fs.renameSync(temp, DATA_FILE);
  } catch (error) {
    console.error("FIGHT database save error:", error);
  }
}

function makeCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function getStats(userID) {
  if (!db.players[userID]) {
    db.players[userID] = {
      wins: 0,
      losses: 0,
      draws: 0,
      fights: 0,
      character: "ninja"
    };
  }
  if (!CHARACTERS[db.players[userID].character]) {
    db.players[userID].character = "ninja";
  }
  return db.players[userID];
}

function groupHasGame(threadID) {
  return Object.values(db.games).some(game =>
    (game.status === "waiting" || game.status === "active") &&
    (game.player1?.threadID === threadID ||
      game.player2?.threadID === threadID)
  );
}

function getActiveGame(threadID) {
  return Object.values(db.games).find(game =>
    game.status === "active" &&
    (game.player1?.threadID === threadID ||
      game.player2?.threadID === threadID)
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

function finishStats(game) {
  if (game.statsSaved) return;
  game.statsSaved = true;

  const p1 = getStats(game.player1.userID);
  const p2 = getStats(game.player2.userID);

  p1.fights++;
  p2.fights++;

  if (game.player1.hp <= 0 && game.player2.hp <= 0) {
    p1.draws++;
    p2.draws++;
  } else if (game.player1.hp <= 0) {
    p1.losses++;
    p2.wins++;
  } else {
    p1.wins++;
    p2.losses++;
  }
}

// ------------------------- MOVES ----------------------------

const MOVES = {
  s1: "kick",
  s2: "punch",
  s3: "fire",
  s4: "defend",
  s5: "heal",
  s6: "thunder",
  s7: "special",
  s8: "dodge"
};

const CHARACTERS = {
  ninja: {
    name: "Shadow Ninja",
    emoji: "🥷",
    special: "SHADOW STRIKE",
    min: 38,
    max: 58,
    attacks: {
      kick: "Phantom Kick",
      punch: "Silent Fist",
      fire: "Smoke Kunai",
      thunder: "Shadow Dash"
    },
    damage: {
      kick: [17, 30],
      punch: [13, 25],
      fire: [18, 34],
      thunder: [22, 39]
    }
  },

  samurai: {
    name: "Dark Samurai",
    emoji: "⚔️",
    special: "BLADE STORM",
    min: 42,
    max: 62,
    attacks: {
      kick: "Ronin Sweep",
      punch: "Iron Palm",
      fire: "Katana Arc",
      thunder: "Dragon Lunge"
    },
    damage: {
      kick: [16, 29],
      punch: [14, 26],
      fire: [21, 37],
      thunder: [24, 42]
    }
  },

  mage: {
    name: "Fire Mage",
    emoji: "🧙",
    special: "INFERNO BLAST",
    min: 40,
    max: 65,
    attacks: {
      kick: "Flame Heel",
      punch: "Ember Palm",
      fire: "Meteor Orb",
      thunder: "Inferno Wave"
    },
    damage: {
      kick: [14, 26],
      punch: [12, 24],
      fire: [24, 42],
      thunder: [20, 38]
    }
  },

  thunder: {
    name: "Thunder Warrior",
    emoji: "⚡",
    special: "STORM BREAKER",
    min: 44,
    max: 64,
    attacks: {
      kick: "Storm Breaker Kick",
      punch: "Volt Fist",
      fire: "Plasma Burst",
      thunder: "Lightning Crash"
    },
    damage: {
      kick: [19, 33],
      punch: [16, 28],
      fire: [20, 37],
      thunder: [25, 44]
    }
  }
};

const ATTACK_MOVES = ["kick", "punch", "fire", "thunder"];

const MOVE_NAMES = {
  kick: "KICK",
  punch: "PUNCH",
  fire: "FIRE ATTACK",
  defend: "DEFENSE",
  heal: "HEAL",
  thunder: "THUNDER",
  special: "SPECIAL ATTACK",
  dodge: "DODGE",
  fusion: "FUSION COMBO"
};

const MOVE_EMOJI = {
  kick: "🦵",
  punch: "👊",
  fire: "🔥",
  defend: "🛡️",
  heal: "❤️",
  thunder: "⚡",
  special: "💥",
  dodge: "💨",
  fusion: "🌪️"
};

function moveHelp() {
  return (
    "🥊 FIGHT — MOVE LIST\n\n" +
    "s1 = Character Unique Kick\n" +
    "s2 = Character Unique Punch\n" +
    "s3 = Character Unique Skill Attack\n" +
    "s4 = 🛡️ Defense\n" +
    "s5 = ❤️ Heal\n" +
    "s6 = Character Unique Heavy Attack\n" +
    "s7 = 💥 Character Special (৩ Charge)\n" +
    "s8 = 💨 Dodge\n" +
    "s1s2 = Fusion Combo (৩০ HP, নিজের HP ২০০+)\n\n" +
    "যেকোনো দুটি আলাদা Attack একসঙ্গে লিখলেই Fusion হবে।\n" +
    "যেমন: s1s2 / s1s3 / s2s6\n" +
    "দুই গ্রুপের Player-ই গোপনে Move দেবে।"
  );
}

// --------------------- MESSENGER HELPERS --------------------

function sendText(api, threadID, message) {
  return new Promise(resolve => {
    api.sendMessage(message, threadID, error => {
      if (error) console.error("FIGHT send error:", error);
      resolve(!error);
    });
  });
}

function sendImage(api, threadID, imagePath, message) {
  return new Promise(resolve => {
    const stream = fs.createReadStream(imagePath);

    stream.on("error", error => {
      console.error("FIGHT image stream error:", error);
      resolve(false);
    });

    api.sendMessage(
      { body: message, attachment: stream },
      threadID,
      error => {
        if (error) console.error("FIGHT image send error:", error);
        resolve(!error);
      }
    );
  });
}

// --------------------- DAMAGE / ROUND ----------------------

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function calculateAttack(move, enemyMove, player, combo) {
  const ch = CHARACTERS[player.character] || CHARACTERS.ninja;
  const ranges = ch.damage;

  let damage = 0;
  let critical = false;
  let specialName = null;

  if (move.startsWith("fusion:")) {
    const parts = move.slice(7).split("+");
    const total = parts.reduce((sum, part) => {
      return sum + randomInt(...ranges[part]);
    }, 0);

    damage = Math.floor(total * 1.15);

    specialName = parts
      .map(part => ch.attacks[part])
      .join(" + ");
  } else if (move === "special") {
    damage = randomInt(ch.min, ch.max);
    specialName = ch.special;
  } else if (ranges[move]) {
    damage = randomInt(...ranges[move]);
    specialName = ch.attacks[move];
  }

  if (damage > 0 && Math.random() < 0.12) {
    critical = true;
    damage = Math.floor(damage * 1.5);
  }

  if (
    combo &&
    damage > 0 &&
    move !== "special" &&
    !move.startsWith("fusion:")
  ) {
    damage = Math.floor(damage * 1.45);
  }

  if (enemyMove === "defend") {
    damage = Math.floor(damage * 0.35);
  }

  return { damage, critical, specialName };
}

function resolveRound(game) {
  const p1 = game.player1;
  const p2 = game.player2;

  const move1 = p1.move;
  const move2 = p2.move;

  const combo1 = ATTACK_MOVES.includes(move1) && p1.lastMove === move1;
  const combo2 = ATTACK_MOVES.includes(move2) && p2.lastMove === move2;

  const attack1 = calculateAttack(move1, move2, p1, combo1);
  const attack2 = calculateAttack(move2, move1, p2, combo2);

  const chance1 = attack2.critical
    ? 0.20
    : (p1.failedDodges >= 3 ? 0.55 : 0.40);

  const chance2 = attack1.critical
    ? 0.20
    : (p2.failedDodges >= 3 ? 0.55 : 0.40);

  const dodge1 = move1 === "dodge" && Math.random() < chance1;
  const dodge2 = move2 === "dodge" && Math.random() < chance2;

  if (move1 === "dodge") {
    p1.failedDodges = dodge1 ? 0 : (p1.failedDodges || 0) + 1;
  }

  if (move2 === "dodge") {
    p2.failedDodges = dodge2 ? 0 : (p2.failedDodges || 0) + 1;
  }

  const actualTo1 = dodge1 ? 0 : attack2.damage;
  const actualTo2 = dodge2 ? 0 : attack1.damage;

  const damage1 = Math.min(p1.hp, actualTo1);
  const damage2 = Math.min(p2.hp, actualTo2);

  p1.hp = Math.max(0, p1.hp - actualTo1);
  p2.hp = Math.max(0, p2.hp - actualTo2);

  let comeback1 = false;
  let comeback2 = false;

  if (p1.hp <= 0 && p1.secondWind) {
    p1.hp = SECOND_WIND_HP;
    p1.secondWind = false;
    comeback1 = true;
  }

  if (p2.hp <= 0 && p2.secondWind) {
    p2.hp = SECOND_WIND_HP;
    p2.secondWind = false;
    comeback2 = true;
  }

  let heal1 = 0;
  let heal2 = 0;

  if (move1 === "heal" && p1.hp > 0) {
    heal1 = Math.min(HEAL_AMOUNT, MAX_HP - p1.hp);
    p1.hp += heal1;
  }

  if (move2 === "heal" && p2.hp > 0) {
    heal2 = Math.min(HEAL_AMOUNT, MAX_HP - p2.hp);
    p2.hp += heal2;
  }

  p1.specialCharge = move1 === "special"
    ? 0
    : Math.min(3, (p1.specialCharge || 0) + 1);

  p2.specialCharge = move2 === "special"
    ? 0
    : Math.min(3, (p2.specialCharge || 0) + 1);

  p1.lastMove = ATTACK_MOVES.includes(move1) ? move1 : null;
  p2.lastMove = ATTACK_MOVES.includes(move2) ? move2 : null;

  let message = "⚔️ BATTLE CONTINUES!";

  if (dodge1 || dodge2) {
    message = "💨 DODGE SUCCESS!";
  } else if (comeback1 || comeback2) {
    message = "🔥 SECOND WIND ACTIVATED!";
  } else if (
    move1.startsWith("fusion:") ||
    move2.startsWith("fusion:")
  ) {
    message = "🌪️ FUSION COMBO RELEASED!";
  } else if (combo1 || combo2) {
    message = "⚡ COMBO ATTACK!";
  } else if (attack1.critical || attack2.critical) {
    message = "💥 CRITICAL HIT!";
  }

  const result = {
    round: game.round,
    move1,
    move2,
    moveName1: attack1.specialName || MOVE_NAMES[move1] || "FUSION COMBO",
    moveName2: attack2.specialName || MOVE_NAMES[move2] || "FUSION COMBO",
    damage1,
    damage2,
    heal1,
    heal2,
    critical1: attack1.critical,
    critical2: attack2.critical,
    combo1,
    combo2,
    special1: move1 === "special",
    special2: move2 === "special",
    dodge1,
    dodge2,
    message
  };

  p1.move = null;
  p2.move = null;
  game.round++;

  if (p1.hp <= 0 && p2.hp <= 0) {
    game.status = "finished";
    result.message = "🤝 BATTLE DRAW!";
  } else if (p1.hp <= 0) {
    game.status = "finished";
    result.message = "🏆 PLAYER 2 WINS!";
  } else if (p2.hp <= 0) {
    game.status = "finished";
    result.message = "🏆 PLAYER 1 WINS!";
  }

  if (game.status === "finished") finishStats(game);

  return result;
}

// -------------------- CANVAS FIGHTER ART -------------------

function drawFighter(
  ctx,
  x,
  floorY,
  facing,
  move,
  frame,
  color,
  recoil,
  isWinner
) {
  const phase = (frame / (FRAME_COUNT - 1)) * Math.PI * 2;
  const attack = Math.sin(phase);
  const impact = Math.max(0, Math.sin(phase * 1.5 - 0.8));
  const active = frame >= 4 && frame <= 12;
  const direction = facing;

  let bodyShift = 0;

  if (move === "dodge" && active) {
    bodyShift = -direction * 48 *
      Math.max(0, Math.sin(((frame - 4) / 8) * Math.PI));
  }

  if (move === "kick" && active) bodyShift = attack * 12;
  if (move === "punch" && active) bodyShift = attack * 8;
  if (recoil) bodyShift -= recoil * impact * 20;

  const cx = x + bodyShift;
  const bob = Math.sin(phase * 2) * 3;
  const hipY = floorY - 78 + bob;
  const shoulderY = hipY - 47;
  const headY = shoulderY - 22;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.beginPath();
  ctx.ellipse(cx, floorY + 3, 43, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  const aura = ctx.createRadialGradient(
    cx, hipY - 35, 5,
    cx, hipY - 35, 72
  );

  aura.addColorStop(0, color + "55");
  aura.addColorStop(1, color + "00");

  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, hipY - 35, 72, 0, Math.PI * 2);
  ctx.fill();

  let frontKneeX = cx + direction * 17;
  let frontKneeY = hipY + 28;
  let frontFootX = cx + direction * 28;
  let frontFootY = floorY - 3;

  if (move === "kick" && active) {
    const k = Math.max(
      0,
      Math.sin(((frame - 4) / 8) * Math.PI)
    );

    frontKneeX = cx + direction * (22 + 24 * k);
    frontKneeY = hipY + 10 - 8 * k;
    frontFootX = cx + direction * (34 + 70 * k);
    frontFootY = hipY + 4 - 22 * k;
  }

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 17;
  ctx.beginPath();
  ctx.moveTo(cx - 8, hipY + 5);
  ctx.lineTo(cx - direction * 17, hipY + 31);
  ctx.lineTo(cx - direction * 29, floorY - 3);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(cx - 8, hipY + 5);
  ctx.lineTo(cx - direction * 17, hipY + 31);
  ctx.lineTo(cx - direction * 29, floorY - 3);
  ctx.stroke();

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(cx + 8, hipY + 5);
  ctx.lineTo(frontKneeX, frontKneeY);
  ctx.lineTo(frontFootX, frontFootY);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(cx + 8, hipY + 5);
  ctx.lineTo(frontKneeX, frontKneeY);
  ctx.lineTo(frontFootX, frontFootY);
  ctx.stroke();

  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(cx - direction * 37 - 7, floorY - 8, 23, 9);
  ctx.fillRect(frontFootX - 8, frontFootY - 6, 25, 10);

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.moveTo(cx - 21, shoulderY);
  ctx.lineTo(cx + 21, shoulderY);
  ctx.lineTo(cx + 17, hipY + 12);
  ctx.lineTo(cx - 17, hipY + 12);
  ctx.closePath();
  ctx.fill();

  const torsoGrad = ctx.createLinearGradient(
    cx - 20, shoulderY,
    cx + 20, hipY
  );

  torsoGrad.addColorStop(0, color);
  torsoGrad.addColorStop(1, "#111827");

  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 17, shoulderY + 3);
  ctx.lineTo(cx + 17, shoulderY + 3);
  ctx.lineTo(cx + 12, hipY + 8);
  ctx.lineTo(cx - 12, hipY + 8);
  ctx.closePath();
  ctx.fill();

  let nearHandX = cx + direction * 38;
  let nearHandY = shoulderY + 13;
  let farHandX = cx - direction * 27;
  let farHandY = shoulderY + 26;

  if (move === "punch" && active) {
    const p = Math.max(
      0,
      Math.sin(((frame - 4) / 8) * Math.PI)
    );

    nearHandX = cx + direction * (42 + 68 * p);
    nearHandY = shoulderY + 10 - 5 * p;
  } else if (move === "defend") {
    nearHandX = cx + direction * 22;
    nearHandY = shoulderY - 7;
    farHandX = cx - direction * 2;
    farHandY = shoulderY + 2;
  } else if (move === "heal") {
    nearHandX = cx + direction * 22;
    nearHandY = shoulderY - 40 - Math.sin(phase * 2) * 5;
    farHandX = cx - direction * 22;
    farHandY = shoulderY - 34;
  } else if (move === "fire" && active) {
    nearHandX = cx + direction * (42 + impact * 18);
    nearHandY = shoulderY + 2;
  } else if (move === "thunder" && active) {
    nearHandX = cx + direction * 24;
    nearHandY = shoulderY - 40;
    farHandX = cx - direction * 24;
    farHandY = shoulderY - 38;
  }

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(cx + direction * 12, shoulderY + 4);
  ctx.lineTo(nearHandX, nearHandY);
  ctx.moveTo(cx - direction * 12, shoulderY + 4);
  ctx.lineTo(farHandX, farHandY);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(cx + direction * 12, shoulderY + 4);
  ctx.lineTo(nearHandX, nearHandY);
  ctx.moveTo(cx - direction * 12, shoulderY + 4);
  ctx.lineTo(farHandX, farHandY);
  ctx.stroke();

  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(nearHandX, nearHandY, 8, 0, Math.PI * 2);
  ctx.arc(farHandX, farHandY, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f2c6a0";
  ctx.beginPath();
  ctx.arc(cx, headY, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.fillRect(cx - 16, headY - 3, 32, 9);
  ctx.fillStyle = color;
  ctx.fillRect(cx - 16, headY - 9, 32, 6);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx + direction * 4, headY, 4, 3);

  if (move === "special" && active) {
    const radius = 20 + impact * 34;
    const fx = cx + direction * 42;
    const fy = shoulderY - 4;

    ctx.save();
    ctx.globalAlpha = 0.35 + impact * 0.5;
    ctx.strokeStyle = "#ffe08a";
    ctx.lineWidth = 6;
    ctx.shadowColor = "#ffb13b";
    ctx.shadowBlur = 28;

    ctx.beginPath();
    ctx.arc(fx, fy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,190,70,0.35)";
    ctx.beginPath();
    ctx.arc(fx, fy, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (move === "fire" && active) {
    const fx = nearHandX + direction * 20;
    const fy = nearHandY;

    ctx.shadowColor = "#ff6b20";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#ff6b20";
    ctx.beginPath();
    ctx.arc(fx, fy, 12 + impact * 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffe66d";
    ctx.beginPath();
    ctx.arc(fx + direction * 5, fy, 6 + impact * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  if (move === "thunder" && active) {
    ctx.strokeStyle = "#b9f7ff";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#47dfff";
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.moveTo(nearHandX, nearHandY);
    ctx.lineTo(nearHandX + direction * 10, nearHandY - 22);
    ctx.lineTo(nearHandX + direction * 3, nearHandY - 32);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  if (move === "defend") {
    ctx.strokeStyle = "rgba(91,220,255,0.8)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(
      cx + direction * 17,
      shoulderY + 8,
      37,
      -1.2,
      1.2
    );
    ctx.stroke();
  }

  if (move === "heal") {
    ctx.strokeStyle = "rgba(75,255,164,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      cx,
      hipY - 28,
      48 + Math.sin(phase * 2) * 5,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    ctx.fillStyle = "#a7ffce";
    ctx.font = "bold 20px Arial";
    ctx.fillText("+", cx, headY - 25);
  }

  if (isWinner) {
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("★", cx, headY - 28);
  }

  ctx.restore();
}

// ----------------------- BACKGROUND ------------------------

function drawBackground(ctx, frame) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#080b22");
  gradient.addColorStop(0.55, "#171b3c");
  gradient.addColorStop(1, "#080912");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Neon moon
  ctx.save();
  ctx.shadowColor = "#7c5cff";
  ctx.shadowBlur = 35;
  ctx.fillStyle = "#b8a6ff";
  ctx.beginPath();
  ctx.arc(w / 2, 95, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Stars
  for (let i = 0; i < 45; i++) {
    const x = (i * 97) % w;
    const y = (i * 53) % 220;
    const size = 1 + (i % 3);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillRect(x, y, size, size);
  }

  // Arena floor
  const floor = ctx.createLinearGradient(0, 330, 0, h);
  floor.addColorStop(0, "#25294b");
  floor.addColorStop(1, "#090b17");

  ctx.fillStyle = floor;
  ctx.fillRect(0, 330, w, h - 330);

  ctx.strokeStyle = "rgba(125,100,255,0.25)";
  ctx.lineWidth = 2;

  for (let i = 0; i < 12; i++) {
    const y = 350 + i * 18;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(w / 2, 330);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
}

// ----------------------- HP BAR -----------------------------

function drawHPBar(ctx, x, y, width, hp, color, label) {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x, y, width, 19);

  ctx.fillStyle = "#20243a";
  ctx.fillRect(x + 2, y + 2, width - 4, 15);

  const amount = Math.max(0, Math.min(1, hp / MAX_HP));

  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, (width - 4) * amount, 15);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, 19);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "left";
  ctx.fillText(label + "  " + hp + "/" + MAX_HP, x, y - 7);
}

// ----------------------- BATTLE FRAME -----------------------

function drawBattleFrame(ctx, game, result, frame) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  drawBackground(ctx, frame);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 27px Arial";
  ctx.fillText("FIGHT ARENA", w / 2, 40);

  ctx.font = "bold 15px Arial";
  ctx.fillStyle = "#b8c6ff";
  ctx.fillText("ROUND " + result.round, w / 2, 65);

  drawHPBar(ctx, 35, 105, 270, game.player1.hp, "#20d8ff", "PLAYER 1");
  drawHPBar(ctx, 395, 105, 270, game.player2.hp, "#ff3f70", "PLAYER 2");

  const p1Character = CHARACTERS[game.player1.character] || CHARACTERS.ninja;
  const p2Character = CHARACTERS[game.player2.character] || CHARACTERS.ninja;

  ctx.textAlign = "center";
  ctx.font = "bold 17px Arial";
  ctx.fillStyle = "#70e7ff";
  ctx.fillText(p1Character.emoji + " " + p1Character.name, 175, 160);

  ctx.fillStyle = "#ff9bb4";
  ctx.fillText(p2Character.emoji + " " + p2Character.name, 535, 160);

  const move1 = result.move1.startsWith("fusion:") ? "special" : result.move1;
  const move2 = result.move2.startsWith("fusion:") ? "special" : result.move2;

  const active = frame >= 4 && frame <= 12;
  const recoil1 = active && result.damage1 > 0 ? 1 : 0;
  const recoil2 = active && result.damage2 > 0 ? 1 : 0;

  drawFighter(
    ctx, 190, 390, 1,
    move1, frame, "#20d8ff",
    recoil1, game.player1.hp > game.player2.hp
  );

  drawFighter(
    ctx, 530, 390, -1,
    move2, frame, "#ff477e",
    recoil2, game.player2.hp > game.player1.hp
  );

  if (active && (move1 === "fire" || move1 === "special" || move1 === "fusion")) {
    ctx.save();
    ctx.shadowColor = "#ff7a25";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#ffb347";
    ctx.beginPath();
    ctx.arc(350, 270, 12 + Math.sin(frame) * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (active && (move2 === "fire" || move2 === "special" || move2 === "fusion")) {
    ctx.save();
    ctx.shadowColor = "#ff7a25";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#ffb347";
    ctx.beginPath();
    ctx.arc(370, 270, 12 + Math.cos(frame) * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    result.moveName1 + "  VS  " + result.moveName2,
    w / 2,
    465
  );

  ctx.font = "bold 20px Arial";
  ctx.fillStyle = "#ffd166";
  ctx.fillText(result.message, w / 2, 505);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#c5c9e8";
  ctx.fillText(
    "DAMAGE: P1 " + result.damage2 + "  |  P2 " + result.damage1,
    w / 2,
    535
  );
}

// ----------------------- IMAGE GENERATOR --------------------

async function createAnimatedBattle(game, result) {
  const width = 700;
  const height = 560;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const imagePath = path.join(
    CACHE_DIR,
    "fight_" + game.code + "_" + Date.now() + ".png"
  );

  // Canvas package only creates a PNG storyboard.
  // No extra GIF package is required.
  drawBattleFrame(ctx, game, result, 9);

  fs.writeFileSync(imagePath, canvas.toBuffer("image/png"));

  return imagePath;
}

// ----------------------- SEND RESULT -------------------------

async function broadcastResult(api, game, result) {
  const imagePath = await createAnimatedBattle(game, result);

  const p1Name = CHARACTERS[game.player1.character]?.name || "Fighter";
  const p2Name = CHARACTERS[game.player2.character]?.name || "Fighter";

  const message =
    "🥊 FIGHT BATTLE RESULT!\n\n" +
    "🔵 PLAYER 1: " + p1Name + "\n" +
    "🔴 PLAYER 2: " + p2Name + "\n\n" +
    "⚔️ P1 Attack: " + result.moveName1 + "\n" +
    "⚔️ P2 Attack: " + result.moveName2 + "\n\n" +
    "💥 P1 Damage: " + result.damage2 + "\n" +
    "💥 P2 Damage: " + result.damage1 + "\n" +
    "❤️ P1 HP: " + game.player1.hp + "/" + MAX_HP + "\n" +
    "❤️ P2 HP: " + game.player2.hp + "/" + MAX_HP + "\n\n" +
    (result.heal1 ? "💚 P1 Heal: +" + result.heal1 + "\n" : "") +
    (result.heal2 ? "💚 P2 Heal: +" + result.heal2 + "\n" : "") +
    (result.dodge1 ? "💨 Player 1 dodged successfully!\n" : "") +
    (result.dodge2 ? "💨 Player 2 dodged successfully!\n" : "") +
    (result.critical1 ? "💥 P1 Critical Hit!\n" : "") +
    (result.critical2 ? "💥 P2 Critical Hit!\n" : "") +
    "\n" + result.message;

  await Promise.all([
    sendImage(api, game.player1.threadID, imagePath, message),
    sendImage(api, game.player2.threadID, imagePath, message)
  ]);

  try {
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  } catch (e) {}

  if (game.status === "finished") {
    const finalText =
      "🏁 FIGHT FINISHED!\n\n" +
      (game.player1.hp <= 0 && game.player2.hp <= 0
        ? "🤝 Match Draw!"
        : game.player1.hp <= 0
          ? "🏆 Player 2 Winner!"
          : "🏆 Player 1 Winner!") +
      "\n\n📊 Player 1 HP: " + game.player1.hp +
      "\n📊 Player 2 HP: " + game.player2.hp;

    await Promise.all([
      sendText(api, game.player1.threadID, finalText),
      sendText(api, game.player2.threadID, finalText)
    ]);
  }
}

// ----------------------- MAIN HANDLER -----------------------

async function handleAction(api, event, input) {
  const threadID = event.threadID;
  const userID = event.senderID;
  const action = String(input || "").trim().toLowerCase();

  if (!threadID || !userID) return;

  // JOIN BY CODE ALONE
  if (/^[a-z0-9]{5}$/i.test(action) && db.games[action.toUpperCase()]) {
    input = "join " + action.toUpperCase();
  }

  const command = String(input || "").trim().toLowerCase();

  // CREATE NEW GAME
  if (command === "create" || command === "start") {
    if (groupHasGame(threadID)) {
      return sendText(api, threadID, "❌ এই Group-এ আগে থেকেই একটি FIGHT Battle চলছে!");
    }

    let code = makeCode();
    while (db.games[code]) code = makeCode();

    const character = getStats(userID).character;

    db.games[code] = {
      code,
      status: "waiting",
      round: 1,
      player1: {
        userID,
        threadID,
        hp: MAX_HP,
        move: null,
        secondWind: true,
        character,
        specialCharge: 0,
        failedDodges: 0,
        lastMove: null
      },
      player2: null,
      createdAt: Date.now(),
      statsSaved: false
    };

    saveDB();

    return sendText(
      api,
      threadID,
      "🥊 FIGHT BATTLE CREATED!\n\n" +
      "🔐 JOIN CODE: " + code + "\n\n" +
      "অন্য Messenger Group-এ এই ৫ অক্ষরের Code পাঠাও।\n" +
      "প্রতিপক্ষ Join করলেই Battle শুরু হবে।\n\n" +
      "তোমার Character: " +
      (CHARACTERS[character]?.name || "Shadow Ninja")
    );
  }

  // JOIN BY CODE
  if (command.startsWith("join ")) {
    const code = command.split(/\s+/)[1]?.toUpperCase();
    const game = db.games[code];

    if (!code || !game || game.status !== "waiting") {
      return sendText(api, threadID, "❌ ভুল Code অথবা এই Battle আর Join করা যাবে না!");
    }

    if (game.player1.threadID === threadID) {
      return sendText(api, threadID, "❌ অন্য Messenger Group থেকে Code দিতে হবে!");
    }

    if (game.player1.userID === userID) {
      return sendText(api, threadID, "❌ নিজের Battle-এ Join করা যাবে না!");
    }

    if (groupHasGame(threadID)) {
      return sendText(api, threadID, "❌ এই Group-এ আগে থেকেই একটি FIGHT Battle চলছে!");
    }

    game.player2 = {
      userID,
      threadID,
      hp: MAX_HP,
      move: null,
      secondWind: true,
      character: getStats(userID).character,
      specialCharge: 0,
      failedDodges: 0,
      lastMove: null
    };

    game.status = "active";
    saveDB();

    const startMessage =
      "🔥 FIGHT BATTLE STARTED!\n\n" +
      "🔵 PLAYER 1: READY\n" +
      "🔴 PLAYER 2: READY\n\n" +
      "❤️ BOTH HP: " + MAX_HP + "\n" +
      "🔥 SECOND WIND: AVAILABLE\n\n" +
      moveHelp() +
      "\n\n🔒 SECRET MOVE SYSTEM ACTIVE!\n" +
      "প্রতিপক্ষের Move দেখা যাবে না।";

    await Promise.all([
      sendText(api, game.player1.threadID, startMessage),
      sendText(api, game.player2.threadID, startMessage)
    ]);

    return;
  }

  // CHARACTER LIST
  if (command === "characters" || command === "character list") {
    return sendText(
      api,
      threadID,
      "🥊 FIGHT CHARACTERS\n\n" +
      "ninja — 🥷 Shadow Ninja / Shadow Strike\n" +
      "samurai — ⚔️ Dark Samurai / Blade Storm\n" +
      "mage — 🧙 Fire Mage / Inferno Blast\n" +
      "thunder — ⚡ Thunder Warrior / Storm Breaker\n\n" +
      "Select: fight character ninja"
    );
  }

  // SELECT CHARACTER
  if (command.startsWith("character ")) {
    const id = command.split(/\s+/)[1];

    if (!CHARACTERS[id]) {
      return sendText(api, threadID, "❌ Character পাওয়া যায়নি। fight characters লিখো।");
    }

    if (groupHasGame(threadID)) {
      return sendText(api, threadID, "❌ Battle চলাকালে Character বদলানো যাবে না।");
    }

    const stats = getStats(userID);
    stats.character = id;
    saveDB();

    return sendText(
      api,
      threadID,
      "✅ CHARACTER SELECTED!\n\n" +
      CHARACTERS[id].emoji + " " + CHARACTERS[id].name +
      "\n💥 Special: " + CHARACTERS[id].special +
      "\n\nতোমার Unique Attacks:\n" +
      "🦵 " + CHARACTERS[id].attacks.kick + "\n" +
      "👊 " + CHARACTERS[id].attacks.punch + "\n" +
      "🔥 " + CHARACTERS[id].attacks.fire + "\n" +
      "⚡ " + CHARACTERS[id].attacks.thunder
    );
  }

  // LEADERBOARD
  if (command === "top" || command === "leaderboard") {
    const top = Object.entries(db.players)
      .sort((a, b) => (b[1].wins || 0) - (a[1].wins || 0))
      .slice(0, 10);

    if (!top.length) {
      return sendText(api, threadID, "🏆 এখনো কোনো Player Record নেই।");
    }

    return sendText(
      api,
      threadID,
      "🏆 FIGHT TOP 10\n\n" +
      top.map((x, i) =>
        (i + 1) + ". " + x[0] + " — " + (x[1].wins || 0) + " Wins"
      ).join("\n")
    );
  }

  // PLAYER STATS
  if (command === "stats" || command === "record") {
    const stats = getStats(userID);
    saveDB();

    return sendText(
      api,
      threadID,
      "🏆 FIGHT PLAYER RECORD\n\n" +
      "⚔️ Total Fights: " + stats.fights + "\n" +
      "🥇 Wins: " + stats.wins + "\n" +
      "💔 Losses: " + stats.losses + "\n" +
      "🤝 Draws: " + stats.draws
    );
  }

  // HELP
  if (command === "help") {
    return sendText(
      api,
      threadID,
      "🥊 FIGHT HELP\n\n" +
      "fight create — নতুন Battle\n" +
      "অন্য Group-এ Code পাঠাও — Join\n" +
      "fight characters — Character List\n" +
      "fight character ninja — Character Select\n" +
      "fight status — HP ও Round\n" +
      "fight stats — নিজের Record\n" +
      "fight top — Leaderboard\n" +
      "fight quit — Battle বন্ধ\n\n" +
      moveHelp()
    );
  }

  const game = getActiveGame(threadID);

  if (!game) {
    return sendText(
      api,
      threadID,
      "❌ এই Group-এ Active FIGHT নেই!\n\nনতুন Battle: fight create"
    );
  }

  for (const fighter of [game.player1, game.player2]) {
    if (fighter) {
      if (!fighter.character || !CHARACTERS[fighter.character]) {
        fighter.character = "ninja";
      }
      if (typeof fighter.specialCharge !== "number") {
        fighter.specialCharge = 0;
      }
      if (typeof fighter.failedDodges !== "number") {
        fighter.failedDodges = 0;
      }
      if (typeof fighter.lastMove === "undefined") {
        fighter.lastMove = null;
      }
    }
  }

  const player = getPlayer(game, userID);

  if (!player || player.threadID !== threadID) {
    return sendText(api, threadID, "❌ তুমি এই Battle-এর Player নও!");
  }

  const opponent = getOpponent(game, userID);

  // STATUS
  if (command === "status") {
    return sendText(
      api,
      threadID,
      "🥊 FIGHT STATUS\n\n" +
      "🔵 PLAYER 1 HP: " + game.player1.hp + "/" + MAX_HP + "\n" +
      "🔴 PLAYER 2 HP: " + game.player2.hp + "/" + MAX_HP + "\n\n" +
      "🎯 ROUND: " + game.round + "\n" +
      "🔒 YOUR MOVE: " + (player.move ? "SUBMITTED" : "WAITING") + "\n" +
      "⚔️ OPPONENT MOVE: " +
      (opponent.move ? "SUBMITTED (HIDDEN)" : "WAITING") + "\n" +
      "🔥 SECOND WIND: " + (player.secondWind ? "AVAILABLE" : "USED") + "\n" +
      "🥷 CHARACTER: " + CHARACTERS[player.character].name + "\n" +
      "💥 SPECIAL CHARGE: " + (player.specialCharge || 0) + "/3"
    );
  }

  // QUIT
  if (command === "quit") {
    game.status = "finished";
    game.endedAt = Date.now();
    saveDB();

    await Promise.all([
      sendText(api, game.player1.threadID, "🛑 FIGHT Battle বন্ধ করা হয়েছে!"),
      sendText(api, game.player2.threadID, "🛑 FIGHT Battle বন্ধ করা হয়েছে!")
    ]);

    return;
  }

  // FUSION: ONLY s1s2 / s1s3 / s2s6 FORMAT
  const fusionMatch = command.match(/^(s[1236])(s[1236])$/);

  if (fusionMatch) {
    const codeToMove = {
      s1: "kick",
      s2: "punch",
      s3: "fire",
      s6: "thunder"
    };

    const first = fusionMatch[1];
    const second = fusionMatch[2];

    if (first === second) {
      return sendText(
        api,
        threadID,
        "❌ Fusion Combo-তে দুটি আলাদা Attack দিতে হবে। যেমন s1s2 বা s3s6।"
      );
    }

    if (player.hp < 200) {
      return sendText(
        api,
        threadID,
        "❌ Fusion Combo ব্যবহার করতে তোমার কমপক্ষে ২০০ HP লাগবে!"
      );
    }

    if (player.move) {
      return sendText(api, threadID, "⏳ তোমার Move আগেই জমা হয়েছে!");
    }

    player.hp -= 30;
    player.move = "fusion:" + codeToMove[first] + "+" + codeToMove[second];

    saveDB();

    if (!opponent.move) {
      await sendText(
        api,
        threadID,
        "🌪️ FUSION COMBO জমা হয়েছে!\n" +
        "💚 ৩০ HP খরচ হয়েছে।\n" +
        "⏳ প্রতিপক্ষের Move-এর অপেক্ষা করো..."
      );

      await sendText(
        api,
        opponent.threadID,
        "⚠️ প্রতিপক্ষ Secret Fusion Combo জমা দিয়েছে!\nএখন তোমার Move দাও।"
      );

      return;
    }

    const result = resolveRound(game);
    saveDB();
    await broadcastResult(api, game, result);

    if (game.status === "active") {
      const nextMessage =
        "🔄 NEXT ROUND!\n\n" +
        "❤️ P1: " + game.player1.hp + " HP\n" +
        "❤️ P2: " + game.player2.hp + " HP\n\n" +
        "এখন তোমার Attack দাও।\n" +
        "Fusion: s1s2 / s1s3 / s2s6";

      await Promise.all([
        sendText(api, game.player1.threadID, nextMessage),
        sendText(api, game.player2.threadID, nextMessage)
      ]);
    }

    return;
  }

  // NORMAL MOVES
  if (!Object.prototype.hasOwnProperty.call(MOVES, command)) {
    return sendText(api, threadID, moveHelp());
  }

  if (player.move) {
    return sendText(
      api,
      threadID,
      "⏳ তোমার Move আগেই জমা হয়েছে!\nপ্রতিপক্ষের Move-এর অপেক্ষা করো।"
    );
  }

  if (command === "s7" && (player.specialCharge || 0) < 3) {
    return sendText(
      api,
      threadID,
      "💥 Special Attack Ready নয়!\n" +
      "Charge: " + (player.specialCharge || 0) + "/3\n" +
      "আরও " + (3 - (player.specialCharge || 0)) +
      " Round খেললে Special Ready হবে।"
    );
  }

  player.move = MOVES[command];
  saveDB();

  if (!opponent.move) {
    await sendText(
      api,
      threadID,
      "🔒 SECRET MOVE SUBMITTED!\n\n" +
      "✅ তোমার Move গোপনে জমা হয়েছে।\n" +
      "⏳ প্রতিপক্ষের Move-এর অপেক্ষা করো..."
    );

    await sendText(
      api,
      opponent.threadID,
      "⚠️ তোমার প্রতিপক্ষ একটি Secret Move দিয়েছে!\n\n" +
      "এখন s1 / s2 / s3 / s4 / s5 / s6 / s7 / s8 লিখে চাল দাও।\n" +
      "🔒 প্রতিপক্ষের Move গোপন আছে!"
    );

    return;
  }

  const result = resolveRound(game);
  saveDB();
  await broadcastResult(api, game, result);

  if (game.status === "active") {
    const nextMessage =
      "🔄 NEXT ROUND STARTED!\n\n" +
      "🎯 ROUND: " + game.round + "\n" +
      "❤️ PLAYER 1 HP: " + game.player1.hp + "/" + MAX_HP + "\n" +
      "❤️ PLAYER 2 HP: " + game.player2.hp + "/" + MAX_HP + "\n\n" +
      "s1-s8 অথবা Fusion-এর জন্য s1s2 / s1s3 / s2s6 লিখো।\n" +
      "🔒 তোমার Move গোপন থাকবে!";

    await Promise.all([
      sendText(api, game.player1.threadID, nextMessage),
      sendText(api, game.player2.threadID, nextMessage)
    ]);
  } else {
    saveDB();
  }
}

// --------------------- GOATBOT MODULE -----------------------

module.exports = {
  config: {
    name: "fight",
    aliases: ["fight2", "f2"],
    version: "1.0.0",
    author: "FIGHT Premium",
    countDown: 2,
    role: 0,
    shortDescription: "Premium cross-group fighting game",
    longDescription: "Play a secret fighting battle between two Messenger groups.",
    category: "games",
    guide:
      "{pn} create\n" +
      "Send the 5-character code in another group to join.\n" +
      "s1 / s2 / s3 / s4 / s5 / s6 / s7 / s8\n" +
      "s1s2 / s1s3 / s2s6 = Fusion Combo\n" +
      "{pn} status\n" +
      "{pn} stats\n" +
      "{pn} characters\n" +
      "{pn} character ninja\n" +
      "{pn} top\n" +
      "{pn} quit"
  },

  onStart: async function ({ api, event, args }) {
    const action = (args || []).join(" ").trim();
    return handleAction(api, event, action || "help");
  },

  onChat: async function ({ api, event }) {
    if (!event || !event.body || !event.senderID || !event.threadID) {
      return;
    }

    const message = event.body.trim();
    if (!message) return;

    const lower = message.toLowerCase();

    if (
      Object.prototype.hasOwnProperty.call(MOVES, lower) ||
      /^s[1236]s[1236]$/.test(lower)
    ) {
      return handleAction(api, event, lower);
    }

    const code = message.toUpperCase();

    if (/^[A-Z0-9]{5}$/.test(code) && db.games[code]) {
      return handleAction(api, event, code);
    }
  }
};
