const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

const DATA_DIR = path.join(__dirname, "bom_data");
const DATA_FILE = path.join(DATA_DIR, "games.json");

const SIZE = 5;
const BOMB_COUNT = 5;
const SAFE_COUNT = 20;

// ================================
// DATA SYSTEM
// ================================

function loadData() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify({ games: {}, leaderboard: {} }, null, 2)
        );
    }

    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
        data.games = data.games || {};
        data.leaderboard = data.leaderboard || {};
        return data;
    } catch (error) {
        console.error("BOM DATA ERROR:", error);
        return { games: {}, leaderboard: {} };
    }
}

function saveData(data) {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getPlayer(data, uid) {
    if (!data.leaderboard[uid]) {
        data.leaderboard[uid] = {
            points: 0,
            wins: 0,
            losses: 0,
            games: 0
        };
    }

    return data.leaderboard[uid];
}

// ================================
// GAME SYSTEM
// ================================

function createGame(uid, mode) {
    const bombs = [];

    while (bombs.length < BOMB_COUNT) {
        const number = Math.floor(Math.random() * 25);

        if (!bombs.includes(number)) {
            bombs.push(number);
        }
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

function finishGame(data, game, winner, loser) {
    game.status = "finished";
    game.winner = winner || null;
    game.loser = loser || null;

    if (winner) {
        const player = getPlayer(data, winner);
        player.wins++;
        player.games++;
        player.points += 10;
    }

    if (loser) {
        const player = getPlayer(data, loser);
        player.losses++;
        player.games++;
    }
}

// ================================
// CANVAS IMAGE
// ================================

function drawBoard(game) {
    const canvas = createCanvas(650, 760);
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#641f59";
    ctx.fillRect(0, 0, 650, 760);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 40px Arial";
    ctx.fillText("BOMB FINDER", 325, 65);

    ctx.font = "23px Arial";
    ctx.fillText("Find all the safe boxes!", 325, 110);

    const startX = 115;
    const startY = 190;
    const cell = 82;
    const gap = 8;

    // Column numbers
    ctx.font = "bold 25px Arial";

    for (let c = 0; c < SIZE; c++) {
        const x = startX + c * (cell + gap);

        ctx.fillStyle = "#292929";
        ctx.fillRect(x, 130, cell, 45);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(String(c + 1), x + cell / 2, 152);
    }

    // Rows and boxes
    for (let r = 0; r < SIZE; r++) {
        const y = startY + r * (cell + gap);

        ctx.fillStyle = "#292929";
        ctx.fillRect(45, y, 55, cell);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(String(r + 1), 72, y + cell / 2);

        for (let c = 0; c < SIZE; c++) {
            const index = r * SIZE + c;
            const x = startX + c * (cell + gap);

            const opened = game.revealed.includes(index);
            const bomb = game.bombs.includes(index);
            const showBomb = game.status === "finished" && bomb;

            ctx.fillStyle = (opened && bomb) || showBomb
                ? "#e53935"
                : opened
                    ? "#36c878"
                    : "#eeeeee";

            ctx.beginPath();
            ctx.roundRect(x, y, cell, cell, 12);
            ctx.fill();

            if (opened || showBomb) {
                ctx.fillStyle = "#222222";
                ctx.font = "bold 32px Arial";

                ctx.fillText(
                    bomb ? "X" : "✓",
                    x + cell / 2,
                    y + cell / 2
                );

                ctx.font = "bold 25px Arial";
            }
        }
    }

    // Score
    const safe = game.revealed.filter(
        index => !game.bombs.includes(index)
    ).length;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(70, 650, 510, 3);

    ctx.textAlign = "left";
    ctx.font = "bold 30px Arial";
    ctx.fillText(`SAFE: ${safe}/20`, 110, 695);
    ctx.fillText(`BOMBS: ${BOMB_COUNT}`, 110, 735);

    // Return PNG stream directly
    const imageStream = canvas.createPNGStream();
    imageStream.path = `bom_${Date.now()}.png`;

    return imageStream;
}

// ================================
// SEND IMAGE + REGISTER REPLY
// ================================

function sendBoard(message, game, key) {
    const imageStream = drawBoard(game);

    let body = "💣 BOMB FINDER";

    if (game.status === "playing") {
        body += "\n\n";

        if (game.mode === "duo") {
            body += `🎮 Current Turn: ${game.turn}\n`;
        }

        body += "ছবিতে Reply করে শুধু Row এবং Column লিখো।\n";
        body += "উদাহরণ: 2 3";
    } else {
        body += "\n\n🏁 GAME FINISHED!";
    }

    return message.reply(
        {
            body,
            attachment: imageStream
        },
        (error, info) => {
            if (error) {
                console.error("BOM IMAGE SEND ERROR:", error);
                return;
            }

            if (
                game.status === "playing" &&
                info &&
                info.messageID
            ) {
                if (!global.GoatBot.onReply) {
                    global.GoatBot.onReply = new Map();
                }

                global.GoatBot.onReply.set(info.messageID, {
                    commandName: "bom",
                    gameKey: key
                });
            }
        }
    );
}

// ================================
// COMMAND
// ================================

module.exports = {
    config: {
        name: "bom",
        version: "3.1.0",
        author: "Riyad",
        countDown: 3,
        role: 0,
        shortDescription: "Image Bomb Finder Game",
        longDescription: "Solo and Duo Bomb Finder game with image board",
        category: "game",
        guide: {
            en: "{pn} solo | duo | accept | rank | help"
        }
    },

    // ============================
    // ON START
    // ============================

    onStart: async function ({ message, event, args }) {
        try {
            const data = loadData();
            const key = String(event.threadID);
            const uid = String(event.senderID);

            const action = String(
                args && args[0] ? args[0] : "help"
            ).toLowerCase();

            // HELP
            if (action === "help") {
                return message.reply(
                    "💣 BOMB FINDER HELP\n\n" +
                    "🎮 bom solo - Solo Game\n" +
                    "⚔️ bom duo - Duo Challenge\n" +
                    "✅ bom accept - Accept Challenge\n" +
                    "🏆 bom rank - Leaderboard\n\n" +
                    "📸 ছবিতে Reply করে শুধু লিখবে:\n" +
                    "2 3\n\n" +
                    "🟩 Green = Safe\n" +
                    "💣 Red = Bomb"
                );
            }

            // RANK
            if (action === "rank") {
                const players = Object.entries(data.leaderboard)
                    .sort((a, b) =>
                        b[1].wins - a[1].wins ||
                        b[1].points - a[1].points
                    )
                    .slice(0, 10);

                if (!players.length) {
                    return message.reply("🏆 এখনো কোনো Player নেই!");
                }

                let output = "🏆 BOMB FINDER RANK\n\n";

                players.forEach(([id, stats], index) => {
                    output +=
                        `${index + 1}. ${id}\n` +
                        `⭐ Points: ${stats.points}\n` +
                        `🏆 Wins: ${stats.wins}\n` +
                        `❌ Losses: ${stats.losses}\n` +
                        `🎮 Games: ${stats.games}\n\n`;
                });

                return message.reply(output);
            }

            // ACCEPT DUO
            if (action === "accept") {
                const game = data.games[key];

                if (!game || game.status !== "waiting") {
                    return message.reply("❌ কোনো Pending Challenge নেই!");
                }

                if (game.player1 === uid) {
                    return message.reply("❌ নিজের Challenge Accept করতে পারবে না!");
                }

                game.player2 = uid;
                game.turn = game.player1;
                game.status = "playing";

                getPlayer(data, uid);
                getPlayer(data, game.player1);

                saveData(data);

                return sendBoard(message, game, key);
            }

            // START SOLO / DUO
            if (action === "solo" || action === "duo") {
                const oldGame = data.games[key];

                if (
                    oldGame &&
                    ["playing", "waiting"].includes(oldGame.status)
                ) {
                    return message.reply(
                        "⚠️ এই গ্রুপে ইতিমধ্যে একটি Game চলছে!"
                    );
                }

                const game = createGame(uid, action);

                getPlayer(data, uid);
                data.games[key] = game;

                saveData(data);

                if (action === "duo") {
                    return message.reply(
                        "⚔️ DUO CHALLENGE!\n\n" +
                        `👤 Challenger: ${uid}\n\n` +
                        "অন্য সদস্য লিখবে:\n" +
                        "👉 bom accept"
                    );
                }

                return sendBoard(message, game, key);
            }

            return message.reply("❌ ভুল Command! লিখো: bom help");

        } catch (error) {
            console.error("BOM START ERROR:", error);
            return message.reply("❌ BOM ERROR: " + error.message);
        }
    },

    // ============================
    // ON REPLY
    // ============================

    onReply: async function ({ message, event, Reply }) {
        try {
            const data = loadData();

            const key = String(Reply.gameKey);
            const game = data.games[key];
            const uid = String(event.senderID);

            if (!game || game.status !== "playing") {
                return message.reply("❌ এই Game আর চালু নেই!");
            }

            if (String(event.threadID) !== key) {
                return;
            }

            // Player permission
            if (
                game.mode === "solo" &&
                uid !== game.player1
            ) {
                return message.reply("❌ এটি অন্য Player-এর Solo Game!");
            }

            if (
                game.mode === "duo" &&
                uid !== game.player1 &&
                uid !== game.player2
            ) {
                return message.reply("❌ তুমি এই Game-এর Player নও!");
            }

            // Duo turn
            if (game.mode === "duo" && uid !== game.turn) {
                return message.reply("⏳ এখন অন্য Player-এর Turn!");
            }

            // Read reply number
            const text = String(event.body || "").trim();
            const match = text.match(/^([1-5])\s+([1-5])$/);

            if (!match) {
                return message.reply(
                    "❌ শুধু Row এবং Column লিখো!\n" +
                    "উদাহরণ: 2 3"
                );
            }

            const row = Number(match[1]);
            const col = Number(match[2]);
            const index = (row - 1) * SIZE + (col - 1);

            if (game.revealed.includes(index)) {
                return message.reply("⚠️ এই Box আগেই খোলা হয়েছে!");
            }

            game.revealed.push(index);

            // BOMB FOUND
            if (game.bombs.includes(index)) {
                if (game.mode === "duo") {
                    const winner = uid === game.player1
                        ? game.player2
                        : game.player1;

                    finishGame(data, game, winner, uid);
                } else {
                    finishGame(data, game, null, uid);
                }

                saveData(data);

                await sendBoard(message, game, key);

                if (game.mode === "duo") {
                    return message.reply(
                        `💥 BOOM! ${uid} Bomb পেয়েছে!\n` +
                        `🏆 Winner: ${game.winner}\n` +
                        `❌ Loser: ${uid}`
                    );
                }

                return message.reply("💥 BOOM! তুমি Bomb পেয়েছ! Game Over!");
            }

            // SAFE BOX
            getPlayer(data, uid).points++;

            // ALL SAFE BOXES FOUND
            if (game.revealed.length === SAFE_COUNT) {
                finishGame(data, game, uid, null);
                saveData(data);

                await sendBoard(message, game, key);

                return message.reply(
                    `🏆 CONGRATULATIONS!\n` +
                    `🎉 Winner: ${uid}`
                );
            }

            // CHANGE DUO TURN
            if (game.mode === "duo") {
                game.turn = uid === game.player1
                    ? game.player2
                    : game.player1;
            }

            saveData(data);

            return sendBoard(message, game, key);

        } catch (error) {
            console.error("BOM REPLY ERROR:", error);
            return message.reply("❌ REPLY ERROR: " + error.message);
        }
    }
};
