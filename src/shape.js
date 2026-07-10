// Turn the raw Blizzard Profile API responses into a compact, frontend-friendly
// shape. Everything here is defensive: any sub-resource can be null.

// Blizzard slot type -> readable label, in roughly armory order.
const SLOT_ORDER = [
  'HEAD', 'NECK', 'SHOULDER', 'BACK', 'CHEST', 'SHIRT', 'TABARD', 'WRIST',
  'HANDS', 'WAIST', 'LEGS', 'FEET', 'FINGER_1', 'FINGER_2', 'TRINKET_1',
  'TRINKET_2', 'MAIN_HAND', 'OFF_HAND',
];

const QUALITY = {
  POOR: 'poor', COMMON: 'common', UNCOMMON: 'uncommon', RARE: 'rare',
  EPIC: 'epic', LEGENDARY: 'legendary', ARTIFACT: 'artifact', HEIRLOOM: 'heirloom',
};

function shapeGear(equipment) {
  if (!equipment?.equipped_items) return [];
  const bySlot = new Map();
  for (const item of equipment.equipped_items) {
    bySlot.set(item.slot?.type, item);
  }
  const out = [];
  for (const slot of SLOT_ORDER) {
    const item = bySlot.get(slot);
    if (!item) continue;
    out.push({
      slot,
      name: item.name,
      itemLevel: item.level?.value ?? null,
      quality: QUALITY[item.quality?.type] || 'common',
    });
  }
  return out;
}

function shapeBracket(bracket) {
  if (!bracket) return null;
  const stats = bracket.season_match_statistics;
  return {
    rating: bracket.rating ?? 0,
    tier: bracket.tier?.name ?? null,
    played: stats?.played ?? 0,
    won: stats?.won ?? 0,
    lost: stats?.lost ?? 0,
  };
}

function shapeMythic(mythic) {
  if (!mythic) return null;
  const runs = (mythic.current_period?.best_runs || [])
    .map((run) => ({
      dungeon: run.dungeon?.name,
      level: run.keystone_level,
      timed: run.is_completed_within_time,
    }))
    .sort((a, b) => b.level - a.level)
    .slice(0, 10);
  return {
    rating: mythic.current_mythic_rating?.rating
      ? Math.round(mythic.current_mythic_rating.rating)
      : null,
    bestRuns: runs,
  };
}

export function shapeCharacter(raw, region) {
  const { summary, media, equipment, pvpSummary, brackets, mythic } = raw;

  const avatar = media?.assets?.find((a) => a.key === 'avatar')?.value
    || media?.assets?.find((a) => a.key === 'main-raw')?.value
    || null;

  return {
    region,
    name: summary.name,
    realm: summary.realm?.name,
    level: summary.level,
    faction: summary.faction?.name,
    race: summary.race?.name,
    class: summary.character_class?.name,
    spec: summary.active_spec?.name,
    guild: summary.guild?.name ?? null,
    itemLevel: {
      equipped: summary.equipped_item_level ?? null,
      average: summary.average_item_level ?? null,
    },
    title: summary.active_title?.display_string ?? null,
    achievementPoints: summary.achievement_points ?? null,
    avatar,
    gear: shapeGear(equipment),
    pvp: {
      honorLevel: pvpSummary?.honor_level ?? null,
      brackets: {
        '2v2': shapeBracket(brackets.twos),
        '3v3': shapeBracket(brackets.threes),
        rbg: shapeBracket(brackets.rbg),
      },
    },
    mythicPlus: shapeMythic(mythic),
  };
}
