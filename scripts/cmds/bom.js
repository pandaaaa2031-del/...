const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");
const { Readable } = require("stream");

const DATA_DIR = path.join(__dirname, "bom_data");
const DATA_FILE = path.join(DATA_DIR, "games.json");

const SIZE = 5;
const BOMB_COUNT = 5;
const SAFE_COUNT = 20;

function loadData() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ games: {} }, null, 2));
    }

    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch {
        return { games: {} };
    }
}

function saveData(data) {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function createGame(uid, mode) {
    const bombs = [];

    while (bombs.length < BOMB_COUNT) {
        const n = Math.floor(Math.random() * 25);
        if (!bombs.includes(n)) bombs.push(n);
    }

    return {
        mode,
        status: mode === "duo" ? "waiting" : "playing",
        player1: uid,
        player2: null,
        turn: uid,
        bombs,
        revealed: []
    };
}

function drawBoard(game) {
    const canvas = createCanvas(650, 760);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#641f59";
    ctx.fillRect(0, 0, 650, 760);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Arial";
    ctx.fillText("💣 BOMB FINDER", 145, 65);

    ctx.font = "24px Arial";
    ctx.fillText("Find the safe boxes!", 205, 105);

    const startX = 110;
    const startY = 180;
    const cell = 85;
    const gap = 8;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 25px Arial";

    for (let c = 0; c < SIZE; c++) {
        ctx.fillStyle = "#222222";
        ctx.fillRect(startX + c * (cell + gap), 125, cell, 42);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(
            String(c + 1),
            startX + c * (cell + gap) + cell / 2,
            146
        );
    }

    for (let r = 0; r < SIZE; r++) {
        ctx.fillStyle = "#222222";
        ctx.fillRect(35, startY + r * (cell + gap), 55, cell);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(
            String(r + 1),
            62,
            startY + r * (cell + gap) + cell / 2
        );

        for (let c = 0; c < SIZE; c++) {
            const index = r * SIZE + c;
            const x = startX + c * (cell + gap);
            const y = startY + r * (cell + gap);

            const opened = game.revealed.includes(index);
            const isBomb = game.bombs.includes(index);

            if (opened && isBomb) {
                ctx.fillStyle = "#e53935";
            } else if (opened) {
                ctx.fillStyle = "#36c878";
            } else if (game.status === "finished" && isBomb) {
                ctx.fillStyle = "#e53935";
            } else {
                ctx.fillStyle = "#eeeeee";
            }

            ctx.beginPath();
            ctx.roundRect(x, y, cell, cell, 12);
            ctx.fill();

            if (opened || (game.status === "finished" && isBomb)) {
                ctx.fillStyle = opened && isBomb ? "#ffffff" : "#222222";
                ctx.font = "bold 35px Arial";
                ctx.fillText(
                    isBomb ? "💣" : "✓",
                    x + cell / 2,
                    y + cell / 2
                );
            }
        }
    }

    const safe = game.revealed.filter(
        i => !game.bombs.includes(i)
    ).length;

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px Arial";
    ctx.fillText("━━━━━━━━━━━━━━━━━━━━", 75, 655);

    ctx.font = "28px Arial";
    ctx.fillText(`🟩 Safe: ${safe}/20`, 100, 700);
    ctx.fillText(`💣 Bombs: ${BOMB_COUNT}`, 100, 740);

    return canvas.toBuffer("image/png");
}

async function sendBoard(message, game, key, commandName) {
    const buffer = drawBoard(game);

    const sent = await message.reply({
        body:
            game.status === "waiting"
                ? "⚔️ DUO CHALLENGE: একজন খেলোয়াড় Accept করার অপেক্ষায়!"
                : game.status === "finished"
                    ? "🏁 GAME FINISHED!"
                    : game.mode === "duo"
                        ? `🎮 Turn: ${game.turn}\nছবিতে Reply করে শুধু row column লিখো। যেমন: 2 3`
                        : "🎮 ছবিতে Reply করে শুধু row column লিখো। যেমন: 2 3",
        attachment: Readable.from(buffer)
    });

    if (
        sent &&
        sent.messageID &&
        global.GoatBot &&
        global.GoatBot.onReply
    ) {
        global.GoatBot.onReply.set(sent.messageID, {
            commandName,
            gameKey: key
        });
    }

    return sent;
}

module.exports = {
    config: {
        name: "bom",
        version: "3.0.0",
        author: "Riyad",
        countDown: 3,
        role: 0,
        shortDescription: "Image Bomb Finder Game",
        longDescription: "Play Bomb Finder in Solo or Duo mode",
        category: "game",
        guide: {
            en: "{pn} solo | duo | accept | help"
        }
    },

    onStart: async function ({ message, event, args }) {
        try {
            const data = loadData();
            const key = String(event.threadID);
            const uid = String(event.senderID);
            const action = String(args[0] || "help").toLowerCase();

            if (action === "help") {
                return message.reply(
                    "💣 BOMB FINDER\n\n" +
                    "🎮 bom solo\n" +
                    "⚔️ bom duo\n" +
                    "✅ bom accept\n\n" +
                    "গেমের ছবিতে Reply করে শুধু লিখবে: 2 3"
                );
            }

            if (action === "accept") {
                const game = data.games[key];

                if (!game || game.status !== "waiting") {
                    return message.reply("❌ কোনো Pending Duo Challenge নেই!");
                }

                if (game.player1 === uid) {
                    return message.reply("❌ নিজের Challenge নিজে Accept করা যাবে না!");
                }

                game.player2 = uid;
                game.turn = game.player1;
                game.status = "playing";

                saveData(data);

                return sendBoard(message, game, key, "bom");
            }

            if (action === "solo" || action === "duo") {
                const old = data.games[key];

                if (old && ["playing", "waiting"].includes(old.status)) {
                    return message.reply("⚠️ এই গ্রুপে একটি Game চলছে!");
                }

                const game = createGame(uid, action);
                data.games[key] = game;
                saveData(data);

                return sendBoard(message, game, key, "bom");
            }

            return message.reply("❌ ভুল Command! লিখো: bom help");

        } catch (error) {
            console.error("BOM START ERROR:", error);
            return message.reply("❌ Game Start Error: " + error.message);
        }
    },

    onReply: async function ({ message, event, Reply }) {
        try {
            const data = loadData();
            const key = Reply.gameKey;
            const game = data.games[key];
            const uid = String(event.senderID);

            if (!game || game.status !== "playing") {
                return message.reply("❌ এই Game আর চালু নেই!");
            }

            if (String(event.threadID) !== String(key)) {
                return;
            }

            if (
                game.mode === "solo" &&
                uid !== game.player1
            ) {
                return message.reply("❌ এটি অন্য সদস্যের Solo Game!");
            }

            if (
                game.mode === "duo" &&
                uid !== game.player1 &&
                uid !== game.player2
            ) {
                return message.reply("❌ তুমি এই Game-এর Player নও!");
            }

            if (game.mode === "duo" && uid !== game.turn) {
                return message.reply("⏳ এখন অন্য Player-এর Turn!");
            }

            const text = String(event.body || "").trim();
            const match = text.match(/^([1-5])\s+([1-5])$/);

            if (!match) {
                return message.reply("❌ শুধু Row এবং Column লিখো। যেমন: 2 3");
            }

            const row = Number(match[1]);
            const col = Number(match[2]);
            const index = (row - 1) * SIZE + (col - 1);

            if (game.revealed.includes(index)) {
                return message.reply("⚠️ এই Box আগেই খোলা হয়েছে!");
            }

            game.revealed.push(index);

            if (game.bombs.includes(index)) {
                game.status = "finished";
                saveData(data);

                await sendBoard(message, game, key, "bom");

                if (game.mode === "duo") {
                    const winner = uid === game.player1
                        ? game.player2
                        : game.player1;

                    return message.reply(
                        `💥 BOOM! ${uid} Bomb পেয়েছে!\n🏆 Winner: ${winner}`
                    );
                }

                return message.reply("💥 BOOM! তুমি Bomb পেয়েছ! Game Over!");
            }

            if (game.revealed.length === SAFE_COUNT) {
                game.status = "finished";
                saveData(data);

                await sendBoard(message, game, key, "bom");
                return message.reply(`🏆 অসাধারণ! ${uid} Game জিতেছে!`);
            }

            if (game.mode === "duo") {
                game.turn = uid === game.player1
                    ? game.player2
                    : game.player1;
            }

            saveData(data);

            return sendBoard(message, game, key, "bom");

        } catch (error) {
            console.error("BOM REPLY ERROR:", error);
            return message.reply("❌ Reply Error: " + error.message);
        }
    }
};
