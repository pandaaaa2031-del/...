
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

const games = new Map();
const activePlayers = new Map();

const FINISH_DISTANCE = 1000;
const CACHE_DIR = path.join(__dirname, "cache");

const random = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function moneyFormat(num) {
  return "$" + Number(num || 0).toLocaleString("en-US");
}

function getTargetID(event) {
  if (event.messageReply) {
    return event.messageReply.senderID;
  }

  if (event.mentions && Object.keys(event.mentions).length) {
    return Object.keys(event.mentions)[0];
  }

  return null;
}

function getBet(args) {
  const numbers = args
    .filter(x => /^\d+$/.test(x) && x.length <= 12)
    .map(Number);

  return numbers.length ? numbers[numbers.length - 1] : 0;
}

async function getMoney(usersData, id) {
  const data = await usersData.get(id);
  return Number(data?.data?.money ?? data?.money ?? 0);
}

async function setMoney(usersData, id, amount) {
  await usersData.set(id, { money: amount }, "data");
}

async function getName(usersData, id) {
  try {
    return await usersData.getName(id) || "Player";
  } catch {
    return "Player";
  }
}

function roundedRect(ctx, x, y, w, h, r, color) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCar(ctx, x, y, color, name) {
  ctx.save();

  // Wheels
  ctx.fillStyle = "#080808";
  ctx.fillRect(x + 18, y + 39, 28, 12);
  ctx.fillRect(x + 100, y + 39, 28, 12);

  // Car body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + 35);
  ctx.lineTo(x + 15, y + 12);
  ctx.lineTo(x + 45, y + 5);
  ctx.lineTo(x + 100, y + 5);
  ctx.lineTo(x + 125, y + 22);
  ctx.lineTo(x + 140, y + 35);
  ctx.lineTo(x + 135, y + 43);
  ctx.lineTo(x + 5, y + 43);
  ctx.closePath();
  ctx.fill();

  // Window
  ctx.fillStyle = "#b9edff";
  ctx.beginPath();
  ctx.moveTo(x + 48, y + 10);
  ctx.lineTo(x + 92, y + 10);
  ctx.lineTo(x + 108, y + 26);
  ctx.lineTo(x + 35, y + 26);
  ctx.closePath();
  ctx.fill();

  // Lights
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 125, y + 29, 10, 6);

  ctx.font = "bold 14px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(name.substring(0, 16), x + 70, y - 8);

  ctx.restore();
}

function drawRaceImage(game) {
  const width = 1000;
  const height = 600;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#080b20");
  bg.addColorStop(1, "#151b35");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Stars
  for (let i = 0; i < 75; i++) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(random(0, width), random(0, 180), 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Title
  ctx.textAlign = "center";
  ctx.font = "bold 48px Arial";
  ctx.fillStyle = "#00eaff";
  ctx.shadowColor = "#00eaff";
  ctx.shadowBlur = 15;
  ctx.fillText("NEON SPEED RACING", 500, 65);
  ctx.shadowBlur = 0;

  ctx.font = "18px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("FIRST TO CROSS THE FINISH LINE WINS", 500, 100);

  // Track
  roundedRect(ctx, 45, 145, 910, 325, 20, "#282e3b");

  // Track lines
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.setLineDash([25, 20]);

  ctx.beginPath();
  ctx.moveTo(65, 305);
  ctx.lineTo(930, 305);
  ctx.stroke();

  ctx.setLineDash([]);

  // Finish line
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 6; j++) {
      ctx.fillStyle = (i + j) % 2 ? "#111111" : "#ffffff";
      ctx.fillRect(900 + i * 5, 160 + j * 45, 5, 45);
    }
  }

  // Cars and progress
  game.players.forEach((player, index) => {
    const laneY = index === 0 ? 215 : 365;
    const carX = 75 + Math.min(player.distance / FINISH_DISTANCE, 1) * 680;

    const color = index === 0 ? "#00eaff" : "#ff315b";

    ctx.textAlign = "left";
    ctx.font = "bold 19px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(player.name, 75, laneY - 30);

    drawCar(ctx, carX, laneY, color, player.name);

    // Progress bar
    roundedRect(ctx, 75, laneY + 65, 750, 12, 6, "#444b59");

    roundedRect(
      ctx,
      75,
      laneY + 65,
      750 * Math.min(player.distance / FINISH_DISTANCE, 1),
      12,
      6,
      color
    );

    ctx.font = "bold 17px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
      `${Math.min(player.distance, FINISH_DISTANCE)} / ${FINISH_DISTANCE} M`,
      75,
      laneY + 105
    );

    ctx.fillText(`SPEED: ${player.speed} KM/H`, 570, laneY + 105);

    if (player.nitroUsed) {
      ctx.fillStyle = "#ffbd39";
      ctx.fillText("NITRO USED", 730, laneY + 105);
    }
  });

  // Bottom panel
  roundedRect(ctx, 45, 490, 910, 80, 18, "#111a2d");

  ctx.textAlign = "center";
  ctx.font = "bold 23px Arial";
  ctx.fillStyle = "#00eaff";
  ctx.fillText(
    `BET: ${moneyFormat(game.bet)} EACH`,
    500,
    520
  );

  ctx.font = "18px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(
    `TOTAL PRIZE: ${moneyFormat(game.bet * 2)}`,
    500,
    550
  );

  if (game.winner) {
    roundedRect(ctx, 270, 245, 460, 75, 18, "#e6a500");
    ctx.font = "bold 36px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("🏆 " + game.winner + " WINS!", 500, 293);
  }

  return canvas.toBuffer("image/png");
}

async function sendImage(api, event, game, caption = "") {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const filePath = path.join(
    CACHE_DIR,
    `racing_${Date.now()}_${random(1000, 9999)}.png`
  );

  const buffer = drawRaceImage(game);
  fs.writeFileSync(filePath, buffer);

  try {
    await api.sendMessage(
      {
        body: caption,
        attachment: fs.createReadStream(filePath)
      },
      event.threadID,
      event.messageID
    );
  } finally {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 20000);
  }
}

function releaseGame(game) {
  games.delete(game.threadID);

  for (const player of game.players) {
    activePlayers.delete(player.id);
  }
}

async function finishGame(api, event, game, winnerIndex, usersData) {
  if (game.finished) return;

  game.finished = true;

  const winner = game.players[winnerIndex];
  const loser = game.players[1 - winnerIndex];

  game.winner = winner.name;

  const prize = game.bet * 2;

  // Winner receives the prize pool.
  if (!game.solo || winner.id !== "BOT") {
    const currentMoney = await getMoney(usersData, winner.id);
    await setMoney(usersData, winner.id, currentMoney + prize);
  }

  const caption =
    `🏆 RACE FINISHED!\n\n` +
    `🥇 Winner: ${winner.name}\n` +
    `🥈 Runner-up: ${loser.name}\n\n` +
    `💰 Prize: ${moneyFormat(prize)}\n` +
    `🏁 Distance: ${FINISH_DISTANCE} M`;

  try {
    await sendImage(api, event, game, caption);
  } finally {
    releaseGame(game);
  }
}

function movePlayer(player, nitro = false) {
  let distance = random(95, 140);
  let speed = random(180, 270);

  if (nitro && !player.nitroUsed) {
    distance += random(120, 190);
    speed += random(70, 120);
    player.nitroUsed = true;
  }

  player.speed = speed;
  player.distance += distance;

  return distance;
}

function createPlayer(id, name, isBot = false) {
  return {
    id,
    name,
    distance: 0,
    speed: 0,
    nitroUsed: false,
    isBot
  };
}

module.exports.config = {
  name: "racing",
  aliases: ["race", "car"],
  version: "1.0.0",
  author: "Si Fat",
  countDown: 3,
  role: 0,
  shortDescription: "Neon Speed Racing Game",
  longDescription: "Solo and Duo car racing with HD Canvas images",
  category: "games",
  guide:
    "{pn} solo <bet>\n" +
    "{pn} duo @mention <bet>\n" +
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
    // START SOLO
    if (action === "solo") {
      if (games.has(threadID)) {
        return api.sendMessage(
          "❌ এই গ্রুপে ইতিমধ্যে একটি Race চলছে!",
          threadID,
          messageID
        );
      }

      if (activePlayers.has(senderID)) {
        return api.sendMessage(
          "❌ তুমি ইতিমধ্যে অন্য একটি Race-এ আছো!",
          threadID,
          messageID
        );
      }

      const bet = getBet(args.slice(1));

      if (!Number.isSafeInteger(bet) || bet <= 0) {
        return api.sendMessage(
          "❌ সঠিক Bet দাও!\nExample: /racing solo 100",
          threadID,
          messageID
        );
      }

      const balance = await getMoney(usersData, senderID);

      if (balance < bet) {
        return api.sendMessage(
          `❌ তোমার পর্যাপ্ত টাকা নেই!\nBalance: ${moneyFormat(balance)}`,
          threadID,
          messageID
        );
      }

      const name = await getName(usersData, senderID);

      await setMoney(usersData, senderID, balance - bet);

      const game = {
        threadID,
        solo: true,
        bet,
        finished: false,
        turn: 0,
        players: [
          createPlayer(senderID, name),
          createPlayer("BOT", "RACING BOT", true)
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
        `💰 Bet: ${moneyFormat(bet)}\n` +
        `🏆 Prize: ${moneyFormat(bet * 2)}\n\n` +
        `এখন /racing go অথবা /racing nitro লিখে Race করো!`
      );

      return;
    }

    // START DUO
    if (action === "duo") {
      if (games.has(threadID)) {
        return api.sendMessage(
          "❌ এই গ্রুপে ইতিমধ্যে একটি Race চলছে!",
          threadID,
          messageID
        );
      }

      const targetID = getTargetID(event);
      const bet = getBet(args.slice(1));

      if (!targetID || targetID === senderID) {
        return api.sendMessage(
          "❌ একজন বন্ধুকে Mention করে Duo Race শুরু করো!\nExample: /racing duo @friend 100",
          threadID,
          messageID
        );
      }

      if (!Number.isSafeInteger(bet) || bet <= 0) {
        return api.sendMessage(
          "❌ সঠিক Bet দাও!\nExample: /racing duo @friend 100",
          threadID,
          messageID
        );
      }

      if (
        activePlayers.has(senderID) ||
        activePlayers.has(targetID)
      ) {
        return api.sendMessage(
          "❌ একজন Player ইতিমধ্যে অন্য Race-এ আছে!",
          threadID,
          messageID
        );
      }

      const balance1 = await getMoney(usersData, senderID);
      const balance2 = await getMoney(usersData, targetID);

      if (balance1 < bet || balance2 < bet) {
        return api.sendMessage(
          `❌ দুইজনেরই পর্যাপ্ত টাকা থাকতে হবে!\n\n` +
          `তোমার Balance: ${moneyFormat(balance1)}\n` +
          `বন্ধুর Balance: ${moneyFormat(balance2)}`,
          threadID,
          messageID
        );
      }

      const name1 = await getName(usersData, senderID);
      const name2 = await getName(usersData, targetID);

      await setMoney(usersData, senderID, balance1 - bet);

      try {
        await setMoney(usersData, targetID, balance2 - bet);
      } catch (error) {
        await setMoney(usersData, senderID, balance1);
        throw error;
      }

      const game = {
        threadID,
        solo: false,
        bet,
        finished: false,
        turn: 0,
        players: [
          createPlayer(senderID, name1),
          createPlayer(targetID, name2)
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
        `🔵 Player 1: ${name1}\n` +
        `🔴 Player 2: ${name2}\n\n` +
        `💰 Each Bet: ${moneyFormat(bet)}\n` +
        `🏆 Total Prize: ${moneyFormat(bet * 2)}\n\n` +
        `প্রথমে ${name1} খেলবে!\n` +
        `/racing go অথবা /racing nitro`
      );

      return;
    }

    // FIND ACTIVE GAME
    const game = games.get(threadID);

    if (!game) {
      return api.sendMessage(
        "❌ কোনো Active Race নেই!\n/racing solo 100 অথবা /racing duo @mention 100",
        threadID,
        messageID
      );
    }

    if (game.finished) return;

    const playerIndex = game.players.findIndex(
      player => player.id === senderID
    );

    if (playerIndex === -1) {
      return api.sendMessage(
        "❌ তুমি এই Race-এর Player নও!",
        threadID,
        messageID
      );
    }

    const player = game.players[playerIndex];

    // STATUS
    if (action === "status") {
      return sendImage(
        api,
        event,
        game,
        `🏁 RACE STATUS\n` +
        game.players.map(p =>
          `${p.name}: ${p.distance}/${FINISH_DISTANCE} M`
        ).join("\n")
      );
    }

    // QUIT
    if (action === "quit") {
      if (game.solo) {
        game.players[1].distance = FINISH_DISTANCE;
        return finishGame(api, event, game, 1, usersData);
      }

      return finishGame(
        api,
        event,
        game,
        1 - playerIndex,
        usersData
      );
    }

    if (action !== "go" && action !== "nitro") {
      return api.sendMessage(
        "❌ Command বুঝতে পারিনি!\n/racing go\n/racing nitro\n/racing status\n/racing quit",
        threadID,
        messageID
      );
    }

    // DUO TURN SYSTEM
    if (!game.solo && game.turn !== playerIndex) {
      return api.sendMessage(
        `⏳ এখন ${game.players[game.turn].name}-এর Turn!`,
        threadID,
        messageID
      );
    }

    if (action === "nitro" && player.nitroUsed) {
      return api.sendMessage(
        "❌ তোমার Nitro ইতিমধ্যে ব্যবহার করা হয়েছে!",
        threadID,
        messageID
      );
    }

    // PLAYER MOVE
    const nitro = action === "nitro";
    const gained = movePlayer(player, nitro);

    if (player.distance >= FINISH_DISTANCE) {
      return finishGame(
        api,
        event,
        game,
        playerIndex,
        usersData
      );
    }

    // SOLO BOT MOVE
    if (game.solo) {
      const bot = game.players[1];

      const botNitro =
        !bot.nitroUsed && Math.random() < 0.25;

      movePlayer(bot, botNitro);

      if (bot.distance >= FINISH_DISTANCE) {
        return finishGame(api, event, game, 1, usersData);
      }
    } else {
      game.turn = 1 - playerIndex;
    }

    const nextMessage = game.solo
      ? `⚡ ${player.name} এগিয়েছে ${gained} M!\n🤖 Bot-ও Race করেছে!\nআবার /racing go অথবা /racing nitro`
      : `⚡ ${player.name} এগিয়েছে ${gained} M!\n\nএখন ${game.players[game.turn].name}-এর Turn!`;

    await sendImage(api, event, game, nextMessage);

  } catch (error) {
    console.error("[RACING ERROR]", error);

    return api.sendMessage(
      "❌ Racing Game-এ সমস্যা হয়েছে! Console Log পরীক্ষা করো।",
      threadID,
      messageID
    );
  }
};
