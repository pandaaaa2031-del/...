const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");


// ============================================================
// FIGHT2 — PREMIUM CROSS-GROUP FIGHTING GAME
// Uses the existing canvas package only. No extra package required.
// ============================================================

const DATA_FILE = path.join(__dirname, "fight2_data.json");
const CACHE_DIR = path.join(__dirname, "fight2_cache");

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
    console.error("FIGHT2 database load error:", error);
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
    console.error("FIGHT2 database save error:", error);
  }
}

function makeCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function getStats(userID) {
  if (!db.players[userID]) {
    db.players[userID] = { wins: 0, losses: 0, draws: 0, fights: 0, character: "ninja" };
  }
  if (!CHARACTERS[db.players[userID].character]) db.players[userID].character = "ninja";
  return db.players[userID];
}

function groupHasGame(threadID) {
  return Object.values(db.games).some(game =>
    (game.status === "waiting" || game.status === "active") &&
    (game.player1?.threadID === threadID || game.player2?.threadID === threadID)
  );
}

function getActiveGame(threadID) {
  return Object.values(db.games).find(game =>
    game.status === "active" &&
    (game.player1?.threadID === threadID || game.player2?.threadID === threadID)
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
  s1: "kick", s2: "punch", s3: "fire", s4: "defend",
  s5: "heal", s6: "thunder", s7: "special"
};

const CHARACTERS = {
  ninja: { name: "Shadow Ninja", emoji: "🥷", special: "SHADOW STRIKE", min: 38, max: 58 },
  samurai: { name: "Dark Samurai", emoji: "⚔️", special: "BLADE STORM", min: 42, max: 62 },
  mage: { name: "Fire Mage", emoji: "🧙", special: "INFERNO BLAST", min: 40, max: 65 },
  thunder: { name: "Thunder Warrior", emoji: "⚡", special: "STORM BREAKER", min: 44, max: 64 }
};
const ATTACK_MOVES = ["kick", "punch", "fire", "thunder"];

const MOVE_NAMES = {
  kick: "KICK",
  punch: "PUNCH",
  fire: "FIRE ATTACK",
  defend: "DEFENSE",
  heal: "HEAL",
  thunder: "THUNDER",
  special: "SPECIAL ATTACK"
};

const MOVE_EMOJI = {
  kick: "🦵",
  punch: "👊",
  fire: "🔥",
  defend: "🛡️",
  heal: "❤️",
  thunder: "⚡",
  special: "💥"
};

function moveHelp() {
  return (
    "🥷 FIGHT2 — MOVE LIST\n\n" +
    "s1 = 🦵 Kick\n" +
    "s2 = 👊 Punch\n" +
    "s3 = 🔥 Fire Attack\n" +
    "s4 = 🛡️ Defense\n" +
    "s5 = ❤️ Heal\n" +
    "s6 = ⚡ Thunder\n" +
    "s7 = 💥 Character Special (৩ Charge)\n\n" +
    "একই Attack পরপর দুই Round দিলে Combo হবে!\n" +
    "দুই গ্রুপের Player-ই গোপনে Move দেবে।\n" +
    "শুধু s1 থেকে s7 লিখলেই হবে!"
  );
}

// --------------------- MESSENGER HELPERS --------------------

function sendText(api, threadID, message) {
  return new Promise(resolve => {
    api.sendMessage(message, threadID, error => {
      if (error) console.error("FIGHT2 send error:", error);
      resolve(!error);
    });
  });
}

function sendImage(api, threadID, imagePath, message) {
  return new Promise(resolve => {
    const stream = fs.createReadStream(imagePath);
    stream.on("error", error => {
      console.error("FIGHT2 image stream error:", error);
      resolve(false);
    });

    api.sendMessage({ body: message, attachment: stream }, threadID, error => {
      if (error) console.error("FIGHT2 image send error:", error);
      resolve(!error);
    });
  });
}

// --------------------- DAMAGE / ROUND ----------------------

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function calculateAttack(move, enemyMove, player, combo) {
  const ranges = {
    kick: [15, 28], punch: [11, 23], fire: [19, 35], thunder: [23, 40]
  };
  let damage = 0;
  let critical = false;
  let specialName = null;

  if (move === "special") {
    const ch = CHARACTERS[player.character] || CHARACTERS.ninja;
    damage = randomInt(ch.min, ch.max);
    specialName = ch.special;
  } else if (ranges[move]) {
    damage = randomInt(ranges[move][0], ranges[move][1]);
  }

  if (damage > 0 && Math.random() < 0.12) {
    critical = true;
    damage = Math.floor(damage * 1.5);
  }
  if (combo && damage > 0 && move !== "special") damage = Math.floor(damage * 1.45);
  if (enemyMove === "defend") damage = Math.floor(damage * 0.35);

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

  const damage1 = Math.min(p1.hp, attack2.damage);
  const damage2 = Math.min(p2.hp, attack1.damage);
  p1.hp = Math.max(0, p1.hp - attack2.damage);
  p2.hp = Math.max(0, p2.hp - attack1.damage);

  let comeback1 = false;
  let comeback2 = false;
  if (p1.hp <= 0 && p1.secondWind) {
    p1.hp = SECOND_WIND_HP; p1.secondWind = false; comeback1 = true;
  }
  if (p2.hp <= 0 && p2.secondWind) {
    p2.hp = SECOND_WIND_HP; p2.secondWind = false; comeback2 = true;
  }

  let heal1 = 0, heal2 = 0;
  if (move1 === "heal" && p1.hp > 0) {
    heal1 = Math.min(HEAL_AMOUNT, MAX_HP - p1.hp); p1.hp += heal1;
  }
  if (move2 === "heal" && p2.hp > 0) {
    heal2 = Math.min(HEAL_AMOUNT, MAX_HP - p2.hp); p2.hp += heal2;
  }

  // Each non-special round adds one charge. Special consumes all three.
  p1.specialCharge = move1 === "special" ? 0 : Math.min(3, (p1.specialCharge || 0) + 1);
  p2.specialCharge = move2 === "special" ? 0 : Math.min(3, (p2.specialCharge || 0) + 1);

  p1.lastMove = ATTACK_MOVES.includes(move1) ? move1 : null;
  p2.lastMove = ATTACK_MOVES.includes(move2) ? move2 : null;

  let message = "⚔️ BATTLE CONTINUES!";
  if (comeback1 && comeback2) message = "🔥 BOTH PLAYERS SECOND WIND!";
  else if (comeback1) message = "🔥 PLAYER 1 SECOND WIND!";
  else if (comeback2) message = "🔥 PLAYER 2 SECOND WIND!";
  else if (combo1 || combo2) message = "⚡ COMBO ATTACK!";
  else if (move1 === "special" || move2 === "special") message = "💥 SPECIAL ATTACK RELEASED!";
  else if (attack1.critical || attack2.critical) message = "💥 CRITICAL HIT!";
  else if (move1 === "heal" || move2 === "heal") message = "❤️ HEALING ACTIVATED!";
  else if (move1 === "defend" || move2 === "defend") message = "🛡️ DEFENSE ACTIVATED!";

  const result = {
    round: game.round, move1, move2,
    moveName1: attack1.specialName || MOVE_NAMES[move1],
    moveName2: attack2.specialName || MOVE_NAMES[move2],
    damage1, damage2, heal1, heal2,
    critical1: attack1.critical, critical2: attack2.critical,
    combo1, combo2, special1: move1 === "special", special2: move2 === "special",
    message
  };

  p1.move = null;
  p2.move = null;
  game.round++;

  if (p1.hp <= 0 && p2.hp <= 0) {
    game.status = "finished"; result.message = "🤝 BATTLE DRAW!";
  } else if (p1.hp <= 0) {
    game.status = "finished"; result.message = "🏆 PLAYER 2 WINS!";
  } else if (p2.hp <= 0) {
    game.status = "finished"; result.message = "🏆 PLAYER 1 WINS!";
  }

  if (game.status === "finished") finishStats(game);
  return result;
}

// -------------------- PREMIUM CANVAS ART -------------------

// Draws a stylized full-body fighter. The arms and legs are
// redrawn in every GIF frame, so the characters visibly move.
function drawFighter(ctx, x, floorY, facing, move, frame, color, recoil, isWinner) {
  const phase = (frame / (FRAME_COUNT - 1)) * Math.PI * 2;
  const attack = Math.sin(phase);
  const impact = Math.max(0, Math.sin(phase * 1.5 - 0.8));
  const active = frame >= 4 && frame <= 12;
  const direction = facing;

  let bodyShift = 0;
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

  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.beginPath();
  ctx.ellipse(cx, floorY + 3, 43, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Aura
  const aura = ctx.createRadialGradient(cx, hipY - 35, 5, cx, hipY - 35, 72);
  aura.addColorStop(0, color + "55");
  aura.addColorStop(1, color + "00");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, hipY - 35, 72, 0, Math.PI * 2);
  ctx.fill();

  // Legs: kick extends the front leg and bends the back leg.
  let frontKneeX = cx + direction * 17;
  let frontKneeY = hipY + 28;
  let frontFootX = cx + direction * 28;
  let frontFootY = floorY - 3;

  if (move === "kick" && active) {
    const k = Math.max(0, Math.sin(((frame - 4) / 8) * Math.PI));
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

  // Boots
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(cx - direction * 37 - 7, floorY - 8, 23, 9);
  ctx.fillRect(frontFootX - 8, frontFootY - 6, 25, 10);

  // Torso
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.moveTo(cx - 21, shoulderY);
  ctx.lineTo(cx + 21, shoulderY);
  ctx.lineTo(cx + 17, hipY + 12);
  ctx.lineTo(cx - 17, hipY + 12);
  ctx.closePath();
  ctx.fill();

  const torsoGrad = ctx.createLinearGradient(cx - 20, shoulderY, cx + 20, hipY);
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

  // Arms with different attack poses
  let nearHandX = cx + direction * 38;
  let nearHandY = shoulderY + 13;
  let farHandX = cx - direction * 27;
  let farHandY = shoulderY + 26;

  if (move === "punch" && active) {
    const p = Math.max(0, Math.sin(((frame - 4) / 8) * Math.PI));
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

  // Gloves
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(nearHandX, nearHandY, 8, 0, Math.PI * 2);
  ctx.arc(farHandX, farHandY, 8, 0, Math.PI * 2);
  ctx.fill();

  // Head and mask
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

  // Special effects around hands / body
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
    ctx.arc(cx + direction * 17, shoulderY + 8, 37, -1.2, 1.2);
    ctx.stroke();
  }

  if (move === "heal") {
    ctx.strokeStyle = "rgba(75,255,164,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, hipY - 28, 48 + Math.sin(phase * 2) * 5, 0, Math.PI * 2);
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
function drawBackground(ctx, frame) {
  const gradient = ctx.createLinearGradient(0, 0, 900, 500);
  gradient.addColorStop(0, "#070b20");
  gradient.addColorStop(0.5, "#241044");
  gradient.addColorStop(1, "#090d22");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 900, 500);

  // Neon arena lights
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 105;
    ctx.fillStyle = i % 2 ? "rgba(255,70,140,0.08)" : "rgba(55,190,255,0.08)";
    ctx.beginPath();
    ctx.arc(x, 170 + Math.sin(frame / 3 + i) * 9, 55, 0, Math.PI * 2);
    ctx.fill();
  }

  // Floor grid
  ctx.strokeStyle = "rgba(120,160,255,0.16)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 11; i++) {
    const y = 365 + i * 13;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(900, y);
    ctx.stroke();
  }
  for (let i = 0; i < 13; i++) {
    const x = i * 75;
    ctx.beginPath();
    ctx.moveTo(450, 350);
    ctx.lineTo(x, 500);
    ctx.stroke();
  }

  // Floating sparks
  for (let i = 0; i < 45; i++) {
    const x = (i * 97 + frame * (i % 3 + 1) * 2) % 900;
    const y = (i * 53 + frame * 3) % 340;
    ctx.fillStyle = i % 2 ? "rgba(255,180,90,0.65)" : "rgba(100,220,255,0.65)";
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = "rgba(5,7,20,0.55)";
  ctx.fillRect(0, 0, 900, 500);
}

function drawHPBar(ctx, x, y, width, hp, color, label) {
  ctx.fillStyle = "#111827";
  ctx.fillRect(x, y, width, 17);
  const pct = Math.max(0, Math.min(1, hp / MAX_HP));
  const grad = ctx.createLinearGradient(x, y, x + width, y);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "#f8fafc");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, width * pct, 17);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, 17);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px Arial";
  ctx.textAlign = "left";
  ctx.fillText(label + "  " + hp + "/" + MAX_HP, x, y - 8);
}

function drawBattleFrame(ctx, game, result, frame) {
  drawBackground(ctx, frame);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd166";
  ctx.font = "bold 34px Arial";
  ctx.fillText("FIGHT2", 450, 43);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 17px Arial";
  ctx.fillText("ROUND " + result.round, 450, 70);

  drawHPBar(ctx, 45, 112, 315, game.player1.hp, "#31c8ff", "PLAYER 1");
  drawHPBar(ctx, 540, 112, 315, game.player2.hp, "#ff477e", "PLAYER 2");

  ctx.fillStyle = "#ffd166";
  ctx.font = "bold 46px Arial";
  ctx.fillText("VS", 450, 258);

  const hitPhase = frame >= 7 && frame <= 12;
  const recoil1 = result.damage1 > 0 && hitPhase ? 1 : 0;
  const recoil2 = result.damage2 > 0 && hitPhase ? 1 : 0;

  drawFighter(
    ctx, 260, 410, 1, result.move1, frame, "#32c9ff",
    recoil1, game.status === "finished" && game.player1.hp > 0
  );
  drawFighter(
    ctx, 640, 410, -1, result.move2, frame, "#ff477e",
    recoil2, game.status === "finished" && game.player2.hp > 0
  );

  // Impact flash when attacks connect
  if (hitPhase && (result.damage1 > 0 || result.damage2 > 0)) {
    const pulse = Math.max(0, Math.sin((frame - 7) / 5 * Math.PI));
    ctx.fillStyle = "rgba(255,255,255," + (pulse * 0.22) + ")";
    ctx.fillRect(0, 0, 900, 500);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold " + (22 + pulse * 8) + "px Arial";
    ctx.fillText("IMPACT!", 450, 315);
  }

  ctx.fillStyle = "#dbeafe";
  ctx.font = "bold 17px Arial";
  ctx.fillText(
    MOVE_EMOJI[result.move1] + " " + (result.moveName1 || MOVE_NAMES[result.move1]) +
    "     VS     " + MOVE_EMOJI[result.move2] + " " + (result.moveName2 || MOVE_NAMES[result.move2]),
    450, 455
  );
}

async function createAnimatedBattle(game, result) {
  // Three action poses in one image: anticipation, impact, recovery.
  // Uses only the existing "canvas" dependency; no GIF/video package.
  const file = path.join(
    CACHE_DIR,
    "fight2_" + game.code + "_" + result.round + "_" + Date.now() + ".png"
  );

  const panelW = 600;
  const panelH = 333;
  const canvas = createCanvas(panelW * 3, panelH + 48);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#070b20";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const frames = [4, 8, 12];
  const labels = ["01 • READY", "02 • IMPACT", "03 • RECOVERY"];

  for (let i = 0; i < frames.length; i++) {
    const panel = createCanvas(900, 500);
    const panelCtx = panel.getContext("2d");
    drawBattleFrame(panelCtx, game, result, frames[i]);

    ctx.drawImage(panel, i * panelW, 0, panelW, panelH);
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(labels[i], i * panelW + panelW / 2, panelH + 32);

    ctx.strokeStyle = "#8ea5ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(i * panelW + 2, 2, panelW - 4, panelH - 4);
  }

  fs.writeFileSync(file, canvas.toBuffer("image/png"));
  return file;
}

// ----------------------- BROADCAST --------------------------

async function broadcastResult(api, game, result) {
  let imagePath = null;

  let ending = "";
  if (game.status === "finished") {
    if (game.player1.hp <= 0 && game.player2.hp <= 0) ending = "\n\n🤝 BATTLE DRAW!";
    else if (game.player1.hp <= 0) ending = "\n\n🏆 PLAYER 2 WINS!";
    else ending = "\n\n🏆 PLAYER 1 WINS!";
  }

  const message =
    "🥷 FIGHT2 — ROUND " + result.round + "\n\n" +
    "🔵 Player 1: " + MOVE_EMOJI[result.move1] + " " + (result.moveName1 || MOVE_NAMES[result.move1]) + "\n" +
    "🔴 Player 2: " + MOVE_EMOJI[result.move2] + " " + (result.moveName2 || MOVE_NAMES[result.move2]) + "\n\n" +
    "💥 Player 1 Damage: " + result.damage1 + " HP\n" +
    "💥 Player 2 Damage: " + result.damage2 + " HP\n\n" +
    "❤️ Player 1 HP: " + game.player1.hp + "/" + MAX_HP + "\n" +
    "❤️ Player 2 HP: " + game.player2.hp + "/" + MAX_HP + "\n" +
    (result.heal1 ? "💚 Player 1 healed: +" + result.heal1 + " HP\n" : "") +
    (result.heal2 ? "💚 Player 2 healed: +" + result.heal2 + " HP\n" : "") +
    (result.combo1 ? "\n⚡ PLAYER 1 2-HIT COMBO!" : "") +
    (result.combo2 ? "\n⚡ PLAYER 2 2-HIT COMBO!" : "") +
    (result.special1 ? "\n💥 PLAYER 1 SPECIAL ATTACK!" : "") +
    (result.special2 ? "\n💥 PLAYER 2 SPECIAL ATTACK!" : "") +
    "\n✨ " + result.message + ending;

  try {
    imagePath = await createAnimatedBattle(game, result);
    const sent = await Promise.all([
      sendImage(api, game.player1.threadID, imagePath, message),
      sendImage(api, game.player2.threadID, imagePath, message)
    ]);

    if (!sent[0] || !sent[1]) {
      console.warn("FIGHT2: One or more group image sends failed.");
    }
  } catch (error) {
    console.error("FIGHT2 broadcast error:", error);
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
        } catch (_) {}
      }, 180000);
    }
  }
}

// ----------------------- MAIN HANDLER -----------------------

async function handleAction(api, event, input) {
  const threadID = event.threadID;
  const userID = event.senderID;
  let action = String(input || "").trim();

  const upper = action.toUpperCase();
  if (/^[A-Z0-9]{5}$/.test(upper) && db.games[upper]) {
    action = "join " + upper;
  } else {
    action = action.toLowerCase();
  }

  // CREATE GAME
  if (action === "create") {
    if (groupHasGame(threadID)) {
      return sendText(api, threadID, "❌ এই গ্রুপে আগে থেকেই একটি FIGHT2 Battle চলছে!");
    }

    let code = makeCode();
    while (db.games[code]) code = makeCode();

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
        character: getStats(userID).character,
        specialCharge: 0,
        lastMove: null
      },
      player2: null,
      createdAt: Date.now(),
      statsSaved: false
    };

    saveDB();
    return sendText(api, threadID, code);
  }

  // JOIN BY "join CODE" OR SENDING CODE ALONE
  if (action.startsWith("join ")) {
    const code = action.split(/\s+/)[1]?.toUpperCase();
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
      return sendText(api, threadID, "❌ এই গ্রুপে আগে থেকেই একটি FIGHT2 Battle চলছে!");
    }

    game.player2 = {
      userID,
      threadID,
      hp: MAX_HP,
      move: null,
      secondWind: true,
      character: getStats(userID).character,
      specialCharge: 0,
      lastMove: null
    };
    game.status = "active";
    saveDB();

    const startMessage =
      "🔥 FIGHT2 BATTLE STARTED!\n\n" +
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

  // CHARACTER SELECTION
  if (action === "characters" || action === "character list") {
    return sendText(api, threadID,
      "🥷 FIGHT2 CHARACTERS\n\n" +
      "ninja — 🥷 Shadow Ninja / Shadow Strike\n" +
      "samurai — ⚔️ Dark Samurai / Blade Storm\n" +
      "mage — 🧙 Fire Mage / Inferno Blast\n" +
      "thunder — ⚡ Thunder Warrior / Storm Breaker\n\n" +
      "Select: fight2 character ninja");
  }

  if (action.startsWith("character ")) {
    const id = action.split(/\s+/)[1];
    if (!CHARACTERS[id]) return sendText(api, threadID, "❌ Character পাওয়া যায়নি। fight2 characters লিখো।");
    if (groupHasGame(threadID)) return sendText(api, threadID, "❌ Battle চলাকালে Character বদলানো যাবে না।");
    const stats = getStats(userID);
    stats.character = id;
    saveDB();
    return sendText(api, threadID,
      "✅ Character selected!\n" + CHARACTERS[id].emoji + " " + CHARACTERS[id].name +
      "\n💥 Special: " + CHARACTERS[id].special);
  }

  if (action === "top" || action === "leaderboard") {
    const top = Object.entries(db.players)
      .sort((a, b) => (b[1].wins || 0) - (a[1].wins || 0)).slice(0, 10);
    if (!top.length) return sendText(api, threadID, "🏆 এখনো কোনো Player Record নেই।");
    return sendText(api, threadID, "🏆 FIGHT2 TOP 10\n\n" +
      top.map((x, i) => (i + 1) + ". " + x[0] + " — " + (x[1].wins || 0) + " Wins").join("\n"));
  }

  // STATS CAN BE CHECKED WITHOUT AN ACTIVE GAME
  if (action === "stats" || action === "record") {
    const stats = getStats(userID);
    saveDB();
    return sendText(
      api,
      threadID,
      "🏆 FIGHT2 PLAYER RECORD\n\n" +
      "⚔️ Total Fights: " + stats.fights + "\n" +
      "🥇 Wins: " + stats.wins + "\n" +
      "💔 Losses: " + stats.losses + "\n" +
      "🤝 Draws: " + stats.draws
    );
  }

  if (action === "help") {
    return sendText(
      api,
      threadID,
      "🥷 FIGHT2 HELP\n\n" +
      "shadow create — নতুন Battle\n" +
      "অন্য Group-এ Code পাঠাও — Join\n" +
      "s1-s6 — Secret Attack\n" +
      "shadow status — HP ও Round\n" +
      "shadow quit — Battle বন্ধ\n" +
      "shadow stats — নিজের Record\n\n" +
      moveHelp()
    );
  }

  const game = getActiveGame(threadID);
  if (!game) {
    return sendText(
      api,
      threadID,
      "❌ এই Group-এ Active FIGHT2 নেই!\n\nনতুন Battle: shadow create"
    );
  }

  for (const fighter of [game.player1, game.player2]) {
    if (fighter) {
      if (!fighter.character || !CHARACTERS[fighter.character]) fighter.character = "ninja";
      if (typeof fighter.specialCharge !== "number") fighter.specialCharge = 0;
      if (typeof fighter.lastMove === "undefined") fighter.lastMove = null;
    }
  }

  const player = getPlayer(game, userID);
  if (!player || player.threadID !== threadID) {
    return sendText(api, threadID, "❌ তুমি এই Battle-এর Player নও!");
  }

  const opponent = getOpponent(game, userID);

  if (action === "status") {
    return sendText(
      api,
      threadID,
      "🥷 FIGHT2 STATUS\n\n" +
      "🔵 PLAYER 1 HP: " + game.player1.hp + "/" + MAX_HP + "\n" +
      "🔴 PLAYER 2 HP: " + game.player2.hp + "/" + MAX_HP + "\n\n" +
      "🎯 ROUND: " + game.round + "\n" +
      "🔒 YOUR MOVE: " + (player.move ? "SUBMITTED" : "WAITING") + "\n" +
      "⚔️ OPPONENT MOVE: " + (opponent.move ? "SUBMITTED (HIDDEN)" : "WAITING") + "\n" +
      "🔥 SECOND WIND: " + (player.secondWind ? "AVAILABLE" : "USED") + "\n" +
      "🥷 CHARACTER: " + (CHARACTERS[player.character] || CHARACTERS.ninja).name + "\n" +
      "💥 SPECIAL CHARGE: " + (player.specialCharge || 0) + "/3"
    );
  }

  if (action === "quit") {
    game.status = "finished";
    game.endedAt = Date.now();
    saveDB();
    await Promise.all([
      sendText(api, game.player1.threadID, "🛑 FIGHT2 Battle বন্ধ করা হয়েছে!"),
      sendText(api, game.player2.threadID, "🛑 FIGHT2 Battle বন্ধ করা হয়েছে!")
    ]);
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(MOVES, action)) {
    return sendText(api, threadID, moveHelp());
  }

  if (player.move) {
    return sendText(
      api,
      threadID,
      "⏳ তোমার Move আগেই জমা হয়েছে!\nপ্রতিপক্ষের Move-এর অপেক্ষা করো।"
    );
  }

  if (action === "s7" && (player.specialCharge || 0) < 3) {
    return sendText(api, threadID,
      "💥 Special Attack Ready নয়!\n" +
      "Charge: " + (player.specialCharge || 0) + "/3\n" +
      "আরও " + (3 - (player.specialCharge || 0)) + " Round খেললে Special Ready হবে।");
  }

  player.move = MOVES[action];
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
      "এখন s1 / s2 / s3 / s4 / s5 / s6 / s7 লিখে চাল দাও।\n" +
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
      "শুধু s1 / s2 / s3 / s4 / s5 / s6 / s7 লিখো।\n" +
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
    name: "fight2",
    aliases: ["f2", "fight"],
    version: "1.0.0",
    author: "FIGHT2 Premium",
    countDown: 2,
    role: 0,
    shortDescription: "Premium animated cross-group fighting game",
    longDescription: "Play a secret animated fighting battle between two Messenger groups.",
    category: "games",
    guide:
      "{pn} create\n" +
      "Send the 5-character code in another group to join.\n" +
      "s1 / s2 / s3 / s4 / s5 / s6 / s7\n" +
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
    if (!event || !event.body || !event.senderID || !event.threadID) return;

    const message = event.body.trim();
    if (!message) return;

    const lower = message.toLowerCase();

    if (Object.prototype.hasOwnProperty.call(MOVES, lower)) {
      return handleAction(api, event, lower);
    }

    const code = message.toUpperCase();
    if (/^[A-Z0-9]{5}$/.test(code) && db.games[code]) {
      return handleAction(api, event, code);
    }
  }
};
