
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

const games = new Map();
const activePlayers = new Map();

const FINISH = 1000;
const CACHE = path.join(__dirname, "cache");

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundedRect(ctx, x, y, w, h, r, color) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w - r, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h - r, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCar(ctx, x, y, color, name) {
  ctx.fillStyle = "#050505";
  ctx.fillRect(x + 12, y + 35, 25, 12);
  ctx.fillRect(x + 100, y + 35, 25, 12);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + 32);
  ctx.lineTo(x + 20, y + 8);
  ctx.lineTo(x + 100, y + 8);
  ctx.lineTo(x + 140, y + 32);
  ctx.lineTo(x + 135, y + 45);
  ctx.lineTo(x + 5, y + 45);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#a8eaff";
  ctx.beginPath();
  ctx.moveTo(x + 42, y + 12);
  ctx.lineTo(x + 95, y + 12);
  ctx.lineTo(x + 112, y + 29);
  ctx.lineTo(x + 28, y + 29);
  ctx.closePath();
  ctx.fill();

  ctx.font = "bold 15px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(name.slice(0, 15), x + 70, y - 8);
}

function drawGame(game) {
  const canvas = createCanvas(1000, 600);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 0, 600);
  bg.addColorStop(0, "#080c25");
  bg.addColorStop(1, "#18233c");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1000, 600);

  // Stars
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(random(0, 1000), random(0, 140), 2, 2);
  }

  ctx.textAlign = "center";
  ctx.font = "bold 48px Arial";
  ctx.fillStyle = "#00eaff";
  ctx.shadowColor = "#00eaff";
  ctx.shadowBlur = 15;
  ctx.fillText("NEON SPEED RACING", 500, 65);
  ctx.shadowBlur = 0;

  ctx.font = "18px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("FREE RACING CHAMPIONSHIP", 500, 100);

  roundedRect(ctx, 40, 140, 920, 330, 20, "#29303e");

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.setLineDash([25, 20]);
  ctx.beginPath();
  ctx.moveTo(60, 305);
  ctx.lineTo(940, 305);
  ctx.stroke();
  ctx.setLineDash([]);

  // Finish line
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 10; j++) {
      ctx.fillStyle = (i + j) % 2 ? "#111111" : "#ffffff";
      ctx.fillRect(890 + j * 5, 150 + i * 50, 5, 50);
    }
  }

  game.players.forEach((p, i) => {
    const y = i === 0 ? 215 : 365;
    const x = 70 + Math.min(p.distance / FINISH, 1) * 680;
    const color = i === 0 ? "#00eaff" : "#ff315b";

    ctx.textAlign = "left";
    ctx.font = "bold 19px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(p.name, 70, y - 30);

    drawCar(ctx, x, y, color, p.name);

    roundedRect(ctx, 70, y + 65, 750, 12, 6, "#444b59");
    roundedRect(
      ctx,
      70,
      y + 65,
      750 * Math.min(p.distance / FINISH, 1),
      12,
      6,
      color
    );

    ctx.font = "bold 17px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
      `DISTANCE: ${Math.min(p.distance, FINISH)} M`,
      70,
      y + 105
    );
    ctx.fillText(`SPEED: ${p.speed} KM/H`, 570, y + 105);

    if (p.nitroUsed) {
      ctx.fillStyle = "#ffbd39";
      ctx.fillText("NITRO USED", 750, y + 105);
    }
  });

  roundedRect(ctx, 40, 490, 920, 80, 18, "#101a30");

  ctx.textAlign = "center";
  ctx.font = "bold 24px Arial";
  ctx.fillStyle = "#00eaff";
  ctx.fillText("🏁 FIRST TO 1000 METERS WINS!", 500, 540);

  if (game.winner) {
    roundedRect(ctx, 250, 245, 500, 75, 18, "#c38b13");
    ctx.font = "bold 36px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("🏆 " + game.winner + " WINS!", 500, 292);
  }

  return canvas.toBuffer("image/png");
}

async function sendImage(api, event, game, message) {
  if (!fs.existsSync(CACHE)) {
    fs.mkdirSync(CACHE, { recursive: true });
  }

  const file = path.join(
    CACHE,
    `race_${Date.now()}_${random(1000, 9999)}.png`
  );

  fs.writeFileSync(file, drawGame(game));

  try {
    await api.sendMessage({
      body: message,
      attachment: fs.createReadStream(file)
    }, event.threadID, event.messageID);
  } finally {
    setTimeout(() => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }, 20000);
  }
}

function release(game) {
  games.delete(game.threadID);
  for (const p of game.players) {
    activePlayers.delete(p.id);
  }
}

async function finish(api, event, game, winnerIndex) {
  if (game.finished) return;

  game.finished = true;
  game.winner = game.players[winnerIndex].name;

  const winner = game.players[winnerIndex];
  const loser = game.players[1 - winnerIndex];

  try {
    await sendImage(
      api,
      event,
      game,
      `🏆 RACE FINISHED!\n\n` +
      `🥇 WINNER: ${winner.name}\n` +
      `🥈 RUNNER UP: ${loser.name}\n\n` +
      `🏁 Winner Distance: ${winner.distance} M\n` +
      `🎮 Game: FREE RACING\n` +
      `💰 Entry Fee: FREE\n\n` +
      `Congratulations ${winner.name}!`
    );
  } finally {
    release(game);
  }
}

function move(player, nitro) {
  let distance = random(95, 140);
  let speed = random(180, 270);

  if (nitro) {
    distance += random(120, 190);
    speed += random(70, 120);
    player.nitroUsed = true;
  }

  player.distance += distance;
  player.speed = speed;

  return distance;
}

function makePlayer(id, name, bot = false) {
  return {
    id,
    name,
    distance: 0,
    speed: 0,
    nitroUsed: false,
    bot
  };
}

module.exports.config = {
  name: "racing",
  aliases: ["race", "car"],
  version: "2.0.0",
  author: "Si Fat",
  countDown: 3,
  role: 0,
  shortDescription: "Free Neon Racing Game",
  longDescription: "Solo and Duo Free Car Racing",
  category: "games",
  guide:
    "{pn} solo\n" +
    "{pn} duo @mention\n" +
    "{pn} go\n" +
    "{pn} nitro\n" +
    "{pn} status\n" +
    "{pn} quit"
};

module.exports.onStart = async function ({
  api,
  event,
  args,
  usersData
}) {
  const { senderID, threadID, messageID } = event;
  const action = (args[0] || "").toLowerCase();

  try {
    // SOLO MODE
    if (action === "solo") {
      if (games.has(threadID) || activePlayers.has(senderID)) {
        return api.sendMessage(
          "❌ তুমি অথবা এই গ্রুপ ইতিমধ্যে একটি Race-এ আছে!",
          threadID,
          messageID
        );
      }

      const name = await usersData.getName(senderID);

      const game = {
        threadID,
        solo: true,
        turn: 0,
        finished: false,
        players: [
          makePlayer(senderID, name || "Player"),
          makePlayer("BOT", "RACING BOT", true)
        ]
      };

      games.set(threadID, game);
      activePlayers.set(senderID, threadID);

      await sendImage(
        api,
        event,
        game,
        `🏎️ SOLO RACE STARTED!\n\n` +
        `👤 Player: ${name}\n` +
        `🤖 Opponent: Racing Bot\n` +
        `💰 Entry Fee: FREE\n\n` +
        `Race শুরু করতে /racing go লেখো।`
      );
      return;
    }

    // DUO MODE
    if (action === "duo") {
      if (games.has(threadID)) {
        return api.sendMessage(
          "❌ এই গ্রুপে ইতিমধ্যে একটি Race চলছে!",
          threadID,
          messageID
        );
      }

      const targetID = event.messageReply
        ? event.messageReply.senderID
        : event.mentions && Object.keys(event.mentions)[0];

      if (!targetID || targetID === senderID) {
        return api.sendMessage(
          "❌ একজন বন্ধুকে Mention অথবা Reply করো!",
          threadID,
          messageID
        );
      }

      if (
        activePlayers.has(senderID) ||
        activePlayers.has(targetID)
      ) {
        return api.sendMessage(
          "❌ একজন Player অন্য Race-এ আছে!",
          threadID,
          messageID
        );
      }

      const name1 = await usersData.getName(senderID);
      const name2 = await usersData.getName(targetID);

      const game = {
        threadID,
        solo: false,
        turn: 0,
        finished: false,
        players: [
          makePlayer(senderID, name1 || "Player 1"),
          makePlayer(targetID, name2 || "Player 2")
        ]
      };

      games.set(threadID, game);
      activePlayers.set(senderID, threadID);
      activePlayers.set(targetID, threadID);

      await sendImage(
        api,
        event,
        game,
        `🏎️ DUO RACE STARTED!\n\n` +
        `🔵 ${name1}\n` +
        `🔴 ${name2}\n\n` +
        `💰 Entry Fee: FREE\n` +
        `🏆 Prize: Trophy + Score\n\n` +
        `প্রথম Turn: ${name1}\n` +
        `/racing go অথবা /racing nitro`
      );
      return;
    }

    const game = games.get(threadID);

    if (!game) {
      return api.sendMessage(
        "❌ কোনো Race চলছে না!\n/racing solo অথবা /racing duo @mention",
        threadID,
        messageID
      );
    }

    if (game.finished) return;

    const index = game.players.findIndex(p => p.id === senderID);

    if (index === -1) {
      return api.sendMessage(
        "❌ তুমি এই Race-এর Player নও!",
        threadID,
        messageID
      );
    }

    const player = game.players[index];

    // STATUS
    if (action === "status") {
      return sendImage(
        api,
        event,
        game,
        `🏁 CURRENT RACE STATUS\n\n` +
        game.players.map(p =>
          `${p.name}: ${p.distance}/${FINISH} M`
        ).join("\n")
      );
    }

    // QUIT
    if (action === "quit") {
      if (game.solo) {
        return finish(api, event, game, 1);
      }

      return finish(api, event, game, 1 - index);
    }

    if (action !== "go" && action !== "nitro") {
      return api.sendMessage(
        "❌ সঠিক Command দাও!\n/racing go\n/racing nitro\n/racing status\n/racing quit",
        threadID,
        messageID
      );
    }

    if (!game.solo && game.turn !== index) {
      return api.sendMessage(
        `⏳ এখন ${game.players[game.turn].name}-এর Turn!`,
        threadID,
        messageID
      );
    }

    if (action === "nitro" && player.nitroUsed) {
      return api.sendMessage(
        "❌ তোমার Nitro শেষ!",
        threadID,
        messageID
      );
    }

    const gained = move(player, action === "nitro");

    if (player.distance >= FINISH) {
      return finish(api, event, game, index);
    }

    // BOT MOVE
    if (game.solo) {
      const bot = game.players[1];
      const useNitro = !bot.nitroUsed && Math.random() < 0.25;

      move(bot, useNitro);

      if (bot.distance >= FINISH) {
        return finish(api, event, game, 1);
      }
    } else {
      game.turn = 1 - index;
    }

    const message = game.solo
      ? `⚡ ${player.name} এগিয়েছে ${gained} M!\n🤖 Bot-ও Race করেছে!\nআবার /racing go অথবা /racing nitro লেখো।`
      : `⚡ ${player.name} এগিয়েছে ${gained} M!\n\nএখন ${game.players[game.turn].name}-এর Turn!`;

    await sendImage(api, event, game, message);

  } catch (error) {
    console.error("[RACING ERROR]", error);

    return api.sendMessage(
      "❌ Racing Game Error! Console Log পরীক্ষা করো।",
      threadID,
      messageID
    );
  }
};
