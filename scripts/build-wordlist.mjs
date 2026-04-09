import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "data", "source-packs");
const outputFile = path.join(root, "data", "family-safe-words.json");

const SOURCE_FILES = ["vanilla.txt", "duet.txt", "jack.txt"];
const BANNED_WORDS = new Set(["DONG", "DOPE", "TRUMP"]);

function normalizeLine(line) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-") || trimmed.startsWith("=") || trimmed.startsWith("<")) {
    return null;
  }

  const value = trimmed.startsWith(">") ? trimmed.slice(1) : trimmed;
  const normalized = value
    .toUpperCase()
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized || BANNED_WORDS.has(normalized)) {
    return null;
  }

  return normalized;
}

async function buildWordlist() {
  const words = new Set();

  for (const filename of SOURCE_FILES) {
    const content = await readFile(path.join(sourceDir, filename), "utf8");

    for (const line of content.split("\n")) {
      const normalized = normalizeLine(line);

      if (normalized) {
        words.add(normalized);
      }
    }
  }

  const sorted = Array.from(words).sort((left, right) => left.localeCompare(right));
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(sorted, null, 2)}\n`);

  console.log(`Built ${sorted.length} family-safe words into ${path.relative(root, outputFile)}.`);
}

await buildWordlist();
