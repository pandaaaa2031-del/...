
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

const DATA_DIR = path.join(__dirname, "temple_data");
const DATA_FILE = path.join(DATA_DIR, "games.json");

const SIZE = 5;
const KEY_COUNT = 3;
const TRAP_COUNT = 5;
const MAX_LIVES = 3;

function loadData() {
    if (!fs.existsSync(DATA_DIR))
        fs.mkdirSync(DATA_DIR, { recursive: true });

    if (!fs.existsSync(DATA_FILE))
        fs.writeFileSync(DATA_FILE, JSON.stringify({
            games: {}, leaderboard: {}
        }, null, 2));

    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
        data.games ||= {};
        data.leaderboard ||= {};
        return data;
    } catch (e) {
        return { games: {}, leaderboard: {} };
    }
}

function saveData(data) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getPlayer(data, uid) {
    if (!data.leaderboard[uid]) {
        data.leaderboard[uid] = {
            points: 0, wins: 0, losses: 0, games: 0, keys: 0
        };
    }
    return data.leaderboard[uid];
}

function randomPositions(count, excluded = []) {
    const positions = [];
    while (positions.length < count) {
        const n = Math.floor(Math.random() * 25);
        if (!positions.includes(n) && !excluded.includes(n))
            positions.push(n);
    }
    return positions;
}

function createGame(uid, mode) {
    const keys = randomPositions(KEY_COUNT);
    return {
        mode,
        status: mode === "duo" ? "waiting" : "playing",
        player1: uid,
        player2: null,
        turn: uid,
        keys,
        traps: randomPositions(TRAP_COUNT, keys),
        revealed: [],
        lives: MAX_LIVES,
        keysFound: 0,
        trapsFound: 0
    };
}

function finishGame(data, game, winner, loser) {
    if (game.status === "finished") return;

    game.status = "finished";
    game.winner = winner || null;
    game.loser = loser || null;

    if (winner) {
        const p = getPlayer(data, winner);
        p.wins++;
        p.games++;
        p.points += 20;
    }

    if (loser) {
        const p = getPlayer(data, loser);
        p.losses++;
        p.games++;
    }
}

// =================================
// CANVAS BOARD
// =================================

function drawBoard(game) {
    const canvas = createCanvas(650, 760);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#641f59";
    ctx.fillRect(0, 0, 650, 760);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "bold 40px Arial";
    ctx.fillText("TEMPLE ESCAPE", 325, 65);

    ctx.font = "23px Arial";
    ctx.fillText("Find 3 Ancient Keys!", 325, 110);

    const startX = 115;
    const startY = 190;
    const cell = 82;
    const gap = 8;

    ctx.font = "bold 25px Arial";

    for (let c = 0; c < SIZE; c++) {
        const x = startX + c * (cell + gap);
        ctx.fillStyle = "#292929";
        ctx.fillRect(x, 130, cell, 45);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(String(c + 1), x + cell / 2, 152);
    }

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
            const key = game.keys.includes(index);
            const trap = game.traps.includes(index);
            const revealAll = game.status === "finished";

            let color = "#eeeeee";

            if ((opened || revealAll) && trap)
                color = "#e53935";
            else if ((opened || revealAll) && key)
                color = "#ffd54f";
            else if (opened)
                color = "#36c878";

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(x, y, cell, cell, 12);
            ctx.fill();

            if (opened || (revealAll && (key || trap))) {
                ctx.fillStyle = "#222222";
                ctx.font = "bold 32px Arial";
                ctx.fillText(
                    trap ? "X" : key ? "K" : "✓",
                    x + cell / 2,
                    y + cell / 2
                );
            }
        }
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(70, 650, 510, 3);

    ctx.textAlign = "left";
    ctx.font = "bold 27px Arial";
    ctx.fillText(`KEYS: ${game.keysFound}/3`, 90, 695);
    ctx.fillText(`LIVES: ${game.lives}/3`, 350, 695);

    ctx.textAlign = "center";
    ctx.font = "bold 20px Arial";
    ctx.fillText(
        game.status === "finished"
            ? "TEMPLE CHALLENGE COMPLETE"
            : "FIND THE ANCIENT KEYS",
        325, 735
    );

    const stream = canvas.createPNGStream();
    stream.path = `temple_${Date.now()}.png`;
    return stream;
}

// =================================
// SEND BOARD
// =================================

function sendBoard(message, game, key) {
    const attachment = drawBoard(game);

    let body = "🏛️ TEMPLE ESCAPE";

    if (game.status === "playing") {
        body += "\n\n";

        if (game.mode === "duo")
            body += `🎮 Current Turn: ${game.turn}\n`;

        body +=
            `🔑 Keys: ${game.keysFound}/3\n` +
            `❤️ Lives: ${game.lives}/3\n\n` +
            "📸 ছবিতে Reply করে Row এবং Column লিখো।\n" +
            "উদাহরণ: 3 4";
    } else {
        body += "\n\n🏁 GAME FINISHED!";
    }

    return message.reply({ body, attachment }, (error, info) => {
        if (error) {
            console.error("TEMPLE IMAGE ERROR:", error);
            return;
        }

        if (game.status === "playing" && info?.messageID) {
            if (!global.GoatBot.onReply)
                global.GoatBot.onReply = new Map();

            global.GoatBot.onReply.set(info.messageID, {
                commandName: "temple",
                gameKey: key
            });
        }
    });
}

// =================================
// COMMAND
// =================================

module.exports = {
    config: {
        name: "temple",
        version: "2.0.0",
        author: "Riyad",
        countDown: 3,
        role: 0,
        shortDescription: "Temple Escape Game",
        longDescription: "Find ancient keys and escape the temple",
        category: "game",
        guide: {
            en: "{pn} solo | duo | accept | rank | help"
        }
    },

    onStart: async function ({ message, event, args }) {
        try {
            const data = loadData();
            const key = String(event.threadID);
            const uid = String(event.senderID);
            const action = String(args?.[0] || "help").toLowerCase();

            if (action === "help") {
                return message.reply(
                    "🏛️ TEMPLE ESCAPE\n\n" +
                    "🎮 temple solo\n" +
                    "⚔️ temple duo\n" +
                    "✅ temple accept\n" +
                    "🏆 temple rank\n\n" +
                    "🔑 Find 3 Keys!\n" +
                    "⚠️ Avoid Traps!\n" +
                    "❤️ 3 Lives\n\n" +
                    "📸 ছবিতে Reply করো: 3 4"
                );
            }

            if (action === "rank") {
                const players = Object.entries(data.leaderboard)
                    .sort((a, b) =>
                        b[1].wins - a[1].wins ||
                        b[1].points - a[1].points
                    ).slice(0, 10);

                if (!players.length)
                    return message.reply("🏆 এখনো কোনো Player নেই!");

                let output = "🏆 TEMPLE ESCAPE RANK\n\n";

                players.forEach(([id, p], i) => {
                    output +=
                        `${i + 1}. ${id}\n` +
                        `⭐ Points: ${p.points}\n` +
                        `🏆 Wins: ${p.wins}\n` +
                        `❌ Losses: ${p.losses}\n` +
                        `🎮 Games: ${p.games}\n\n`;
                });

                return message.reply(output);
            }

            if (action === "accept") {
                const game = data.games[key];

                if (!game || game.status !== "waiting")
                    return message.reply("❌ কোনো Pending Challenge নেই!");

                if (game.player1 === uid)
                    return message.reply("❌ নিজের Challenge Accept করা যাবে না!");

                game.player2 = uid;
                game.turn = game.player1;
                game.status = "playing";

                getPlayer(data, uid);
                saveData(data);

                return sendBoard(message, game, key);
            }

            if (action === "solo" || action === "duo") {
                const old = data.games[key];

                if (old && ["playing", "waiting"].includes(old.status))
                    return message.reply("⚠️ এই গ্রুপে একটি Game চলছে!");

                const game = createGame(uid, action);
                getPlayer(data, uid);
                data.games[key] = game;
                saveData(data);

                if (action === "duo") {
                    return message.reply(
                        "⚔️ TEMPLE DUO CHALLENGE!\n\n" +
                        `👤 Challenger: ${uid}\n\n` +
                        "অন্য সদস্য লিখবে: temple accept"
                    );
                }

                return sendBoard(message, game, key);
            }

            return message.reply("❌ লিখো: temple help");

        } catch (error) {
            console.error("TEMPLE START ERROR:", error);
            return message.reply("❌ TEMPLE ERROR: " + error.message);
        }
    },

    onReply: async function ({ message, event, Reply }) {
        try {
            const data = loadData();
            const key = String(Reply.gameKey);
            const game = data.games[key];
            const uid = String(event.senderID);

            if (!game || game.status !== "playing")
                return message.reply("❌ এই Game আর চালু নেই!");

            if (String(event.threadID) !== key) return;

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

            if (game.mode === "duo" && uid !== game.turn)
                return message.reply("⏳ এখন অন্য Player-এর Turn!");

            const match = String(event.body || "")
                .trim()
                .match(/^([1-5])\s+([1-5])$/);

            if (!match) {
                return message.reply(
                    "❌ শুধু Row এবং Column লিখো!\nউদাহরণ: 3 4"
                );
            }

            const row = Number(match[1]);
            const col = Number(match[2]);
            const index = (row - 1) * SIZE + (col - 1);

            if (game.revealed.includes(index))
                return message.reply("⚠️ এই Box আগেই খোলা হয়েছে!");

            game.revealed.push(index);

            const player = getPlayer(data, uid);

            // TRAP
            if (game.traps.includes(index)) {
                game.trapsFound++;
                game.lives--;

                if (game.lives <= 0) {
                    if (game.mode === "duo") {
                        const winner = uid === game.player1
                            ? game.player2 : game.player1;
                        finishGame(data, game, winner, uid);
                    } else {
                        finishGame(data, game, null, uid);
                    }

                    saveData(data);
                    await sendBoard(message, game, key);

                    return message.reply(
                        game.mode === "duo"
                            ? `💥 Trap! Winner: ${game.winner}`
                            : "💥 সব Life শেষ! GAME OVER!"
                    );
                }

                if (game.mode === "duo") {
                    game.turn = uid === game.player1
                        ? game.player2 : game.player1;
                }

                saveData(data);
                await sendBoard(message, game, key);

                return message.reply(
                    `💥 TRAP FOUND!\n❤️ Remaining Lives: ${game.lives}`
                );
            }

            // KEY
            if (game.keys.includes(index)) {
                game.keysFound++;
                player.keys++;
                player.points += 5;

                if (game.keysFound >= KEY_COUNT) {
                    finishGame(data, game, uid, null);
                    saveData(data);
                    await sendBoard(message, game, key);

                    return message.reply(
                        "🏛️ TEMPLE UNLOCKED!\n" +
                        "🔑 সব Ancient Key পাওয়া গেছে!\n" +
                        `🏆 WINNER: ${uid}\n⭐ +20 Bonus Points!`
                    );
                }

                if (game.mode === "duo") {
                    game.turn = uid === game.player1
                        ? game.player2 : game.player1;
                }

                saveData(data);
                await sendBoard(message, game, key);

                return message.reply(
                    `🔑 KEY FOUND!\n` +
                    `Keys: ${game.keysFound}/3\n` +
                    `❤️ Lives: ${game.lives}`
                );
            }

            // SAFE
            player.points++;

            if (game.mode === "duo") {
                game.turn = uid === game.player1
                    ? game.player2 : game.player1;
            }

            saveData(data);
            return sendBoard(message, game, key);

        } catch (error) {
            console.error("TEMPLE REPLY ERROR:", error);
            return message.reply("❌ REPLY ERROR: " + error.message);
        }
    }
};
