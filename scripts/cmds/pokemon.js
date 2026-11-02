"use strict";

/*
 * POKEMON WORLD ULTIMATE
 * GoatBot V2 Command
 * Graphics: Canvas
 * Database: JSON
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let Canvas;
try {
  Canvas = require("canvas");
} catch (e) {
  Canvas = null;
}

const DATA_DIR = path.join(__dirname, "pokemon_world_data");
const DB_FILE = path.join(DATA_DIR, "database.json");
const BACKUP_FILE = path.join(DATA_DIR, "backup.json");
const IMAGE_DIR = path.join(DATA_DIR, "cards");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

const CONFIG = {
  startMoney: 1000,
  huntCooldown: 30000,
  battleCooldown: 15000,
  catchCooldown: 5000,
  maxTeam: 6,
  pageSize: 8,
  adminIDs: [],
  defaultBall: 10
};

const TYPES = {
  Normal: { strong: [], weak: ["Fighting"], color: "#aaaaaa" },
  Fire: { strong: ["Grass", "Ice", "Bug", "Steel"], weak: ["Water", "Ground", "Rock"], color: "#ff7043" },
  Water: { strong: ["Fire", "Ground", "Rock"], weak: ["Electric", "Grass"], color: "#42a5f5" },
  Electric: { strong: ["Water", "Flying"], weak: ["Ground"], color: "#fdd835" },
  Grass: { strong: ["Water", "Ground", "Rock"], weak: ["Fire", "Ice", "Poison", "Flying", "Bug"], color: "#66bb6a" },
  Ice: { strong: ["Grass", "Ground", "Flying", "Dragon"], weak: ["Fire", "Fighting", "Rock", "Steel"], color: "#80deea" },
  Fighting: { strong: ["Normal", "Ice", "Rock", "Dark", "Steel"], weak: ["Flying", "Psychic", "Fairy"], color: "#ef5350" },
  Poison: { strong: ["Grass", "Fairy"], weak: ["Ground", "Psychic"], color: "#ab47bc" },
  Ground: { strong: ["Fire", "Electric", "Poison", "Rock", "Steel"], weak: ["Water", "Grass", "Ice"], color: "#bc8f50" },
  Flying: { strong: ["Grass", "Fighting", "Bug"], weak: ["Electric", "Ice", "Rock"], color: "#90caf9" },
  Psychic: { strong: ["Fighting", "Poison"], weak: ["Bug", "Ghost", "Dark"], color: "#ec407a" },
  Bug: { strong: ["Grass", "Psychic", "Dark"], weak: ["Fire", "Flying", "Rock"], color: "#9ccc65" },
  Rock: { strong: ["Fire", "Ice", "Flying", "Bug"], weak: ["Water", "Grass", "Fighting", "Ground", "Steel"], color: "#a1887f" },
  Ghost: { strong: ["Psychic", "Ghost"], weak: ["Ghost", "Dark"], color: "#7e57c2" },
  Dragon: { strong: ["Dragon"], weak: ["Ice", "Dragon", "Fairy"], color: "#5c6bc0" },
  Dark: { strong: ["Psychic", "Ghost"], weak: ["Fighting", "Bug", "Fairy"], color: "#616161" },
  Steel: { strong: ["Ice", "Rock", "Fairy"], weak: ["Fire", "Fighting", "Ground"], color: "#90a4ae" },
  Fairy: { strong: ["Fighting", "Dragon", "Dark"], weak: ["Poison", "Steel"], color: "#f48fb1" }
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

/*
 * Pokémon registry.
 * Admin tools can add more Pokémon in the next part.
 */

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

const GYM_LEADERS = [
  { name: "Brock", type: "Rock", pokemon: ["Geodude", "Garchomp"], reward: 300 },
  { name: "Misty", type: "Water", pokemon: ["Psyduck", "Lapras"], reward: 350 },
  { name: "Lt. Surge", type: "Electric", pokemon: ["Pikachu", "Raichu"], reward: 400 },
  { name: "Erika", type: "Grass", pokemon: ["Bulbasaur", "Venusaur"], reward: 450 },
  { name: "Blaine", type: "Fire", pokemon: ["Charmander", "Charizard"], reward: 500 },
  { name: "Sabrina", type: "Psychic", pokemon: ["Gastly", "Mewtwo"], reward: 600 },
  { name: "Clair", type: "Dragon", pokemon: ["Dragonair", "Dragonite"], reward: 700 }
];

const BADGES = [
  { id: "boulder", name: "Boulder Badge", leader: "Brock", emoji: "🪨", rarity: "Common" },
  { id: "cascade", name: "Cascade Badge", leader: "Misty", emoji: "💧", rarity: "Common" },
  { id: "thunder", name: "Thunder Badge", leader: "Lt. Surge", emoji: "⚡", rarity: "Uncommon" },
  { id: "rainbow", name: "Rainbow Badge", leader: "Erika", emoji: "🌈", rarity: "Uncommon" },
  { id: "soul", name: "Soul Badge", leader: "Koga", emoji: "☠️", rarity: "Rare" },
  { id: "marsh", name: "Marsh Badge", leader: "Sabrina", emoji: "🔮", rarity: "Rare" },
  { id: "volcano", name: "Volcano Badge", leader: "Blaine", emoji: "🌋", rarity: "Epic" },
  { id: "earth", name: "Earth Badge", leader: "Giovanni", emoji: "🌍", rarity: "Legendary" }
];

function defaultDB() {
  return {
    version: 1,
    players: {},
    activeHunts: {},
    battles: {},
    groupBattles: {},
    trades: {},
    customPokemon: [],
    customBadges: [],
    logs: []
  };
}

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const db = defaultDB();
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      return db;
    }
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return { ...defaultDB(), ...data };
  } catch (err) {
    console.error("[Pokemon DB]", err);
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        return { ...defaultDB(), ...JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8")) };
      }
    } catch (_) {}
    return defaultDB();
  }
}

let DB = loadDB();
let saveTimer = null;

function saveDB() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const temp = DB_FILE + ".tmp";
      fs.writeFileSync(temp, JSON.stringify(DB, null, 2));
      fs.renameSync(temp, DB_FILE);
      fs.copyFileSync(DB_FILE, BACKUP_FILE);
    } catch (err) {
      console.error("[Pokemon Save]", err);
    }
  }, 150);
}

function id() {
  return crypto.randomBytes(5).toString("hex");
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(percent) {
  return Math.random() * 100 < percent;
}

function getPokemon(name) {
  const all = [...POKEMON, ...DB.customPokemon];
  return all.find(p => p.name.toLowerCase() === String(name).toLowerCase());
}

function getAllPokemon() {
  return [...POKEMON, ...DB.customPokemon];
}

function getPlayer(userID, name = "Trainer") {
  if (!DB.players[userID]) {
    DB.players[userID] = {
      id: userID,
      name,
      money: CONFIG.startMoney,
      balls: CONFIG.defaultBall,
      greatBalls: 0,
      ultraBalls: 0,
      bait: 3,
      pokemons: [],
      badges: [],
      team: [],
      wins: 0,
      losses: 0,
      level: 1,
      xp: 0,
      lastHunt: 0,
      lastBattle: 0,
      lastCatch: 0,
      createdAt: Date.now()
    };
    saveDB();
  }
  DB.players[userID].name = name || DB.players[userID].name;
  return DB.players[userID];
}

function makePokemon(species, level = 5) {
  const base = getPokemon(species);
  if (!base) return null;

  const shiny = chance(1);
  const mult = RARITY[base.rarity]?.multiplier || 1;
  const stat = (n) => Math.max(1, Math.floor((n + level * 2) * mult));

  return {
    uid: id(),
    species: base.name,
    nickname: base.name,
    type: base.type,
    rarity: base.rarity,
    level,
    xp: 0,
    hp: stat(base.hp),
    maxHp: stat(base.hp),
    atk: stat(base.atk),
    def: stat(base.def),
    spd: stat(base.spd),
    shiny,
    caughtAt: Date.now(),
    friendship: 10,
    moves: [
      { name: MOVES[base.type[0]]?.[0] || "Tackle", power: 20, type: base.type[0], cooldown: 0 },
      { name: MOVES[base.type[0]]?.[1] || "Power Strike", power: 35, type: base.type[0], cooldown: 1 },
      { name: MOVES[base.type[0]]?.[2] || "Ultimate Attack", power: 50, type: base.type[0], cooldown: 2 }
    ],
    status: null
  };
}

function getOwnedPokemon(player, uid) {
  return player.pokemons.find(p => p.uid === uid || p.uid.startsWith(uid));
}

function getTeam(player) {
  return player.team
    .map(uid => getOwnedPokemon(player, uid))
    .filter(Boolean);
}

function addXP(player, amount) {
  player.xp += amount;
  let leveled = false;
  while (player.xp >= player.level * 100) {
    player.xp -= player.level * 100;
    player.level++;
    player.money += 100;
    leveled = true;
  }
  return leveled;
}

function getRarityRoll() {
  const total = Object.values(RARITY).reduce((a, b) => a + b.weight, 0);
  let roll = Math.random() * total;
  for (const [name, data] of Object.entries(RARITY)) {
    roll -= data.weight;
    if (roll <= 0) return name;
  }
  return "Common";
}

function pickWildPokemon() {
  const rarity = getRarityRoll();
  const pool = getAllPokemon().filter(p => p.rarity === rarity);
  if (!pool.length) {
    const fallback = getAllPokemon().filter(p => p.rarity === "Common");
    return fallback[random(0, fallback.length - 1)];
  }
  return pool[random(0, pool.length - 1)];
}

function typeMultiplier(attackType, defenderTypes) {
  let mult = 1;
  for (const type of defenderTypes || []) {
    const data = TYPES[attackType];
    if (!data) continue;
    if (data.strong.includes(type)) mult *= 2;
    if (data.weak.includes(type)) mult *= 0.5;
  }
  return mult;
}

function calculateDamage(attacker, defender, move) {
  const mult = typeMultiplier(move.type, defender.type);
  const base = Math.max(1, move.power + attacker.atk * 0.45 - defender.def * 0.25);
  const critical = chance(10);
  const randomFactor = random(85, 100) / 100;
  const damage = Math.max(1, Math.floor(base * mult * randomFactor * (critical ? 1.5 : 1)));
  return { damage, critical, multiplier: mult };
}

function makeBar(current, max, length = 12) {
  const ratio = Math.max(0, Math.min(1, current / Math.max(1, max)));
  const filled = Math.round(ratio * length);
  return "🟩".repeat(filled) + "⬛".repeat(length - filled);
}

async function makeCard(pokemon, title = "WILD POKÉMON") {
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
  ctx.fillText(title, 35, 55);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px Arial";
  ctx.fillText(pokemon.nickname || pokemon.species, 35, 115);

  ctx.font = "100px Arial";
  ctx.fillText(base?.emoji || "❔", 70, 260);

  ctx.font = "bold 22px Arial";
  ctx.fillStyle = color;
  ctx.fillText(pokemon.rarity + (pokemon.shiny ? " ✨ SHINY" : ""), 35, 320);

  ctx.fillStyle = "#ffffff";
  ctx.font = "20px Arial";
  ctx.fillText("TYPE: " + (pokemon.type || []).join(" / "), 350, 190);
  ctx.fillText("LEVEL: " + pokemon.level, 350, 230);
  ctx.fillText("HP: " + pokemon.hp + "/" + pokemon.maxHp, 350, 270);
  ctx.fillText("ATK: " + pokemon.atk + "   DEF: " + pokemon.def, 350, 310);
  ctx.fillText("SPD: " + pokemon.spd, 350, 350);

  const file = path.join(IMAGE_DIR, `${id()}.png`);
  fs.writeFileSync(file, canvas.toBuffer("image/png"));
  return file;
}

function sendCard(api, threadID, pokemon, title, body) {
  return makeCard(pokemon, title).then(file => {
    if (!file) {
      return api.sendMessage(body, threadID);
    }
    api.sendMessage({
      body,
      attachment: fs.createReadStream(file)
    }, threadID, () => {
      try { fs.unlinkSync(file); } catch (_) {}
    });
  });
}

function isAdmin(userID) {
  return CONFIG.adminIDs.includes(String(userID));
}

function getRandomRegion() {
  const regions = [
    { name: "Viridian Forest", types: ["Grass", "Bug"], bonus: ["Bulbasaur", "Pikachu", "Gastly"] },
    { name: "Rocky Mountain", types: ["Rock", "Ground"], bonus: ["Geodude", "Garchomp"] },
    { name: "Azure Lake", types: ["Water", "Ice"], bonus: ["Squirtle", "Lapras", "Psyduck"] },
    { name: "Volcano Valley", types: ["Fire"], bonus: ["Charmander", "Moltres"] },
    { name: "Mystic Cave", types: ["Ghost", "Psychic"], bonus: ["Gastly", "Gengar", "Mewtwo"] },
    { name: "Dragon Peak", types: ["Dragon", "Flying"], bonus: ["Dratini", "Dragonite", "Rayquaza"] }
  ];
  return regions[random(0, regions.length - 1)];
}

function pickRegionPokemon(region) {
  if (chance(35)) {
    const bonus = region.bonus.map(getPokemon).filter(Boolean);
    if (bonus.length) return bonus[random(0, bonus.length - 1)];
  }

  const pool = getAllPokemon().filter(p => p.type.some(t => region.types.includes(t)));
  return pool.length ? pool[random(0, pool.length - 1)] : pickWildPokemon();
}

function cleanText(value) {
  return String(value || "").replace(/[<>]/g, "").slice(0, 100);
}
function registerReply(global, messageID, data) {
  if (!global.GoatBot) global.GoatBot = {};
  if (!global.GoatBot.onReply) global.GoatBot.onReply = new Map();

  global.GoatBot.onReply.set(messageID, {
    name: "pokemon",
    messageID,
    ...data
  });
}

function send(api, threadID, text) {
  return api.sendMessage(text, threadID);
}

function getActivePokemon(player) {
  const team = getTeam(player);
  return team.find(p => p.hp > 0) || team[0] || player.pokemons[0] || null;
}

function addPokemon(player, pokemon) {
  if (player.pokemons.length >= 100) return false;

  player.pokemons.push(pokemon);

  if (player.team.length < CONFIG.maxTeam) {
    player.team.push(pokemon.uid);
  }

  return true;
}

function getPokemonText(p, index) {
  return `${index + 1}. ${p.shiny ? "✨" : ""}${p.nickname} [${p.rarity}]
   Type: ${p.type.join("/")}
   Lv.${p.level} | HP ${p.hp}/${p.maxHp}
   ATK ${p.atk} | DEF ${p.def} | SPD ${p.spd}
   ID: ${p.uid.slice(0, 6)}`;
}

function getBadgeList(player) {
  const all = [...BADGES, ...DB.customBadges];
  return player.badges.map(id => all.find(b => b.id === id)).filter(Boolean);
}

function startBattle(api, threadID, userID, player, enemy, mode, extra = {}) {
  const own = getActivePokemon(player);

  if (!own) {
    return send(api, threadID, "❌ আগে Pokémon ধরো। তোমার কোনো Pokémon নেই!");
  }

  if (own.hp <= 0) {
    return send(api, threadID, "❌ তোমার Pokémon-এর HP শেষ! আগে heal করো: `p heal`");
  }

  const battleID = id();

  DB.battles[battleID] = {
    id: battleID,
    threadID,
    userID,
    mode,
    ownUID: own.uid,
    enemy: { ...enemy },
    enemyHP: enemy.hp,
    enemyMaxHP: enemy.hp,
    round: 1,
    extra,
    createdAt: Date.now()
  };

  saveDB();

  const moves = own.moves || [];
  const text =
    `⚔️ POKÉMON BATTLE START!\n\n` +
    `🟦 তোমার Pokémon: ${own.nickname} Lv.${own.level}\n` +
    `${makeBar(own.hp, own.maxHp)} ${own.hp}/${own.maxHp}\n\n` +
    `🟥 প্রতিপক্ষ: ${enemy.species}\n` +
    `${makeBar(enemy.hp, enemy.hp)} ${enemy.hp}/${enemy.hp}\n\n` +
    `🎯 কোন Skill ব্যবহার করবে?\n\n` +
    moves.map((m, i) => `${i + 1}. ${m.name} [Power ${m.power}]`).join("\n") +
    `\n\nReply করো: 1 / 2 / 3`;

  api.sendMessage(text, threadID, (err, info) => {
    if (!err) {
      registerReply(global, info.messageID, {
        action: "battle",
        battleID,
        userID
      });
    }
  });
}

function endBattle(api, battle, won) {
  const player = DB.players[battle.userID];
  if (!player) {
    delete DB.battles[battle.id];
    saveDB();
    return;
  }

  const own = getOwnedPokemon(player, battle.ownUID);

  if (won) {
    player.wins++;
    player.money += battle.mode === "gym" ? 250 : 100;
    addXP(player, 60);

    if (own) {
      own.xp += 50;
      own.hp = Math.max(1, Math.floor(own.maxHp * 0.35));
    }

    let reward = "";

    if (battle.mode === "gym" && battle.extra.badgeID) {
      const badge = [...BADGES, ...DB.customBadges]
        .find(b => b.id === battle.extra.badgeID);

      if (badge && chance(70)) {
        player.badges.push(badge.id);
        reward = `\n🏅 তুমি পেয়েছো ${badge.name}!`;
      } else {
        reward = "\n🎁 এবার Badge পাওয়া যায়নি। আবার চেষ্টা করো!";
      }
    }

    send(
      api,
      battle.threadID,
      `🏆 VICTORY!\n\n` +
      `তুমি ${battle.enemy.species}-কে পরাজিত করেছো!\n` +
      `💰 পুরস্কার: ${battle.mode === "gym" ? 250 : 100} Coins` +
      reward +
      `\n⭐ Trainer XP +60`
    );
  } else {
    player.losses++;

    if (own) own.hp = Math.max(1, Math.floor(own.maxHp * 0.1));

    send(
      api,
      battle.threadID,
      `💔 DEFEAT!\n\n${battle.enemy.species} তোমাকে হারিয়ে দিয়েছে।\n` +
      `তোমার Pokémon-এর HP কমে গেছে। Heal করতে লিখো: p heal`
    );
  }

  delete DB.battles[battle.id];
  saveDB();
}

function executeMove(api, battle, player, moveIndex) {
  const own = getOwnedPokemon(player, battle.ownUID);

  if (!own || !battle.enemy) {
    delete DB.battles[battle.id];
    saveDB();
    return;
  }

  const move = own.moves[moveIndex];

  if (!move) {
    return send(api, battle.threadID, "❌ ভুল Skill নির্বাচন!");
  }

  const result = calculateDamage(own, battle.enemy, move);
  battle.enemyHP -= result.damage;

  let report =
    `⚔️ ROUND ${battle.round}\n\n` +
    `🟦 ${own.nickname} ব্যবহার করেছে ${move.name}!\n` +
    `💥 Damage: ${result.damage}`;

  if (result.critical) report += "\n🔥 CRITICAL HIT!";
  if (result.multiplier > 1) report += "\n💪 SUPER EFFECTIVE!";
  if (result.multiplier < 1) report += "\n😵 NOT VERY EFFECTIVE!";

  report +=
    `\n\n🟥 ${battle.enemy.species}\n` +
    `${makeBar(Math.max(0, battle.enemyHP), battle.enemyMaxHP)} ` +
    `${Math.max(0, battle.enemyHP)}/${battle.enemyMaxHP}`;

  if (battle.enemyHP <= 0) {
    send(api, battle.threadID, report + "\n\n🏆 প্রতিপক্ষ পরাজিত!");
    return endBattle(api, battle, true);
  }

  const enemyMove = {
    name: "Enemy Attack",
    power: 20 + Math.floor(battle.enemy.atk * 0.3),
    type: battle.enemy.type?.[0] || "Normal"
  };

  const enemyResult = calculateDamage(battle.enemy, own, enemyMove);
  own.hp -= enemyResult.damage;

  report +=
    `\n\n🟥 ${battle.enemy.species} পাল্টা আক্রমণ করেছে!\n` +
    `💥 তোমার Damage: ${enemyResult.damage}\n` +
    `🟦 ${own.nickname}\n` +
    `${makeBar(Math.max(0, own.hp), own.maxHp)} ` +
    `${Math.max(0, own.hp)}/${own.maxHp}`;

  battle.round++;

  if (own.hp <= 0) {
    own.hp = 0;
    send(api, battle.threadID, report + "\n\n💔 তোমার Pokémon পরাজিত!");
    return endBattle(api, battle, false);
  }

  saveDB();

  const moves = own.moves || [];
  report +=
    `\n\n🎯 পরের Skill নির্বাচন করো:\n` +
    moves.map((m, i) => `${i + 1}. ${m.name} [Power ${m.power}]`).join("\n");

  api.sendMessage(report, battle.threadID, (err, info) => {
    if (!err) {
      registerReply(global, info.messageID, {
        action: "battle",
        battleID: battle.id,
        userID: battle.userID
      });
    }
  });
}

module.exports = {
  config: {
    name: "pokemon",
    aliases: ["p", "pk", "pok"],
    version: "3.0.0",
    author: "Pokémon World",
    countDown: 3,
    role: 0,
    shortDescription: "Pokémon World Ultimate",
    longDescription: "Hunt, catch, battle, gym, badges and Pokémon collection.",
    category: "game",
    guide: {
      en:
        "pokemon\n" +
        "pokemon hunt\n" +
        "pokemon catch\n" +
        "pokemon pokedex [page]\n" +
        "pokemon team\n" +
        "pokemon team add [id]\n" +
        "pokemon battle\n" +
        "pokemon gym\n" +
        "pokemon badge [page]\n" +
        "pokemon profile\n" +
        "pokemon heal\n" +
        "pokemon top\n" +
        "pokemon shop\n" +
        "pokemon buy [ball|greatball|ultraball|bait]\n" +
        "pokemon admin backup\n" +
        "pokemon admin restore"
    }
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const userID = String(event.senderID);
    const threadID = event.threadID;
    const name = event.senderName || "Trainer";
    const player = getPlayer(userID, name);

    const sub = String(args[0] || "help").toLowerCase();

    if (sub === "help") {
      return send(api, threadID,
        `🌍 POKÉMON WORLD ULTIMATE\n\n` +
        `🌲 p hunt — Pokémon খুঁজতে যাও\n` +
        `🎯 p catch — Pokémon ধরো\n` +
        `📖 p pk [page] — Pokédex\n` +
        `👥 p team — তোমার Team\n` +
        `⚔️ p battle — Wild Battle\n` +
        `🏟️ p gym — Gym Challenge\n` +
        `🏅 p bd — Badge Collection\n` +
        `👤 p profile — Trainer Profile\n` +
        `❤️ p heal — Pokémon Heal\n` +
        `🏆 p top — Top Trainers\n` +
        `🛒 p shop — Shop\n` +
        `💰 p buy ball — Pokéball কিনো\n\n` +
        `Reply করে Hunt ও Battle-এর সিদ্ধান্ত দিতে হবে।`
      );
    }

    if (sub === "hunt") {
      const now = Date.now();
      if (now - player.lastHunt < CONFIG.huntCooldown) {
        const left = Math.ceil((CONFIG.huntCooldown - (now - player.lastHunt)) / 1000);
        return send(api, threadID, `⏳ আবার Hunt করতে ${left} সেকেন্ড অপেক্ষা করো।`);
      }

      player.lastHunt = now;

      const region = getRandomRegion();

      if (chance(22)) {
        saveDB();
        return send(api, threadID,
          `🌲 তুমি ${region.name}-এ ঘুরে দেখলে...\n` +
          `🍃 কিছু পায়ের ছাপ পাওয়া গেছে, কিন্তু Pokémon দেখা যায়নি!\n` +
          `পরে আবার চেষ্টা করো।`
        );
      }

      const base = pickRegionPokemon(region);
      const level = random(3, 12);
      const wild = makePokemon(base.name, level);

      if (!wild) return send(api, threadID, "❌ Pokémon তৈরি করা যায়নি।");

      DB.activeHunts[userID] = {
        pokemon: wild,
        region: region.name,
        expires: Date.now() + 60000
      };

      saveDB();

      const body =
        `🌲 ${region.name}\n\n` +
        `⚠️ একটি Wild Pokémon দেখা গেছে!\n` +
        `${wild.shiny ? "✨ SHINY POKÉMON!\n" : ""}` +
        `${wild.nickname} [${wild.rarity}]\n` +
        `Level: ${wild.level}\n` +
        `HP: ${wild.hp}\n\n` +
        `কী করবে?\n` +
        `1 — Pokéball ছুঁড়বে\n` +
        `2 — Bait ব্যবহার করবে\n` +
        `3 — Sneak করে ধরার চেষ্টা করবে\n` +
        `4 — পালিয়ে যাবে\n\n` +
        `⏳ ৬০ সেকেন্ডের মধ্যে Reply করো।`;

      api.sendMessage(body, threadID, (err, info) => {
        if (!err) {
          registerReply(global, info.messageID, {
            action: "hunt",
            userID
          });
        }
      });

      return;
    }

    if (sub === "catch") {
      const hunt = DB.activeHunts[userID];
      if (!hunt || hunt.expires < Date.now()) {
        delete DB.activeHunts[userID];
        return send(api, threadID, "❌ কোনো Wild Pokémon নেই। আগে `p hunt` লেখো।");
      }

      return send(api, threadID,
        `🎯 ${hunt.pokemon.species} ধরতে হলে Hunt-এর মেসেজে Reply করে 1, 2 অথবা 3 লেখো।`
      );
    }

    if (sub === "pk" || sub === "pokedex") {
      const page = Math.max(1, parseInt(args[1]) || 1);
      const all = getAllPokemon();
      const pages = Math.max(1, Math.ceil(all.length / CONFIG.pageSize));
      const selected = all.slice((page - 1) * CONFIG.pageSize, page * CONFIG.pageSize);

      if (!selected.length) return send(api, threadID, "❌ এই পৃষ্ঠা নেই।");

      let text =
        `📖 POKÉDEX | PAGE ${page}/${pages}\n` +
        `Collected: ${player.pokemons.length}\n\n`;

      selected.forEach((p, i) => {
        const caught = player.pokemons.some(x => x.species === p.name);
        text += `${(page - 1) * CONFIG.pageSize + i + 1}. ${p.emoji} ${p.name}\n`;
        text += `   ${p.type.join("/")} | ${p.rarity} ${caught ? "✅" : "❔"}\n`;
      });

      text += `\nপরের পৃষ্ঠা: p pk ${Math.min(pages, page + 1)}`;
      return send(api, threadID, text);
    }

    if (sub === "team") {
      if (String(args[1]).toLowerCase() === "add") {
        const uid = String(args[2] || "");
        const pokemon = getOwnedPokemon(player, uid);

        if (!pokemon) return send(api, threadID, "❌ Pokémon ID পাওয়া যায়নি।");
        if (player.team.includes(pokemon.uid)) return send(api, threadID, "এটি আগে থেকেই Team-এ আছে।");
        if (player.team.length >= CONFIG.maxTeam) return send(api, threadID, "❌ Team পূর্ণ। সর্বোচ্চ ৬টি Pokémon রাখতে পারবে।");

        player.team.push(pokemon.uid);
        saveDB();
        return send(api, threadID, `✅ ${pokemon.nickname} Team-এ যোগ হয়েছে!`);
      }

      const team = getTeam(player);
      if (!team.length) return send(api, threadID, "❌ Team খালি। আগে Pokémon ধরো!");

      return send(api, threadID,
        `👥 YOUR POKÉMON TEAM\n\n` +
        team.map((p, i) => getPokemonText(p, i)).join("\n\n") +
        `\n\nTeam পরিবর্তন: p team add [Pokémon ID]`
      );
    }

    if (sub === "profile" || sub === "me") {
      return send(api, threadID,
        `👤 TRAINER PROFILE\n\n` +
        `Name: ${player.name}\n` +
        `Level: ${player.level}\n` +
        `XP: ${player.xp}/${player.level * 100}\n` +
        `💰 Coins: ${player.money}\n` +
        `Pokémon: ${player.pokemons.length}\n` +
        `🏅 Badges: ${player.badges.length}\n` +
        `⚔️ Wins: ${player.wins}\n` +
        `💔 Losses: ${player.losses}\n` +
        `Pokéball: ${player.balls}\n` +
        `Great Ball: ${player.greatBalls}\n` +
        `Ultra Ball: ${player.ultraBalls}\n` +
        `Bait: ${player.bait}`
      );
    }

    if (sub === "bd" || sub === "badge") {
      const badges = getBadgeList(player);
      if (!badges.length) return send(api, threadID, "🏅 এখনো কোনো Badge নেই। Gym Challenge খেলো!");

      const page = Math.max(1, parseInt(args[1]) || 1);
      const pages = Math.max(1, Math.ceil(badges.length / CONFIG.pageSize));
      const selected = badges.slice((page - 1) * CONFIG.pageSize, page * CONFIG.pageSize);

      return send(api, threadID,
        `🏅 BADGE COLLECTION ${page}/${pages}\n\n` +
        selected.map((b, i) => `${i + 1}. ${b.emoji} ${b.name}\n   ${b.rarity} | Leader: ${b.leader}`).join("\n") +
        `\n\nপরের পৃষ্ঠা: p bd ${Math.min(page + 1, pages)}`
      );
    }

    if (sub === "heal") {
      if (player.money < 50) return send(api, threadID, "❌ Heal করতে ৫০ Coins লাগবে।");

      player.money -= 50;
      player.pokemons.forEach(p => {
        p.hp = p.maxHp;
        p.status = null;
      });

      saveDB();
      return send(api, threadID, "❤️ তোমার সব Pokémon পুরো Heal হয়েছে! ৫০ Coins কাটা হয়েছে।");
    }

    if (sub === "battle") {
      const own = getActivePokemon(player);
      if (!own) return send(api, threadID, "❌ আগে Pokémon ধরো!");

      const base = pickWildPokemon();
      const enemy = makePokemon(base.name, Math.max(3, own.level + random(-2, 3)));

      return startBattle(api, threadID, userID, player, enemy, "wild");
    }

    if (sub === "gym" || sub === "gl") {
      const leader = GYM_LEADERS[random(0, GYM_LEADERS.length - 1)];
      const enemyName = leader.pokemon[random(0, leader.pokemon.length - 1)];
      const enemy = makePokemon(enemyName, random(8, 15));

      const badge = BADGES.find(b => b.leader === leader.name);

      send(api, threadID,
        `🏟️ GYM LEADER CHALLENGE\n\n` +
        `👑 Leader: ${leader.name}\n` +
        `Type: ${leader.type}\n` +
        `Enemy: ${enemy.name}\n` +
        `Level: ${enemy.level}\n` +
        `🏅 সম্ভাব্য Badge: ${badge ? badge.name : "Special Badge"}\n\n` +
        `⚔️ Battle শুরু হচ্ছে...`
      );

      return startBattle(api, threadID, userID, player, enemy, "gym", {
        leader: leader.name,
        badgeID: badge?.id || null
      });
    }

    if (sub === "top") {
      const top = Object.values(DB.players)
        .sort((a, b) => (b.wins * 100 + b.pokemons.length * 10 + b.level) -
                        (a.wins * 100 + a.pokemons.length * 10 + a.level))
        .slice(0, 10);

      if (!top.length) return send(api, threadID, "এখনো কোনো Trainer নেই!");

      return send(api, threadID,
        `🏆 TOP TRAINERS\n\n` +
        top.map((p, i) =>
          `${i + 1}. ${p.name}\n` +
          `   Level ${p.level} | Wins ${p.wins} | Pokémon ${p.pokemons.length}`
        ).join("\n\n")
      );
    }

    if (sub === "shop") {
      return send(api, threadID,
        `🛒 POKÉMON SHOP\n\n` +
        `1. Pokéball — ৫০ Coins\n` +
        `2. Great Ball — ১৫০ Coins\n` +
        `3. Ultra Ball — ৪০০ Coins\n` +
        `4. Bait — ১০০ Coins\n\n` +
        `কিনতে লিখো:\n` +
        `p buy ball\n` +
        `p buy greatball\n` +
        `p buy ultraball\n` +
        `p buy bait`
      );
    }

    if (sub === "buy") {
      const item = String(args[1] || "").toLowerCase();
      const items = {
        ball: { price: 50, field: "balls", name: "Pokéball" },
        greatball: { price: 150, field: "greatBalls", name: "Great Ball" },
        ultraball: { price: 400, field: "ultraBalls", name: "Ultra Ball" },
        bait: { price: 100, field: "bait", name: "Bait" }
      };

      const selected = items[item];
      if (!selected) return send(api, threadID, "❌ p buy ball / greatball / ultraball / bait");

      if (player.money < selected.price) return send(api, threadID, "❌ পর্যাপ্ত Coins নেই!");

      player.money -= selected.price;
      player[selected.field]++;
      saveDB();

      return send(api, threadID,
        `✅ ${selected.name} কেনা হয়েছে!\n💰 বাকি Coins: ${player.money}`
      );
    }

    if (sub === "admin") {
      if (!isAdmin(userID)) return send(api, threadID, "⛔ Admin only!");

      const action = String(args[1] || "").toLowerCase();

      if (action === "backup") {
        try {
          fs.writeFileSync(BACKUP_FILE, JSON.stringify(DB, null, 2));
          return send(api, threadID, "✅ Database backup তৈরি হয়েছে।");
        } catch (e) {
          return send(api, threadID, "❌ Backup failed: " + e.message);
        }
      }

      if (action === "restore") {
        try {
          if (!fs.existsSync(BACKUP_FILE)) return send(api, threadID, "❌ Backup file পাওয়া যায়নি!");
          DB = { ...defaultDB(), ...JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8")) };
          saveDB();
          return send(api, threadID, "✅ Backup থেকে Database restore হয়েছে!");
        } catch (e) {
          return send(api, threadID, "❌ Restore failed: " + e.message);
        }
      }

      if (action === "money") {
        const target = String(args[2] || "");
        const amount = parseInt(args[3]);

        if (!DB.players[target] || !Number.isFinite(amount)) {
          return send(api, threadID, "ব্যবহার: p admin money [UID] [amount]");
        }

        DB.players[target].money += amount;
        saveDB();
        return send(api, threadID, "✅ Player balance updated!");
      }

      if (action === "pokemon") {
        const target = String(args[2] || "");
        const species = args.slice(3).join(" ");
        const base = getPokemon(species);

        if (!DB.players[target] || !base) {
          return send(api, threadID, "ব্যবহার: p admin pokemon [UID] [Pokémon Name]");
        }

        const pokemon = makePokemon(base.name, 10);
        addPokemon(DB.players[target], pokemon);
        saveDB();

        return send(api, threadID, `✅ ${base.name} যোগ করা হয়েছে!`);
      }

      if (action === "addpokemon") {
        const name = cleanText(args[2]);
        const type = cleanText(args[3] || "Normal");
        const rarity = cleanText(args[4] || "Common");

        if (!name || !TYPES[type] || !RARITY[rarity]) {
          return send(api, threadID, "ব্যবহার: p admin addpokemon [name] [type] [rarity]");
        }

        if (getPokemon(name)) return send(api, threadID, "এই Pokémon আগে থেকেই আছে!");

        DB.customPokemon.push({
          id: 1000 + DB.customPokemon.length,
          name,
          type: [type],
          rarity,
          hp: 60,
          atk: 60,
          def: 60,
          spd: 60,
          emoji: "✨"
        });

        saveDB();
        return send(api, threadID, `✅ নতুন Pokémon যোগ হয়েছে: ${name}`);
      }

      return send(api, threadID,
        `🛠️ ADMIN COMMANDS\n\n` +
        `p admin backup\n` +
        `p admin restore\n` +
        `p admin money [UID] [amount]\n` +
        `p admin pokemon [UID] [name]\n` +
        `p admin addpokemon [name] [type] [rarity]`
      );
    }

    return send(api, threadID, "❌ Command পাওয়া যায়নি। সাহায্যের জন্য `p help` লেখো।");
  },

  onReply: async function ({ api, event, Reply }) {
    const userID = String(event.senderID);
    const threadID = event.threadID;
    const player = DB.players[userID];

    if (!player) return;

    if (String(Reply.userID) !== userID) {
      return send(api, threadID, "❌ এই সিদ্ধান্তটি অন্য Trainer-এর জন্য!");
    }

    if (Reply.action === "hunt") {
      const hunt = DB.activeHunts[userID];

      if (!hunt || hunt.expires < Date.now()) {
        delete DB.activeHunts[userID];
        saveDB();
        return send(api, threadID, "⏳ Wild Pokémon পালিয়ে গেছে!");
      }

      const choice = String(event.body || "").trim();
      const wild = hunt.pokemon;

      if (choice === "4") {
        delete DB.activeHunts[userID];
        saveDB();
        return send(api, threadID, `🏃 তুমি ${wild.species}-কে ছেড়ে চলে গেলে!`);
      }

      let ballBonus = 0;
      let chanceValue = 0;
      let usedItem = "";

      if (choice === "1") {
        if (player.balls <= 0) return send(api, threadID, "❌ তোমার Pokéball নেই! p buy ball");
        player.balls--;
        ballBonus = 0;
        usedItem = "Pokéball";
      } else if (choice === "2") {
        if (player.bait <= 0) return send(api, threadID, "❌ তোমার Bait নেই! p buy bait");
        player.bait--;
        ballBonus = 15;
        usedItem = "Bait";
      } else if (choice === "3") {
        ballBonus = 10;
        usedItem = "Sneak";
      } else {
        return send(api, threadID, "❌ 1, 2, 3 অথবা 4 লিখে Reply করো।");
      }

      const rarityPenalty = {
        Common: 0,
        Uncommon: 5,
        Rare: 15,
        Epic: 25,
        Legendary: 40,
        Mythical: 50,
        Secret: 60
      }[wild.rarity] || 0;

      chanceValue = Math.max(5, Math.min(90, 65 + ballBonus - rarityPenalty));

      if (chance(chanceValue)) {
        if (!addPokemon(player, wild)) {
          return send(api, threadID, "❌ তোমার Pokémon storage পূর্ণ!");
        }

        delete DB.activeHunts[userID];
        saveDB();

        return sendCard(
          api,
          threadID,
          wild,
          "POKÉMON CAUGHT!",
          `🎉 অভিনন্দন! ${wild.species} ধরা পড়েছে!\n` +
          `🎯 ব্যবহার: ${usedItem}\n` +
          `📊 Catch Chance: ${chanceValue}%\n` +
          `✨ Shiny: ${wild.shiny ? "YES!" : "No"}\n` +
          `🆔 ID: ${wild.uid.slice(0, 6)}`
        );
      }

      const escaped = chance(25);
      if (escaped) delete DB.activeHunts[userID];

      saveDB();

      return send(api, threadID,
        `❌ ${wild.species} ধরা পড়েনি!\n` +
        `🎯 Catch Chance: ${chanceValue}%\n` +
        `${escaped ? "🏃 Pokémon পালিয়ে গেছে!" : "⚠️ Pokémon এখনো কাছেই আছে। আবার চেষ্টা করো!"}`
      );
    }

    if (Reply.action === "battle") {
      const battle = DB.battles[Reply.battleID];

      if (!battle || battle.userID !== userID) {
        return send(api, threadID, "❌ Battle আর চালু নেই!");
      }

      const choice = parseInt(String(event.body || "").trim());

      if (![1, 2, 3].includes(choice)) {
        return send(api, threadID, "❌ Skill নির্বাচন করতে 1, 2 অথবা 3 লিখো।");
      }

      return executeMove(api, battle, player, choice - 1);
    }
  }
};
