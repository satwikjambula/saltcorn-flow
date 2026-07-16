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
    {
      css: `/plugins/public/saltcorn-flow@${version}/flowcalendar.css`,
      onlyViews: ["FlowCalendar"],
    },
    {
      css: `/plugins/public/saltcorn-flow@${version}/flowtimeline.css`,
      onlyViews: ["FlowTimeline"],
    },
  ],
  viewtemplates: [require("./kanban"), require("./flowlist"), require("./flowzone"), require("./flowmatrix"), require("./flowcalendar"), require("./flowtimeline")],
  ready_for_mobile: false,
};
