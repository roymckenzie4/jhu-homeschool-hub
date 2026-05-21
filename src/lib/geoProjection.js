/**
 * d3-geo projection helper.
 *
 * All d3-geo usage in this app is quarantined to this file and to
 * `components/ChoroplethMap.jsx`. The rest of the code just consumes the
 * `path` string and projected `[x, y]` coordinates returned here.
 *
 * The projection is `geoAlbersUsa`, which inset-handles Alaska and Hawaii
 * automatically — exactly what the mockup shows.
 */

import { geoAlbersUsa, geoPath } from 'd3-geo';

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
