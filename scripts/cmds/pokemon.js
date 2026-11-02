"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let Canvas = null;
try { Canvas = require("canvas"); } catch (e) {}

const DATA_DIR = path.join(__dirname, "pokemon_world_data");
const DB_FILE = path.join(DATA_DIR, "database.json");
const BACKUP_FILE = path.join(DATA_DIR, "backup.json");
const IMAGE_DIR = path.join(DATA_DIR, "cards");

for (const dir of [DATA_DIR, IMAGE_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const CONFIG = {
  startMoney: 1000,
  defaultBall: 10,
  maxTeam: 6,
  maxStorage: 100,
  pageSize: 8,
  huntCooldown: 30000,
  battleCooldown: 15000,
  catchCooldown: 3000,
  huntTime: 60000,
  adminIDs: []
};

const TYPES = {
  Normal: { strong: [], weak: ["Fighting"] },
  Fire: { strong: ["Grass", "Ice", "Bug", "Steel"], weak: ["Water", "Ground", "Rock"] },
  Water: { strong: ["Fire", "Ground", "Rock"], weak: ["Electric", "Grass"] },
  Electric: { strong: ["Water", "Flying"], weak: ["Ground"] },
  Grass: { strong: ["Water", "Ground", "Rock"], weak: ["Fire", "Ice", "Poison", "Flying", "Bug"] },
  Ice: { strong: ["Grass", "Ground", "Flying", "Dragon"], weak: ["Fire", "Fighting", "Rock", "Steel"] },
  Fighting: { strong: ["Normal", "Ice", "Rock", "Dark", "Steel"], weak: ["Flying", "Psychic", "Fairy"] },
  Poison: { strong: ["Grass", "Fairy"], weak: ["Ground", "Psychic"] },
  Ground: { strong: ["Fire", "Electric", "Poison", "Rock", "Steel"], weak: ["Water", "Grass", "Ice"] },
  Flying: { strong: ["Grass", "Fighting", "Bug"], weak: ["Electric", "Ice", "Rock"] },
  Psychic: { strong: ["Fighting", "Poison"], weak: ["Bug", "Ghost", "Dark"] },
  Bug: { strong: ["Grass", "Psychic", "Dark"], weak: ["Fire", "Flying", "Rock"] },
  Rock: { strong: ["Fire", "Ice", "Flying", "Bug"], weak: ["Water", "Grass", "Fighting", "Ground", "Steel"] },
  Ghost: { strong: ["Psychic", "Ghost"], weak: ["Ghost", "Dark"] },
  Dragon: { strong: ["Dragon"], weak: ["Ice", "Dragon", "Fairy"] },
  Dark: { strong: ["Psychic", "Ghost"], weak: ["Fighting", "Bug", "Fairy"] },
  Steel: { strong: ["Ice", "Rock", "Fairy"], weak: ["Fire", "Fighting", "Ground"] },
  Fairy: { strong: ["Fighting", "Dragon", "Dark"], weak: ["Poison", "Steel"] }
};

const RARITY = {
  Common: { weight: 48, color: "#bdbdbd", multiplier: 1 },
  Uncommon: { weight: 25, color: "#66bb6a", multiplier: 1.15 },
  Rare: { weight: 14, color: "#42a5f5", multiplier: 1.4 },
  Epic: { weight: 7, color: "#ab47bc", multiplier: 1.8 },
  Legendary: { weight: 4, color: "#ff9800", multiplier: 2.5 },
  Mythical: { weight: 1.5, color: "#f06292", multiplier: 3 },
  Secret: { weight: 0.5, color: "#e040fb", multiplier: 4 }
};

const POKEMON = [
  { id: 1, name: "Bulbasaur", type: ["Grass", "Poison"], rarity: "Common", hp: 45, atk: 49, def: 49, spd: 45, evolve: "Ivysaur", level: 16, emoji: "🌱" },
  { id: 2, name: "Ivysaur", type: ["Grass", "Poison"], rarity: "Uncommon", hp: 60, atk: 62, def: 63, spd: 60, evolve: "Venusaur", level: 32, emoji: "🌿" },
  { id: 3, name: "Venusaur", type: ["Grass", "Poison"], rarity: "Epic", hp: 80, atk: 82, def: 83, spd: 80, emoji: "🌺" },
  { id: 4, name: "Charmander", type: ["Fire"], rarity: "Common", hp: 39, atk: 52, def: 43, spd: 65, evolve: "Charmeleon", level: 16, emoji: "🔥" },
  { id: 5, name: "Charmeleon", type: ["Fire"], rarity: "Uncommon", hp: 58, atk: 64, def: 58, spd: 80, evolve: "Charizard", level: 36, emoji: "🔥" },
  { id: 6, name: "Charizard", type: ["Fire", "Flying"], rarity: "Epic", hp: 78, atk: 84, def: 78, spd: 100, emoji: "🐉" },
  { id: 7, name: "Squirtle", type: ["Water"], rarity: "Common", hp: 44, atk: 48, def: 65, spd: 43, evolve: "Wartortle", level: 16, emoji: "💧" },
  { id: 8, name: "Wartortle", type: ["Water"], rarity: "Uncommon", hp: 59, atk: 63, def: 80, spd: 58, evolve: "Blastoise", level: 36, emoji: "🌊" },
  { id: 9, name: "Blastoise", type: ["Water"], rarity: "Epic", hp: 79, atk: 83, def: 100, spd: 78, emoji: "🐢" },
  { id: 10, name: "Pikachu", type: ["Electric"], rarity: "Uncommon", hp: 35, atk: 55, def: 40, spd: 90, evolve: "Raichu", level: 20, emoji: "⚡" },
  { id: 11, name: "Raichu", type: ["Electric"], rarity: "Rare", hp: 60, atk: 90, def: 55, spd: 110, emoji: "⚡" },
  { id: 12, name: "Jigglypuff", type: ["Normal", "Fairy"], rarity: "Common", hp: 115, atk: 45, def: 20, spd: 20, emoji: "🎤" },
  { id: 13, name: "Meowth", type: ["Normal"], rarity: "Common", hp: 40, atk: 45, def: 35, spd: 90, emoji: "🐱" },
  { id: 14, name: "Psyduck", type: ["Water"], rarity: "Common", hp: 50, atk: 52, def: 48, spd: 55, emoji: "🦆" },
  { id: 15, name: "Machop", type: ["Fighting"], rarity: "Common", hp: 70, atk: 80, def: 50, spd: 35, emoji: "💪" },
  { id: 16, name: "Geodude", type: ["Rock", "Ground"], rarity: "Common", hp: 40, atk: 80, def: 100, spd: 20, emoji: "🪨" },
  { id: 17, name: "Gastly", type: ["Ghost", "Poison"], rarity: "Uncommon", hp: 30, atk: 35, def: 30, spd: 80, emoji: "👻" },
  { id: 18, name: "Gengar", type: ["Ghost", "Poison"], rarity: "Epic", hp: 60, atk: 65, def: 60, spd: 110, emoji: "👻" },
  { id: 19, name: "Eevee", type: ["Normal"], rarity: "Rare", hp: 55, atk: 55, def: 50, spd: 55, emoji: "🦊" },
  { id: 20, name: "Snorlax", type: ["Normal"], rarity: "Rare", hp: 160, atk: 110, def: 65, spd: 30, emoji: "😴" },
  { id: 21, name: "Dratini", type: ["Dragon"], rarity: "Rare", hp: 41, atk: 64, def: 45, spd: 50, evolve: "Dragonair", level: 30, emoji: "🐉" },
  { id: 22, name: "Dragonair", type: ["Dragon"], rarity: "Epic", hp: 61, atk: 84, def: 65, spd: 70, evolve: "Dragonite", level: 55, emoji: "🐉" },
  { id: 23, name: "Dragonite", type: ["Dragon", "Flying"], rarity: "Legendary", hp: 91, atk: 134, def: 95, spd: 80, emoji: "🐲" },
  { id: 24, name: "Lapras", type: ["Water", "Ice"], rarity: "Epic", hp: 130, atk: 85, def: 80, spd: 60, emoji: "🌊" },
  { id: 25, name: "Articuno", type: ["Ice", "Flying"], rarity: "Legendary", hp: 90, atk: 85, def: 100, spd: 85, emoji: "🧊" },
  { id: 26, name: "Zapdos", type: ["Electric", "Flying"], rarity: "Legendary", hp: 90, atk: 90, def: 85, spd: 100, emoji: "⚡" },
  { id: 27, name: "Moltres", type: ["Fire", "Flying"], rarity: "Legendary", hp: 90, atk: 100, def: 90, spd: 90, emoji: "🔥" },
  { id: 28, name: "Mewtwo", type: ["Psychic"], rarity: "Mythical", hp: 106, atk: 110, def: 90, spd: 130, emoji: "🔮" },
  { id: 29, name: "Mew", type: ["Psychic"], rarity: "Secret", hp: 100, atk: 100, def: 100, spd: 100, emoji: "✨" },
  { id: 30, name: "Lucario", type: ["Fighting", "Steel"], rarity: "Epic", hp: 70, atk: 110, def: 70, spd: 90, emoji: "🥋" },
  { id: 31, name: "Garchomp", type: ["Dragon", "Ground"], rarity: "Epic", hp: 108, atk: 130, def: 95, spd: 102, emoji: "🦈" },
  { id: 32, name: "Rayquaza", type: ["Dragon", "Flying"], rarity: "Secret", hp: 105, atk: 150, def: 90, spd: 95, emoji: "🐉" },
  { id: 33, name: "Lugia", type: ["Psychic", "Flying"], rarity: "Mythical", hp: 106, atk: 90, def: 130, spd: 110, emoji: "🪽" },
  { id: 34, name: "Ho-Oh", type: ["Fire", "Flying"], rarity: "Mythical", hp: 106, atk: 130, def: 90, spd: 90, emoji: "🌈" },
  { id: 35, name: "Gyarados", type: ["Water", "Flying"], rarity: "Epic", hp: 95, atk: 125, def: 79, spd: 81, emoji: "🐉" },
  { id: 36, name: "Tyranitar", type: ["Rock", "Dark"], rarity: "Legendary", hp: 100, atk: 134, def: 110, spd: 61, emoji: "🦖" }
];

const MOVES = {
  Normal: ["Tackle", "Body Slam", "Quick Attack"],
  Fire: ["Ember", "Flame Burst", "Fire Blast"],
  Water: ["Water Gun", "Aqua Tail", "Hydro Pump"],
  Electric: ["Thunder Shock", "Spark", "Thunderbolt"],
  Grass: ["Vine Whip", "Razor Leaf", "Solar Beam"],
  Ice: ["Ice Shard", "Blizzard", "Ice Beam"],
  Fighting: ["Karate Chop", "Brick Break", "Close Combat"],
  Poison: ["Poison Sting", "Sludge Bomb", "Toxic"],
  Ground: ["Mud Shot", "Earthquake", "Dig"],
  Flying: ["Wing Attack", "Air Slash", "Hurricane"],
  Psychic: ["Confusion", "Psybeam", "Psychic"],
  Bug: ["Bug Bite", "X-Scissor", "Megahorn"],
  Rock: ["Rock Throw", "Rock Slide", "Stone Edge"],
  Ghost: ["Shadow Sneak", "Shadow Ball", "Phantom Force"],
  Dragon: ["Dragon Breath", "Dragon Claw", "Draco Meteor"],
  Dark: ["Bite", "Night Slash", "Dark Pulse"],
  Steel: ["Metal Claw", "Iron Head", "Flash Cannon"],
  Fairy: ["Fairy Wind", "Dazzling Gleam", "Moonblast"]
};

const GYMS = [
  { name: "Brock", type: "Rock", pokemon: ["Geodude", "Garchomp"], badge: "boulder", reward: 300 },
  { name: "Misty", type: "Water", pokemon: ["Psyduck", "Lapras"], badge: "cascade", reward: 350 },
  { name: "Lt. Surge", type: "Electric", pokemon: ["Pikachu", "Raichu"], badge: "thunder", reward: 400 },
  { name: "Erika", type: "Grass", pokemon: ["Bulbasaur", "Venusaur"], badge: "rainbow", reward: 450 },
  { name: "Blaine", type: "Fire", pokemon: ["Charmander", "Charizard"], badge: "volcano", reward: 500 },
  { name: "Sabrina", type: "Psychic", pokemon: ["Gastly", "Mewtwo"], badge: "marsh", reward: 600 },
  { name: "Clair", type: "Dragon", pokemon: ["Dragonair", "Dragonite"], badge: "earth", reward: 700 }
];

const BADGES = [
  { id: "boulder", name: "Boulder Badge", leader: "Brock", emoji: "🪨", rarity: "Common" },
  { id: "cascade", name: "Cascade Badge", leader: "Misty", emoji: "💧", rarity: "Common" },
  { id: "thunder", name: "Thunder Badge", leader: "Lt. Surge", emoji: "⚡", rarity: "Uncommon" },
  { id: "rainbow", name: "Rainbow Badge", leader: "Erika", emoji: "🌈", rarity: "Uncommon" },
  { id: "marsh", name: "Marsh Badge", leader: "Sabrina", emoji: "🔮", rarity: "Rare" },
  { id: "volcano", name: "Volcano Badge", leader: "Blaine", emoji: "🌋", rarity: "Epic" },
  { id: "earth", name: "Earth Badge", leader: "Clair", emoji: "🌍", rarity: "Legendary" }
];

function defaultDB() {
  return {
    version: 2, players: {}, activeHunts: {}, battles: {},
    customPokemon: [], customBadges: [], logs: []
  };
}

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const db = defaultDB();
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      return db;
    }
    return { ...defaultDB(), ...JSON.parse(fs.readFileSync(DB_FILE, "utf8")) };
  } catch (e) {
    console.error("[Pokemon DB]", e);
    try {
      return { ...defaultDB(), ...JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8")) };
    } catch (_) {
      return defaultDB();
    }
  }
}

let DB = loadDB();
let saveTimer = null;

function saveDB() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const tmp = DB_FILE + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(DB, null, 2));
      fs.renameSync(tmp, DB_FILE);
      fs.copyFileSync(DB_FILE, BACKUP_FILE);
    } catch (e) {
      console.error("[Pokemon Save]", e);
    }
  }, 200);
}

function uid() {
  return crypto.randomBytes(5).toString("hex");
}
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function chance(n) {
  return Math.random() * 100 < n;
}
function send(api, threadID, body) {
  return api.sendMessage(body, threadID);
}
function getAllPokemon() {
  return [...POKEMON, ...(DB.customPokemon || [])];
}
function getPokemon(name) {
  return getAllPokemon().find(p => p.name.toLowerCase() === String(name).toLowerCase());
}
function clean(value) {
  return String(value || "").replace(/[<>]/g, "").slice(0, 50);
}

function getPlayer(userID, name) {
  if (!DB.players[userID]) {
    DB.players[userID] = {
      id: userID, name: name || "Trainer", money: CONFIG.startMoney,
      balls: CONFIG.defaultBall, greatBalls: 0, ultraBalls: 0, bait: 3,
      pokemons: [], team: [], badges: [], wins: 0, losses: 0,
      level: 1, xp: 0, lastHunt: 0, lastBattle: 0, lastCatch: 0
    };
    saveDB();
  }
  const p = DB.players[userID];
  p.pokemons = p.pokemons || [];
  p.team = p.team || [];
  p.badges = p.badges || [];
  p.name = name || p.name;
  return p;
}

function makePokemon(name, level = 5) {
  const base = getPokemon(name);
  if (!base) return null;
  const mult = RARITY[base.rarity]?.multiplier || 1;
  const stat = n => Math.max(1, Math.floor((n + level * 2) * mult));
  const type = base.type || ["Normal"];
  const moves = MOVES[type[0]] || MOVES.Normal;

  return {
    uid: uid(), species: base.name, nickname: base.name,
    type, rarity: base.rarity, level, xp: 0,
    hp: stat(base.hp), maxHp: stat(base.hp),
    atk: stat(base.atk), def: stat(base.def), spd: stat(base.spd),
    shiny: chance(1), caughtAt: Date.now(), friendship: 10,
    moves: moves.map((m, i) => ({
      name: m, power: [20, 35, 50][i], type: type[0]
    })),
    status: null
  };
}

function addPokemon(player, pokemon) {
  if (player.pokemons.length >= CONFIG.maxStorage) return false;
  player.pokemons.push(pokemon);
  if (player.team.length < CONFIG.maxTeam) player.team.push(pokemon.uid);
  return true;
}
function getOwnedPokemon(player, id) {
  return player.pokemons.find(p => p.uid === id || p.uid.startsWith(id));
}
function getTeam(player) {
  return player.team.map(id => getOwnedPokemon(player, id)).filter(Boolean);
}
function getActivePokemon(player) {
  return getTeam(player).find(p => p.hp > 0) ||
    player.pokemons.find(p => p.hp > 0) || null;
}
function addXP(player, amount) {
  player.xp += amount;
  let count = 0;
  while (player.xp >= player.level * 100) {
    player.xp -= player.level * 100;
    player.level++;
    player.money += 100;
    count++;
  }
  return count;
}
function rollRarity() {
  const total = Object.values(RARITY).reduce((s, r) => s + r.weight, 0);
  let n = Math.random() * total;
  for (const [name, data] of Object.entries(RARITY)) {
    n -= data.weight;
    if (n <= 0) return name;
  }
  return "Common";
}
function pickWild() {
  const rarity = rollRarity();
  let pool = getAllPokemon().filter(p => p.rarity === rarity);
  if (!pool.length) pool = getAllPokemon().filter(p => p.rarity === "Common");
  return pool[rand(0, pool.length - 1)];
}
function typeMultiplier(attackType, defenderTypes) {
  let mult = 1;
  const data = TYPES[attackType];
  if (!data) return mult;
  for (const type of defenderTypes || []) {
    if (data.strong.includes(type)) mult *= 2;
    if (data.weak.includes(type)) mult *= 0.5;
  }
  return mult;
}
function damage(attacker, defender, move) {
  const mult = typeMultiplier(move.type, defender.type);
  const base = Math.max(1, move.power + attacker.atk * 0.45 - defender.def * 0.25);
  const critical = chance(10);
  return {
    value: Math.max(1, Math.floor(base * mult * (rand(85, 100) / 100) * (critical ? 1.5 : 1))),
    critical, mult
  };
}
function bar(current, max) {
  const n = Math.round(Math.max(0, current) / Math.max(1, max) * 10);
  return "🟩".repeat(n) + "⬛".repeat(10 - n);
}

/* IMPORTANT: GoatBot V2 requires commandName, not only name. */
function registerReply(messageID, data) {
  if (!global.GoatBot) global.GoatBot = {};
  if (!global.GoatBot.onReply) global.GoatBot.onReply = new Map();

  global.GoatBot.onReply.set(messageID, {
    commandName: "pokemon",
    name: "pokemon",
    messageID,
    ...data
  });
}

async function makeCard(pokemon, title) {
  if (!Canvas) return null;
  const canvas = Canvas.createCanvas(700, 420);
  const ctx = canvas.getContext("2d");
  const base = getPokemon(pokemon.species);
  const color = RARITY[pokemon.rarity]?.color || "#ffffff";
  const gradient = ctx.createLinearGradient(0, 0, 700, 420);
  gradient.addColorStop(0, "#101a3a");
  gradient.addColorStop(1, "#28133e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 700, 420);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 676, 396);
  ctx.fillStyle = color;
  ctx.font = "bold 25px Arial";
  ctx.fillText(title || "POKEMON", 35, 55);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 42px Arial";
  ctx.fillText(pokemon.nickname || pokemon.species, 35, 115);
  ctx.font = "100px Arial";
  ctx.fillText(base?.emoji || "❔", 70, 260);
  ctx.fillStyle = color;
  ctx.font = "bold 22px Arial";
  ctx.fillText(pokemon.rarity + (pokemon.shiny ? " SHINY ✨" : ""), 35, 320);
  ctx.fillStyle = "#fff";
  ctx.font = "20px Arial";
  ctx.fillText("TYPE: " + pokemon.type.join("/"), 350, 190);
  ctx.fillText("LEVEL: " + pokemon.level, 350, 230);
  ctx.fillText("HP: " + pokemon.hp + "/" + pokemon.maxHp, 350, 270);
  ctx.fillText("ATK: " + pokemon.atk + " DEF: " + pokemon.def, 350, 310);
  ctx.fillText("SPD: " + pokemon.spd, 350, 350);
  const file = path.join(IMAGE_DIR, uid() + ".png");
  fs.writeFileSync(file, canvas.toBuffer("image/png"));
  return file;
}
async function sendCard(api, threadID, pokemon, title, body) {
  let file = null;
  try { file = await makeCard(pokemon, title); } catch (e) {}
  if (!file) return send(api, threadID, body);
  return api.sendMessage({
    body,
    attachment: fs.createReadStream(file)
  }, threadID, () => {
    try { fs.unlinkSync(file); } catch (e) {}
  });
}
function isAdmin(userID) {
  return CONFIG.adminIDs.map(String).includes(String(userID));
}
function getRegion() {
  const regions = [
    { name: "Viridian Forest", types: ["Grass", "Bug"], bonus: ["Bulbasaur", "Pikachu", "Gastly"] },
    { name: "Rocky Mountain", types: ["Rock", "Ground"], bonus: ["Geodude", "Garchomp"] },
    { name: "Azure Lake", types: ["Water", "Ice"], bonus: ["Squirtle", "Lapras", "Psyduck"] },
    { name: "Volcano Valley", types: ["Fire"], bonus: ["Charmander", "Moltres"] },
    { name: "Mystic Cave", types: ["Ghost", "Psychic"], bonus: ["Gastly", "Gengar", "Mewtwo"] },
    { name: "Dragon Peak", types: ["Dragon", "Flying"], bonus: ["Dratini", "Dragonite", "Rayquaza"] }
  ];
  return regions[rand(0, regions.length - 1)];
}
function pickRegionPokemon(region) {
  if (chance(35)) {
    const bonus = region.bonus.map(getPokemon).filter(Boolean);
    if (bonus.length) return bonus[rand(0, bonus.length - 1)];
  }
  const pool = getAllPokemon().filter(p => p.type.some(t => region.types.includes(t)));
  return pool.length ? pool[rand(0, pool.length - 1)] : pickWild();
}
function pokemonText(p, i) {
  return `${i + 1}. ${p.shiny ? "✨" : ""}${p.nickname} [${p.rarity}]
Type: ${p.type.join("/")} | Lv.${p.level}
HP ${p.hp}/${p.maxHp} | ATK ${p.atk} | DEF ${p.def}
ID: ${p.uid.slice(0, 6)}`;
}
function getBadges(player) {
  return player.badges.map(id => BADGES.find(b => b.id === id)).filter(Boolean);
}

module.exports = {
  config: {
    name: "pokemon",
    aliases: ["p", "pk", "pok"],
    version: "4.0.0",
    author: "Pokémon World",
    countDown: 3,
    role: 0,
    shortDescription: "Pokémon World Ultimate",
    longDescription: "Hunt, catch, battle, gym, badges and collection.",
    category: "game",
    guide: "p help"
  },

  onStart: async function ({ api, event, args }) {
    const userID = String(event.senderID);
    const threadID = event.threadID;
    const player = getPlayer(userID, event.senderName || "Trainer");
    const sub = String(args[0] || "help").toLowerCase();

    if (sub === "help") {
      return send(api, threadID,
        `🌍 POKÉMON WORLD ULTIMATE

🌲 p hunt — Pokémon খুঁজো
🎯 p catch — Catch নির্দেশনা
📖 p pk [page] — Pokédex
👥 p team — Team দেখো
➕ p team add [ID] — Team-এ যোগ
⚔️ p battle — Wild Battle
🏟️ p gym — Gym Challenge
🏅 p badge — Badge Collection
👤 p profile — Profile
❤️ p heal — সব Pokémon Heal
🏆 p top — Top Trainers
🛒 p shop — Shop
💰 p buy ball/greatball/ultraball/bait

Admin:
p admin backup
p admin restore
p admin money [UID] [amount]
p admin pokemon [UID] [name]
p admin addpokemon [name] [type] [rarity]`
      );
    }

    if (sub === "hunt") {
      const now = Date.now();
      const left = CONFIG.huntCooldown - (now - player.lastHunt);
      if (left > 0) return send(api, threadID, `⏳ আবার Hunt করতে ${Math.ceil(left / 1000)} সেকেন্ড অপেক্ষা করো।`);

      player.lastHunt = now;
      const region = getRegion();

      if (chance(18)) {
        saveDB();
        return send(api, threadID, `🌲 ${region.name}-এ Pokémon খুঁজলে, কিন্তু কাউকে পাওয়া গেল না! পরে আবার চেষ্টা করো।`);
      }

      const base = pickRegionPokemon(region);
      const wild = makePokemon(base.name, rand(3, 12));
      DB.activeHunts[userID] = {
        pokemon: wild, region: region.name,
        expires: Date.now() + CONFIG.huntTime
      };
      saveDB();

      const body =
        `🌲 ${region.name}

⚠️ একটি Wild Pokémon দেখা গেছে!
${wild.shiny ? "✨ SHINY POKÉMON!\n" : ""}${wild.species} [${wild.rarity}]
Level: ${wild.level}
HP: ${wild.hp}

কী করবে?
1 — Pokéball ছুঁড়বে
2 — Great Ball ব্যবহার করবে
3 — Ultra Ball ব্যবহার করবে
4 — Bait ব্যবহার করবে
5 — Sneak করবে
6 — পালিয়ে যাবে

⏳ ৬০ সেকেন্ডের মধ্যে এই মেসেজে Reply করো।`;

      return api.sendMessage(body, threadID, (err, info) => {
        if (!err && info?.messageID) {
          registerReply(info.messageID, { action: "hunt", userID });
        }
      });
    }

    if (sub === "catch") {
      const hunt = DB.activeHunts[userID];
      if (!hunt || hunt.expires < Date.now()) {
        delete DB.activeHunts[userID];
        saveDB();
        return send(api, threadID, "❌ কোনো Wild Pokémon নেই। আগে p hunt লেখো।");
      }
      return send(api, threadID, "🎯 Pokémon ধরতে Hunt-এর মেসেজে Reply করে 1–6 লেখো।");
    }

    if (sub === "pk" || sub === "pokedex") {
      const page = Math.max(1, parseInt(args[1]) || 1);
      const all = getAllPokemon();
      const pages = Math.max(1, Math.ceil(all.length / CONFIG.pageSize));
      const list = all.slice((page - 1) * CONFIG.pageSize, page * CONFIG.pageSize);
      if (!list.length) return send(api, threadID, "❌ এই পৃষ্ঠা নেই।");
      let out = `📖 POKÉDEX ${page}/${pages}\nCollected: ${player.pokemons.length}\n\n`;
      list.forEach((p, i) => {
        const caught = player.pokemons.some(x => x.species === p.name);
        out += `${(page - 1) * CONFIG.pageSize + i + 1}. ${p.emoji} ${p.name}\n${p.type.join("/")} | ${p.rarity} ${caught ? "✅" : "❔"}\n`;
      });
      return send(api, threadID, out + `\nপরের পৃষ্ঠা: p pk ${Math.min(page + 1, pages)}`);
    }

    if (sub === "team") {
      if (String(args[1] || "").toLowerCase() === "add") {
        const pokemon = getOwnedPokemon(player, String(args[2] || ""));
        if (!pokemon) return send(api, threadID, "❌ Pokémon ID পাওয়া যায়নি।");
        if (player.team.includes(pokemon.uid)) return send(api, threadID, "এটি আগে থেকেই Team-এ আছে।");
        if (player.team.length >= CONFIG.maxTeam) return send(api, threadID, "❌ Team পূর্ণ! সর্বোচ্চ ৬টি Pokémon।");
        player.team.push(pokemon.uid);
        saveDB();
        return send(api, threadID, `✅ ${pokemon.nickname} Team-এ যোগ হয়েছে!`);
      }
      const team = getTeam(player);
      if (!team.length) return send(api, threadID, "❌ Team খালি। আগে Pokémon ধরো!");
      return send(api, threadID, "👥 YOUR TEAM\n\n" + team.map(pokemonText).join("\n\n"));
    }

    if (sub === "profile" || sub === "me") {
      return send(api, threadID,
        `👤 TRAINER PROFILE

Name: ${player.name}
Level: ${player.level}
XP: ${player.xp}/${player.level * 100}
💰 Coins: ${player.money}
Pokémon: ${player.pokemons.length}
🏅 Badges: ${player.badges.length}
⚔️ Wins: ${player.wins}
💔 Losses: ${player.losses}
Pokéball: ${player.balls}
Great Ball: ${player.greatBalls}
Ultra Ball: ${player.ultraBalls}
Bait: ${player.bait}`
      );
    }

    if (sub === "badge" || sub === "bd") {
      const badges = getBadges(player);
      if (!badges.length) return send(api, threadID, "🏅 এখনো Badge নেই। p gym খেলো!");
      return send(api, threadID, "🏅 YOUR BADGES\n\n" +
        badges.map((b, i) => `${i + 1}. ${b.emoji} ${b.name} — ${b.leader}`).join("\n"));
    }

    if (sub === "heal") {
      if (!player.pokemons.length) return send(api, threadID, "❌ তোমার Pokémon নেই!");
      if (player.money < 50) return send(api, threadID, "❌ Heal করতে ৫০ Coins লাগবে।");
      player.money -= 50;
      player.pokemons.forEach(p => { p.hp = p.maxHp; p.status = null; });
      saveDB();
      return send(api, threadID, "❤️ সব Pokémon Heal হয়েছে! ৫০ Coins কাটা হয়েছে।");
    }

    if (sub === "battle" || sub === "gym") {
      const now = Date.now();
      const left = CONFIG.battleCooldown - (now - player.lastBattle);
      if (left > 0) return send(api, threadID, `⏳ Battle করতে ${Math.ceil(left / 1000)} সেকেন্ড অপেক্ষা করো।`);
      const own = getActivePokemon(player);
      if (!own) return send(api, threadID, "❌ আগে Pokémon ধরো এবং Team-এ রাখো!");
      if (own.hp <= 0) return send(api, threadID, "❌ Pokémon-এর HP শেষ! p heal করো।");
      player.lastBattle = now;

      let enemy, mode = "wild", extra = {};
      if (sub === "gym") {
        const gym = GYMS[rand(0, GYMS.length - 1)];
        const species = gym.pokemon[rand(0, gym.pokemon.length - 1)];
        enemy = makePokemon(species, rand(8, 15));
        mode = "gym";
        extra = { leader: gym.name, badgeID: gym.badge, reward: gym.reward };
      } else {
        const base = pickWild();
        enemy = makePokemon(base.name, Math.max(3, own.level + rand(-2, 3)));
      }

      const battleID = uid();
      DB.battles[battleID] = {
        id: battleID, threadID, userID, mode, ownUID: own.uid,
        enemy, enemyHP: enemy.hp, enemyMaxHP: enemy.hp,
        round: 1, extra, createdAt: Date.now()
      };
      saveDB();

      const intro = mode === "gym"
        ? `🏟️ Gym Leader ${extra.leader}-এর Pokémon ${enemy.species} সামনে এসেছে!\n`
        : `🌿 Wild Pokémon ${enemy.species} সামনে এসেছে!\n`;

      return api.sendMessage(
        `${intro}\n🟦 ${own.nickname} Lv.${own.level}\n${bar(own.hp, own.maxHp)} ${own.hp}/${own.maxHp}\n\n🟥 ${enemy.species} Lv.${enemy.level}\n${bar(enemy.hp, enemy.maxHp)} ${enemy.hp}/${enemy.maxHp}\n\n🎯 Skill বেছে নাও:\n` +
        own.moves.map((m, i) => `${i + 1}. ${m.name} [Power ${m.power}]`).join("\n") +
        "\n\nএই মেসেজে Reply করো: 1 / 2 / 3",
        threadID,
        (err, info) => {
          if (!err && info?.messageID) {
            registerReply(info.messageID, { action: "battle", battleID, userID });
          }
        }
      );
    }

    if (sub === "top") {
      const top = Object.values(DB.players).sort((a, b) =>
        (b.wins * 100 + b.pokemons.length * 10 + b.level) -
        (a.wins * 100 + a.pokemons.length * 10 + a.level)
      ).slice(0, 10);
      if (!top.length) return send(api, threadID, "এখনো কোনো Trainer নেই!");
      return send(api, threadID, "🏆 TOP TRAINERS\n\n" +
        top.map((p, i) => `${i + 1}. ${p.name}\nLevel ${p.level} | Wins ${p.wins} | Pokémon ${p.pokemons.length}`).join("\n\n"));
    }

    if (sub === "shop") {
      return send(api, threadID,
        `🛒 POKÉMON SHOP

1. Pokéball — ৫০ Coins
2. Great Ball — ১৫০ Coins
3. Ultra Ball — ৪০০ Coins
4. Bait — ১০০ Coins

কিনতে:
p buy ball
p buy greatball
p buy ultraball
p buy bait`
      );
    }

    if (sub === "buy") {
      const items = {
        ball: { price: 50, field: "balls", name: "Pokéball" },
        greatball: { price: 150, field: "greatBalls", name: "Great Ball" },
        ultraball: { price: 400, field: "ultraBalls", name: "Ultra Ball" },
        bait: { price: 100, field: "bait", name: "Bait" }
      };
      const item = items[String(args[1] || "").toLowerCase()];
      if (!item) return send(api, threadID, "❌ p buy ball / greatball / ultraball / bait");
      if (player.money < item.price) return send(api, threadID, "❌ পর্যাপ্ত Coins নেই!");
      player.money -= item.price;
      player[item.field]++;
      saveDB();
      return send(api, threadID, `✅ ${item.name} কেনা হয়েছে!\n💰 বাকি Coins: ${player.money}`);
    }

    if (sub === "admin") {
      if (!isAdmin(userID)) return send(api, threadID, "⛔ Admin only!");
      const action = String(args[1] || "").toLowerCase();

      if (action === "backup") {
        try {
          fs.writeFileSync(BACKUP_FILE, JSON.stringify(DB, null, 2));
          return send(api, threadID, "✅ Database backup তৈরি হয়েছে।");
        } catch (e) { return send(api, threadID, "❌ Backup failed: " + e.message); }
      }

      if (action === "restore") {
        try {
          if (!fs.existsSync(BACKUP_FILE)) return send(api, threadID, "❌ Backup file পাওয়া যায়নি!");
          DB = { ...defaultDB(), ...JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8")) };
          saveDB();
          return send(api, threadID, "✅ Database restore হয়েছে!");
        } catch (e) { return send(api, threadID, "❌ Restore failed: " + e.message); }
      }

      if (action === "money") {
        const target = String(args[2] || "");
        const amount = Number(args[3]);
        if (!DB.players[target] || !Number.isFinite(amount) || amount === 0) {
          return send(api, threadID, "ব্যবহার: p admin money [UID] [amount]");
        }
        DB.players[target].money = Math.max(0, DB.players[target].money + amount);
        saveDB();
        return send(api, threadID, "✅ Player balance updated!");
      }

      if (action === "pokemon") {
        const target = String(args[2] || "");
        const base = getPokemon(args.slice(3).join(" "));
        if (!DB.players[target] || !base) return send(api, threadID, "ব্যবহার: p admin pokemon [UID] [Pokémon Name]");
        const pokemon = makePokemon(base.name, 10);
        if (!addPokemon(DB.players[target], pokemon)) return send(api, threadID, "❌ Player storage পূর্ণ!");
        saveDB();
        return send(api, threadID, `✅ ${base.name} যোগ করা হয়েছে!`);
      }

      if (action === "addpokemon") {
        const name = clean(args[2]);
        const type = clean(args[3] || "Normal");
        const rarity = clean(args[4] || "Common");
        if (!name || !TYPES[type] || !RARITY[rarity]) {
          return send(api, threadID, "ব্যবহার: p admin addpokemon [name] [type] [rarity]");
        }
        if (getPokemon(name)) return send(api, threadID, "এই Pokémon আগে থেকেই আছে!");
        DB.customPokemon.push({
          id: 1000 + DB.customPokemon.length, name,
          type: [type], rarity, hp: 60, atk: 60, def: 60, spd: 60, emoji: "✨"
        });
        saveDB();
        return send(api, threadID, `✅ নতুন Pokémon যোগ হয়েছে: ${name}`);
      }

      return send(api, threadID,
        `🛠️ ADMIN COMMANDS
p admin backup
p admin restore
p admin money [UID] [amount]
p admin pokemon [UID] [name]
p admin addpokemon [name] [type] [rarity]`
      );
    }

    return send(api, threadID, "❌ Command পাওয়া যায়নি। p help লেখো।");
  },
   onReply: async function ({ api, event, Reply }) {
    const userID = String(event.senderID);
    const threadID = event.threadID;
    const player = DB.players[userID];

    if (!player) {
      return send(api, threadID, "❌ আগে p help দিয়ে Game শুরু করো।");
    }

    if (!Reply || !Reply.action) {
      return send(api, threadID, "❌ Reply data পাওয়া যায়নি। আবার চেষ্টা করো।");
    }

    // অন্য Trainer যেন অন্যের Hunt বা Battle নিয়ন্ত্রণ করতে না পারে
    if (String(Reply.userID) !== userID) {
      return send(api, threadID, "❌ এই সিদ্ধান্তটি অন্য Trainer-এর জন্য!");
    }

    const choice = String(event.body || "").trim();

    // =====================================
    // HUNT / CATCH SYSTEM
    // =====================================
    if (Reply.action === "hunt") {
      const hunt = DB.activeHunts[userID];

      if (!hunt || hunt.expires < Date.now()) {
        delete DB.activeHunts[userID];
        saveDB();
        return send(api, threadID, "⏳ Wild Pokémon পালিয়ে গেছে! আবার p hunt লেখো।");
      }

      const wild = hunt.pokemon;

      if (choice === "6") {
        delete DB.activeHunts[userID];
        saveDB();
        return send(api, threadID, `🏃 তুমি ${wild.species}-কে ছেড়ে চলে গেলে!`);
      }

      const now = Date.now();
      const left = CONFIG.catchCooldown - (now - (player.lastCatch || 0));

      if (left > 0) {
        return send(api, threadID, `⏳ আবার চেষ্টা করতে ${Math.ceil(left / 1000)} সেকেন্ড অপেক্ষা করো।`);
      }

      let bonus = 0;
      let usedItem = "";

      if (choice === "1") {
        if (player.balls <= 0) {
          return send(api, threadID, "❌ তোমার Pokéball নেই! কিনতে p buy ball লেখো।");
        }
        player.balls--;
        bonus = 0;
        usedItem = "Pokéball";
      } else if (choice === "2") {
        if (player.greatBalls <= 0) {
          return send(api, threadID, "❌ তোমার Great Ball নেই! কিনতে p buy greatball লেখো।");
        }
        player.greatBalls--;
        bonus = 15;
        usedItem = "Great Ball";
      } else if (choice === "3") {
        if (player.ultraBalls <= 0) {
          return send(api, threadID, "❌ তোমার Ultra Ball নেই! কিনতে p buy ultraball লেখো।");
        }
        player.ultraBalls--;
        bonus = 30;
        usedItem = "Ultra Ball";
      } else if (choice === "4") {
        if (player.bait <= 0) {
          return send(api, threadID, "❌ তোমার Bait নেই! কিনতে p buy bait লেখো।");
        }
        player.bait--;
        bonus = 10;
        usedItem = "Bait";
      } else if (choice === "5") {
        bonus = 5;
        usedItem = "Sneak";
      } else {
        return send(api, threadID, "❌ 1, 2, 3, 4, 5 অথবা 6 লিখে Reply করো।");
      }

      player.lastCatch = now;

      const penalty = {
        Common: 0,
        Uncommon: 5,
        Rare: 15,
        Epic: 25,
        Legendary: 40,
        Mythical: 50,
        Secret: 60
      }[wild.rarity] || 0;

      const catchChance = Math.max(5, Math.min(95, 65 + bonus - penalty));

      if (chance(catchChance)) {
        if (!addPokemon(player, wild)) {
          // Storage পূর্ণ হলে ব্যবহৃত Item ফেরত
          if (choice === "1") player.balls++;
          if (choice === "2") player.greatBalls++;
          if (choice === "3") player.ultraBalls++;
          if (choice === "4") player.bait++;
          saveDB();
          return send(api, threadID, "❌ Pokémon Storage পূর্ণ! সর্বোচ্চ ১০০টি Pokémon রাখতে পারবে।");
        }

        delete DB.activeHunts[userID];
        player.money += wild.rarity === "Secret" ? 500 : wild.rarity === "Mythical" ? 300 : 25;
        saveDB();

        return sendCard(
          api,
          threadID,
          wild,
          "POKEMON CAUGHT!",
          `🎉 অভিনন্দন! Pokémon ধরা পড়েছে!

${wild.shiny ? "✨ SHINY POKÉMON!\n" : ""}🐾 Pokémon: ${wild.species}
⭐ Rarity: ${wild.rarity}
📊 Level: ${wild.level}
🎯 Used: ${usedItem}
🎲 Catch Chance: ${catchChance}%
🆔 ID: ${wild.uid.slice(0, 6)}

💰 Catch Reward যোগ হয়েছে!
👥 Team-এ স্বয়ংক্রিয়ভাবে যোগ হয়েছে (জায়গা থাকলে)।`
        );
      }

      const escaped = chance(20);
      if (escaped) delete DB.activeHunts[userID];

      saveDB();

      return send(
        api,
        threadID,
        `❌ ${wild.species} ধরা পড়েনি!

🎯 Catch Chance: ${catchChance}%
🎒 ব্যবহৃত: ${usedItem}

${escaped
  ? "🏃 Pokémon পালিয়ে গেছে! আবার Hunt করো।"
  : "⚠️ Pokémon এখনো কাছেই আছে। Hunt মেসেজে আবার Reply করে চেষ্টা করো!"}`
      );
    }

    // =====================================
    // BATTLE SYSTEM
    // =====================================
    if (Reply.action === "battle") {
      const battle = DB.battles[Reply.battleID];

      if (!battle || String(battle.userID) !== userID) {
        return send(api, threadID, "❌ এই Battle আর চালু নেই!");
      }

      if (String(battle.threadID) !== String(threadID)) {
        return send(api, threadID, "❌ এই Battle অন্য Chat-এ শুরু হয়েছিল।");
      }

      const moveIndex = Number(choice) - 1;

      if (!Number.isInteger(moveIndex) || moveIndex < 0 || moveIndex > 2) {
        return send(api, threadID, "❌ Skill নির্বাচন করতে 1, 2 অথবা 3 লিখে Reply করো।");
      }

      const own = getOwnedPokemon(player, battle.ownUID);

      if (!own || !battle.enemy) {
        delete DB.battles[battle.id];
        saveDB();
        return send(api, threadID, "❌ Battle data পাওয়া যায়নি!");
      }

      if (own.hp <= 0) {
        delete DB.battles[battle.id];
        saveDB();
        return send(api, threadID, "💔 তোমার Pokémon-এর HP শেষ! p heal লেখো।");
      }

      const move = own.moves[moveIndex];

      if (!move) {
        return send(api, threadID, "❌ এই Skill পাওয়া যায়নি!");
      }

      // Battle শেষ করার ফাংশন
      const finishBattle = (won) => {
        if (won) {
          player.wins++;

          const reward = battle.mode === "gym"
            ? Number(battle.extra.reward || 250)
            : 100;

          player.money += reward;
          const levels = addXP(player, 60);

          own.xp = (own.xp || 0) + 50;
          own.hp = Math.max(1, Math.floor(own.maxHp * 0.35));

          let badgeText = "";

          if (battle.mode === "gym" && battle.extra.badgeID) {
            const badge = BADGES.find(b => b.id === battle.extra.badgeID);

            if (badge && !player.badges.includes(badge.id)) {
              if (chance(70)) {
                player.badges.push(badge.id);
                badgeText = `\n🏅 নতুন Badge: ${badge.emoji} ${badge.name}`;
              } else {
                badgeText = "\n🎁 এবার Badge পাওয়া যায়নি। আবার Gym Challenge খেলো!";
              }
            } else if (badge) {
              badgeText = "\n🏅 এই Badge তোমার আগে থেকেই আছে!";
            }
          }

          delete DB.battles[battle.id];
          saveDB();

          return send(
            api,
            threadID,
            `🏆 VICTORY! তুমি জিতে গেছো!

⚔️ পরাজিত: ${battle.enemy.species}
💰 Reward: ${reward} Coins
⭐ Trainer XP: +60
🐾 Pokémon XP: +50
${levels ? `🎉 Level Up: ${player.level}` : ""}
${badgeText}

❤️ ${own.nickname}-এর HP: ${own.hp}/${own.maxHp}`
          );
        }

        player.losses++;
        own.hp = Math.max(1, Math.floor(own.maxHp * 0.1));

        delete DB.battles[battle.id];
        saveDB();

        return send(
          api,
          threadID,
          `💔 DEFEAT!

${battle.enemy.species} তোমাকে হারিয়ে দিয়েছে।

📉 Loss +1
❤️ ${own.nickname}-এর HP: ${own.hp}/${own.maxHp}

আবার Battle করার আগে p heal লেখো।`
        );
      };

      // নিজের Pokémon-এর আক্রমণ
      const result = damage(own, battle.enemy, move);
      battle.enemyHP -= result.value;

      let report =
        `⚔️ ROUND ${battle.round}

🟦 ${own.nickname} ব্যবহার করেছে ${move.name}!
💥 Damage: ${result.value}`;

      if (result.critical) report += "\n🔥 CRITICAL HIT!";
      if (result.mult > 1) report += "\n💪 SUPER EFFECTIVE!";
      if (result.mult < 1) report += "\n😵 NOT VERY EFFECTIVE!";

      report +=
        `\n\n🟥 ${battle.enemy.species}
${bar(battle.enemyHP, battle.enemyMaxHP)}
HP: ${Math.max(0, battle.enemyHP)}/${battle.enemyMaxHP}`;

      if (battle.enemyHP <= 0) {
        send(api, threadID, report + "\n\n🏆 প্রতিপক্ষ পরাজিত!");
        return finishBattle(true);
      }

      // Enemy-এর পাল্টা আক্রমণ
      const enemyMove = {
        name: "Enemy Attack",
        power: 20 + Math.floor(battle.enemy.atk * 0.3),
        type: battle.enemy.type?.[0] || "Normal"
      };

      const enemyResult = damage(battle.enemy, own, enemyMove);
      own.hp -= enemyResult.value;

      report +=
        `\n\n🟥 ${battle.enemy.species} পাল্টা আক্রমণ করেছে!
💥 Damage: ${enemyResult.value}

🟦 ${own.nickname}
${bar(own.hp, own.maxHp)}
HP: ${Math.max(0, own.hp)}/${own.maxHp}`;

      if (own.hp <= 0) {
        own.hp = 0;
        send(api, threadID, report + "\n\n💔 তোমার Pokémon পরাজিত!");
        return finishBattle(false);
      }

      battle.round++;
      saveDB();

      report +=
        `\n\n🎯 পরের Skill নির্বাচন করো:
${own.moves.map((m, i) => `${i + 1}. ${m.name} [Power ${m.power}]`).join("\n")}

এই মেসেজে Reply করো: 1 / 2 / 3`;

      return api.sendMessage(report, threadID, (err, info) => {
        if (!err && info?.messageID) {
          registerReply(info.messageID, {
            action: "battle",
            battleID: battle.id,
            userID
          });
        }
      });
    }

    return send(api, threadID, "❌ এই Reply-এর কোনো Action পাওয়া যায়নি।");
  }
}; 
