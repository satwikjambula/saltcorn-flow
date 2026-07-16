const { scTable, scField, scForm, scWorkflow, scHelper } = require("./_resolve");
const {
  div,
  span,
  script,
  domReady,
  a,
  i,
  select,
  option,
  table: tableTag,
  thead,
  tbody,
  tr,
  th,
  td,
  text,
} = require("@saltcorn/markup/tags");

// ─── helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_COLORS = {
  Urgent: "danger",
  High: "danger",
  Medium: "warning",
  Low: "secondary",
};

function formatDate(val) {
  if (!val) return "";
  const d = new Date(val);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dateCls(val) {
  if (!val) return "text-muted";
  const d = new Date(val);
  const now = new Date();
  if (d < now) return "text-danger";
  if (d - now < 3 * 24 * 60 * 60 * 1000) return "text-warning";
  return "text-muted";
}

function initials(name) {
  return String(name)
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── configuration workflow ───────────────────────────────────────────────────

const configuration_workflow = (req) => {
  const Workflow = scWorkflow();
  return new Workflow({
    steps: [
      {
        name: req.__("List settings"),
        form: async (context) => {
          const Table = scTable();
          const Form = scForm();
          const table = Table.findOne({ id: parseInt(context.table_id, 10) });
          const fields = table.getFields();

          const allFields = fields.filter((f) => !f.primary_key);
          const stringFields = allFields.filter(
            (f) => f.type?.name === "String"
          );
          const dateFields = allFields.filter((f) => f.type?.name === "Date");
          const intFields = allFields.filter(
            (f) => f.type?.name === "Integer"
          );

          return new Form({
            fields: [
              {
                name: "title_field",
                label: req.__("Title field"),
                sublabel: req.__("Field displayed as the task name"),
                type: "String",
                required: true,
                attributes: { options: allFields.map((f) => f.name) },
              },
              {
                name: "status_field",
                label: req.__("Status field"),
                sublabel: req.__(
                  "Optional: String field with an inline dropdown for editing"
                ),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { label: req.__("None"), value: "" },
                    ...stringFields.map((f) => f.name),
                  ],
                },
              },
              {
                name: "status_options",
                label: req.__("Status options"),
                sublabel: req.__(
                  "Comma-separated values for the status dropdown, e.g. To Do,In Progress,Done"
                ),
                type: "String",
                required: false,
              },
              {
                name: "due_date_field",
                label: req.__("Due date field"),
                sublabel: req.__("Optional Date field shown in the list"),
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
                sublabel: req.__("Optional field shown as an avatar"),
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
                  "Optional: values Urgent/High/Medium/Low get colour badges"
                ),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { label: req.__("None"), value: "" },
                    ...stringFields.map((f) => f.name),
                  ],
                },
              },
              {
                name: "position_field",
                label: req.__("Position field"),
                sublabel: req.__(
                  "Optional Integer field that stores row order — enables drag-to-reorder"
                ),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { label: req.__("None"), value: "" },
                    ...intFields.map((f) => f.name),
                  ],
                },
              },
              {
                name: "min_role",
                label: req.__("Minimum role to edit / reorder"),
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
    title_field,
    status_field,
    status_options,
    due_date_field,
    assignee_field,
    priority_field,
    position_field,
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

  if (!title_field) {
    return div(
      { class: "alert alert-warning" },
      "FlowList: no title field configured."
    );
  }

  const posFieldMissing =
    position_field && !fields.some((f) => f.name === position_field);

  const where = stateFieldsToWhere({ fields, state, table });
  const q = stateFieldsToQuery({ state, fields });
  const effectivePositionField = posFieldMissing ? null : position_field;
  const orderBy = effectivePositionField ? { orderBy: effectivePositionField } : {};
  const rows = await table.getRows(where, {
    ...q,
    ...orderBy,
    forUser: req.user,
    forPublic: !req.user,
  });

  const role = req.user ? req.user.role_id : 100;
  const canEdit = role <= parseInt(min_role || "80", 10);
  const canReorder = canEdit && !!effectivePositionField;

  const statusOpts = status_options
    ? status_options.split(",").map((s) => s.trim())
    : [];

  // ── build columns visibility ────────────────────────────────────────────────
  const showStatus = !!status_field;
  const showDue = !!due_date_field;
  const showAssignee = !!assignee_field;
  const showPriority = !!priority_field;

  // ── header row ──────────────────────────────────────────────────────────────
  const headerRow = tr(
    canReorder ? th({ class: "sc-flowlist-handle-th", style: "width:32px" }, "") : "",
    th({ class: "sc-flowlist-title-th" }, req.__("Task")),
    showStatus ? th({ class: "sc-flowlist-status-th", style: "width:150px" }, req.__("Status")) : "",
    showPriority ? th({ class: "sc-flowlist-priority-th", style: "width:100px" }, req.__("Priority")) : "",
    showDue ? th({ class: "sc-flowlist-due-th", style: "width:110px" }, req.__("Due")) : "",
    showAssignee ? th({ class: "sc-flowlist-assignee-th", style: "width:80px" }, req.__("Assignee")) : ""
  );

  // ── build a status select for inline editing ─────────────────────────────────
  const statusSelect = (row) => {
    if (!showStatus) return "";
    const currentVal = String(row[status_field] ?? "");
    const opts =
      statusOpts.length > 0
        ? statusOpts
        : [currentVal]; // fallback: show current value only

    return select(
      {
        class: "form-select form-select-sm sc-flowlist-status-select",
        "data-id": String(row[pk_name]),
        "data-field": status_field,
        "data-viewname": viewname,
        disabled: canEdit ? undefined : "disabled",
      },
      ...opts.map((o) =>
        option({ value: o, selected: o === currentVal ? "selected" : undefined }, text(o))
      )
    );
  };

  // ── build a priority select for inline editing ───────────────────────────────
  const prioritySelect = (row) => {
    if (!showPriority) return "";
    const currentVal = String(row[priority_field] ?? "");
    const opts = ["Urgent", "High", "Medium", "Low"];
    const color = PRIORITY_COLORS[currentVal] || "secondary";

    if (!canEdit) {
      return currentVal
        ? span({ class: `badge bg-${color}` }, text(currentVal))
        : "";
    }

    return select(
      {
        class: "form-select form-select-sm sc-flowlist-priority-select",
        "data-id": String(row[pk_name]),
        "data-field": priority_field,
        "data-viewname": viewname,
      },
      option({ value: "", selected: !currentVal ? "selected" : undefined }, "—"),
      ...opts.map((o) =>
        option({ value: o, selected: o === currentVal ? "selected" : undefined }, o)
      )
    );
  };

  // ── data row ─────────────────────────────────────────────────────────────────
  const dataRow = (row) => {
    const dueVal = due_date_field ? row[due_date_field] : null;
    const assigneeVal = assignee_field ? row[assignee_field] : null;

    return tr(
      {
        class: "sc-flowlist-row",
        "data-id": String(row[pk_name]),
      },
      canReorder
        ? td(
            { class: "sc-flowlist-handle text-muted", title: "Drag to reorder" },
            "⠿"
          )
        : "",
      td(
        { class: "sc-flowlist-title-cell" },
        span({ class: "sc-flowlist-title-text" }, text(String(row[title_field] ?? "")))
      ),
      showStatus ? td({ class: "sc-flowlist-status-cell" }, statusSelect(row)) : "",
      showPriority ? td({ class: "sc-flowlist-priority-cell" }, prioritySelect(row)) : "",
      showDue
        ? td(
            { class: `sc-flowlist-due-cell small ${dateCls(dueVal)}` },
            dueVal ? `📅 ${formatDate(dueVal)}` : ""
          )
        : "",
      showAssignee
        ? td(
            { class: "sc-flowlist-assignee-cell" },
            assigneeVal
              ? span(
                  { class: "sc-flow-assignee", title: text(String(assigneeVal)) },
                  initials(assigneeVal)
                )
              : ""
          )
        : ""
    );
  };

  const listId = `sc-flowlist-${viewname.replace(/\W/g, "_")}`;

  const listHtml = div(
    { class: "sc-flowlist-wrapper table-responsive" },
    tableTag(
      { class: "table table-hover sc-flowlist-table", id: listId },
      thead({ class: "table-light" }, headerRow),
      tbody(
        { class: "sc-flowlist-tbody", "data-viewname": viewname },
        ...rows.map(dataRow)
      )
    )
  );

  const posWarn = posFieldMissing
    ? div(
        { class: "alert alert-warning py-1 px-2 mb-2 small" },
        `FlowList: position field "${position_field}" does not exist on this table — drag-to-reorder is disabled. Reconfigure the view to fix this.`
      )
    : "";

  if (!canEdit) return posWarn + listHtml;

  // ── scripts ──────────────────────────────────────────────────────────────────
  const editorScript = script(
    domReady(`
(function() {
  var listEl = document.getElementById(${JSON.stringify(listId)});
  if (!listEl) return;

  // inline field update (status, priority, etc.)
  function updateField(id, field, value, vn) {
    fetch('/view/' + vn + '/update_field', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
                 'CSRF-Token': _sc_get_csrf_token() },
      body: JSON.stringify({ id: id, field: field, value: value })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.error) notifyAlert({ type: 'danger', text: data.error });
    }).catch(function() {
      notifyAlert({ type: 'danger', text: 'Update failed' });
    });
  }

  listEl.querySelectorAll('.sc-flowlist-status-select, .sc-flowlist-priority-select')
    .forEach(function(sel) {
      sel.addEventListener('change', function() {
        updateField(
          sel.getAttribute('data-id'),
          sel.getAttribute('data-field'),
          sel.value,
          sel.getAttribute('data-viewname')
        );
      });
    });

  ${canReorder ? `
  // drag-to-reorder rows
  var tbody = listEl.querySelector('.sc-flowlist-tbody');
  if (tbody) {
    new Sortable(tbody, {
      handle: '.sc-flowlist-handle',
      animation: 150,
      ghostClass: 'sc-flowlist-ghost',
      onEnd: function() {
        var vn = tbody.getAttribute('data-viewname');
        var ids = Array.from(tbody.querySelectorAll('.sc-flowlist-row'))
          .map(function(r) { return r.getAttribute('data-id'); });
        fetch('/view/' + vn + '/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',
                     'CSRF-Token': _sc_get_csrf_token() },
          body: JSON.stringify({ order: ids })
        }).then(function(r) { return r.json(); }).then(function(data) {
          if (data.error) notifyAlert({ type: 'danger', text: data.error });
        }).catch(function() {
          notifyAlert({ type: 'danger', text: 'Reorder failed' });
        });
      }
    });
  }
  ` : ""}
})();
`)
  );

  return posWarn + listHtml + editorScript;
};

// ─── routes ───────────────────────────────────────────────────────────────────

const update_field = async (table_id, _vn, { min_role }, body, { req }) => {
  const role = req.user ? req.user.role_id : 100;
  if (role > parseInt(min_role || "80", 10))
    return { json: { error: "Not authorized" } };

  const { id, field, value } = body;
  if (!id || !field)
    return { json: { error: "Missing id or field" } };

  const table = scTable().findOne({ id: parseInt(table_id, 10) });
  const tableFields = table.getFields();
  const fieldDef = tableFields.find((f) => f.name === field);
  if (!fieldDef)
    return { json: { error: "Unknown field" } };

  try {
    await table.updateRow({ [field]: value || null }, parseInt(id, 10), req.user);
    return { json: { success: true } };
  } catch (e) {
    return { json: { error: e.message || "Update failed" } };
  }
};

const reorder = async (table_id, _vn, { position_field, min_role }, body, { req }) => {
  const role = req.user ? req.user.role_id : 100;
  if (role > parseInt(min_role || "80", 10))
    return { json: { error: "Not authorized" } };

  if (!position_field)
    return { json: { error: "No position field configured" } };

  const { order } = body;
  if (!Array.isArray(order))
    return { json: { error: "Invalid order payload" } };

  const table = scTable().findOne({ id: parseInt(table_id, 10) });
  try {
    await Promise.all(
      order.map((id, idx) =>
        table.updateRow({ [position_field]: idx + 1 }, parseInt(id, 10), req.user)
      )
    );
    return { json: { success: true } };
  } catch (e) {
    return { json: { error: e.message || "Reorder failed" } };
  }
};

// ─── export ───────────────────────────────────────────────────────────────────

module.exports = {
  name: "FlowList",
  description:
    "Asana-style flat task list with inline status editing, priority badges, due dates, assignee avatars, and drag-to-reorder",
  configuration_workflow,
  run,
  get_state_fields,
  routes: { update_field, reorder },
  getStringsForI18n() { return []; },
};
