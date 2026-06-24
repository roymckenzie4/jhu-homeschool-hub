/**
 * Policy data loader — the single seam between the app and the regulation data.
 *
 * Components import shaped data from here, never the CSV directly. Today it
 * bundles the published CSV at build time and parses it synchronously. When the
 * live data path lands, ONLY this module changes: it will fetch the JHU Google
 * Sheet (via the Sheets API, which preserves the per-cell source hyperlinks the
 * CSV export strips), validate the response shape, fall back to the bundled
 * snapshot on mismatch, and revalidate in the background. The rest of the app —
 * which consumes `policyByState` and the config in policy.js — stays unchanged.
 */

import csvText from "../../homeschool-hub-policy-data.csv?raw";
import { parsePolicyCsv } from "./parsePolicyCsv.js";

// Raw CSV text, exposed for the view's "Download data (CSV)" affordance so the
// download serves exactly the bundled source.
export const policyCsvText = csvText;

// Shaped regulation data, keyed by full state name. Parsed once at module load.
export const { byState: policyByState } = parsePolicyCsv(csvText);
