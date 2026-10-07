/**
 * Merges TN's TIGER school-district "<Base> in <City>" enclave polygons into
 * their parent district's shape, so each real reported number has exactly
 * one selectable map region instead of two.
 *
 * Census's school-district product splits a handful of TN districts' HIGH-
 * SCHOOL-ONLY zone into a separate polygon where it falls inside a town that
 * runs its own separate K-8 city district — e.g. "Wilson County School
 * District in Lebanon": Lebanon has its own "Lebanon Special School
 * District" for K-8, but Wilson County still legally covers Lebanon's high
 * schoolers, so Census gives that slice its own polygon. These are real,
 * different administrative zones, not duplicates — confirmed via distinct
 * GEOIDs and (for Lebanon) a real separate "Lebanon Special School District"
 * feature and raw-data row. But JHU's workbook only ever reports ONE number
 * for the whole county — there's no way to carve out just the enclave's
 * students — so left as a separate map feature, the enclave polygon always
 * rendered as a gray "not reporting" sliver inside an otherwise-fully-
 * reporting county.
 *
 * An earlier attempt gave the enclave polygon the SAME value as its parent
 * for display (aliasing, not merging) — reverted same session: it let a
 * user select both "Wilson County School District" and "...in Lebanon" as
 * if comparing two real places and see the identical number twice, which
 * misrepresents JHU's actual reporting granularity worse than the gray
 * sliver did. See decisions.md (2026-10-07) for the full back-and-forth.
 *
 * Re-run this script after any fresh rebuild of tn-districts.json from raw
 * TIGER data (the recipe lives in build-state-explorer-snapshot.mjs, near
 * MAP_MATCHED.TN) — a new TIGER download will have these enclave polygons
 * again; they're a standard product feature, not a one-time data glitch.
 *
 *   node scripts/merge-tn-enclave-districts.mjs
 *
 * Uses mapshaper (installed on demand via npx — not a project dependency,
 * same as the 2026-10-06 simplification passes) to do the actual geometry
 * dissolve, rather than hand-rolling arc bookkeeping: `-dissolve` handles
 * shared-boundary removal AND multi-way merges for free (McMinn County has
 * two enclaves, Athens and Etowah, both folding into the same base).
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { districtNormKey } from "./build-state-explorer-snapshot.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const GEO_PATH = resolve(HERE, "../public/state-explorer-geo/tn-districts.json");

// Maps each "<Base> in <City>" name to its parent "<Base>" name, matched by
// normalized key (not exact string — e.g. "Arlington Community Schools"
// vs. the real "Arlington Community School District" only line up once
// stopwords are stripped). Throws rather than guessing if a name's base
// doesn't resolve to exactly one real sibling — a fresh TIGER download
// could plausibly introduce a new, genuinely ambiguous case that deserves a
// human look, not a silent wrong merge.
function findEnclaveMergeMap(names) {
  const byKey = new Map();
  for (const n of names) {
    const key = districtNormKey(n);
    (byKey.get(key) ?? byKey.set(key, []).get(key)).push(n);
  }

  const mergeMap = {};
  for (const n of names) {
    const enclaveOf = /^(.+) in .+$/i.exec(n);
    if (!enclaveOf) continue;
    const baseKey = districtNormKey(enclaveOf[1].trim());
    const siblings = (byKey.get(baseKey) ?? []).filter((x) => x !== n);
    if (siblings.length !== 1) {
      throw new Error(
        `"${n}" has ${siblings.length} possible base-district matches ` +
          `(expected exactly 1): ${siblings.join(", ") || "none"} — needs a ` +
          `human look, not an automatic merge.`,
      );
    }
    mergeMap[n] = siblings[0];
  }
  return mergeMap;
}

function main() {
  const topo = JSON.parse(readFileSync(GEO_PATH, "utf8"));
  const objectKey = Object.keys(topo.objects)[0];
  const names = topo.objects[objectKey].geometries.map((g) => g.properties.name);

  const mergeMap = findEnclaveMergeMap(names);
  const enclaveCount = Object.keys(mergeMap).length;
  if (enclaveCount === 0) {
    console.log('No "<Base> in <City>" enclave polygons found — nothing to merge.');
    return;
  }

  // Tag every feature with its merge target (or its own name, for anything
  // not an enclave), dissolve by that tag — which transparently merges
  // McMinn's two enclaves + its base into one group, not just pairs — then
  // rename the tag back to `name`. The merge map is embedded directly in
  // the `-each` expression (not read from a file by mapshaper itself) and
  // passed via execFileSync's args array, not a shell string, so the JSON
  // blob never needs shell-escaping.
  const tagExpr =
    `var MERGE = ${JSON.stringify(mergeMap)}; ` +
    `this.properties.mergeKey = MERGE[this.properties.name] || this.properties.name;`;
  const renameExpr = `this.properties.name = this.properties.mergeKey; delete this.properties.mergeKey;`;

  execFileSync(
    "npx",
    [
      "mapshaper",
      GEO_PATH,
      "-each", tagExpr,
      "-dissolve", "mergeKey", "copy-fields=GEOID,STATEFP",
      "-each", renameExpr,
      "-o", "format=topojson", GEO_PATH, "force",
    ],
    { stdio: "inherit" },
  );

  console.log(`Merged ${enclaveCount} enclave polygon(s) into their parent district.`);
}

main();
