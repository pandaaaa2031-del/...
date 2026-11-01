
const https = require("https");
const http = require("http");
const { Readable } = require("stream");

const games = global.__temple2Games ||
  (global.__temple2Games = new Map());

const scenes = [
  {
    title: "🌲 THE FORGOTTEN JUNGLE",
    image: "https://images.unsplash.com/photo-1511497584788-876760111969?w=1000&q=85",
    story: "You wake up inside a mysterious jungle. Ancient symbols cover a stone wall. Behind you, the entrance collapses.",
    question: "What will you do?",
    options: "A. Examine the ancient symbols\nB. Pull the mysterious vine",
    answer: ["A"],
    hint: "Look for a warning hidden in the carvings."
  },
  {
    title: "🌑 THE SHADOW CHAMBER",
    image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1000&q=85",
    story: "A mysterious voice asks: I follow you in daylight, but disappear in darkness. What am I?",
    question: "Solve the riddle.",
    options: "Type your answer.",
    answer: ["SHADOW"],
    hint: "It appears when light meets an object."
  },
  {
    title: "⚠️ THE BROKEN BRIDGE",
    image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1000&q=85",
    story: "A dangerous canyon blocks your way. A damaged bridge hangs above the abyss.",
    question: "Choose your strategy.",
    options: "A. Run across the bridge\nB. Secure a rope before crossing",
    answer: ["B"],
    hint: "Prepare before taking a dangerous step."
  },
  {
    title: "🪞 THE MIRROR OF SOULS",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ee35b?w=1000&q=85",
    story: "An ancient inscription says: I show your face, but have no eyes. What am I?",
    question: "What is the answer?",
    options: "Type your answer.",
    answer: ["MIRROR"],
    hint: "Look at the object in front of you."
  },
  {
    title: "👑 THE FINAL SANCTUARY",
    image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1000&q=85",
    story: "You discover a golden artifact. A warning says: Greed destroys those who take without understanding.",
    question: "Choose carefully.",
    options: "A. Grab the artifact immediately\nB. Examine the altar first",
    answer: ["B"],
    hint: "Understand the temple before touching its treasure."
  }
];

function downloadImage(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      return reject(new Error("Too many redirects"));
    }

    const client = url.startsWith("https:")
      ? https
      : http;

    client.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    }, response => {

      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume();

        if (!response.headers.location) {
          return reject(new Error("Redirect missing"));
        }

        const next = new URL(
          response.headers.location,
          url
        ).toString();

        return resolve(downloadImage(next, redirects + 1));
      }

      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error("Image HTTP " + response.statusCode));
      }

      const chunks = [];

      response.on("data", chunk => {
        chunks.push(chunk);
      });

      response.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      response.on("error", reject);

    }).on("error", reject);
  });
}

function getKey(event) {
  return `${event.threadID}_${event.senderID}`;
}

function sendText(api, event, text) {
  api.sendMessage(text, event.threadID, null, event.messageID);
}

async function sendScene(api, event, state, customText) {
  const scene = scenes[state.stage];

  const message =
    "╔══════════════════════════╗\n" +
    "   🏛️ CURSE OF THE LOST TEMPLE\n" +
    "╚══════════════════════════╝\n\n" +
    scene.title + "\n\n" +
    (customText || scene.story) + "\n\n" +
    "📜 " + scene.question + "\n\n" +
    scene.options + "\n\n" +
    "❤️ Lives: " + state.lives + "/3\n" +
    "💎 Artifacts: " + state.artifacts + "\n" +
    "🗺️ Level: " + (state.stage + 1) + "/" + scenes.length + "\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "↪ Reply to this message to play.";

  try {
    const buffer = await downloadImage(scene.image);

    if (!buffer || !buffer.length) {
      throw new Error("Empty image");
    }

    const attachment = Readable.from([buffer]);

    attachment.path = "temple-scene-" +
      (state.stage + 1) + ".jpg";

    api.sendMessage({
      body: message,
      attachment: attachment
    }, event.threadID, (err, info) => {

      if (err || !info) {
        console.error("Send image error:", err);

        return sendText(
          api,
          event,
          "❌ Messenger image পাঠাতে পারেনি। আবার চেষ্টা করো।"
        );
      }

      global.GoatBot.onReply.set(info.messageID, {
        commandName: "temple2",
        author: event.senderID,
        gameKey: getKey(event)
      });

    }, event.messageID);

  } catch (error) {
    console.error("Temple image error:", error);

    sendText(
      api,
      event,
      message + "\n\n⚠️ Image load হয়নি। আবার চেষ্টা করো।"
    );
  }
}

module.exports = {
  config: {
    name: "temple2",
    version: "2.0.0",
    author: "SIYAM",
    countDown: 5,
    role: 0,
    shortDescription: "Hard adventure mystery",
    longDescription: "Explore an ancient temple with mysteries, traps and puzzles.",
    category: "game",
    guide: {
      en: "{pn} - Start adventure\n{pn} stop - Stop adventure"
    }
  },

  onStart: async function ({ api, event, args }) {
    const key = getKey(event);

    if (args[0]?.toLowerCase() === "stop") {
      games.delete(key);

      return sendText(
        api,
        event,
        "🛑 Your adventure has ended."
      );
    }

    if (games.has(key)) {
      return sendText(
        api,
        event,
        "⚠️ Already playing!\nReply to your game or type temple2 stop."
      );
    }

    const state = {
      stage: 0,
      lives: 3,
      artifacts: 0
    };

    games.set(key, state);

    await sendScene(api, event, state);
  },

  onReply: async function ({ api, event, Reply }) {
    const state = games.get(Reply.gameKey);

    if (!state) {
      return sendText(
        api,
        event,
        "❌ Game expired! Type temple2 to start again."
      );
    }

    if (String(event.senderID) !== String(Reply.author)) {
      return;
    }

    const answer = (event.body || "")
      .trim()
      .toUpperCase();

    if (!answer) return;

    const scene = scenes[state.stage];

    if (!scene.answer.includes(answer)) {
      state.lives--;

      if (state.lives <= 0) {
        games.delete(Reply.gameKey);

        return sendText(
          api,
          event,
          "💀 GAME OVER!\n\nThe temple has defeated you!\n\n" +
          "🏆 Levels completed: " + state.stage + "\n" +
          "💎 Artifacts: " + state.artifacts + "\n\n" +
          "Type temple2 to try again."
        );
      }

      return sendScene(
        api,
        event,
        state,
        "❌ WRONG ANSWER!\n\n" +
        scene.hint +
        "\n\n❤️ Lives remaining: " + state.lives
      );
    }

    state.artifacts++;
    state.stage++;

    if (state.stage >= scenes.length) {
      games.delete(Reply.gameKey);

      return sendText(
        api,
        event,
        "╔══════════════════════════╗\n" +
        "    👑 TEMPLE CONQUERED!\n" +
        "╚══════════════════════════╝\n\n" +
        "🔥 Congratulations, Explorer!\n\n" +
        "You survived all the mysteries!\n" +
        "You escaped the Lost Temple!\n\n" +
        "💎 Artifacts: " + state.artifacts + "\n" +
        "❤️ Lives remaining: " + state.lives + "\n\n" +
        "🏆 LEGENDARY EXPLORER!"
      );
    }

    await sendScene(
      api,
      event,
      state,
      "✅ CORRECT ANSWER!\n\nThe ancient door opens...\n\n" +
      scene.story
    );
  }
};
