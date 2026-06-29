const { version } = require("./package.json");

module.exports = {
  sc_plugin_api_version: 1,
  plugin_name: "saltcorn-kanban-simple",
  headers: [
    {
      script: `https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js`,
      onlyViews: ["Kanban"],
    },
    {
      css: `/plugins/public/saltcorn-kanban-simple@${version}/kanban.css`,
      onlyViews: ["Kanban"],
    },
  ],
  viewtemplates: [require("./kanban")],
  ready_for_mobile: false,
};
