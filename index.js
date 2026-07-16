const { version } = require("./package.json");

module.exports = {
  sc_plugin_api_version: 1,
  plugin_name: "saltcorn-flow",
  headers: [
    {
      script: "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js",
      onlyViews: ["FlowBoard", "FlowList", "FlowZone"],
    },
    {
      css: `/plugins/public/saltcorn-flow@${version}/kanban.css`,
      onlyViews: ["FlowBoard"],
    },
    {
      css: `/plugins/public/saltcorn-flow@${version}/flowlist.css`,
      onlyViews: ["FlowList"],
    },
    {
      css: `/plugins/public/saltcorn-flow@${version}/flowzone.css`,
      onlyViews: ["FlowZone"],
    },
    {
      css: `/plugins/public/saltcorn-flow@${version}/flowmatrix.css`,
      onlyViews: ["FlowMatrix"],
    },
  ],
  viewtemplates: [require("./kanban"), require("./flowlist"), require("./flowzone"), require("./flowmatrix")],
  ready_for_mobile: false,
};
