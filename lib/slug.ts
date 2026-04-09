const LEFT_WORDS = [
  "amber",
  "arc",
  "atlas",
  "brass",
  "cedar",
  "cipher",
  "cosmic",
  "ember",
  "fable",
  "gilded",
  "harbor",
  "honey",
  "ivory",
  "juniper",
  "lantern",
  "maple",
  "meridian",
  "north",
  "opal",
  "paper",
  "quiet",
  "royal",
  "sable",
  "signal",
  "silver",
  "sunset",
  "timber",
  "velvet",
  "wild",
  "zephyr"
];

const RIGHT_WORDS = [
  "anchor",
  "biscuit",
  "bridge",
  "camp",
  "cardinal",
  "crown",
  "drift",
  "field",
  "forge",
  "harvest",
  "hearth",
  "horizon",
  "ink",
  "island",
  "junction",
  "meadow",
  "needle",
  "orchard",
  "parlor",
  "pocket",
  "quarry",
  "rocket",
  "signal",
  "stone",
  "summit",
  "thread",
  "valley",
  "voyage",
  "wagon",
  "whistle"
];

function pick(values: string[]): string {
  return values[Math.floor(Math.random() * values.length)];
}

export function normalizeRoomSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function generateRoomSlug() {
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${pick(LEFT_WORDS)}-${pick(RIGHT_WORDS)}-${suffix}`;
}
