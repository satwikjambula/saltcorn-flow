const { version } = require("./package.json");

module.exports = {
  sc_plugin_api_version: 1,
  plugin_name: "saltcorn-flow",
  headers: [
    {
      script: `https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js`,
      onlyViews: ["FlowBoard"],
    },
    {
      css: `/plugins/public/saltcorn-flow@${version}/kanban.css`,
      onlyViews: ["FlowBoard"],
    },
  ],
  viewtemplates: [require("./kanban")],
  ready_for_mobile: false,
};
