
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

const games = global.__ZERO_HOUR_CANVAS ||
  (global.__ZERO_HOUR_CANVAS = new Map());

const WIDTH = 1000;
const HEIGHT = 700;

const ROOMS = [
  "ABANDONED LAB",
  "UNDERGROUND TUNNEL",
  "FROZEN STORAGE",
  "POWER GENERATOR",
  "SECURITY VAULT",
  "FINAL EXTRACTION"
];

const ENEMIES = [
  "SHADOW STALKER",
  "MUTATED GUARD",
  "VOID HUNTER",
  "EXPERIMENT X",
  "THE OVERSEER"
];

const cacheDir = path.join(__dirname, "cache");

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function roundRect(ctx, x, y, w, h, r, fill = false, stroke = false) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function text(ctx, value, x, y, size = 20, color = "#ffffff", weight = "normal") {
  ctx.font = `${weight} ${size}px Arial`;
  ctx.fillStyle = color;
  ctx.fillText(String(value), x, y);
}

function bar(ctx, x, y, w, h, value, max, color) {
  ctx.fillStyle = "#202a35";
  roundRect(ctx, x, y, w, h, 7, true);

  ctx.fillStyle = color;
  roundRect(ctx, x, y, w * clamp(value / max, 0, 1), h, 7, true);
}

function background(ctx, stage, round) {
  const colors = [
    ["#07111c", "#152c3b"],
    ["#10121f", "#293747"],
    ["#142735", "#526c7b"],
    ["#160c13", "#4a2024"],
    ["#100b19", "#30213f"],
    ["#091a20", "#214c4b"]
  ];

  const color = colors[stage % colors.length];

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, color[0]);
  gradient.addColorStop(1, color[1]);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Room structure
  ctx.strokeStyle = "rgba(150,210,230,0.13)";
  ctx.lineWidth = 3;

  for (let i = 0; i < 8; i++) {
    const x = i * 145 - 50;
    ctx.beginPath();
    ctx.moveTo(x, 80);
    ctx.lineTo(x + 60, 430);
    ctx.stroke();
  }

  // Ceiling lights
  for (let i = 0; i < 5; i++) {
    const x = 100 + i * 200;

    ctx.fillStyle = i % 2 === 0
      ? "rgba(255,50,50,0.12)"
      : "rgba(60,190,255,0.12)";

    ctx.beginPath();
    ctx.arc(x, 140, 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = i % 2 === 0 ? "#ff4141" : "#48cfff";
    ctx.fillRect(x - 25, 65, 50, 5);
  }

  // Floor
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 410, WIDTH, 290);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";

  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 110, 410);
    ctx.lineTo(i * 150 - 150, HEIGHT);
    ctx.stroke();
  }

  // Random debris
  for (let i = 0; i < 22; i++) {
    ctx.fillStyle = "rgba(160,180,190,0.18)";
    ctx.fillRect(
      random(0, WIDTH),
      random(420, HEIGHT - 10),
      random(8, 30),
      random(4, 12)
    );
  }

  // Room number
  text(ctx, "SECTOR 0" + (stage + 1), 45, 155, 17, "#69dfff", "bold");
  text(ctx, "ROUND " + round, 45, 185, 15, "#a9bac9");
}

function drawEnemy(ctx, game) {
  const x = 720;
  const y = 325;

  const glow = ctx.createRadialGradient(x, y, 10, x, y, 170);
  glow.addColorStop(0, "rgba(255,35,35,0.35)");
  glow.addColorStop(1, "rgba(255,35,35,0)");

  ctx.fillStyle = glow;
  ctx.fillRect(x - 180, y - 180, 360, 360);

  // Enemy silhouette
  ctx.fillStyle = game.boss ? "#100509" : "#0a111b";

  ctx.beginPath();
  ctx.ellipse(x, y + 30, game.boss ? 95 : 65, game.boss ? 145 : 110, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y - 100, game.boss ? 65 : 45, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#ff2828";
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 25;

  ctx.fillRect(x - 35, y - 110, 18, 9);
  ctx.fillRect(x + 17, y - 110, 18, 9);

  ctx.shadowBlur = 0;

  text(ctx, game.enemy, 610, 505, 19, "#ff7474", "bold");

  bar(ctx, 610, 520, 220, 14, game.enemyHP, game.maxEnemyHP, "#ef3c46");

  text(ctx, `ENEMY HP ${game.enemyHP}/${game.maxEnemyHP}`, 610, 558, 14, "#ffffff");
}

function drawPlayer(ctx, player, index) {
  const x = 140 + index * 230;
  const y = 400;

  ctx.fillStyle = player.alive ? "#102b3c" : "#302020";

  ctx.beginPath();
  ctx.arc(x, y - 70, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = player.alive ? "#32b6d9" : "#777777";

  roundRect(ctx, x - 35, y - 35, 70, 105, 15, true);

  // Weapon
  ctx.fillStyle = "#9aa9b6";
  ctx.fillRect(x + 25, y - 5, 50, 8);

  text(ctx, player.name, x - 65, y + 100, 16, "#ffffff", "bold");

  text(ctx, `HP ${player.hp}`, x - 65, y + 128, 14, "#ffffff");
  bar(ctx, x - 65, y + 138, 135, 9, player.hp, 100, "#35d77a");

  text(ctx, `EN ${player.energy}`, x - 65, y + 170, 14, "#ffffff");
  bar(ctx, x - 65, y + 180, 135, 9, player.energy, 100, "#32b8ff");
}

function drawGame(game, latestAction) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  const stage = Math.min(
    Math.floor((game.round - 1) / 2),
    ROOMS.length - 1
  );

  background(ctx, stage, game.round);

  // Top title panel
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  roundRect(ctx, 25, 20, 950, 95, 18, true);

  text(ctx, "PROJECT: ZERO HOUR", 50, 62, 32, "#ffffff", "bold");
  text(ctx, "SURVIVAL OPERATIONS // LIVE FEED", 52, 91, 15, "#65dafa");

  // Scene name
  text(ctx, ROOMS[stage], 45, 230, 25, "#ffffff", "bold");

  // Enemy
  if (game.enemyHP > 0) {
    drawEnemy(ctx, game);
  } else {
    text(ctx, "ENEMY ELIMINATED", 630, 350, 25, "#39f5a3", "bold");
  }

  // Players
  game.players.forEach((player, i) => {
    drawPlayer(ctx, player, i);
  });

  // HUD panel
  ctx.fillStyle = "rgba(0,0,0,0.78)";
  roundRect(ctx, 25, 590, 950, 90, 15, true);

  text(ctx, "MODE: " + game.mode.toUpperCase(), 45, 620, 17, "#5fdcff", "bold");

  text(ctx, "ROUND: " + game.round, 45, 652, 17, "#ffffff");

  text(ctx, "WEAPON: " + game.players[0].weapon, 260, 620, 16);
  text(ctx, "AMMO: " + game.players[0].ammo, 260, 652, 16);

  text(ctx, latestAction || "AWAITING ACTION...", 540, 620, 16, "#75ffb0", "bold");

  const alive = game.players.filter(p => p.alive).length;

  text(ctx, `TEAM ALIVE: ${alive}/${game.players.length}`, 540, 652, 16);

  // Duo turn status
  if (game.mode === "duo") {
    game.players.forEach((p, i) => {
      const submitted = !!game.pending[p.id];

      text(
        ctx,
        `${p.name}: ${submitted ? "ACTION READY" : "WAITING"}`,
        45 + i * 440,
        555,
        16,
        submitted ? "#39f5a3" : "#ffc45c",
        "bold"
      );
    });
  }

  return canvas.toBuffer("image/png");
}

function createPlayer(id, name) {
  return {
    id: String(id),
    name: name || "SURVIVOR",
    hp: 100,
    energy: 100,
    armor: 30,
    weapon: "PISTOL",
    ammo: 12,
    medkits: 2,
    alive: true,
    defended: false
  };
}

function statusText(game, action) {
  return (
    "⚡ PROJECT ZERO HOUR\n\n" +
    (action ? action + "\n\n" : "") +
    game.players.map(p =>
      `${p.name}: ❤️ ${p.hp} | ⚡ ${p.energy} | 🛡️ ${p.armor}\n` +
      `🔫 ${p.weapon} | Ammo: ${p.ammo} | Medkits: ${p.medkits}\n` +
      `${p.alive ? "🟢 ALIVE" : "💀 ELIMINATED"}`
    ).join("\n\n") +
    "\n\n👾 " + game.enemy +
    "\nEnemy HP: " + game.enemyHP + "/" + game.maxEnemyHP +
    "\n\nACTIONS:\n" +
    "ATTACK / SEARCH / DEFEND / RUN\n" +
    "HEAL / REPAIR / RELOAD / SCAN\n\n" +
    "Reply to the latest game image to play."
  );
}

function sendGame(api, event, game, action) {
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const buffer = drawGame(game, action);

      const filePath = path.join(
        cacheDir,
        `zero_${Date.now()}_${random(1000, 9999)}.png`
      );

      fs.writeFileSync(filePath, buffer);

      const attachment = fs.createReadStream(filePath);

      api.sendMessage({
        body: statusText(game, action),
        attachment
      }, event.threadID, (err, info) => {

        setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch (e) {}
        }, 30000);

        if (err || !info) {
          console.error("Zero Hour send error:", err);
          resolve(false);
          return;
        }

        global.GoatBot.onReply.set(info.messageID, {
          commandName: "zerohour",
          gameKey: String(event.threadID),
          players: game.players.map(p => p.id)
        });

        resolve(true);
      }, event.messageID);

    } catch (error) {
      console.error("Render error:", error);
      resolve(false);
    }
  });
}

function damage(player, amount) {
  if (player.defended) {
    amount = Math.ceil(amount * 0.35);
    player.defended = false;
  }

  const blocked = Math.min(player.armor, amount);

  player.armor -= blocked;
  player.hp = Math.max(0, player.hp - (amount - blocked));

  if (player.hp <= 0) player.alive = false;
}

function performAction(game, player, action) {
  let result = "";

  if (action === "ATTACK") {
    if (player.energy < 10) return "❌ Not enough energy.";

    if (player.ammo <= 0) return "❌ No ammunition. Use RELOAD.";

    player.energy -= 10;
    player.ammo--;

    const damageAmount = random(20, 35);

    game.enemyHP = Math.max(0, game.enemyHP - damageAmount);

    result = `⚔️ ${player.name} attacked for ${damageAmount} damage!`;
  }

  else if (action === "SEARCH") {
    if (player.energy < 8) return "❌ Not enough energy.";

    player.energy -= 8;

    const loot = random(1, 4);

    if (loot === 1) {
      player.medkits++;
      result = "💉 MEDKIT FOUND!";
    } else if (loot === 2) {
      player.ammo += 6;
      result = "🔫 6 AMMO FOUND!";
    } else if (loot === 3) {
      player.armor += 25;
      result = "🛡️ ARMOR FOUND!";
    } else {
      player.energy = Math.min(100, player.energy + 25);
      result = "⚡ ENERGY CELL FOUND!";
    }
  }

  else if (action === "DEFEND") {
    player.defended = true;
    player.armor += 5;
    result = "🛡️ DEFENSE ACTIVATED!";
  }

  else if (action === "RUN") {
    player.energy = Math.min(100, player.energy + 25);
    result = "🏃 YOU ESCAPED AND RECOVERED ENERGY!";
  }

  else if (action === "HEAL") {
    if (!player.medkits) return "❌ No medkit!";

    player.medkits--;
    player.hp = Math.min(100, player.hp + 40);
    result = "💉 HEALTH RESTORED!";
  }

  else if (action === "REPAIR") {
    if (player.energy < 15) return "❌ Not enough energy.";

    player.energy -= 15;
    player.armor += 30;
    result = "🔧 ARMOR REPAIRED!";
  }

  else if (action === "RELOAD") {
    player.ammo = 12;
    result = "🔋 WEAPON RELOADED!";
  }

  else if (action === "SCAN") {
    player.energy = Math.max(0, player.energy - 5);
    result = "📡 SCAN COMPLETE! Enemy position identified.";
  }

  return result;
}

function enemyAttack(game) {
  const targets = game.players.filter(p => p.alive);

  if (!targets.length || game.enemyHP <= 0) return "";

  const target = targets[random(0, targets.length - 1)];
  const amount = game.boss ? random(25, 40) : random(12, 24);

  damage(target, amount);

  return `👾 ${game.enemy} attacked ${target.name} for ${amount} damage!`;
}

function resolveRound(game) {
  const logs = [];

  for (const player of game.players) {
    const action = game.pending[player.id];

    if (action && player.alive) {
      const result = performAction(game, player, action);
      logs.push(`${player.name}: ${result}`);
    }
  }

  if (game.enemyHP <= 0) {
    logs.push("💥 ENEMY ELIMINATED!");

    game.round++;

    if (game.round === 9) {
      game.boss = true;
      game.enemy = "THE OVERSEER";
      game.enemyHP = 220;
      game.maxEnemyHP = 220;
    } else if (game.round > 10) {
      game.won = true;
    } else {
      game.enemy = ENEMIES[random(0, ENEMIES.length - 1)];
      game.enemyHP = random(65, 110);
      game.maxEnemyHP = game.enemyHP;
    }
  } else {
    logs.push(enemyAttack(game));
    game.round++;
  }

  for (const p of game.players) {
    if (p.alive) {
      p.energy = Math.min(100, p.energy + 5);
    }
  }

  game.pending = {};

  return logs.filter(Boolean).join("\n");
}

function getAction(body) {
  const action = String(body || "").trim().toUpperCase();

  const aliases = {
    HIT: "ATTACK",
    SHOOT: "ATTACK",
    LOOT: "SEARCH",
    BLOCK: "DEFEND",
    ESCAPE: "RUN",
    MEDKIT: "HEAL",
    FIX: "REPAIR",
    AMMO: "RELOAD"
  };

  const selected = aliases[action] || action;

  const allowed = [
    "ATTACK", "SEARCH", "DEFEND", "RUN",
    "HEAL", "REPAIR", "RELOAD", "SCAN"
  ];

  return allowed.includes(selected) ? selected : null;
}

function endGame(api, event, game, win) {
  games.delete(String(event.threadID));

  const message =
    win
      ? "🏆 ZERO HOUR COMPLETED!\n\nYour team survived the final encounter!"
      : "💀 MISSION FAILED!\n\nYour team could not survive.";

  api.sendMessage(
    message + "\n\n" + statusText(game, "MISSION REPORT"),
    event.threadID,
    null,
    event.messageID
  );
}

module.exports = {
  config: {
    name: "zerohour",
    version: "2.0.0",
    author: "SIYAM",
    countDown: 5,
    role: 0,
    shortDescription: "Live Canvas Survival Game",
    longDescription: "Solo and duo survival game with dynamic canvas images.",
    category: "game",
    guide: {
      en: "{pn} solo\n{pn} duo @mention\n{pn} stop"
    }
  },

  onStart: async function ({ api, event, args, usersData }) {
    const id = String(event.threadID);

    if (args[0]?.toLowerCase() === "stop") {
      games.delete(id);
      return api.sendMessage(
        "🛑 ZERO HOUR mission stopped.",
        event.threadID,
        null,
        event.messageID
      );
    }

    if (games.has(id)) {
      return api.sendMessage(
        "⚠️ A game is already running in this group. Use zerohour stop first.",
        event.threadID,
        null,
        event.messageID
      );
    }

    const mode = (args[0] || "solo").toLowerCase();

    if (!["solo", "duo"].includes(mode)) {
      return api.sendMessage(
        "Use:\nzerohour solo\nzerohour duo @friend",
        event.threadID,
        null,
        event.messageID
      );
    }

    const players = [];

    const name1 = usersData
      ? await usersData.getName(event.senderID)
      : "PLAYER 1";

    players.push(createPlayer(event.senderID, name1));

    if (mode === "duo") {
      const mentioned = Object.keys(event.mentions || {})
        .filter(uid => uid !== String(event.senderID));

      if (!mentioned.length) {
        return api.sendMessage(
          "❌ Mention your teammate to start Duo Mode.\nExample: zerohour duo @friend",
          event.threadID,
          null,
          event.messageID
        );
      }

      const name2 = usersData
        ? await usersData.getName(mentioned[0])
        : "PLAYER 2";

      players.push(createPlayer(mentioned[0], name2));
    }

    const game = {
      mode,
      players,
      round: 1,
      enemy: ENEMIES[0],
      enemyHP: 100,
      maxEnemyHP: 100,
      boss: false,
      won: false,
      pending: {}
    };

    games.set(id, game);

    await sendGame(api, event, game, "MISSION STARTED");
  },

  onReply: async function ({ api, event, Reply }) {
    const id = String(event.threadID);
    const game = games.get(id);

    if (!game) {
      return api.sendMessage(
        "❌ No active game. Start with zerohour solo.",
        event.threadID,
        null,
        event.messageID
      );
    }

    const player = game.players.find(p =>
      p.id === String(event.senderID)
    );

    if (!player) {
      return api.sendMessage(
        "❌ You are not a member of this mission.",
        event.threadID,
        null,
        event.messageID
      );
    }

    if (!player.alive) {
      return api.sendMessage(
        "💀 You have been eliminated.",
        event.threadID,
        null,
        event.messageID
      );
    }

    if (game.pending[player.id]) {
      return api.sendMessage(
        "⚠️ You already selected an action this round.",
        event.threadID,
        null,
        event.messageID
      );
    }

    const action = getAction(event.body);

    if (!action) {
      return api.sendMessage(
        "❌ Invalid action!\n\n" +
        "ATTACK / SEARCH / DEFEND / RUN\n" +
        "HEAL / REPAIR / RELOAD / SCAN",
        event.threadID,
        null,
        event.messageID
      );
    }

    game.pending[player.id] = action;

    if (game.mode === "duo") {
      const living = game.players.filter(p => p.alive);

      const ready = living.every(p =>
        Boolean(game.pending[p.id])
      );

      if (!ready) {
        return sendGame(
          api,
          event,
          game,
          `${player.name} selected ${action}. Waiting for teammate...`
        );
      }
    }

    const report = resolveRound(game);

    if (game.won) {
      return endGame(api, event, game, true);
    }

    if (!game.players.some(p => p.alive)) {
      return endGame(api, event, game, false);
    }

    if (game.round > 12) {
      return endGame(api, event, game, false);
    }

    await sendGame(
      api,
      event,
      game,
      "ROUND REPORT: " + report.replace(/\n/g, " | ")
    );
  }
};
