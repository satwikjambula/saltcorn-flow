// Resolve @saltcorn/data modules from the main process module cache.
// Top-level require() from a local plugin resolves to a different instance
// than the server's, giving an empty state singleton. Cache lookup gives the
// same instance the server loaded, so getState() returns live data.
//
// Saltcorn builds to dist/, so the cache keys look like:
//   .../node_modules/@saltcorn/data/dist/models/table.js
//   .../node_modules/@saltcorn/data/dist/plugin-helper.js
// The regexes below match with or without the dist/ prefix to stay compatible
// across Saltcorn dev builds and release builds.

function _mod(re) {
  const k = Object.keys(require.cache).find((k) => re.test(k));
  return k ? require.cache[k].exports : null;
}

const scTable    = () => _mod(/\/@saltcorn\/data\/(?:dist\/)?models\/table(\.js)?$/);
const scView     = () => _mod(/\/@saltcorn\/data\/(?:dist\/)?models\/view(\.js)?$/);
const scField    = () => _mod(/\/@saltcorn\/data\/(?:dist\/)?models\/field(\.js)?$/);
const scForm     = () => _mod(/\/@saltcorn\/data\/(?:dist\/)?models\/form(\.js)?$/);
const scWorkflow = () => _mod(/\/@saltcorn\/data\/(?:dist\/)?models\/workflow(\.js)?$/);
const scHelper   = () => _mod(/\/@saltcorn\/data\/(?:dist\/)?plugin-helper(\.js)?$/);

module.exports = { scTable, scView, scField, scForm, scWorkflow, scHelper };
