const { getState } = require("@saltcorn/data/db/state");
const Table = require("@saltcorn/data/models/table");
const View = require("@saltcorn/data/models/view");
const Field = require("@saltcorn/data/models/field");
const Form = require("@saltcorn/data/models/form");
const Workflow = require("@saltcorn/data/models/workflow");
const {
  stateFieldsToWhere,
  stateFieldsToQuery,
} = require("@saltcorn/data/plugin-helper");
const {
  div,
  h5,
  span,
  script,
  domReady,
  a,
  i,
  text,
} = require("@saltcorn/markup/tags");

// ─── configuration wizard ─────────────────────────────────────────────────────

const configuration_workflow = (req) =>
  new Workflow({
    steps: [
      {
        name: req.__("Kanban settings"),
        form: async (context) => {
          const table = Table.findOne(context.table_id);
          const fields = table.getFields();

          const groupable = fields.filter(
            (f) =>
              !f.primary_key &&
              (f.type?.name === "String" || f.type?.name === "Integer")
          );

          const show_views = await View.find_table_views_where(
            context.table_id,
            ({ state_fields, viewrow }) =>
              viewrow.name !== context.viewname &&
              state_fields.some((sf) => sf.name === "id")
          );

          const create_views = await View.find_table_views_where(
            context.table_id,
            ({ state_fields, viewrow }) =>
              viewrow.name !== context.viewname &&
              state_fields.every((sf) => !sf.required)
          );

          return new Form({
            fields: [
              {
                name: "group_field",
                label: req.__("Group-by field"),
                sublabel: req.__(
                  "Cards will be grouped into columns by this field's value"
                ),
                type: "String",
                required: true,
                attributes: {
                  options: groupable.map((f) => f.name),
                },
              },
              {
                name: "column_order",
                label: req.__("Column order (comma-separated values)"),
                sublabel: req.__(
                  "Optional: define the column order, e.g. To Do,In Progress,Done"
                ),
                type: "String",
                required: false,
              },
              {
                name: "card_title_field",
                label: req.__("Card title field"),
                sublabel: req.__("The field shown as the card heading"),
                type: "String",
                required: false,
                attributes: {
                  options: fields
                    .filter((f) => !f.primary_key)
                    .map((f) => f.name),
                },
              },
              {
                name: "show_view",
                label: req.__("Card detail view"),
                sublabel: req.__(
                  "Optional: clicking a card opens this view in a modal"
                ),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { label: req.__("None"), value: "" },
                    ...show_views.map((v) => v.select_option),
                  ],
                },
              },
              {
                name: "view_to_create",
                label: req.__("Use view to create"),
                sublabel: req.__("Optional: show a button to add new cards"),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { label: req.__("None"), value: "" },
                    ...create_views.map((v) => v.select_option),
                  ],
                },
              },
              {
                name: "min_role",
                label: req.__("Minimum role to move cards"),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { name: "1", label: req.__("Admin") },
                    { name: "40", label: req.__("Staff") },
                    { name: "80", label: req.__("User") },
                    { name: "100", label: req.__("Public") },
                  ],
                },
              },
            ],
          });
        },
      },
    ],
  });

// ─── state fields ─────────────────────────────────────────────────────────────

const get_state_fields = async (table_id, _viewname, _config) => {
  const table = Table.findOne(table_id);
  return table
    .getFields()
    .filter((f) => !f.primary_key)
    .map((f) => {
      const sf = new Field(f);
      sf.required = false;
      return sf;
    });
};

// ─── run ──────────────────────────────────────────────────────────────────────

const run = async (
  table_id,
  viewname,
  {
    group_field,
    column_order,
    card_title_field,
    show_view,
    view_to_create,
    min_role,
  },
  state,
  extraArgs
) => {
  const { req } = extraArgs;
  const table = Table.findOne(table_id);
  const pk_name = table.pk_name;
  const fields = table.getFields();

  if (!group_field) {
    return div(
      { class: "alert alert-warning" },
      "Kanban: no group-by field configured."
    );
  }

  const where = stateFieldsToWhere({ fields, state, table });
  const q = stateFieldsToQuery({ state, fields });
  const rows = await table.getRows(where, {
    ...q,
    forUser: req.user,
    forPublic: !req.user,
  });

  // Determine column list
  let columns;
  if (column_order && column_order.trim()) {
    columns = column_order.split(",").map((s) => s.trim());
  } else {
    const seen = new Set();
    columns = [];
    for (const row of rows) {
      const val = String(row[group_field] ?? "");
      if (!seen.has(val)) {
        seen.add(val);
        columns.push(val);
      }
    }
    if (columns.length === 0) columns = ["(empty)"];
  }

  // Group rows into columns
  const grouped = {};
  for (const col of columns) grouped[col] = [];
  for (const row of rows) {
    const val = String(row[group_field] ?? "");
    if (grouped[val] !== undefined) {
      grouped[val].push(row);
    } else if (!column_order) {
      grouped[val] = [row];
      if (!columns.includes(val)) columns.push(val);
    }
  }

  const role = req.user ? req.user.role_id : 100;
  const canMove = role <= parseInt(min_role || "80", 10);

  // ── build HTML ──────────────────────────────────────────────────────────────

  const cardHtml = (row) => {
    const titleVal = card_title_field
      ? text(String(row[card_title_field] ?? ""))
      : text(String(row[pk_name]));

    const cardBody = div(
      { class: "card-body p-2" },
      h5({ class: "card-title mb-1 sc-kanban-title" }, titleVal)
    );

    if (show_view) {
      return div(
        {
          class: "card sc-kanban-card mb-2",
          "data-id": row[pk_name],
          "data-group": String(row[group_field] ?? ""),
        },
        a(
          {
            href: "javascript:void(0)",
            "data-sc-modal": `/view/${show_view}?id=${row[pk_name]}`,
            class: "text-decoration-none text-body stretched-link",
          },
          cardBody
        )
      );
    }

    return div(
      {
        class: "card sc-kanban-card mb-2",
        "data-id": row[pk_name],
        "data-group": String(row[group_field] ?? ""),
      },
      cardBody
    );
  };

  const addBtn = (colValue) => {
    if (!view_to_create) return "";
    const qs = new URLSearchParams({ [group_field]: colValue }).toString();
    return div(
      { class: "mt-2 text-center" },
      a(
        {
          href: `/view/${view_to_create}?${qs}`,
          class: "btn btn-sm btn-outline-secondary w-100 sc-kanban-add",
        },
        i({ class: "fas fa-plus me-1" }),
        req.__("Add")
      )
    );
  };

  const columnHtml = (col) =>
    div(
      { class: "sc-kanban-column card" },
      div(
        {
          class:
            "sc-kanban-col-header card-header d-flex justify-content-between align-items-center",
        },
        span({ class: "fw-semibold" }, text(col)),
        span(
          { class: "badge bg-secondary sc-kanban-count" },
          String((grouped[col] || []).length)
        )
      ),
      div(
        {
          class: "sc-kanban-cards p-2",
          "data-column": col,
          "data-viewname": viewname,
        },
        ...(grouped[col] || []).map(cardHtml),
        addBtn(col)
      )
    );

  const boardId = `sc-kanban-${viewname.replace(/\W/g, "_")}`;
  const boardHtml = div(
    { class: "sc-kanban-board", id: boardId },
    ...columns.map(columnHtml)
  );

  if (!canMove) return boardHtml;

  // ── drag-and-drop script (SortableJS loaded via plugin headers) ────────────
  const dragScript =
    script(domReady(`
(function() {
  var board = document.getElementById(${JSON.stringify(boardId)});
  if (!board) return;
  board.querySelectorAll('.sc-kanban-cards').forEach(function(lane) {
    new Sortable(lane, {
      group: ${JSON.stringify(boardId)},
      animation: 150,
      ghostClass: 'sc-kanban-ghost',
      onEnd: function(evt) {
        var card = evt.item;
        var id = card.getAttribute('data-id');
        var newCol = evt.to.getAttribute('data-column');
        var viewname = evt.to.getAttribute('data-viewname');
        if (!id || !newCol || !viewname) return;
        [evt.from, evt.to].forEach(function(lane) {
          var col = lane.closest('.sc-kanban-column');
          if (col) {
            col.querySelector('.sc-kanban-count').textContent =
              lane.querySelectorAll('.sc-kanban-card').length;
          }
        });
        fetch('/view/' + viewname + '/move_card', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': _sc_get_csrf_token()
          },
          body: JSON.stringify({ id: id, column: newCol })
        }).then(function(r) {
          if (!r.ok) {
            notifyAlert({ type: 'danger', text: 'Move failed' });
            location.reload();
          }
        }).catch(function() { location.reload(); });
      }
    });
  });
})();
`));

  return boardHtml + dragScript;
};

// ─── move_card route ──────────────────────────────────────────────────────────

const move_card = async (
  table_id,
  _viewname,
  { group_field, min_role },
  body,
  { req }
) => {
  const role = req.user ? req.user.role_id : 100;
  if (role > parseInt(min_role || "80", 10)) {
    return { json: { error: "Not authorized" } };
  }

  const { id, column } = body;
  if (!id || column === undefined) {
    return { json: { error: "Missing id or column" } };
  }

  const table = Table.findOne(table_id);
  try {
    await table.updateRow({ [group_field]: column }, id, req.user);
    return { json: { success: true } };
  } catch (e) {
    return { json: { error: e.message || "Update failed" } };
  }
};

// ─── export ───────────────────────────────────────────────────────────────────

module.exports = {
  name: "Kanban",
  description:
    "Display rows as cards grouped into draggable swim-lane columns by a field value",
  configuration_workflow,
  run,
  get_state_fields,
  routes: { move_card },
  getStringsForI18n() {
    return [];
  },
};
