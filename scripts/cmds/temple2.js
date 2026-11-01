
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const DIR = path.join(__dirname, "temple2_data");
const FILE = path.join(DIR, "games.json");
const BG = path.join(__dirname, "rainbow_bg.png");

const COLORS = {
    RED: "#ff3045",
    BLUE: "#168cff",
    GREEN: "#20e875",
    YELLOW: "#ffe52e",
    ORANGE: "#ff8b20",
    PURPLE: "#c52dff"
};

const NAMES = Object.keys(COLORS);
const ALIAS = {
    R: "RED", B: "BLUE", G: "GREEN",
    Y: "YELLOW", O: "ORANGE", P: "PURPLE"
};

const LENGTH = 4;
const MAX = 10;

let bgCache = null;

// ==========================================
// DATABASE
// ==========================================

function loadData() {
    if (!fs.existsSync(DIR))
        fs.mkdirSync(DIR, { recursive: true });

    if (!fs.existsSync(FILE)) {
        fs.writeFileSync(FILE, JSON.stringify({
            games: {},
            leaderboard: {}
        }, null, 2));
    }

    try {
        const d = JSON.parse(fs.readFileSync(FILE, "utf8"));
        d.games ||= {};
        d.leaderboard ||= {};
        return d;
    } catch (e) {
        return { games: {}, leaderboard: {} };
    }
}

function saveData(d) {
    fs.mkdirSync(DIR, { recursive: true });
    const temp = FILE + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(d, null, 2));
    fs.renameSync(temp, FILE);
}

function player(d, id) {
    if (!d.leaderboard[id]) {
        d.leaderboard[id] = {
            points: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            games: 0
        };
    }
    return d.leaderboard[id];
}

// ==========================================
// GAME ENGINE
// ==========================================

function randomCode() {
    const a = [...NAMES];

    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }

    return a.slice(0, LENGTH);
}

function createGame(uid, mode) {
    return {
        mode,
        status: mode === "duo" ? "waiting" : "playing",
        player1: uid,
        player2: null,
        turn: uid,
        secret: randomCode(),
        guesses: [],
        winner: null,
        loser: null
    };
}

function checkGuess(secret, guess) {
    let exact = 0;
    let close = 0;

    const a = [];
    const b = [];

    for (let i = 0; i < LENGTH; i++) {
        if (secret[i] === guess[i]) {
            exact++;
        } else {
            a.push(secret[i]);
            b.push(guess[i]);
        }
    }

    for (const color of b) {
        const index = a.indexOf(color);
        if (index !== -1) {
            close++;
            a.splice(index, 1);
        }
    }

    return { exact, close };
}

function finishGame(d, g, winner, loser) {
    if (g.status === "finished") return;

    g.status = "finished";
    g.winner = winner || null;
    g.loser = loser || null;

    if (winner) {
        const w = player(d, winner);
        w.wins++;
        w.games++;
        w.points += 20;

        if (loser) {
            const l = player(d, loser);
            l.losses++;
            l.games++;
        }
    } else if (g.mode === "solo") {
        if (loser) {
            const p = player(d, loser);
            p.losses++;
            p.games++;
        }
    } else {
        for (const id of [g.player1, g.player2]) {
            if (id) {
                const p = player(d, id);
                p.draws++;
                p.games++;
            }
        }
    }
}

// ==========================================
// BACKGROUND
// ==========================================

async function getBG() {
    if (!fs.existsSync(BG)) {
        throw new Error(
            "rainbow_bg.png পাওয়া যায়নি! " +
            "ছবিটি temple2.js-এর একই ফোল্ডারে রাখো।"
        );
    }

    if (!bgCache) bgCache = loadImage(BG);

    try {
        return await bgCache;
    } catch (e) {
        bgCache = null;
        throw e;
    }
}

// ==========================================
// DRAW HELPERS
// ==========================================

function orb(ctx, x, y, color, r = 23) {
    ctx.save();

    const grad = ctx.createRadialGradient(
        x - r * 0.35, y - r * 0.4, 2,
        x, y, r
    );

    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.25, color);
    grad.addColorStop(1, "#100b35");

    ctx.shadowColor = color;
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

function txt(ctx, value, x, y, size = 20, color = "#ffffff") {
    ctx.save();
    ctx.font = `bold ${size}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 4;
    ctx.fillText(String(value), x, y);
    ctx.restore();
}

function panel(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = "rgba(7,5,30,0.94)";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(211,155,255,0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

// ==========================================
// DRAW FULL GAME IMAGE
// ==========================================

async function drawBoard(g) {
    const bg = await getBG();

    const canvas = createCanvas(1374, 1145);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(bg, 0, 0, 1374, 1145);

    // SECRET CODE
    panel(ctx, 445, 285, 490, 125);

    const sx = [520, 630, 740, 850];

    for (let i = 0; i < 4; i++) {
        if (g.status === "finished") {
            orb(ctx, sx[i], 348, COLORS[g.secret[i]], 34);
        } else {
            orb(ctx, sx[i], 348, "#32165f", 34);
            txt(ctx, "?", sx[i], 348, 35, "#d4a2ff");
        }
    }

    // STATUS
    panel(ctx, 1080, 225, 235, 235);

    txt(ctx, "MODE: " + g.mode.toUpperCase(),
        1197, 260, 22, "#35ff9a");

    txt(ctx, `ATTEMPTS: ${g.guesses.length}/${MAX}`,
        1197, 310, 20);

    if (g.status === "playing" && g.mode === "duo") {
        txt(ctx, "CURRENT TURN", 1197, 365, 18, "#ffe45c");
        txt(ctx, String(g.turn).slice(-10), 1197, 400, 17);
    } else if (g.status === "finished") {
        txt(ctx, g.winner ? "WINNER!" : "GAME OVER",
            1197, 370, 24,
            g.winner ? "#ffe45c" : "#ff5969");

        txt(ctx, g.winner || "NO WINNER",
            1197, 410, 17);
    } else {
        txt(ctx, "STATUS: PLAYING",
            1197, 375, 20, "#49ffb0");
    }

    // GUESS HISTORY
    const visible = g.guesses.slice(-5);
    const rowY = [555, 615, 675, 735, 795];
    const ballX = [525, 585, 645, 705];

    visible.forEach((item, i) => {
        const y = rowY[i];

        panel(ctx, 475, y - 27, 475, 54);

        txt(
            ctx,
            g.guesses.length - visible.length + i + 1,
            485, y, 17, "#ffe45c"
        );

        item.guess.forEach((color, j) => {
            orb(ctx, ballX[j], y, COLORS[color], 19);
        });

        txt(ctx, `E:${item.exact}`,
            790, y, 17, "#49ff9c");

        txt(ctx, `C:${item.close}`,
            875, y, 17, "#ffe45c");
    });

    // FOOTER
    panel(ctx, 385, 955, 600, 90);

    if (g.status === "playing") {
        txt(ctx, "REPLY WITH 4 COLORS",
            685, 985, 27);

        txt(ctx, "RED BLUE GREEN YELLOW",
            685, 1018, 23, "#ffe45c");
    } else {
        txt(ctx, g.winner
            ? "RAINBOW CODE CRACKED!"
            : "GAME FINISHED",
            685, 985, 25,
            g.winner ? "#ffe45c" : "#ff7585");

        txt(ctx, g.secret.join(" "),
            685, 1018, 21);
    }

    return canvas.createPNGStream();
}

// ==========================================
// SEND IMAGE + REGISTER REPLY
// ==========================================

async function sendBoard(message, g, key) {
    const attachment = await drawBoard(g);

    let body = "🌈 TEMPLE2 - RAINBOW MYSTERY\n\n";

    if (g.status === "playing") {
        body +=
            `🎮 Mode: ${g.mode.toUpperCase()}\n` +
            `🎯 Attempts: ${g.guesses.length}/${MAX}\n`;

        if (g.mode === "duo") {
            body += `⏳ Current Turn: ${g.turn}\n`;
        }

        body +=
            "\n📸 ছবিতে Reply করে ৪টি রং লিখো:\n\n" +
            "🔴 RED | 🔵 BLUE | 🟢 GREEN\n" +
            "🟡 YELLOW | 🟠 ORANGE | 🟣 PURPLE\n\n" +
            "Example: RED BLUE GREEN YELLOW\n\n" +
            "E = সঠিক রং ও অবস্থান\n" +
            "C = সঠিক রং, ভুল অবস্থান\n\n" +
            "Short form: R B G Y";
    } else {
        body +=
            "\n🏁 GAME FINISHED!\n" +
            `🏆 Winner: ${g.winner || "Nobody"}\n` +
            `🔐 Secret: ${g.secret.join(" ")}`;
    }

    return new Promise((resolve, reject) => {
        message.reply(
            { body, attachment },
            (error, info) => {
                if (error) {
                    console.error("[TEMPLE2] Image send error:", error);
                    reject(error);
                    return;
                }

                if (
                    g.status === "playing" &&
                    info &&
                    info.messageID
                ) {
                    if (!global.GoatBot.onReply) {
                        global.GoatBot.onReply = new Map();
                    }

                    global.GoatBot.onReply.set(info.messageID, {
                        commandName: "temple2",
                        gameKey: key
                    });
                }

                resolve(info);
            }
        );
    });
}

// ==========================================
// GUESS PARSER
// ==========================================

function parseGuess(input) {
    const parts = String(input || "")
        .trim()
        .toUpperCase()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(x => ALIAS[x] || x);

    if (parts.length !== 4) {
        return { error: "❌ ঠিক ৪টি রং লিখো!\nExample: RED BLUE GREEN YELLOW" };
    }

    if (parts.some(x => !NAMES.includes(x))) {
        return { error: "❌ ভুল রং! RED BLUE GREEN YELLOW ORANGE PURPLE ব্যবহার করো।" };
    }

    if (new Set(parts).size !== 4) {
        return { error: "⚠️ চারটি আলাদা রং ব্যবহার করো!" };
    }

    return { guess: parts };
}

// ==========================================
// MAIN COMMAND
// ==========================================

module.exports = {
    config: {
        name: "temple2",
        version: "1.0.0",
        author: "Si Fat",
        countDown: 3,
        role: 0,
        shortDescription: "Rainbow Mystery Game",
        longDescription: "Crack the magical secret color code",
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
                    "🌈 TEMPLE2 - RAINBOW MYSTERY\n\n" +
                    "🎮 temple2 solo\n" +
                    "⚔️ temple2 duo\n" +
                    "✅ temple2 accept\n" +
                    "🏆 temple2 rank\n\n" +
                    "🔐 ৪টি গোপন রং Guess করো!\n" +
                    "🟢 EXACT = সঠিক রং ও অবস্থান\n" +
                    "🟡 CLOSE = সঠিক রং, ভুল অবস্থান\n\n" +
                    "রং: RED BLUE GREEN YELLOW ORANGE PURPLE\n\n" +
                    "Example: RED BLUE GREEN YELLOW\n" +
                    "❤️ Maximum 10 attempts!"
                );
            }

            // RANK
            if (action === "rank") {
                const list = Object.entries(data.leaderboard)
                    .sort((a, b) =>
                        b[1].wins - a[1].wins ||
                        b[1].points - a[1].points
                    )
                    .slice(0, 10);

                if (!list.length) {
                    return message.reply("🏆 এখনো কোনো Player নেই!");
                }

                let out = "🌈 TEMPLE2 TOP RANK\n\n";

                list.forEach(([id, p], i) => {
                    out +=
                        `${i + 1}. ${id}\n` +
                        `⭐ Points: ${p.points}\n` +
                        `🏆 Wins: ${p.wins}\n` +
                        `❌ Losses: ${p.losses}\n` +
                        `🤝 Draws: ${p.draws}\n` +
                        `🎮 Games: ${p.games}\n\n`;
                });

                return message.reply(out);
            }

            // ACCEPT DUO
            if (action === "accept") {
                const g = data.games[key];

                if (!g || g.status !== "waiting") {
                    return message.reply("❌ কোনো Pending Challenge নেই!");
                }

                if (g.player1 === uid) {
                    return message.reply("❌ নিজের Challenge Accept করা যাবে না!");
                }

                g.player2 = uid;
                g.turn = g.player1;
                g.status = "playing";

                player(data, uid);
                saveData(data);

                return await sendBoard(message, g, key);
            }

            // START GAME
            if (action === "solo" || action === "duo") {
                const old = data.games[key];

                if (old && ["playing", "waiting"].includes(old.status)) {
                    return message.reply(
                        "⚠️ এই গ্রুপে একটি Temple2 Game চলছে!\n" +
                        "আগের Game শেষ করো।"
                    );
                }

                if (action === "solo" && !fs.existsSync(BG)) {
                    return message.reply(
                        "❌ rainbow_bg.png পাওয়া যায়নি!\n" +
                        "ছবিটি temple2.js-এর একই ফোল্ডারে রাখো।"
                    );
                }

                const g = createGame(uid, action);

                player(data, uid);
                data.games[key] = g;
                saveData(data);

                if (action === "duo") {
                    return message.reply(
                        "⚔️ TEMPLE2 DUO CHALLENGE!\n\n" +
                        `👤 Challenger: ${uid}\n\n` +
                        "অন্য Player লিখবে:\ntemple2 accept"
                    );
                }

                return await sendBoard(message, g, key);
            }

            return message.reply("❌ লিখো: temple2 help");

        } catch (error) {
            console.error("[TEMPLE2] START ERROR:", error);
            return message.reply("❌ TEMPLE2 ERROR:\n" + error.message);
        }
    },

    // ==========================================
    // REPLY HANDLER
    // ==========================================

    onReply: async function ({ message, event, Reply }) {
        try {
            const data = loadData();
            const key = String(Reply.gameKey);
            const uid = String(event.senderID);

            if (String(event.threadID) !== key) return;

            const g = data.games[key];

            if (!g || g.status !== "playing") {
                return message.reply("❌ এই Game আর চালু নেই!");
            }

            if (
                g.mode === "solo" &&
                uid !== g.player1
            ) {
                return message.reply("❌ এটি অন্য Player-এর Solo Game!");
            }

            if (
                g.mode === "duo" &&
                uid !== g.player1 &&
                uid !== g.player2
            ) {
                return message.reply("❌ তুমি এই Game-এর Player নও!");
            }

            if (g.mode === "duo" && uid !== g.turn) {
                return message.reply("⏳ এখন অন্য Player-এর Turn!");
            }

            const parsed = parseGuess(event.body);

            if (parsed.error) {
                return message.reply(parsed.error);
            }

            const guess = parsed.guess;

            const duplicate = g.guesses.some(
                item => item.guess.join(",") === guess.join(",")
            );

            if (duplicate) {
                return message.reply(
                    "⚠️ এই Combination আগেই Guess করা হয়েছে!"
                );
            }

            const result = checkGuess(g.secret, guess);

            g.guesses.push({
                player: uid,
                guess,
                exact: result.exact,
                close: result.close
            });

            // WIN
            if (result.exact === LENGTH) {
                const loser = g.mode === "duo"
                    ? (uid === g.player1 ? g.player2 : g.player1)
                    : null;

                finishGame(data, g, uid, loser);
                saveData(data);

                await sendBoard(message, g, key);

                return message.reply(
                    "🌈 RAINBOW CODE CRACKED!\n\n" +
                    `🏆 WINNER: ${uid}\n` +
                    "⭐ +20 Points!\n🎉 অসাধারণ খেলেছো!"
                );
            }

            // MAX ATTEMPTS
            if (g.guesses.length >= MAX) {
                finishGame(data, g, null, null);
                saveData(data);

                await sendBoard(message, g, key);

                return message.reply(
                    "😢 সব Attempt শেষ!\n" +
                    "🤝 কেউ Secret Code বের করতে পারেনি!\n" +
                    `🔐 Answer: ${g.secret.join(" ")}`
                );
            }

            // DUO TURN
            if (g.mode === "duo") {
                g.turn = uid === g.player1
                    ? g.player2
                    : g.player1;
            }

            saveData(data);

            await sendBoard(message, g, key);

            return message.reply(
                "🎯 GUESS RESULT\n\n" +
                `🟢 EXACT: ${result.exact}\n` +
                `🟡 CLOSE: ${result.close}\n\n` +
                `🎮 Attempts: ${g.guesses.length}/${MAX}\n` +
                (g.mode === "duo"
                    ? `⏳ Next Turn: ${g.turn}`
                    : "🌈 আবার চেষ্টা করো!")
            );

        } catch (error) {
            console.error("[TEMPLE2] REPLY ERROR:", error);
            return message.reply("❌ REPLY ERROR:\n" + error.message);
        }
    }
};
