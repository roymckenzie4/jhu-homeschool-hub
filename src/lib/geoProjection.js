/**
 * d3-geo projection helper.
 *
 * All d3-geo usage in this app is quarantined to this file and to
 * `components/ChoroplethMap.jsx`. The rest of the code just consumes the
 * `path` string and projected `[x, y]` coordinates returned here.
 *
 * The national map uses `geoAlbersUsa`, which inset-handles Alaska and Hawaii
 * automatically — exactly what the mockup shows. A single-state zoom (see
 * buildStateProjection below) wants a plain conformal fit to that state's own
 * bounds instead — geoAlbersUsa's Alaska/Hawaii insets only make sense at the
 * national scale.
 */

import { geoAlbersUsa, geoMercator, geoPath } from 'd3-geo';

/**
 * Build a projection + path generator sized to fit `featureCollection` inside
 * a `width × height` viewport. Result is memoized per (width, height, ref);
 * callers re-use the same FeatureCollection identity per render.
 */
const cache = new WeakMap();

export function buildProjection(featureCollection, width, height) {
  let perCollection = cache.get(featureCollection);
  if (!perCollection) {
    perCollection = new Map();
    cache.set(featureCollection, perCollection);
  }
  const key = `${width}x${height}`;
  if (perCollection.has(key)) return perCollection.get(key);

  const projection = geoAlbersUsa().fitSize([width, height], featureCollection);
  const path = geoPath(projection);
  const built = { projection, path };
  perCollection.set(key, built);
  return built;
}

// Separate cache from the national map's, but the SAME identity-keyed shape
// (WeakMap on the featureCollection, not a caller-supplied string). A string
// key here previously raced: when a caller's `stateKey` prop changed before
// its `featureCollection` had caught up to match (e.g. React re-rendering the
// same mounted map component between two states, one render behind its own
// fetch), the old projection got returned for the NEW state and then
// permanently cached under the new state's key — silently reusing one
// state's projection matrix for another state's coordinates. Keying off the
// featureCollection's own object identity instead makes that impossible: a
// new state's decoded geometry is always a new object, so it can never hit a
// stale cache entry.
const stateCache = new WeakMap();

/**
 * Same shape as buildProjection, but fit to a single state's own bounds via
 * geoMercator rather than the whole-country geoAlbersUsa.
 */
export function buildStateProjection(featureCollection, width, height) {
  let perCollection = stateCache.get(featureCollection);
  if (!perCollection) {
    perCollection = new Map();
    stateCache.set(featureCollection, perCollection);
  }
  const key = `${width}x${height}`;
  if (perCollection.has(key)) return perCollection.get(key);

  const projection = geoMercator().fitSize([width, height], featureCollection);
  const path = geoPath(projection);
  const built = { projection, path };
  perCollection.set(key, built);
  return built;
}
