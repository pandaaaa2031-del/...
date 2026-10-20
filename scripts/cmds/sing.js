const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");

const cacheDir = path.join(__dirname, "cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

const MAX_SIZE = 25 * 1024 * 1024; // Messenger attachment limit

const API_JSON =
  "https://raw.githubusercontent.com/MR-MAHABUB-004/MAHABUB-BOT-STORAGE/refs/heads/main/APIURL.json";

const DL_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "*/*"
};

let API_CACHE = null;

async function getApiConfig() {
  if (API_CACHE) return API_CACHE;
  const res = await axios.get(API_JSON, { timeout: 15000 });
  if (!res.data || typeof res.data !== "object") throw new Error("API config invalid");
  API_CACHE = res.data;
  return API_CACHE;
}

// Audio download API: cfg.ytmp3 -> BASE/ytmp3v4?url=<youtube url>
async function getBaseApi() {
  const cfg = await getApiConfig();
  if (!cfg.ytmp3) throw new Error("ytmp3 API URL not found");
  return String(cfg.ytmp3).replace(/\/+$/, "");
}

// Search API: cfg.api  (called as BASE/mahabub/ytsearch?q=<query>)
async function getSearchApi() {
  const cfg = await getApiConfig();
  if (!cfg.api) throw new Error("search API URL not found");
  return String(cfg.api).replace(/\/+$/, "");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Safe error-body printer (stream bodies are skipped)
const errBody = (err) => {
  const d = err?.response?.data;
  if (!d || typeof d.pipe === "function") return "";
  try {
    return typeof d === "string" ? d.slice(0, 300) : JSON.stringify(d).slice(0, 300);
  } catch {
    return "";
  }
};

// Call ytmp3v4 API with retry -> returns the full response object
// Response: { status, title, author, videoId, filesize, download_url, expires_in, ... }
async function fetchMp3Link(MP3_API, youtubeUrl) {
  const apiUrl = `${MP3_API}/ytmp3v4?url=${encodeURIComponent(youtubeUrl)}`;
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data } = await axios.get(apiUrl, { timeout: 120000 });
      if (data?.status === "success" && /^https?:\/\//i.test(data?.download_url || "")) {
        return data;
      }
      lastErr = new Error(data?.message || "API returned no download link");
      console.error("[SING] Invalid API response:", JSON.stringify(data)?.slice(0, 500));
    } catch (e) {
      lastErr = e;
      console.error(
        `[SING] ytmp3v4 attempt ${attempt} failed:`,
        e?.response?.status || e?.code || "",
        e?.message
      );
    }
    if (attempt < 3) await sleep(attempt * 3000);
  }
  throw lastErr;
}

module.exports = {
  config: {
    name: "sing",
    version: "5.5",
    author: "@𝐌𝐑᭄﹅ 𝐌𝐀𝐇𝐀𝐁𝐔𝐁﹅ メꪜ",
    countDown: 5,
    role: 0,
    longDescription: {
      en: "🎶 Search song → reply number → auto download → auto unsend → auto delete"
    },
    category: "media",
    guide: {
      en: "{pn} <song name>\nExample: sing toh phir aao"
    }
  },

  // ============================================================
  // SONG SEARCH
  // ============================================================
  onStart: async ({ api, args, event }) => {
    if (!args.length) {
      return api.sendMessage(
        "❌ **Song name dao na!**\n\n📌 Example:\n➤ `sing toh phir aao`",
        event.threadID,
        event.messageID
      );
    }

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      const BASE = await getSearchApi();
      const query = encodeURIComponent(args.join(" "));

      const response = await axios.get(`${BASE}/mahabub/ytsearch?q=${query}`, {
        timeout: 30000
      });
      const data = response.data;
      console.log("[SING] Search response:", JSON.stringify(data)?.slice(0, 1500));

      const pick = (d) =>
        [
          d?.videos,
          d?.data?.videos,
          d?.results,
          d?.data?.results,
          d?.data,
          d?.result,
          d?.data?.data,
          d?.items,
          Array.isArray(d) ? d : null
        ].find((x) => Array.isArray(x) && x.length > 0);

      const rawList = pick(data);

      if (!rawList) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return api.sendMessage(
          "🚫 **No results found!**\nTry another keyword 🎧",
          event.threadID
        );
      }

      const results = rawList.slice(0, 10).map((it) => {
        const url = it.url || it.link || "";
        const idFromUrl = (url.match(/[?&]v=([\w-]{11})/) ||
          url.match(/youtu\.be\/([\w-]{11})/) ||
          [])[1];
        return {
          ...it,
          videoId: it.videoId || it.video_id || it.id || idFromUrl,
          title: it.title || it.name || "Unknown",
          thumbnail: it.thumbnail || it.thumb || it.image
        };
      });

      let body =
        "🎧✨ **SONG SEARCH RESULTS** ✨🎧\n" +
        "━━━━━━━━━━━━━━━━━━━\n" +
        `🔎 **Query:** ${data.query || args.join(" ")}\n\n`;

      results.forEach((item, i) => {
        const meta = [item.duration && `⏱ ${item.duration}`, item.author]
          .filter(Boolean)
          .join(" • ");
        body += `🎵 **${i + 1}.** ${item.title}\n`;
        if (meta) body += `     ${meta}\n`;
      });

      const thumbs = await Promise.all(
        results.map(async (item) => {
          const thumbnail =
            item?.thumbnails?.high ||
            item?.thumbnails?.medium ||
            item?.thumbnails?.default ||
            item?.thumbnail;
          if (!thumbnail) return null;
          try {
            const image = await axios.get(thumbnail, {
              responseType: "stream",
              timeout: 15000
            });
            return image.data;
          } catch (err) {
            return null;
          }
        })
      );
      const attachments = thumbs.filter(Boolean);

      body +=
        "\n━━━━━━━━━━━━━━━━━━━\n" +
        `📝 **Reply with a number (1-${results.length})**\n` +
        "⬇️ To download audio 🎶";

      api.sendMessage(
        {
          body,
          attachment: attachments.length > 0 ? attachments : undefined
        },
        event.threadID,
        (err, info) => {
          if (err) {
            console.error("Search message error:", err);
            return;
          }
          if (!info?.messageID) return;

          global.GoatBot.onReply.set(info.messageID, {
            commandName: "sing",
            author: event.senderID,
            results,
            searchMsgID: info.messageID
          });
        },
        event.messageID
      );

      api.setMessageReaction("🎶", event.messageID, () => {}, true);
    } catch (err) {
      console.error("SONG SEARCH ERROR:", err?.response?.status, err?.message);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      api.sendMessage("❌ **Search failed!**\nTry again later.", event.threadID);
    }
  },

  // ============================================================
  // REPLY HANDLER
  // ============================================================
  onReply: async ({ api, event, Reply }) => {
    if (String(event.senderID) !== String(Reply.author)) return;

    const choice = parseInt(String(event.body || "").trim(), 10);

    if (Number.isNaN(choice) || choice < 1 || choice > Reply.results.length) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return api.sendMessage(
        "⚠️ **Invalid number!**\n" + `Reply between 1-${Reply.results.length} 🔢`,
        event.threadID,
        event.messageID
      );
    }

    if (Reply.searchMsgID) {
      try {
        api.unsendMessage(Reply.searchMsgID);
      } catch (err) {
        console.error("Unsend search message error:", err);
      }
    }

    const video = Reply.results[choice - 1];
    const videoId = video?.videoId || video?.id;

    if (!videoId) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return api.sendMessage("❌ **Video ID not found!**", event.threadID);
    }

    const youtubeUrl = `https://youtube.com/watch?v=${videoId}`;
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    let filePath = null;
    const cleanup = () => {
      if (filePath && fs.existsSync(filePath)) fs.unlink(filePath, () => {});
    };

    // Reject JSON/HTML error bodies saved as media
    const looksLikeError = (file) => {
      const size = fs.statSync(file).size;
      if (size > 50 * 1024) return false;
      const head = fs.readFileSync(file, { encoding: "utf8" }).slice(0, 200).trim();
      return /^[{<]/.test(head) || /error|expired|forbidden/i.test(head);
    };

    const downloadFile = async (url, ext, safeId) => {
      const r = await axios.get(url, {
        responseType: "stream",
        timeout: 180000,
        maxRedirects: 5,
        headers: DL_HEADERS,
        validateStatus: (s) => s >= 200 && s < 300
      });

      const ctype = String(r.headers["content-type"] || "").toLowerCase();
      if (/text\/html|application\/json/.test(ctype)) {
        r.data.destroy();
        throw new Error(`Bad content-type: ${ctype}`);
      }

      const len = Number(r.headers["content-length"] || 0);
      if (len > MAX_SIZE) {
        r.data.destroy();
        const e = new Error("File too large");
        e.code = "TOO_BIG";
        throw e;
      }

      filePath = path.join(cacheDir, `${safeId}_${Date.now()}.${ext}`);
      await pipeline(r.data, fs.createWriteStream(filePath));

      const size = fs.statSync(filePath).size;
      if (size <= 0) throw new Error("File is empty");
      if (size > MAX_SIZE) {
        const e = new Error("File too large");
        e.code = "TOO_BIG";
        throw e;
      }
      if (looksLikeError(filePath)) throw new Error("Server returned an error body");
      return size;
    };

    try {
      const MP3_API = await getBaseApi(); // download API base (with fallback)
      const safeId = String(videoId).replace(/[^a-zA-Z0-9_-]/g, "_");

      // The API stores the file on its own server and returns a ready link
      // (valid ~5 minutes), so we download it right away.
      let info = await fetchMp3Link(MP3_API, youtubeUrl);
      const title = info.title || video?.title || "Unknown Song";
      const channel = info.author || video?.author || "";

      // Skip the download if the API already reports a file that is too big
      if (Number(info.filesize) > MAX_SIZE) {
        const e = new Error("File too large");
        e.code = "TOO_BIG";
        throw e;
      }

      let size = 0;
      let lastErr = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          size = await downloadFile(info.download_url, "mp3", safeId);
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          console.error(
            `[SING] download attempt ${attempt} failed:`,
            e?.response?.status || e?.code || "",
            e?.message,
            errBody(e)
          );
          cleanup();
          filePath = null;
          if (e.code === "TOO_BIG") break;
          // After 2 failures, request a fresh link in case it expired
          if (attempt === 2) {
            try { info = await fetchMp3Link(MP3_API, youtubeUrl); } catch (_) {}
          }
          if (attempt < 3) await sleep(2000);
        }
      }

      if (lastErr || !filePath) throw lastErr || new Error("No file downloaded");

      api.sendMessage(
        {
          body:
            "🎶 **NOW PLAYING** 🎶\n" +
            "━━━━━━━━━━━━━━━━━━━\n" +
            `🎵 **Title:** ${title}\n` +
            (channel ? `📺 **Channel:** ${channel}\n` : "") +
            `📦 **Size:** ${(size / 1024 / 1024).toFixed(2)} MB\n` +
            "━━━━━━━━━━━━━━━━━━━\n" +
            "💿 **MAHABUB-BOT** ✨",
          attachment: fs.createReadStream(filePath)
        },
        event.threadID,
        (err) => {
          if (err) console.error("[SING] Send audio error:", err);
          cleanup();
        },
        event.messageID
      );

      api.setMessageReaction("🎵", event.messageID, () => {}, true);
    } catch (err) {
      console.error(
        "[SING] DOWNLOAD ERROR:",
        err?.response?.status || err?.code || "",
        err?.message,
        errBody(err)
      );
      cleanup();
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      api.sendMessage(
        err?.code === "TOO_BIG"
          ? "❌ **File too large to send!** (max 25 MB)"
          : "❌ **Audio download error!**\nPlease try again later.",
        event.threadID
      );
    }
  }
};api, event, Reply }) => {
    if (String(event.senderID) !== String(Reply.author)) return;

    const choice = Number(String(event.body || "").trim());

    if (!Number.isInteger(choice) || choice < 1 || choice > Reply.results.length) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);

      return api.sendMessage(
        `⚠️ Invalid number!\nReply between 1-${Reply.results.length}.`,
        event.threadID,
        event.messageID
      );
    }

    if (Reply.searchMsgID) {
      try {
        api.unsendMessage(Reply.searchMsgID);
      } catch (error) {
        console.error("[SING] Unsend error:", error.message);
      }
    }

    const video = Reply.results[choice - 1];

    const videoId =
      video?.videoId ||
      video?.video_id ||
      (typeof video?.id === "string" ? video.id : video?.id?.videoId);

    if (!videoId) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);

      return api.sendMessage(
        "❌ Video ID not found!",
        event.threadID,
        event.messageID
      );
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    let filePath = null;

    const cleanup = () => {
      if (filePath) {
        const target = filePath;
        filePath = null;

        fs.unlink(target, (error) => {
          if (error && error.code !== "ENOENT") {
            console.error("[SING] File cleanup error:", error.message);
          }
        });
      }
    };

    const downloadFile = async (url, safeId, headers) => {
      const response = await axios.get(url, {
        responseType: "stream",
        timeout: 180000,
        maxRedirects: 5,
        headers,
        validateStatus: (status) => status >= 200 && status < 300
      });

      const contentType = String(
        response.headers["content-type"] || ""
      ).toLowerCase();

      if (/text\/html|application\/json|text\/plain/.test(contentType)) {
        response.data.destroy();
        throw new Error(`Invalid audio content-type: ${contentType}`);
      }

      const contentLength = Number(response.headers["content-length"] || 0);

      if (contentLength > MAX_SIZE) {
        response.data.destroy();

        const error = new Error("File exceeds 25 MB");
        error.code = "TOO_BIG";
        throw error;
      }

      filePath = path.join(cacheDir, `${safeId}_${Date.now()}.mp3`);

      try {
        await pipeline(response.data, fs.createWriteStream(filePath));

        const stats = fs.statSync(filePath);

        if (stats.size <= 0) throw new Error("Downloaded file is empty");

        if (stats.size > MAX_SIZE) {
          const error = new Error("File exceeds 25 MB");
          error.code = "TOO_BIG";
          throw error;
        }

        // Detect common JSON/HTML error responses.
        const fd = fs.openSync(filePath, "r");
        const buffer = Buffer.alloc(256);
        let bytesRead;

        try {
          bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
        } finally {
          fs.closeSync(fd);
        }

        const head = buffer
          .subarray(0, bytesRead)
          .toString("utf8")
          .trim()
          .toLowerCase();

        if (
          head.startsWith("<!doctype html") ||
          head.startsWith("<html") ||
          head.startsWith("{") ||
          head.startsWith("<")
        ) {
          throw new Error("Server returned an error page instead of audio");
        }

        return stats.size;
      } catch (error) {
        cleanup();
        throw error;
      }
    };

    try {
      const BASE = await getBaseApi("mp3");

      const safeId = String(videoId).replace(/[^a-zA-Z0-9_-]/g, "_");

      let lastError = null;
      let downloadedSize = 0;
      let apiInfo = null;

      // Retry download and refresh the API link when necessary.
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          const result = await fetchMp3Link(BASE, youtubeUrl);

          apiInfo = result.info;

          console.log(
            "[SING] Download URL hosts:",
            result.urls
              .map((url) => {
                try {
                  return new URL(url).host;
                } catch {
                  return "unknown";
                }
              })
              .join(", ")
          );

          for (const downloadUrl of result.urls) {
            // Try each header profile (different referers) until one works.
            for (const headers of DL_HEADER_PROFILES) {
              try {
                downloadedSize = await downloadFile(downloadUrl, safeId, headers);
                lastError = null;
                break;
              } catch (error) {
                lastError = error;

                console.error(
                  "[SING] Download attempt failed:",
                  error.response?.status || error.code || "",
                  error.message,
                  "| referer:",
                  headers.referer,
                  getErrorBody(error)
                );

                cleanup();

                if (error.code === "TOO_BIG") throw error;
              }
            }

            if (!lastError && filePath) break;
          }

          if (!lastError && filePath) break;
        } catch (error) {
          lastError = error;

          if (error.code === "TOO_BIG") throw error;

          console.error(`[SING] Attempt ${attempt} failed:`, error.message);
        }

        if (attempt < 4) await sleep(attempt * 3000);
      }

      if (!filePath || lastError) {
        throw lastError || new Error("Audio download failed");
      }

      const title = apiInfo?.title || video.title || "Unknown Song";
      const author = apiInfo?.author || video.author || "";
      const bitrate = apiInfo?.bitrate || "";

      const messageBody =
        "🎶 NOW PLAYING 🎶\n" +
        "━━━━━━━━━━━━━━━━━━━\n" +
        `🎵 Title: ${title}\n` +
        (author ? `📺 Artist/Channel: ${author}\n` : "") +
        (bitrate ? `🔊 Quality: ${bitrate}\n` : "") +
        `📦 Size: ${(downloadedSize / 1024 / 1024).toFixed(2)} MB\n` +
        "━━━━━━━━━━━━━━━━━━━\n" +
        "💿 MAHABUB-BOT ✨";

      api.sendMessage(
        {
          body: messageBody,
          attachment: fs.createReadStream(filePath)
        },
        event.threadID,
        (error) => {
          if (error) console.error("[SING] Send audio error:", error);
          cleanup();
        },
        event.messageID
      );

      api.setMessageReaction("🎵", event.messageID, () => {}, true);
    } catch (error) {
      console.error(
        "[SING] DOWNLOAD ERROR:",
        error.response?.status || error.code || "",
        error.message,
        getErrorBody(error)
      );

      cleanup();

      // Re-read APIURL.json next time in case the URL changed.
      API_CACHE = null;

      api.setMessageReaction("❌", event.messageID, () => {}, true);

      api.sendMessage(
        error.code === "TOO_BIG"
          ? "❌ Audio file is too large! Maximum size: 25 MB."
          : "❌ Audio download failed!\nPlease try again later.",
        event.threadID,
        event.messageID
      );
    }
  }
};
