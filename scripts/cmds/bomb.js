const fs = require("fs");
const path = require("path");

// Terminal compatibility
if (process.stderr) {
    if (typeof process.stderr.clearLine !== "function") {
        process.stderr.clearLine = function () {
            return false;
        };
    }

    if (typeof process.stderr.cursorTo !== "function") {
        process.stderr.cursorTo = function () {
            return false;
        };
    }
}

const DATA_DIR = path.join(__dirname, "bomb_data");
const DATA_FILE = path.join(DATA_DIR, "games.json");

const SIZE = 5;
const SAFE_COUNT = 20;
const BOMB_COUNT = 5;

function loadData() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(
                DATA_FILE,
                JSON.stringify({
                    games: {},
                    leaderboard: {}
                }, null, 2)
            );
        }

        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        data.games = data.games || {};
        data.leaderboard = data.leaderboard || {};

        return data;
    } catch (error) {
        console.error("Bomb Data Error:", error);
        return {
            games: {},
            leaderboard: {}
        };
    }
}

function saveData(data) {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2)
    );
}

function createBoard() {
    const bombs = new Set();

    while (bombs.size < BOMB_COUNT) {
        bombs.add(
            Math.floor(Math.random() * SIZE * SIZE)
        );
    }

    return [...bombs];
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

function createGame(uid, mode) {
    return {
        status: mode === "duo" ? "waiting" : "playing",
        mode: mode,
        player1: uid,
        player2: null,
        turn: uid,
        bombs: createBoard(),
        revealed: [],
        scores: {},
        winner: null,
        loser: null
    };
}

function renderBoard(game) {
    let output = "💣 BOMB FINDER\n";
    output += "━━━━━━━━━━━━━━━━━━\n\n";
    output += "   1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣\n";

    for (let r = 0; r < SIZE; r++) {
        output += `${r + 1}️⃣ `;

        for (let c = 0; c < SIZE; c++) {
            const index = r * SIZE + c;

            if (game.revealed.includes(index)) {
                output += game.bombs.includes(index)
                    ? "💣 "
                    : "🟩 ";
            } else if (
                game.status === "finished" &&
                game.bombs.includes(index)
            ) {
                output += "💣 ";
            } else {
                output += "⬜ ";
            }
        }

        output += "\n";
    }

    const safeFound = game.revealed.filter(
        index => !game.bombs.includes(index)
    ).length;

    output += "\n━━━━━━━━━━━━━━━━━━\n";
    output += `🟩 Safe: ${safeFound}/${SAFE_COUNT}\n`;
    output += `💣 Bombs: ${BOMB_COUNT}\n`;

    if (game.status === "playing" && game.mode === "duo") {
        output += `🎮 Turn: ${game.turn}\n`;
    }

    return output;
}

function finishGame(data, game, winner, loser) {
    game.status = "finished";
    game.winner = winner || null;
    game.loser = loser || null;

    if (winner) {
        const p = getPlayer(data, winner);
        p.wins++;
        p.games++;
        p.points += 10;
    }

    if (loser) {
        const p = getPlayer(data, loser);
        p.losses++;
        p.games++;
    }

    if (game.mode === "solo") {
        const p = getPlayer(data, game.player1);
        p.games++;
    }
}

module.exports = {
    config: {
        name: "bomb",
        version: "2.1.0",
        author: "Riyad",
        countDown: 3,
        role: 0,
        shortDescription: "Bomb Finder Game",
        longDescription: "Solo and Duo Multiplayer Bomb Game",
        category: "game",
        guide: {
            en: "{pn} solo | duo | accept | move <row> <column> | rank | help"
        }
    },

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
                    "💣 BOMB FINDER\n\n" +
                    "🎮 bomb solo\n" +
                    "⚔️ bomb duo\n" +
                    "✅ bomb accept\n" +
                    "🔢 bomb move 2 3\n" +
                    "🏆 bomb rank\n\n" +
                    "🟩 Green = Safe\n" +
                    "💣 Bomb = Game Over\n"
                );
            }

            // LEADERBOARD
            if (action === "rank") {
                const players = Object.entries(
                    data.leaderboard
                ).sort((a, b) =>
                    b[1].wins - a[1].wins ||
                    b[1].points - a[1].points
                ).slice(0, 10);

                if (!players.length) {
                    return message.reply(
                        "🏆 No players yet!"
                    );
                }

                let output = "🏆 BOMB LEADERBOARD\n\n";

                players.forEach(([id, stats], index) => {
                    output +=
                        `${index + 1}. ${id}\n` +
                        `⭐ Points: ${stats.points}\n` +
                        `🏆 Wins: ${stats.wins}\n` +
                        `❌ Losses: ${stats.losses}\n\n`;
                });

                return message.reply(output);
            }

            // ACCEPT CHALLENGE
            if (action === "accept") {
                const game = data.games[key];

                if (!game || game.status !== "waiting") {
                    return message.reply(
                        "❌ No pending challenge!"
                    );
                }

                if (game.player1 === uid) {
                    return message.reply(
                        "❌ Cannot accept your own challenge!"
                    );
                }

                game.player2 = uid;
                game.turn = game.player1;
                game.status = "playing";

                game.scores[game.player1] = 0;
                game.scores[uid] = 0;

                getPlayer(data, uid);
                getPlayer(data, game.player1);

                saveData(data);

                return message.reply(
                    "⚔️ CHALLENGE ACCEPTED!\n\n" +
                    `👤 Player 1: ${game.player1}\n` +
                    `👤 Player 2: ${uid}\n\n` +
                    "🎮 Game Started!\n" +
                    `👉 First Turn: ${game.player1}\n\n` +
                    renderBoard(game) +
                    "\nUse: bomb move 2 3"
                );
            }

            // START GAME
            if (action === "solo" || action === "duo") {
                const oldGame = data.games[key];

                if (
                    oldGame &&
                    ["playing", "waiting"].includes(oldGame.status)
                ) {
                    return message.reply(
                        "⚠️ A game is already running!"
                    );
                }

                const game = createGame(uid, action);

                getPlayer(data, uid);

                if (action === "duo") {
                    data.games[key] = game;
                    saveData(data);

                    return message.reply(
                        "⚔️ DUO CHALLENGE!\n\n" +
                        `👤 Challenger: ${uid}\n\n` +
                        "Another member can join using:\n" +
                        "👉 bomb accept\n\n" +
                        "⏳ Waiting for opponent..."
                    );
                }

                game.scores[uid] = 0;
                data.games[key] = game;

                saveData(data);

                return message.reply(
                    "🎮 SOLO GAME STARTED!\n\n" +
                    renderBoard(game) +
                    "\n👉 bomb move 2 3"
                );
            }

            // MOVE
            if (action === "move") {
                const game = data.games[key];

                if (!game || game.status !== "playing") {
                    return message.reply(
                        "❌ No active game!"
                    );
                }

                if (
                    game.mode === "duo" &&
                    uid !== game.player1 &&
                    uid !== game.player2
                ) {
                    return message.reply(
                        "❌ You are not a player!"
                    );
                }

                if (
                    game.mode === "duo" &&
                    game.turn !== uid
                ) {
                    return message.reply(
                        "⏳ Wait for your turn!"
                    );
                }

                if (
                    game.mode === "solo" &&
                    game.player1 !== uid
                ) {
                    return message.reply(
                        "❌ This is not your game!"
                    );
                }

                const row = Number(args[1]);
                const col = Number(args[2]);

                if (
                    !Number.isInteger(row) ||
                    !Number.isInteger(col) ||
                    row < 1 || row > SIZE ||
                    col < 1 || col > SIZE
                ) {
                    return message.reply(
                        "❌ Invalid position!\n" +
                        "Example: bomb move 2 3"
                    );
                }

                const index = (row - 1) * SIZE + (col - 1);

                if (game.revealed.includes(index)) {
                    return message.reply(
                        "⚠️ This box is already opened!"
                    );
                }

                // BOMB
                if (game.bombs.includes(index)) {
                    game.revealed.push(index);

                    if (game.mode === "duo") {
                        const opponent =
                            uid === game.player1
                                ? game.player2
                                : game.player1;

                        finishGame(
                            data,
                            game,
                            opponent,
                            uid
                        );

                        saveData(data);

                        return message.reply(
                            "💥 BOOM! BOMB FOUND!\n\n" +
                            renderBoard(game) +
                            `\n🏆 WINNER: ${opponent}` +
                            `\n❌ LOSER: ${uid}`
                        );
                    }

                    finishGame(data, game, null, uid);
                    saveData(data);

                    return message.reply(
                        "💥 BOOM! BOMB FOUND!\n\n" +
                        renderBoard(game) +
                        "\n❌ GAME OVER!"
                    );
                }

                // SAFE
                game.revealed.push(index);

                game.scores[uid] =
                    (game.scores[uid] || 0) + 1;

                getPlayer(data, uid).points++;

                // WIN
                if (game.revealed.length === SAFE_COUNT) {
                    const opponent =
                        game.mode === "duo"
                            ? (
                                uid === game.player1
                                    ? game.player2
                                    : game.player1
                            )
                            : null;

                    finishGame(
                        data,
                        game,
                        uid,
                        opponent
                    );

                    saveData(data);

                    return message.reply(
                        "🏆 YOU WIN!\n\n" +
                        renderBoard(game) +
                        `\n🎉 WINNER: ${uid}`
                    );
                }

                // CHANGE TURN
                if (game.mode === "duo") {
                    game.turn =
                        uid === game.player1
                            ? game.player2
                            : game.player1;
                }

                saveData(data);

                return message.reply(
                    "✅ SAFE BOX!\n" +
                    `⭐ ${uid}: +1 Point\n\n` +
                    renderBoard(game) +
                    "\n" +
                    (
                        game.mode === "duo"
                            ? `👉 Next Turn: ${game.turn}`
                            : "👉 Next: bomb move 2 3"
                    )
                );
            }

            return message.reply(
                "❌ Invalid command!\nType bomb help"
            );

        } catch (error) {
            console.error("BOMB COMMAND ERROR:", error);

            return message.reply(
                "❌ Bomb Game Error!\n" +
                "Please try again later."
            );
        }
    }
};
