// Resolve @saltcorn/data modules from the main process module cache.
// Top-level require() from a local plugin resolves to a different instance
// than the server's, giving an empty state singleton. Cache lookup gives the
// same instance the server loaded, so getState() returns live data.
//
// Saltcorn builds to dist/, so the cache keys look like:
//   .../node_modules/@saltcorn/data/dist/models/table.js
//   .../node_modules/@saltcorn/data/dist/plugin-helper.js
// The regexes match with or without the dist/ prefix to stay compatible
// across Saltcorn dev builds and release builds.

function _mod(re, label) {
  const k = Object.keys(require.cache).find((k) => re.test(k));
  if (!k) {
    throw new Error(
      `saltcorn-flow: could not find "${label}" in the server module cache. ` +
      `Ensure you are running inside a Saltcorn server (v1.x+) and the plugin ` +
      `is loaded after Saltcorn initialises. Cache keys containing "saltcorn": ` +
      Object.keys(require.cache).filter((k) => k.includes("saltcorn")).slice(0, 5).join(", ")
    );
  }
  return require.cache[k].exports;
}

const scTable    = () => _mod(/\/@saltcorn\/data\/(?:dist\/)?models\/table(\.js)?$/, "@saltcorn/data/models/table");
const scView     = () => _mod(/\/@saltcorn\/data\/(?:dist\/)?models\/view(\.js)?$/, "@saltcorn/data/models/view");
const scField    = () => _mod(/\/@saltcorn\/data\/(?:dist\/)?models\/field(\.js)?$/, "@saltcorn/data/models/field");
const scForm     = () => _mod(/\/@saltcorn\/data\/(?:dist\/)?models\/form(\.js)?$/, "@saltcorn/data/models/form");
const scWorkflow = () => _mod(/\/@saltcorn\/data\/(?:dist\/)?models\/workflow(\.js)?$/, "@saltcorn/data/models/workflow");
const scHelper   = () => _mod(/\/@saltcorn\/data\/(?:dist\/)?plugin-helper(\.js)?$/, "@saltcorn/data/plugin-helper");

module.exports = { scTable, scView, scField, scForm, scWorkflow, scHelper };
