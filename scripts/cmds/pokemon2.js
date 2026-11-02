
"use strict";

/*
 * POKEMON2 - ULTIMATE MESSENGER RPG
 * PART 1/2
 * Combine PART 1 + PART 2 in pokemon2.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createCanvas } = require("canvas");

// ==========================================
// CONFIGURATION
// ==========================================

const DB_DIR = path.join(__dirname, "pokemon2_data");
const DB_FILE = path.join(DB_DIR, "database.json");
const BACKUP_DIR = path.join(DB_DIR, "backups");

const WIDTH = 1000;
const HEIGHT = 700;

const PREFIX = "pokemon2";

const games = new Map();

const COLORS = {
  bg: "#10152c",
  panel: "#202b4c",
  gold: "#ffd166",
  red: "#ff5268",
  green: "#39d98a",
  blue: "#52b9ff",
  purple: "#a78bfa",
  white: "#ffffff",
  gray: "#aab5d0"
};

// ==========================================
// DATABASE ENGINE
// ==========================================

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

let database = {
  players: {},
  trades: [],
  battles: [],
  version: 1
};

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      database = {
        players: data.players || {},
        trades: data.trades || [],
        battles: data.battles || [],
        version: data.version || 1
      };
    }
  } catch (err) {
    console.error("[POKEMON2] Database error:", err);
  }
}

function saveDatabase() {
  try {
    const temp = DB_FILE + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(database, null, 2));
    fs.renameSync(temp, DB_FILE);
    return true;
  } catch (err) {
    console.error("[POKEMON2] Save error:", err);
    return false;
  }
}

function createBackup(playerID) {
  try {
    const player = database.players[playerID];
    if (!player) return false;

    const backup = {
      version: 1,
      playerID,
      savedAt: Date.now(),
      player: JSON.parse(JSON.stringify(player))
    };

    const file = path.join(
      BACKUP_DIR,
      `${playerID}.json`
    );

    fs.writeFileSync(file, JSON.stringify(backup, null, 2));
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function restoreBackup(code) {
  try {
    const normalized = String(code).trim().toUpperCase();

    for (const file of fs.readdirSync(BACKUP_DIR)) {
      if (!file.endsWith(".json")) continue;

      const backup = JSON.parse(
        fs.readFileSync(path.join(BACKUP_DIR, file), "utf8")
      );

      if (
        backup.player &&
        backup.player.recoveryCode === normalized
      ) {
        database.players[backup.playerID] = backup.player;
        saveDatabase();
        return backup.playerID;
      }
    }
  } catch (e) {
    console.error(e);
  }

  return null;
}

loadDatabase();

// ==========================================
// POKEMON DATABASE
// ==========================================

const POKEMON = [
  {
    id: 1, name: "Bulbasaur", type: "Grass",
    hp: 45, attack: 49, defense: 49, speed: 45,
    rarity: "Common", color: "#70c86b",
    emoji: "🌱", evolution: 2, level: 16
  },
  {
    id: 2, name: "Ivysaur", type: "Grass",
    hp: 60, attack: 62, defense: 63, speed: 60,
    rarity: "Uncommon", color: "#48a95d",
    emoji: "🌿", evolution: 3, level: 32
  },
  {
    id: 3, name: "Venusaur", type: "Grass",
    hp: 80, attack: 82, defense: 83, speed: 80,
    rarity: "Rare", color: "#329c6a",
    emoji: "🌺"
  },
  {
    id: 4, name: "Charmander", type: "Fire",
    hp: 39, attack: 52, defense: 43, speed: 65,
    rarity: "Common", color: "#ff9252",
    emoji: "🔥", evolution: 5, level: 16
  },
  {
    id: 5, name: "Charmeleon", type: "Fire",
    hp: 58, attack: 64, defense: 58, speed: 80,
    rarity: "Uncommon", color: "#ed633e",
    emoji: "🔥", evolution: 6, level: 36
  },
  {
    id: 6, name: "Charizard", type: "Fire",
    hp: 78, attack: 84, defense: 78, speed: 100,
    rarity: "Rare", color: "#ee7138",
    emoji: "🐉"
  },
  {
    id: 7, name: "Squirtle", type: "Water",
    hp: 44, attack: 48, defense: 65, speed: 43,
    rarity: "Common", color: "#58b9ee",
    emoji: "💧", evolution: 8, level: 16
  },
  {
    id: 8, name: "Wartortle", type: "Water",
    hp: 59, attack: 63, defense: 80, speed: 58,
    rarity: "Uncommon", color: "#459bd8",
    emoji: "💧", evolution: 9, level: 36
  },
  {
    id: 9, name: "Blastoise", type: "Water",
    hp: 79, attack: 83, defense: 100, speed: 78,
    rarity: "Rare", color: "#397fc6",
    emoji: "🐢"
  },
  {
    id: 10, name: "Pikachu", type: "Electric",
    hp: 35, attack: 55, defense: 40, speed: 90,
    rarity: "Uncommon", color: "#ffdf47",
    emoji: "⚡"
  },
  {
    id: 11, name: "Eevee", type: "Normal",
    hp: 55, attack: 55, defense: 50, speed: 55,
    rarity: "Uncommon", color: "#c58b54",
    emoji: "🦊"
  },
  {
    id: 12, name: "Gengar", type: "Ghost",
    hp: 60, attack: 65, defense: 60, speed: 110,
    rarity: "Rare", color: "#9255ce",
    emoji: "👻"
  },
  {
    id: 13, name: "Snorlax", type: "Normal",
    hp: 160, attack: 110, defense: 65, speed: 30,
    rarity: "Rare", color: "#5687b8",
    emoji: "💤"
  },
  {
    id: 14, name: "Dragonite", type: "Dragon",
    hp: 91, attack: 134, defense: 95, speed: 80,
    rarity: "Epic", color: "#e9a34f",
    emoji: "🐲"
  },
  {
    id: 15, name: "Mewtwo", type: "Psychic",
    hp: 106, attack: 110, defense: 90, speed: 130,
    rarity: "Legendary", color: "#b79bd8",
    emoji: "🔮"
  },
  {
    id: 16, name: "Mew", type: "Psychic",
    hp: 100, attack: 100, defense: 100, speed: 100,
    rarity: "Mythical", color: "#f39acb",
    emoji: "✨"
  },
  {
    id: 17, name: "Articuno", type: "Ice",
    hp: 90, attack: 85, defense: 100, speed: 85,
    rarity: "Legendary", color: "#79d8ff",
    emoji: "❄️"
  },
  {
    id: 18, name: "Zapdos", type: "Electric",
    hp: 90, attack: 90, defense: 85, speed: 100,
    rarity: "Legendary", color: "#ffd43b",
    emoji: "⚡"
  },
  {
    id: 19, name: "Moltres", type: "Fire",
    hp: 90, attack: 100, defense: 90, speed: 90,
    rarity: "Legendary", color: "#ff7048",
    emoji: "🔥"
  },
  {
    id: 20, name: "Rayquaza", type: "Dragon",
    hp: 105, attack: 150, defense: 90, speed: 95,
    rarity: "Legendary", color: "#4bd69b",
    emoji: "🐉"
  }
];

const MOVES = {
  Normal: ["Tackle", "Quick Attack", "Body Slam"],
  Fire: ["Ember", "Flame Burst", "Fire Blast"],
  Water: ["Water Gun", "Aqua Tail", "Hydro Pump"],
  Grass: ["Vine Whip", "Razor Leaf", "Solar Beam"],
  Electric: ["Thunder Shock", "Spark", "Thunderbolt"],
  Psychic: ["Confusion", "Psybeam", "Psychic"],
  Ghost: ["Shadow Ball", "Night Shade", "Hex"],
  Dragon: ["Dragon Breath", "Dragon Claw", "Draco Meteor"],
  Ice: ["Ice Shard", "Ice Beam", "Blizzard"]
};

const GYMS = [
  { name: "Pewter Gym", leader: "Brock", type: "Rock", badge: "Boulder Badge", pokemon: [13] },
  { name: "Cerulean Gym", leader: "Misty", type: "Water", badge: "Cascade Badge", pokemon: [7, 8] },
  { name: "Vermilion Gym", leader: "Lt. Surge", type: "Electric", badge: "Thunder Badge", pokemon: [10, 10] },
  { name: "Celadon Gym", leader: "Erika", type: "Grass", badge: "Rainbow Badge", pokemon: [1, 2, 3] },
  { name: "Fuchsia Gym", leader: "Koga", type: "Poison", badge: "Soul Badge", pokemon: [12, 12] },
  { name: "Saffron Gym", leader: "Sabrina", type: "Psychic", badge: "Marsh Badge", pokemon: [15, 16] },
  { name: "Cinnabar Gym", leader: "Blaine", type: "Fire", badge: "Volcano Badge", pokemon: [4, 5, 6] },
  { name: "Viridian Gym", leader: "Giovanni", type: "Ground", badge: "Earth Badge", pokemon: [13, 14, 20] }
];

const ITEMS = {
  pokeball: { name: "Poké Ball", price: 100, type: "ball" },
  greatball: { name: "Great Ball", price: 300, type: "ball" },
  ultraball: { name: "Ultra Ball", price: 600, type: "ball" },
  masterball: { name: "Master Ball", price: 5000, type: "ball" },
  potion: { name: "Potion", price: 100, heal: 20 },
  superpotion: { name: "Super Potion", price: 300, heal: 50 },
  hyperpotion: { name: "Hyper Potion", price: 600, heal: 100 },
  maxpotion: { name: "Max Potion", price: 1000, heal: 9999 },
  revive: { name: "Revive", price: 500, revive: true }
};

// ==========================================
// GENERAL HELPERS
// ==========================================

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeCode() {
  return "PKM-" +
    crypto.randomBytes(2).toString("hex").toUpperCase() +
    "-" +
    crypto.randomBytes(2).toString("hex").toUpperCase();
}

function getPokemon(id) {
  return POKEMON.find(p => p.id === Number(id));
}

function getPlayer(id) {
  return database.players[String(id)] || null;
}

function createPlayer(id, name) {
  const player = {
    id: String(id),
    name: name || "Trainer",
    recoveryCode: makeCode(),
    level: 1,
    exp: 0,
    coins: 1000,
    wins: 0,
    losses: 0,
    badges: [],
    achievements: [],
    pokedex: [],
    team: [],
    storage: [],
    inventory: {
      pokeball: 10,
      greatball: 2,
      ultraball: 0,
      masterball: 0,
      potion: 5,
      superpotion: 0,
      hyperpotion: 0,
      maxpotion: 0,
      revive: 2
    },
    daily: 0,
    lastDaily: 0,
    createdAt: Date.now(),
    lastSeen: Date.now()
  };

  database.players[String(id)] = player;
  saveDatabase();
  createBackup(String(id));

  return player;
}

function updatePlayer(player) {
  player.lastSeen = Date.now();
  saveDatabase();
  createBackup(player.id);
}

function getOwnedPokemon(player, index) {
  return player.team.concat(player.storage)[Number(index) - 1];
}

function getAllPokemon(player) {
  return player.team.concat(player.storage);
}

function getPokemonByUID(player, uid) {
  return getAllPokemon(player).find(p => p.uid === uid);
}

function addPokemon(player, speciesID, shiny = false) {
  const species = getPokemon(speciesID);
  if (!species) return null;

  const instance = {
    uid: crypto.randomBytes(5).toString("hex"),
    speciesID: species.id,
    name: species.name,
    level: 5,
    exp: 0,
    hp: species.hp,
    maxHp: species.hp,
    attack: species.attack,
    defense: species.defense,
    speed: species.speed,
    shiny: !!shiny,
    fainted: false,
    caughtAt: Date.now()
  };

  player.pokedex.push(species.id);

  if (player.team.length < 6) {
    player.team.push(instance);
  } else {
    player.storage.push(instance);
  }

  updatePlayer(player);
  return instance;
}

function gainExp(player, amount) {
  player.exp += amount;

  while (player.exp >= player.level * 100) {
    player.exp -= player.level * 100;
    player.level++;
    player.coins += 100;
  }
}

function typeMultiplier(attackType, defenderType) {
  const chart = {
    Fire: { Grass: 2, Water: 0.5, Ice: 2 },
    Water: { Fire: 2, Rock: 2, Grass: 0.5 },
    Grass: { Water: 2, Fire: 0.5 },
    Electric: { Water: 2, Ground: 0.5 },
    Ice: { Dragon: 2, Grass: 2, Fire: 0.5 },
    Psychic: { Poison: 2, Ghost: 0.5 },
    Ghost: { Psychic: 2, Normal: 0 },
    Dragon: { Dragon: 2 }
  };

  return chart[attackType]?.[defenderType] ?? 1;
}

// ==========================================
// CANVAS GRAPHICS ENGINE
// ==========================================

function roundedRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function drawText(ctx, text, x, y, size = 24, color = "#fff", align = "left") {
  ctx.font = `bold ${size}px Arial`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(String(text), x, y);
}

function drawBar(ctx, x, y, width, height, value, max, color) {
  roundedRect(ctx, x, y, width, height, 12, "#343d5c");

  const percent = Math.max(0, Math.min(1, value / Math.max(1, max)));

  if (percent > 0) {
    roundedRect(ctx, x, y, width * percent, height, 12, color);
  }
}

function drawMonster(ctx, species, x, y, scale = 1, shiny = false) {
  const color = shiny ? "#f6a6e6" : species.color;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 92, 80, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 35, 58, 65, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(0, -35, 43, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.beginPath();
  ctx.moveTo(-30, -65);
  ctx.lineTo(-55, -105);
  ctx.lineTo(-10, -80);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(30, -65);
  ctx.lineTo(55, -105);
  ctx.lineTo(10, -80);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#172033";
  ctx.beginPath();
  ctx.arc(-15, -40, 6, 0, Math.PI * 2);
  ctx.arc(15, -40, 6, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = "#172033";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, -23, 13, 0.15, Math.PI - 0.15);
  ctx.stroke();

  // Belly
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 48, 30, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Special effects
  if (shiny) {
    drawText(ctx, "✦", 45, -65, 30, "#ffe77a");
    drawText(ctx, "✦", -55, 5, 22, "#ffe77a");
  }

  ctx.restore();
}

function drawBackground(ctx, title) {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#111a3d");
  gradient.addColorStop(0.55, "#273b6c");
  gradient.addColorStop(1, "#10152c");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Stars
  for (let i = 0; i < 65; i++) {
    const x = (i * 173) % WIDTH;
    const y = (i * 97) % HEIGHT;

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  roundedRect(ctx, 25, 20, WIDTH - 50, 70, 20, "rgba(10,15,40,0.85)");
  drawText(ctx, "POKÉMON WORLD", 50, 66, 32, COLORS.gold);
  drawText(ctx, title, WIDTH - 50, 64, 25, "#ffffff", "right");
}

function drawPokemonCard(ctx, pokemon, x, y, width = 270) {
  const species = getPokemon(pokemon.speciesID);
  if (!species) return;

  roundedRect(ctx, x, y, width, 215, 18, COLORS.panel);

  drawMonster(
    ctx,
    species,
    x + width / 2,
    y + 105,
    0.65,
    pokemon.shiny
  );

  drawText(ctx, pokemon.name, x + 15, y + 25, 19);
  drawText(ctx, `Lv.${pokemon.level}`, x + width - 15, y + 25, 17, COLORS.gold, "right");

  drawBar(
    ctx,
    x + 15,
    y + 190,
    width - 30,
    10,
    pokemon.hp,
    pokemon.maxHp,
    COLORS.green
  );

  drawText(
    ctx,
    `${pokemon.hp}/${pokemon.maxHp} HP`,
    x + width / 2,
    y + 180,
    12,
    "#fff",
    "center"
  );
}

function drawScene(title, callback) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, title);

  if (callback) callback(ctx);

  return canvas;
}

function drawProfile(player) {
  return drawScene("TRAINER PROFILE", ctx => {
    roundedRect(ctx, 50, 125, 900, 510, 25, "rgba(15,22,50,0.88)");

    drawText(ctx, player.name, 90, 185, 38, COLORS.gold);
    drawText(ctx, `Trainer Level: ${player.level}`, 90, 240, 25);
    drawText(ctx, `EXP: ${player.exp}/${player.level * 100}`, 90, 285, 20);
    drawText(ctx, `Coins: ${player.coins}`, 90, 340, 25, COLORS.gold);
    drawText(ctx, `Wins: ${player.wins}`, 90, 395, 22, COLORS.green);
    drawText(ctx, `Losses: ${player.losses}`, 90, 435, 22, COLORS.red);
    drawText(ctx, `Pokémon: ${getAllPokemon(player).length}`, 90, 485, 22);
    drawText(ctx, `Badges: ${player.badges.length}/8`, 90, 530, 22, COLORS.gold);

    drawMonster(
      ctx,
      getPokemon(10),
      730,
      370,
      1.5
    );

    drawText(ctx, "TRAINER", 730, 540, 24, COLORS.gold, "center");
  });
}

function drawTeam(player) {
  return drawScene("POKÉMON TEAM", ctx => {
    const all = player.team;

    if (!all.length) {
      drawText(ctx, "No Pokémon found!", 500, 350, 35, COLORS.red, "center");
      return;
    }

    all.slice(0, 6).forEach((p, i) => {
      const x = 45 + (i % 3) * 310;
      const y = 130 + Math.floor(i / 3) * 245;
      drawPokemonCard(ctx, p, x, y, 285);
    });
  });
}

function drawBattle(playerPokemon, enemyPokemon, title = "POKÉMON BATTLE", info = "") {
  const playerSpecies = getPokemon(playerPokemon.speciesID);
  const enemySpecies = getPokemon(enemyPokemon.speciesID);

  return drawScene(title, ctx => {
    roundedRect(ctx, 45, 120, 910, 510, 25, "rgba(13,20,46,0.9)");

    // Battle field
    ctx.fillStyle = "#315b59";
    ctx.beginPath();
    ctx.ellipse(260, 450, 190, 65, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(740, 300, 160, 55, 0, 0, Math.PI * 2);
    ctx.fill();

    drawMonster(ctx, enemySpecies, 740, 240, 1.05, enemyPokemon.shiny);
    drawMonster(ctx, playerSpecies, 260, 405, 1.1, playerPokemon.shiny);

    // Player status
    roundedRect(ctx, 65, 140, 370, 105, 15, COLORS.panel);
    drawText(ctx, playerPokemon.name, 85, 177, 22);
    drawText(ctx, `Lv.${playerPokemon.level}`, 410, 177, 17, COLORS.gold, "right");
    drawBar(ctx, 85, 200, 325, 15, playerPokemon.hp, playerPokemon.maxHp, COLORS.green);
    drawText(ctx, `${playerPokemon.hp}/${playerPokemon.maxHp} HP`, 245, 235, 13, "#fff", "center");

    // Enemy status
    roundedRect(ctx, 565, 350, 370, 105, 15, COLORS.panel);
    drawText(ctx, enemyPokemon.name, 585, 387, 22);
    drawText(ctx, `Lv.${enemyPokemon.level}`, 910, 387, 17, COLORS.gold, "right");
    drawBar(ctx, 585, 410, 325, 15, enemyPokemon.hp, enemyPokemon.maxHp, COLORS.red);
    drawText(ctx, `${enemyPokemon.hp}/${enemyPokemon.maxHp} HP`, 747, 445, 13, "#fff", "center");

    roundedRect(ctx, 70, 535, 860, 65, 15, "#29375d");
    drawText(ctx, info || "Choose your next action!", 500, 575, 22, COLORS.gold, "center");
  });
}

function drawMenu(player) {
  return drawScene("MAIN MENU", ctx => {
    roundedRect(ctx, 60, 120, 880, 510, 25, "rgba(15,22,50,0.9)");

    drawText(ctx, `Welcome ${player.name}!`, 105, 185, 32, COLORS.gold);
    drawText(ctx, `Trainer Level: ${player.level}`, 105, 230, 22);
    drawText(ctx, `Coins: ${player.coins}`, 105, 270, 22, COLORS.gold);

    const options = [
      "HUNT  - Find wild Pokémon",
      "BATTLE - Challenge Pokémon",
      "TEAM - Manage your Pokémon",
      "DEX - Explore Pokédex",
      "GYM - Challenge Gym Leaders",
      "SHOP - Buy items",
      "BAG - View inventory",
      "PROFILE - Trainer profile"
    ];

    options.forEach((option, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 100 + col * 430;
      const y = 350 + row * 65;

      roundedRect(ctx, x, y, 390, 48, 12, "#33466f");
      drawText(ctx, option, x + 15, y + 31, 17);
    });

    drawMonster(ctx, getPokemon(10), 790, 245, 0.8);
  });
}

function drawTextScene(title, lines) {
  return drawScene(title, ctx => {
    roundedRect(ctx, 55, 120, 890, 520, 24, "rgba(15,22,50,0.9)");

    lines.slice(0, 16).forEach((line, i) => {
      drawText(ctx, line, 95, 180 + i * 28, 19);
    });
  });
}

async function sendImage(api, threadID, canvas, body = "") {
  return new Promise((resolve, reject) => {
    try {
      const stream = canvas.createPNGStream();

      api.sendMessage(
        {
          body,
          attachment: stream
        },
        threadID,
        (err, info) => {
          if (err) return reject(err);
          resolve(info);
        }
      );
    } catch (e) {
      reject(e);
    }
  });
}

// ==========================================
// PART 1 END
// PART 2 WILL CONTINUE HERE
// ==========================================

// ==========================================
// POKEMON2 - PART 2/2
// MAIN GAME ENGINE
// ==========================================

function makeEnemy(speciesID, level = 5) {
  const species = getPokemon(speciesID);

  const maxHp = species.hp + level * 3;

  return {
    uid: crypto.randomBytes(5).toString("hex"),
    speciesID,
    name: species.name,
    level,
    hp: maxHp,
    maxHp,
    attack: species.attack + level * 2,
    defense: species.defense + level,
    speed: species.speed + level,
    shiny: Math.random() < 0.015
  };
}

function getAliveTeam(player) {
  return player.team.filter(p => p.hp > 0);
}

function getFirstAlive(player) {
  return player.team.find(p => p.hp > 0);
}

function getEnemySpecies() {
  const roll = random(1, 100);

  if (roll <= 2) return random(15, 20);
  if (roll <= 10) return random(12, 14);
  if (roll <= 35) return random(7, 11);

  return random(1, 10);
}

function startBattle(player, threadID, gymIndex = -1) {
  const alive = getAliveTeam(player);

  if (!alive.length) {
    return {
      error: "তোমার কোনো সুস্থ Pokémon নেই! আগে Heal করো।"
    };
  }

  let enemies = [];

  if (gymIndex >= 0) {
    const gym = GYMS[gymIndex];

    enemies = gym.pokemon.map(id =>
      makeEnemy(id, player.level + 4 + gymIndex * 2)
    );
  } else {
    enemies = [
      makeEnemy(
        getEnemySpecies(),
        random(Math.max(2, player.level), player.level + 3)
      )
    ];
  }

  const session = {
    playerID: player.id,
    threadID: String(threadID),
    gymIndex,
    enemies,
    enemyIndex: 0,
    activeUID: alive[0].uid,
    waitingSwitch: false,
    startedAt: Date.now()
  };

  games.set(player.id, session);

  return { session };
}

function getActivePokemon(player, session) {
  return getPokemonByUID(player, session.activeUID);
}

function nextEnemy(session) {
  session.enemyIndex++;

  return session.enemies[session.enemyIndex] || null;
}

function getActiveEnemy(session) {
  return session.enemies[session.enemyIndex];
}

function checkBattleEnd(player, session) {
  const alive = getAliveTeam(player);

  if (!alive.length) {
    player.losses++;
    updatePlayer(player);
    games.delete(player.id);

    return "PLAYER_LOST";
  }

  if (session.enemyIndex >= session.enemies.length) {
    player.wins++;

    if (session.gymIndex >= 0) {
      const gym = GYMS[session.gymIndex];

      if (!player.badges.includes(gym.badge)) {
        player.badges.push(gym.badge);
        player.coins += 1000;
      }

      gainExp(player, 300 + session.gymIndex * 100);
    } else {
      player.coins += 200;
      gainExp(player, 100);
    }

    updatePlayer(player);
    games.delete(player.id);

    return "PLAYER_WON";
  }

  return null;
}

function getMoveDamage(attacker, defender, moveIndex) {
  const species = getPokemon(attacker.speciesID);

  const moves = MOVES[species.type] || MOVES.Normal;
  const move = moves[(moveIndex - 1) % moves.length];

  const multiplier = typeMultiplier(species.type, getPokemon(defender.speciesID).type);

  const critical = Math.random() < 0.1;
  const base = attacker.attack + attacker.level * 2;

  let damage = Math.floor(
    (base * random(65, 100) / 100) -
    defender.defense * 0.25
  );

  damage = Math.max(1, damage);

  if (critical) damage = Math.floor(damage * 1.5);

  damage = Math.floor(damage * multiplier);

  return {
    move,
    damage: Math.max(0, damage),
    critical,
    multiplier
  };
}

function healPokemon(pokemon, amount) {
  if (pokemon.hp <= 0) return 0;

  const before = pokemon.hp;
  pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + amount);

  return pokemon.hp - before;
}

function revivePokemon(pokemon) {
  if (pokemon.hp > 0) return false;

  pokemon.hp = Math.max(1, Math.floor(pokemon.maxHp / 2));

  return true;
}

function getItemKey(name) {
  const key = String(name || "").toLowerCase();

  const aliases = {
    ball: "pokeball",
    pokeball: "pokeball",
    great: "greatball",
    greatball: "greatball",
    ultra: "ultraball",
    ultraball: "ultraball",
    master: "masterball",
    masterball: "masterball",
    potion: "potion",
    super: "superpotion",
    superpotion: "superpotion",
    hyper: "hyperpotion",
    hyperpotion: "hyperpotion",
    max: "maxpotion",
    maxpotion: "maxpotion",
    revive: "revive"
  };

  return aliases[key] || null;
}

function findPokemonIndex(player, query) {
  const all = getAllPokemon(player);

  const number = Number(query);

  if (Number.isInteger(number) && number > 0) {
    return all[number - 1] || null;
  }

  return all.find(p =>
    p.name.toLowerCase() === String(query).toLowerCase() ||
    p.uid === query
  ) || null;
}

function captureEnemy(player, session) {
  const enemy = getActiveEnemy(session);

  if (!enemy) return { success: false, message: "কোনো Pokémon নেই!" };

  if (session.gymIndex >= 0) {
    return {
      success: false,
      message: "Gym Leader-এর Pokémon ধরা যাবে না!"
    };
  }

  const ball = player.inventory.pokeball > 0
    ? "pokeball"
    : player.inventory.greatball > 0
      ? "greatball"
      : player.inventory.ultraball > 0
        ? "ultraball"
        : player.inventory.masterball > 0
          ? "masterball"
          : null;

  if (!ball) {
    return {
      success: false,
      message: "তোমার কাছে কোনো Poké Ball নেই!"
    };
  }

  player.inventory[ball]--;

  const hpPercent = enemy.hp / enemy.maxHp;

  let chance = 0.25 + (1 - hpPercent) * 0.55;

  if (ball === "greatball") chance += 0.15;
  if (ball === "ultraball") chance += 0.30;
  if (ball === "masterball") chance = 1;

  if (enemy.shiny) chance += 0.05;

  if (Math.random() < chance) {
    const caught = addPokemon(player, enemy.speciesID, enemy.shiny);

    if (caught) {
      caught.level = enemy.level;
      caught.hp = Math.max(1, enemy.hp);
      caught.maxHp = enemy.maxHp;
      caught.attack = enemy.attack;
      caught.defense = enemy.defense;
      caught.speed = enemy.speed;

      updatePlayer(player);
    }

    return {
      success: true,
      message: `${enemy.name} ধরা পড়েছে!`
    };
  }

  updatePlayer(player);

  return {
    success: false,
    message: `${enemy.name} Poké Ball থেকে বেরিয়ে গেছে!`
  };
}

// ==========================================
// BATTLE IMAGE
// ==========================================

function battleImage(player, session, info) {
  const active = getActivePokemon(player, session);
  const enemy = getActiveEnemy(session);

  return drawBattle(active, enemy, session.gymIndex >= 0
    ? "GYM LEADER BATTLE"
    : "WILD POKÉMON BATTLE", info);
}

function teamListText(player) {
  const all = getAllPokemon(player);

  if (!all.length) return "তোমার কোনো Pokémon নেই!";

  return all.map((p, i) => {
    const status = p.hp <= 0 ? "FAINTED" : `${p.hp}/${p.maxHp} HP`;

    return `${i + 1}. ${p.name} | Lv.${p.level} | ${status}`;
  }).join("\n");
}

// ==========================================
// MAIN MODULE
// ==========================================

module.exports = {
  config: {
    name: "pokemon2",
    aliases: ["pkm2", "poke2"],
    version: "2.0.0",
    author: "SIYAM",
    countDown: 3,
    role: 0,
    shortDescription: "Ultimate Pokémon RPG",
    longDescription: "2D Canvas Pokémon RPG Messenger Game",
    category: "game",
    guide: {
      en: "{pn} start | menu | hunt | battle | attack | team | catch | gym | heal | shop | bag | dex | profile | evolve | daily | restore"
    }
  },

  onStart: async function ({ api, event, args, usersData }) {
    const id = String(event.senderID);
    const threadID = event.threadID;

    const command = String(args[0] || "menu").toLowerCase();
    const arg = args.slice(1);

    let player = getPlayer(id);

    const send = async (canvas, body = "") => {
      await sendImage(api, threadID, canvas, body);
    };

    const textReply = msg => api.sendMessage(msg, threadID);

    try {

      // ======================================
      // START
      // ======================================

      if (command === "start") {
        if (player) {
          return textReply(
            "তোমার Game আগে থেকেই আছে!\n" +
            "Recovery Code: " + player.recoveryCode
          );
        }

        let name = "Trainer";

        try {
          if (usersData && usersData.getName) {
            name = await usersData.getName(id);
          }
        } catch (_) {}

        player = createPlayer(id, name);

        const canvas = drawTextScene("WELCOME TRAINER", [
          "Welcome to Pokémon World!",
          "",
          "Your journey begins now.",
          "",
          "Choose your starter Pokémon:",
          "1. Bulbasaur",
          "2. Charmander",
          "3. Squirtle",
          "",
          "Use: pokemon2 starter 1",
          "",
          "Keep your Recovery Code safe!"
        ]);

        return send(
          canvas,
          `🎮 Game Created!\nRecovery Code: ${player.recoveryCode}`
        );
      }

      // ======================================
      // RESTORE
      // ======================================

      if (command === "restore") {
        const code = arg[0];

        if (!code) {
          return textReply("ব্যবহার: pokemon2 restore PKM-XXXX-XXXX");
        }

        const restoredID = restoreBackup(code);

        if (!restoredID) {
          return textReply("❌ Recovery Code পাওয়া যায়নি!");
        }

        const restored = getPlayer(restoredID);

        return send(
          drawProfile(restored),
          "✅ তোমার Pokémon Data Restore হয়েছে!"
        );
      }

      // ======================================
      // RECOVERY
      // ======================================

      if (command === "code" || command === "recovery") {
        if (!player) return textReply("আগে pokemon2 start করো!");

        return send(
          drawTextScene("RECOVERY CODE", [
            "Your personal recovery code:",
            "",
            player.recoveryCode,
            "",
            "Keep this code in a safe place.",
            "Never share it with anyone.",
            "",
            "Restore: pokemon2 restore CODE"
          ]),
          "🔐 Recovery Code: " + player.recoveryCode
        );
      }

      if (!player) {
        return textReply(
          "❌ তুমি এখনো Game শুরু করোনি!\n" +
          "লিখো: pokemon2 start"
        );
      }

      // ======================================
      // MAIN MENU
      // ======================================

      if (command === "menu") {
        return send(
          drawMenu(player),
          "🎮 POKÉMON WORLD\n\n" +
          "pokemon2 hunt\n" +
          "pokemon2 battle\n" +
          "pokemon2 team\n" +
          "pokemon2 gym\n" +
          "pokemon2 shop\n" +
          "pokemon2 bag\n" +
          "pokemon2 dex\n" +
          "pokemon2 profile"
        );
      }

      // ======================================
      // STARTER
      // ======================================

      if (command === "starter") {
        if (player.team.length) {
          return textReply("তুমি ইতিমধ্যে Starter নিয়েছ!");
        }

        const choices = {
          "1": 1,
          "2": 4,
          "3": 7,
          bulbasaur: 1,
          charmander: 4,
          squirtle: 7
        };

        const speciesID = choices[String(arg[0] || "").toLowerCase()];

        if (!speciesID) {
          return send(
            drawTextScene("CHOOSE STARTER", [
              "1. Bulbasaur - Grass",
              "2. Charmander - Fire",
              "3. Squirtle - Water",
              "",
              "pokemon2 starter 1",
              "pokemon2 starter 2",
              "pokemon2 starter 3"
            ])
          );
        }

        const p = addPokemon(player, speciesID);

        p.level = 5;
        p.hp = p.maxHp;

        updatePlayer(player);

        return send(
          drawTeam(player),
          `🎉 ${p.name} তোমার Starter Pokémon!`
        );
      }

      if (!player.team.length) {
        return textReply("আগে Starter নাও: pokemon2 starter 1");
      }

      // ======================================
      // PROFILE
      // ======================================

      if (command === "profile") {
        return send(drawProfile(player));
      }

      // ======================================
      // TEAM
      // ======================================

      if (command === "team") {
        return send(
          drawTeam(player),
          "📋 তোমার Pokémon Team:\n\n" +
          teamListText(player) +
          "\n\npokemon2 switchteam 1"
        );
      }

      // ======================================
      // STORAGE
      // ======================================

      if (command === "storage") {
        const lines = player.storage.map((p, i) =>
          `${i + 1}. ${p.name} Lv.${p.level} HP:${p.hp}/${p.maxHp}`
        );

        return send(
          drawTextScene("POKÉMON STORAGE", lines.length ? lines : ["Storage empty!"]),
          "📦 Storage Pokémon\n" + (lines.join("\n") || "Empty")
        );
      }

      if (command === "switchteam") {
        const index = Number(arg[0]) - 1;
        const pokemon = player.storage[index];

        if (!pokemon) return textReply("Storage-এ Pokémon পাওয়া যায়নি!");

        if (player.team.length >= 6) {
          return textReply("তোমার Team পূর্ণ! আগে একটি Pokémon Storage-এ পাঠাও।");
        }

        player.storage.splice(index, 1);
        player.team.push(pokemon);

        updatePlayer(player);

        return send(drawTeam(player), `${pokemon.name} Team-এ যোগ হয়েছে!`);
      }

      if (command === "deposit") {
        const pokemon = player.team[Number(arg[0]) - 1];

        if (!pokemon) return textReply("Pokémon পাওয়া যায়নি!");
        if (player.team.length <= 1) return textReply("কমপক্ষে ১টি Pokémon Team-এ রাখতে হবে!");

        player.team.splice(player.team.indexOf(pokemon), 1);
        player.storage.push(pokemon);

        updatePlayer(player);

        return send(drawTeam(player), `${pokemon.name} Storage-এ রাখা হয়েছে!`);
      }

      // ======================================
      // HUNT
      // ======================================

      if (command === "hunt" || command === "explore") {
        if (games.has(id)) {
          return textReply("তোমার একটি Battle চলছে! আগে সেটি শেষ করো।");
        }

        const speciesID = getEnemySpecies();
        const enemy = makeEnemy(speciesID, random(2, player.level + 4));

        games.set(id, {
          playerID: id,
          threadID: String(threadID),
          gymIndex: -1,
          enemies: [enemy],
          enemyIndex: 0,
          activeUID: getFirstAlive(player).uid,
          waitingSwitch: false,
          startedAt: Date.now()
        });

        return send(
          drawBattle(getFirstAlive(player), enemy, "WILD ENCOUNTER", "A wild Pokémon appeared!"),
          `🌿 Wild ${enemy.name} appeared!\n` +
          `Level: ${enemy.level}\n\n` +
          `pokemon2 attack 1\n` +
          `pokemon2 catch\n` +
          `pokemon2 surrender`
        );
      }

      // ======================================
      // BATTLE START
      // ======================================

      if (command === "battle") {
        if (games.has(id)) {
          return textReply("একটি Battle ইতিমধ্যে চলছে!");
        }

        const result = startBattle(player, threadID);

        if (result.error) return textReply(result.error);

        const session = result.session;
        const active = getActivePokemon(player, session);
        const enemy = getActiveEnemy(session);

        return send(
          drawBattle(active, enemy, "BATTLE START", "Choose your move!"),
          `⚔️ Battle Started!\n\n` +
          `Your Pokémon: ${active.name}\n` +
          `Enemy: ${enemy.name}\n\n` +
          `pokemon2 attack 1\n` +
          `pokemon2 switch 2\n` +
          `pokemon2 catch\n` +
          `pokemon2 surrender`
        );
      }

      // ======================================
      // GYM
      // ======================================

      if (command === "gym") {
        const gymNumber = Number(arg[0]);

        if (!gymNumber) {
          const lines = GYMS.map((g, i) =>
            `${i + 1}. ${g.name} | Leader: ${g.leader} | ${g.badge}`
          );

          return send(
            drawTextScene("KANTO GYMS", lines),
            "🏆 Gym Challenge\n" +
            lines.join("\n") +
            "\n\nUse: pokemon2 gym 1"
          );
        }

        if (gymNumber < 1 || gymNumber > 8) {
          return textReply("Gym number 1-8 হতে হবে!");
        }

        if (games.has(id)) return textReply("আগের Battle শেষ করো!");

        const index = gymNumber - 1;

        if (index > player.badges.length) {
          return textReply("আগের Gym Badge সংগ্রহ করো!");
        }

        const result = startBattle(player, threadID, index);

        if (result.error) return textReply(result.error);

        const session = result.session;
        const active = getActivePokemon(player, session);
        const enemy = getActiveEnemy(session);
        const gym = GYMS[index];

        return send(
          drawBattle(active, enemy, "GYM LEADER BATTLE", `${gym.leader} challenges you!`),
          `🏆 ${gym.name}\nLeader: ${gym.leader}\nBadge: ${gym.badge}\n\n` +
          `Leader-এর Pokémon: ${gym.pokemon.length}টি\n\n` +
          `pokemon2 attack 1\npokemon2 switch 2\npokemon2 surrender`
        );
      }

      // ======================================
      // ATTACK
      // ======================================

      if (command === "attack" || command === "move") {
        const session = games.get(id);

        if (!session) return textReply("কোনো Battle চলছে না!");

        const active = getActivePokemon(player, session);
        const enemy = getActiveEnemy(session);

        if (!active || !enemy) return textReply("Battle Data পাওয়া যায়নি!");

        if (session.waitingSwitch) {
          return textReply("আগে Pokémon switch করো!");
        }

        if (active.hp <= 0) {
          session.waitingSwitch = true;
          return textReply("তোমার Pokémon Fainted! pokemon2 switch NUMBER");
        }

        const moveIndex = Math.max(1, Math.min(3, Number(arg[0]) || 1));

        const attack = getMoveDamage(active, enemy, moveIndex);

        enemy.hp = Math.max(0, enemy.hp - attack.damage);

        let resultText =
          `${active.name} used ${attack.move}!\n` +
          `Damage: ${attack.damage}`;

        if (attack.critical) resultText += "\nCritical Hit!";
        if (attack.multiplier > 1) resultText += "\nSuper Effective!";
        if (attack.multiplier === 0) resultText += "\nNo Effect!";

        // Enemy defeated
        if (enemy.hp <= 0) {
          const defeatedName = enemy.name;

          gainExp(player, enemy.level * 15);

          const next = nextEnemy(session);

          if (next) {
            resultText += `\n\n${defeatedName} fainted!\n`;
            resultText += `Enemy sent out ${next.name}!`;

            updatePlayer(player);

            return send(
              battleImage(player, session, resultText),
              resultText + "\n\npokemon2 attack 1\npokemon2 switch 1"
            );
          }

          const status = checkBattleEnd(player, session);

          if (status === "PLAYER_WON") {
            return send(
              drawTextScene("VICTORY!", [
                "YOU WON THE BATTLE!",
                `Defeated: ${defeatedName}`,
                "+ EXP",
                "+ Coins",
                "Your Pokémon HP is preserved.",
                "",
                "pokemon2 heal",
                "pokemon2 team"
              ]),
              "🏆 Victory! Battle Won!"
            );
          }
        }

        // Enemy attacks
        const enemyAttack = getMoveDamage(enemy, active, random(1, 3));

        active.hp = Math.max(0, active.hp - enemyAttack.damage);

        resultText +=
          `\n\n${enemy.name} attacked!\n` +
          `Damage received: ${enemyAttack.damage}`;

        if (active.hp <= 0) {
          resultText += `\n${active.name} fainted!`;

          const alive = getAliveTeam(player);

          if (!alive.length) {
            checkBattleEnd(player, session);

            return send(
              drawTextScene("DEFEAT!", [
                "All your Pokémon fainted!",
                "You lost this battle.",
                "Your HP remains saved.",
                "",
                "Visit Pokémon Center.",
                "pokemon2 heal"
              ]),
              "❌ All Pokémon fainted!"
            );
          }

          session.waitingSwitch = true;

          resultText += "\nChoose another Pokémon: pokemon2 switch NUMBER";
        }

        updatePlayer(player);

        return send(
          battleImage(player, session, resultText),
          resultText +
          "\n\npokemon2 attack 1\n" +
          "pokemon2 switch 2\n" +
          "pokemon2 catch\n" +
          "pokemon2 surrender"
        );
      }

      // ======================================
      // SWITCH POKEMON
      // ======================================

      if (command === "switch") {
        const session = games.get(id);

        if (!session) return textReply("কোনো Battle চলছে না!");

        const index = Number(arg[0]) - 1;
        const pokemon = player.team[index];

        if (!pokemon) return textReply("Team-এর সঠিক নম্বর দাও!");

        if (pokemon.hp <= 0) {
          return textReply("এই Pokémon Fainted! আগে Heal করো!");
        }

        const previous = getActivePokemon(player, session);

        if (previous && previous.uid === pokemon.uid) {
          return textReply("এই Pokémon ইতিমধ্যে Battle করছে!");
        }

        session.activeUID = pokemon.uid;
        session.waitingSwitch = false;

        const enemy = getActiveEnemy(session);

        updatePlayer(player);

        return send(
          drawBattle(pokemon, enemy, "POKÉMON SWITCH", `${pokemon.name} entered the battle!`),
          `🔄 ${pokemon.name} Battle-এ এসেছে!\n\npokemon2 attack 1`
        );
      }

      // ======================================
      // CATCH
      // ======================================

      if (command === "catch") {
        const session = games.get(id);

        if (!session) return textReply("কোনো Wild Battle নেই!");

        const result = captureEnemy(player, session);

        if (result.success) {
          games.delete(id);

          return send(
            drawTeam(player),
            "🎉 " + result.message
          );
        }

        return send(
          battleImage(player, session, result.message),
          result.message + "\n\npokemon2 attack 1"
        );
      }

      // ======================================
      // SURRENDER
      // ======================================

      if (command === "surrender" || command === "run") {
        const session = games.get(id);

        if (!session) return textReply("কোনো Battle চলছে না!");

        player.losses++;
        updatePlayer(player);
        games.delete(id);

        return send(
          drawTextScene("BATTLE ENDED", [
            "You surrendered!",
            "Battle has ended.",
            "Pokémon HP remains unchanged.",
            "",
            "Heal your Pokémon before next battle."
          ]),
          "🏳️ তুমি Battle থেকে হার মেনেছ!"
        );
      }

      // ======================================
      // HEAL
      // ======================================

      if (command === "heal" || command === "center") {
        if (games.has(id)) {
          return textReply("Battle চলাকালে Heal করা যাবে না!");
        }

        const pokemon = findPokemonIndex(player, arg[0] || "1");

        if (!pokemon) return textReply("Pokémon পাওয়া যায়নি!");

        const center = String(arg[0] || "").toLowerCase() === "all";

        if (center) {
          let count = 0;

          for (const p of getAllPokemon(player)) {
            p.hp = p.maxHp;
            count++;
          }

          updatePlayer(player);

          return send(
            drawTeam(player),
            `🏥 Pokémon Center!\n${count}টি Pokémon Heal হয়েছে!`
          );
        }

        for (const p of getAllPokemon(player)) {
          p.hp = p.maxHp;
        }

        updatePlayer(player);

        return send(
          drawTeam(player),
          "🏥 তোমার সব Pokémon সম্পূর্ণ Heal হয়েছে!"
        );
      }

      // ======================================
      // POTION
      // ======================================

      if (command === "use") {
        const itemKey = getItemKey(arg[0]);
        const pokemon = findPokemonIndex(player, arg[1] || "1");

        if (!itemKey || !pokemon) {
          return textReply("ব্যবহার: pokemon2 use potion 1");
        }

        const item = ITEMS[itemKey];

        if (!player.inventory[itemKey]) {
          return textReply("এই Item তোমার কাছে নেই!");
        }

        if (item.revive) {
          if (!revivePokemon(pokemon)) {
            return textReply("এই Pokémon Fainted নয়!");
          }
        } else {
          if (pokemon.hp <= 0) {
            return textReply("Fainted Pokémon-এর জন্য Revive ব্যবহার করো!");
          }

          const healed = healPokemon(pokemon, item.heal);

          if (!healed) return textReply("Pokémon-এর HP ইতিমধ্যে Full!");
        }

        player.inventory[itemKey]--;
        updatePlayer(player);

        return send(
          drawTeam(player),
          `💊 ${item.name} ব্যবহার করা হয়েছে!\n${pokemon.name} HP: ${pokemon.hp}/${pokemon.maxHp}`
        );
      }

      // ======================================
      // BAG
      // ======================================

      if (command === "bag" || command === "inventory") {
        const lines = Object.entries(player.inventory).map(([key, value]) =>
          `${ITEMS[key].name}: ${value}`
        );

        return send(
          drawTextScene("YOUR INVENTORY", lines),
          "🎒 Inventory\n" + lines.join("\n")
        );
      }

      // ======================================
      // SHOP
      // ======================================

      if (command === "shop") {
        if (!arg.length) {
          const lines = Object.entries(ITEMS).map(([key, item]) =>
            `${key}: ${item.name} - ${item.price} Coins`
          );

          return send(
            drawTextScene("POKÉMON SHOP", lines),
            "🛒 Buy: pokemon2 shop buy potion 2"
          );
        }

        if (arg[0] === "buy") {
          const key = getItemKey(arg[1]);
          const quantity = Math.max(1, Math.min(99, Number(arg[2]) || 1));

          if (!key) return textReply("Item পাওয়া যায়নি!");

          const total = ITEMS[key].price * quantity;

          if (player.coins < total) {
            return textReply("❌ পর্যাপ্ত Coins নেই!");
          }

          player.coins -= total;
          player.inventory[key] += quantity;

          updatePlayer(player);

          return send(
            drawTextScene("PURCHASE SUCCESS", [
              ITEMS[key].name,
              `Quantity: ${quantity}`,
              `Total: ${total} Coins`,
              `Remaining: ${player.coins} Coins`
            ]),
            "🛒 Purchase successful!"
          );
        }

        return textReply("ব্যবহার: pokemon2 shop buy potion 2");
      }

      // ======================================
      // POKEDEX
      // ======================================

      if (command === "dex" || command === "pokedex") {
        const lines = POKEMON.map(p => {
          const caught = player.pokedex.includes(p.id);
          return `${caught ? "✓" : "?"} #${p.id} ${caught ? p.name : "Unknown"} (${p.type})`;
        });

        return send(
          drawTextScene("POKÉDEX", lines),
          `📘 Pokédex: ${player.pokedex.length}/${POKEMON.length} discovered`
        );
      }

      // ======================================
      // EVOLUTION
      // ======================================

      if (command === "evolve") {
        const pokemon = findPokemonIndex(player, arg[0] || "1");

        if (!pokemon) return textReply("Pokémon পাওয়া যায়নি!");

        const species = getPokemon(pokemon.speciesID);

        if (!species.evolution) {
          return textReply("এই Pokémon-এর Evolution নেই!");
        }

        if (pokemon.level < species.level) {
          return textReply(`Evolution-এর জন্য Level ${species.level} প্রয়োজন!`);
        }

        const next = getPokemon(species.evolution);

        const oldHPPercent = pokemon.hp / pokemon.maxHp;

        pokemon.speciesID = next.id;
        pokemon.name = next.name;
        pokemon.maxHp = next.hp + pokemon.level * 3;
        pokemon.hp = Math.max(1, Math.floor(pokemon.maxHp * oldHPPercent));
        pokemon.attack = next.attack + pokemon.level * 2;
        pokemon.defense = next.defense + pokemon.level;
        pokemon.speed = next.speed + pokemon.level;

        player.pokedex.push(next.id);

        updatePlayer(player);

        return send(
          drawTeam(player),
          `✨ Evolution!\n${species.name} evolved into ${next.name}!`
        );
      }

      // ======================================
      // DAILY REWARD
      // ======================================

      if (command === "daily") {
        const now = Date.now();

        if (now - player.lastDaily < 86400000) {
          const hours = Math.ceil(
            (86400000 - (now - player.lastDaily)) / 3600000
          );

          return textReply(`⏳ Daily Reward নিতে ${hours} ঘণ্টা অপেক্ষা করো!`);
        }

        player.lastDaily = now;
        player.daily++;
        player.coins += 500;
        player.inventory.pokeball += 3;

        updatePlayer(player);

        return send(
          drawTextScene("DAILY REWARD", [
            "+500 Coins",
            "+3 Poké Balls",
            `Day: ${player.daily}`,
            "Come back tomorrow!"
          ]),
          "🎁 Daily Reward Received!"
        );
      }

      // ======================================
      // RANKING
      // ======================================

      if (command === "rank") {
        const ranking = Object.values(database.players)
          .sort((a, b) => b.level - a.level || b.wins - a.wins)
          .slice(0, 10);

        const lines = ranking.map((p, i) =>
          `${i + 1}. ${p.name} | Lv.${p.level} | Wins ${p.wins}`
        );

        return send(
          drawTextScene("TRAINER RANKING", lines),
          lines.join("\n")
        );
      }

      // ======================================
      // BADGES
      // ======================================

      if (command === "badges") {
        return send(
          drawTextScene(
            "GYM BADGES",
            GYMS.map(g =>
              `${player.badges.includes(g.badge) ? "🏅" : "🔒"} ${g.badge}`
            )
          ),
          `🏆 Badges: ${player.badges.length}/8\n` +
          player.badges.join("\n")
        );
      }

      // ======================================
      // SAVE
      // ======================================

      if (command === "save") {
        updatePlayer(player);

        return send(
          drawTextScene("GAME SAVED", [
            "Your game data has been saved.",
            "Backup created.",
            "",
            "Recovery code:",
            player.recoveryCode
          ]),
          "💾 Save Successful!"
        );
      }

      // ======================================
      // HELP
      // ======================================

      if (command === "help") {
        return send(
          drawTextScene("POKÉMON2 HELP", [
            "start - Start Game",
            "starter - Choose Starter",
            "hunt - Find Pokémon",
            "battle - Start Battle",
            "attack 1 - Attack",
            "switch 2 - Change Pokémon",
            "catch - Catch Wild Pokémon",
            "surrender - Give Up",
            "gym 1 - Gym Challenge",
            "team - Pokémon Team",
            "storage - Pokémon Storage",
            "heal all - Heal all Pokémon",
            "use potion 1 - Use Potion",
            "shop - Pokémon Shop",
            "bag - Inventory",
            "dex - Pokédex",
            "evolve 1 - Evolve Pokémon",
            "daily - Daily Reward",
            "badges - Gym Badges",
            "rank - Ranking",
            "profile - Profile",
            "code - Recovery Code",
            "restore CODE - Restore Data"
          ]),
          "📖 Pokémon2 Help"
        );
      }

      // ======================================
      // UNKNOWN COMMAND
      // ======================================

      return textReply(
        "❓ Unknown command!\n" +
        "লিখো: pokemon2 help"
      );

    } catch (error) {
      console.error("[POKEMON2 ERROR]", error);

      return textReply(
        "❌ Game Error!\n" +
        "Console-এ Error Check করো।"
      );
    }
  }
};
