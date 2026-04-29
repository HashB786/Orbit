import { PROFESSIONS, PHOBIAS, HEALTH_CONDITIONS, INVENTORY_POOL, SPECIAL_POWERS, GENDERS } from './bunkerData';

// ─── Random helpers ──────────────────────────────────────────────────────────

export const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const pickRandomExcluding = (arr, excluded) => {
  const pool = arr.filter((x) => !excluded.includes(x));
  return pool.length ? pickRandom(pool) : pickRandom(arr);
};

export const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─── ID / code generation ────────────────────────────────────────────────────

export const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const generatePlayerId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

// ─── Card generation ─────────────────────────────────────────────────────────

/**
 * Generate a unique player card.
 * @param {string[]} usedProfessions - profession names already assigned
 * @param {string[]} usedPowers      - power ids already assigned
 */
export const generateCard = (usedProfessions = [], usedPowers = []) => {
  const profession = pickRandomExcluding(PROFESSIONS, usedProfessions.map((n) => ({ name: n })));
  // profession is an object from PROFESSIONS
  const actualProfession = PROFESSIONS.find((p) => !usedProfessions.includes(p.name))
    ?? pickRandom(PROFESSIONS);

  const power = SPECIAL_POWERS.find((p) => !usedPowers.includes(p.id))
    ?? pickRandom(SPECIAL_POWERS);

  const phobia = pickRandom(PHOBIAS);
  const health = pickRandom(HEALTH_CONDITIONS);
  const age = Math.floor(Math.random() * 40) + 22; // 22–61
  const gender = pickRandom(GENDERS);

  // Use profession's own inventory, with 30% chance of random pool item instead
  const inventory = Math.random() < 0.3
    ? pickRandom(INVENTORY_POOL)
    : actualProfession.inventory;

  return {
    profession: actualProfession.name,
    fact1: actualProfession.fact1,
    fact2: actualProfession.fact2,
    inventory,
    phobia,
    specialPower: { id: power.id, name: power.name, description: power.description, timing: power.timing },
    health,
    age,
    gender,
  };
};

/**
 * Generate cards for all players ensuring no duplicate professions or powers.
 */
export const generateAllCards = (playerCount) => {
  const cards = [];
  const usedProfessions = [];
  const usedPowers = [];

  for (let i = 0; i < playerCount; i++) {
    const profPool = PROFESSIONS.filter((p) => !usedProfessions.includes(p.name));
    const profession = profPool.length ? pickRandom(profPool) : pickRandom(PROFESSIONS);

    const powerPool = SPECIAL_POWERS.filter((p) => !usedPowers.includes(p.id));
    const power = powerPool.length ? pickRandom(powerPool) : pickRandom(SPECIAL_POWERS);

    usedProfessions.push(profession.name);
    usedPowers.push(power.id);

    const phobia = pickRandom(PHOBIAS);
    const health = pickRandom(HEALTH_CONDITIONS);
    const age = Math.floor(Math.random() * 40) + 22;
    const gender = pickRandom(GENDERS);
    const inventory = Math.random() < 0.3 ? pickRandom(INVENTORY_POOL) : profession.inventory;

    cards.push({
      profession: profession.name,
      fact1: profession.fact1,
      fact2: profession.fact2,
      inventory,
      phobia,
      specialPower: { id: power.id, name: power.name, description: power.description, timing: power.timing },
      health,
      age,
      gender,
    });
  }
  return cards;
};

// ─── Stat helpers ─────────────────────────────────────────────────────────────

/** Get the display value of a stat category from a card object */
export const getStatValue = (card, category) => {
  if (!card) return '???';
  switch (category) {
    case 'Profession':    return card.profession;
    case 'Fact 1':        return card.fact1;
    case 'Fact 2':        return card.fact2;
    case 'Inventory':     return card.inventory;
    case 'Phobia':        return card.phobia;
    case 'Special Power': return `${card.specialPower?.name}: ${card.specialPower?.description}`;
    case 'Health':        return card.health;
    default:              return '???';
  }
};

// ─── Vote tallying ────────────────────────────────────────────────────────────

/**
 * Tally elimination votes applying all active power effects.
 *
 * @param {Object} votes           - { voterId: targetId }
 * @param {string[]} activePlayers - array of active player ids
 * @param {Object} effects         - active power effects from game state
 * @returns {{ counts: Object, topPlayerId: string, secondPlayerId: string|null }}
 */
export const tallyVotes = (votes, activePlayers, effects = {}) => {
  const {
    systemBreachTarget = null,
    doubleVotePlayer = null,
    scapegoat = null,        // { fromId, toId }
    ghostedPlayer = null,
    firewallPlayer = null,
  } = effects;

  const counts = {};
  for (const pid of activePlayers) counts[pid] = 0;

  for (const [voterId, targetId] of Object.entries(votes)) {
    if (!activePlayers.includes(voterId)) continue;
    if (voterId === systemBreachTarget) continue; // nullified vote

    let effective = targetId;
    if (scapegoat && effective === scapegoat.fromId) effective = scapegoat.toId;
    if (!activePlayers.includes(effective)) continue;

    const weight = voterId === doubleVotePlayer ? 2 : 1;
    counts[effective] = (counts[effective] || 0) + weight;
  }

  // Sort by vote count
  const sorted = Object.entries(counts)
    .filter(([id]) => id !== ghostedPlayer)
    .sort(([, a], [, b]) => b - a);

  if (!sorted.length) return { counts, topPlayerId: null, secondPlayerId: null };

  const maxVotes = sorted[0][1];
  const topTied = sorted.filter(([, v]) => v === maxVotes).map(([id]) => id);
  const topPlayerId = pickRandom(topTied);

  // Firewall: if top player has firewall, use second-highest instead
  let resolvedTop = topPlayerId;
  if (firewallPlayer && firewallPlayer === topPlayerId) {
    const rest = sorted.filter(([id]) => id !== topPlayerId);
    resolvedTop = rest.length ? pickRandom(rest.filter(([, v]) => v === rest[0][1]).map(([id]) => id)) : topPlayerId;
  }

  const secondSorted = sorted.filter(([id]) => id !== resolvedTop);
  const secondPlayerId = secondSorted.length ? secondSorted[0][0] : null;

  return { counts, topPlayerId: resolvedTop, secondPlayerId };
};

/**
 * Tally stat-reveal votes and return the winning category.
 */
export const tallyStatVotes = (statVotes, revealedCategories) => {
  if (!statVotes || !Object.keys(statVotes).length) return null;

  const counts = {};
  for (const cat of Object.values(statVotes)) {
    if (!revealedCategories.includes(cat)) {
      counts[cat] = (counts[cat] || 0) + 1;
    }
  }
  if (!Object.keys(counts).length) return null;

  const max = Math.max(...Object.values(counts));
  const tied = Object.keys(counts).filter((k) => counts[k] === max);
  return pickRandom(tied);
};

// ─── Timer ───────────────────────────────────────────────────────────────────

export const formatTime = (ms) => {
  if (ms <= 0) return '0';
  return Math.ceil(ms / 1000).toString();
};

export const phaseTimers = {
  card_phase: 45_000,
  stat_vote: 30_000,
  reveal: 8_000,
  discussion: 60_000,
  elim_vote: 40_000,
  defense: 45_000,
  revote: 40_000,
  eliminated_reveal: 6_000,
};

// ─── System message helpers ───────────────────────────────────────────────────

export const sysMsg = (text) => ({
  id: generatePlayerId(),
  author: 'SYSTEM',
  authorId: null,
  text,
  ts: Date.now(),
  isSystem: true,
});
