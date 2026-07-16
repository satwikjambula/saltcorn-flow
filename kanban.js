const { scTable, scView, scField, scForm, scWorkflow, scHelper } = require("./_resolve");
const {
  div,
  h5,
  span,
  script,
  domReady,
  a,
  i,
  input,
  button,
  text,
} = require("@saltcorn/markup/tags");

// ─── helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_COLORS = {
  Urgent: "danger",
  High: "danger",
  Medium: "warning",
  Low: "secondary",
};

function dueDateHtml(row, field) {
  if (!field || !row[field]) return "";
  const due = new Date(row[field]);
  const now = new Date();
  const isOverdue = due < now;
  const isSoon = !isOverdue && due - now < 3 * 24 * 60 * 60 * 1000;
  const dateStr = due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const cls = isOverdue ? "text-danger" : isSoon ? "text-warning" : "text-muted";
  return span({ class: `sc-flow-due small ${cls}` }, `📅 ${dateStr}`);
}

function assigneeHtml(row, field) {
  if (!field || !row[field]) return "";
  const name = String(row[field]);
  const initials = name
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return span({ class: "sc-flow-assignee", title: text(name) }, initials);
}

function priorityHtml(row, field) {
  if (!field || !row[field]) return "";
  const val = String(row[field]);
  const color = PRIORITY_COLORS[val] || "secondary";
  return span({ class: `badge bg-${color} sc-flow-priority` }, text(val));
}

// ─── configuration workflow ───────────────────────────────────────────────────

const configuration_workflow = (req) => {
  const Workflow = scWorkflow();
  return new Workflow({
    steps: [
      {
        name: req.__("Board settings"),
        form: async (context) => {
          const Table = scTable();
          const View = scView();
          const Form = scForm();
          const table = Table.findOne({ id: parseInt(context.table_id, 10) });
          const fields = table.getFields();

          const groupable = fields.filter(
            (f) =>
              !f.primary_key &&
              (f.type?.name === "String" || f.type?.name === "Integer")
          );
          const allFields = fields.filter((f) => !f.primary_key);
          const dateFields = fields.filter(
            (f) => !f.primary_key && f.type?.name === "Date"
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
                  "Cards are grouped into columns by this field's value"
                ),
                type: "String",
                required: true,
                attributes: { options: groupable.map((f) => f.name) },
              },
              {
                name: "column_order",
                label: req.__("Column order"),
                sublabel: req.__(
                  "Comma-separated column values, e.g. To Do,In Progress,Done. Leave empty to derive from data."
                ),
                type: "String",
                required: false,
              },
              {
                name: "card_title_field",
                label: req.__("Card title field"),
                sublabel: req.__("Field shown as the card heading"),
                type: "String",
                required: false,
                attributes: { options: allFields.map((f) => f.name) },
              },
              {
                name: "due_date_field",
                label: req.__("Due date field"),
                sublabel: req.__(
                  "Optional Date field — shown on cards with colour coding"
                ),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { label: req.__("None"), value: "" },
                    ...dateFields.map((f) => f.name),
                  ],
                },
              },
              {
                name: "assignee_field",
                label: req.__("Assignee field"),
                sublabel: req.__(
                  "Optional field — displayed as an avatar initial on each card"
                ),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { label: req.__("None"), value: "" },
                    ...allFields.map((f) => f.name),
                  ],
                },
              },
              {
                name: "priority_field",
                label: req.__("Priority field"),
                sublabel: req.__(
                  "Optional String field — values Urgent/High/Medium/Low get colour badges"
                ),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { label: req.__("None"), value: "" },
                    ...groupable.map((f) => f.name),
                  ],
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
                label: req.__("Create view"),
                sublabel: req.__(
                  "Optional: show an Add button in each column"
                ),
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
                name: "wip_limits",
                label: req.__("WIP limits per column"),
                sublabel: req.__(
                  "Comma-separated max card counts matching Column order (0 = unlimited), e.g. 0,3,1"
                ),
                type: "String",
                required: false,
              },
              {
                name: "min_role",
                label: req.__("Minimum role to move / add columns"),
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
};

// ─── state fields ─────────────────────────────────────────────────────────────

const get_state_fields = async (table_id) => {
  const Table = scTable();
  const Field = scField();
  const table = Table.findOne({ id: parseInt(table_id, 10) });
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
    due_date_field,
    assignee_field,
    priority_field,
    show_view,
    view_to_create,
    wip_limits,
    min_role,
  },
  state,
  { req }
) => {
  const Table = scTable();
  const { stateFieldsToWhere, stateFieldsToQuery } = scHelper();
  const table = Table.findOne({ id: parseInt(table_id, 10) });
  const pk_name = table.pk_name;
  const fields = table.getFields();

  if (!group_field) {
    return div(
      { class: "alert alert-warning" },
      "FlowBoard: no group-by field configured."
    );
  }

  const where = stateFieldsToWhere({ fields, state, table });
  const q = stateFieldsToQuery({ state, fields });
  const rows = await table.getRows(where, {
    ...q,
    forUser: req.user,
    forPublic: !req.user,
  });

  // ── determine columns ───────────────────────────────────────────────────────
  let columns;
  if (column_order && column_order.trim()) {
    columns = column_order.split(",").map((s) => s.trim());
  } else {
    const seen = new Set();
    columns = [];
    for (const row of rows) {
      const val = String(row[group_field] ?? "");
      if (!seen.has(val)) { seen.add(val); columns.push(val); }
    }
    if (columns.length === 0) columns = ["(empty)"];
  }

  // ── group rows ──────────────────────────────────────────────────────────────
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

  // ── WIP limit map: column name → max (0 = unlimited) ──────────────────────
  const wipLimitMap = {};
  if (wip_limits && column_order) {
    const limitArr = wip_limits.split(",").map((s) => parseInt(s.trim(), 10) || 0);
    const colArr = column_order.split(",").map((s) => s.trim());
    colArr.forEach((col, i) => { wipLimitMap[col] = limitArr[i] || 0; });
  }

  const role = req.user ? req.user.role_id : 100;
  const canMove = role <= parseInt(min_role || "80", 10);

  // ── card HTML ───────────────────────────────────────────────────────────────
  const cardHtml = (row) => {
    const titleVal = card_title_field
      ? text(String(row[card_title_field] ?? ""))
      : text(String(row[pk_name]));

    const footer =
      due_date_field || assignee_field || priority_field
        ? div(
            { class: "sc-flow-card-footer d-flex justify-content-between align-items-center mt-2" },
            div({ class: "d-flex align-items-center gap-1" },
              priorityHtml(row, priority_field),
              dueDateHtml(row, due_date_field)
            ),
            assigneeHtml(row, assignee_field)
          )
        : "";

    const cardBody = div(
      { class: "card-body p-2" },
      h5({ class: "card-title mb-1 sc-flow-card-title" }, titleVal),
      footer
    );

    const attrs = {
      class: "card sc-kanban-card mb-2",
      "data-id": String(row[pk_name]),
      "data-group": String(row[group_field] ?? ""),
    };

    if (show_view) {
      return div(
        attrs,
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
    return div(attrs, cardBody);
  };

  // ── add-card button ─────────────────────────────────────────────────────────
  const addCardBtn = (colValue) => {
    if (!view_to_create) return "";
    const qs = new URLSearchParams({ [group_field]: colValue }).toString();
    return div(
      { class: "mt-2" },
      a(
        {
          href: `/view/${view_to_create}?${qs}`,
          class: "btn btn-sm btn-outline-secondary w-100 sc-flow-add-card",
        },
        i({ class: "fas fa-plus me-1" }),
        req.__("Add card")
      )
    );
  };

  // ── column HTML ─────────────────────────────────────────────────────────────
  const columnHtml = (col) => {
    const wipMax = wipLimitMap[col] || 0;
    const wipAttr = wipMax > 0 ? { "data-max": String(wipMax) } : {};
    const wipLabel = wipMax > 0
      ? span({ class: "sc-flow-wip-label small opacity-75 me-1" }, `max ${wipMax}`)
      : "";
    const count = (grouped[col] || []).length;
    const countColor = wipMax > 0 && count >= wipMax ? "bg-danger" : "bg-secondary";

    return div(
      { class: "sc-kanban-column card" },
      div(
        { class: "sc-kanban-col-header card-header d-flex justify-content-between align-items-center" },
        span({ class: "fw-semibold" }, text(col)),
        div(
          { class: "d-flex align-items-center gap-1" },
          wipLabel,
          span({ class: `badge ${countColor} sc-kanban-count` }, String(count))
        )
      ),
      div(
        {
          class: "sc-kanban-cards p-2",
          "data-column": col,
          "data-viewname": viewname,
          ...wipAttr,
        },
        ...(grouped[col] || []).map(cardHtml),
        addCardBtn(col)
      )
    );
  };

  // ── add-column widget (only for users who can move) ─────────────────────────
  const addColWidget = canMove
    ? div(
        { class: "sc-flow-add-col-widget" },
        div(
          { class: "input-group input-group-sm" },
          input({
            type: "text",
            class: "form-control sc-flow-new-col-input",
            placeholder: req.__("New column…"),
          }),
          button(
            {
              class: "btn btn-outline-primary sc-flow-new-col-btn",
              type: "button",
              "data-viewname": viewname,
            },
            "+"
          )
        )
      )
    : "";

  const boardId = `sc-kanban-${viewname.replace(/\W/g, "_")}`;
  const boardHtml = div(
    { class: "sc-kanban-board", id: boardId },
    ...columns.map(columnHtml),
    addColWidget
  );

  if (!canMove) return boardHtml;

  // ── scripts ─────────────────────────────────────────────────────────────────
  const dragScript = script(
    domReady(`
(function() {
  var board = document.getElementById(${JSON.stringify(boardId)});
  if (!board) return;

  // drag cards between columns
  board.querySelectorAll('.sc-kanban-cards').forEach(function(lane) {
    new Sortable(lane, {
      group: ${JSON.stringify(boardId)},
      animation: 150,
      ghostClass: 'sc-kanban-ghost',
      filter: '.sc-flow-add-card',
      onMove: function(evt) {
        var target = evt.to;
        var max = parseInt(target.getAttribute('data-max') || '0', 10);
        if (max > 0) {
          var count = target.querySelectorAll('.sc-kanban-card').length;
          if (count >= max) {
            notifyAlert({ type: 'warning', text: 'Column is at WIP limit (' + max + ')' });
            return false;
          }
        }
        return true;
      },
      onEnd: function(evt) {
        var id = evt.item.getAttribute('data-id');
        var newCol = evt.to.getAttribute('data-column');
        var vn = evt.to.getAttribute('data-viewname');
        if (!id || !newCol || !vn) return;
        [evt.from, evt.to].forEach(function(l) {
          var col = l.closest('.sc-kanban-column');
          if (!col) return;
          var badge = col.querySelector('.sc-kanban-count');
          var count = l.querySelectorAll('.sc-kanban-card').length;
          var max = parseInt(l.getAttribute('data-max') || '0', 10);
          badge.textContent = count;
          badge.className = 'badge sc-kanban-count ' + (max > 0 && count >= max ? 'bg-danger' : 'bg-secondary');
        });
        fetch('/view/' + vn + '/move_card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',
                     'CSRF-Token': _sc_get_csrf_token() },
          body: JSON.stringify({ id: id, column: newCol })
        }).then(function(r) {
          if (!r.ok) { notifyAlert({ type:'danger', text:'Move failed' }); location.reload(); }
        }).catch(function() { location.reload(); });
      }
    });
  });

  // add new column
  board.querySelectorAll('.sc-flow-new-col-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var inp = btn.closest('.input-group').querySelector('.sc-flow-new-col-input');
      var name = inp.value.trim();
      if (!name) { inp.focus(); return; }
      var vn = btn.getAttribute('data-viewname');
      btn.disabled = true;
      fetch('/view/' + vn + '/add_column', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                   'CSRF-Token': _sc_get_csrf_token() },
        body: JSON.stringify({ column_name: name })
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data.error) { notifyAlert({ type:'danger', text: data.error }); btn.disabled = false; }
        else { location.reload(); }
      }).catch(function() { btn.disabled = false; });
    });
    // submit on Enter
    btn.closest('.input-group').querySelector('.sc-flow-new-col-input')
      .addEventListener('keydown', function(e) {
        if (e.key === 'Enter') btn.click();
      });
  });
})();
`)
  );

  return boardHtml + dragScript;
};

// ─── routes ───────────────────────────────────────────────────────────────────

const move_card = async (
  table_id,
  _vn,
  { group_field, min_role, wip_limits, column_order },
  body,
  { req }
) => {
  const role = req.user ? req.user.role_id : 100;
  if (role > parseInt(min_role || "80", 10))
    return { json: { error: "Not authorized" } };

  const { id, column } = body;
  if (!id || column === undefined)
    return { json: { error: "Missing id or column" } };

  const table = scTable().findOne({ id: parseInt(table_id, 10) });

  // server-side WIP limit check
  if (wip_limits && column_order) {
    const colArr = column_order.split(",").map((s) => s.trim());
    const limArr = wip_limits.split(",").map((s) => parseInt(s.trim(), 10) || 0);
    const colIdx = colArr.indexOf(column);
    if (colIdx >= 0 && limArr[colIdx] > 0) {
      const count = await table.countRows({ [group_field]: column });
      if (count >= limArr[colIdx])
        return { json: { error: `Column "${column}" is at WIP limit (${limArr[colIdx]})` } };
    }
  }

  try {
    await table.updateRow({ [group_field]: column }, id, req.user);
    return { json: { success: true } };
  } catch (e) {
    return { json: { error: e.message || "Update failed" } };
  }
};

const add_column = async (table_id, viewname, config, body, { req }) => {
  const role = req.user ? req.user.role_id : 100;
  if (role > parseInt(config.min_role || "80", 10))
    return { json: { error: "Not authorized" } };

  const column_name = (body.column_name || "").trim();
  if (!column_name)
    return { json: { error: "Column name required" } };

  const View = scView();
  const view = View.findOne({ name: viewname });
  if (!view) return { json: { error: "View not found" } };

  const current = config.column_order
    ? config.column_order.split(",").map((s) => s.trim())
    : [];
  if (current.includes(column_name))
    return { json: { error: "Column already exists" } };

  current.push(column_name);
  await View.update(
    { configuration: { ...config, column_order: current.join(",") } },
    view.id
  );
  return { json: { success: true } };
};

// ─── export ───────────────────────────────────────────────────────────────────

module.exports = {
  name: "FlowBoard",
  description:
    "Asana-style board view — cards in draggable columns with due dates, assignees, priorities, and add-column support",
  configuration_workflow,
  run,
  get_state_fields,
  routes: { move_card, add_column },
  getStringsForI18n() { return []; },
};
