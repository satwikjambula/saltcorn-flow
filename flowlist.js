const { scTable, scField, scForm, scWorkflow, scHelper, scView } = require("./_resolve");
const {
  div,
  span,
  script,
  domReady,
  a,
  i,
  input,
  button,
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
          const View = scView();
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
                name: "show_view",
                label: req.__("Row detail view"),
                sublabel: req.__(
                  "Optional: clicking the task title opens this view in a modal"
                ),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { label: req.__("None"), value: "" },
                    ...(
                      await View.find_table_views_where(
                        context.table_id,
                        ({ state_fields, viewrow }) =>
                          viewrow.name !== context.viewname &&
                          state_fields.some((sf) => sf.name === "id")
                      )
                    ).map((v) => v.select_option),
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
    show_view,
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
    canEdit ? th(
      { class: "sc-flowlist-check-th", style: "width:32px" },
      input({ type: "checkbox", class: "sc-flowlist-select-all form-check-input" })
    ) : "",
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
      canEdit
        ? td(
            { class: "sc-flowlist-check-td" },
            input({
              type: "checkbox",
              class: "sc-flowlist-row-check form-check-input",
              value: String(row[pk_name]),
            })
          )
        : "",
      canReorder
        ? td(
            { class: "sc-flowlist-handle text-muted", title: "Drag to reorder" },
            "⠿"
          )
        : "",
      td(
        { class: "sc-flowlist-title-cell" },
        show_view
          ? a(
              {
                href: "javascript:void(0)",
                "data-sc-modal": `/view/${show_view}?id=${row[pk_name]}`,
                class: "sc-flowlist-title-link",
              },
              text(String(row[title_field] ?? ""))
            )
          : canEdit
          ? span(
              {
                class: "sc-flowlist-title-text sc-flowlist-title-editable",
                contenteditable: "true",
                "data-id": String(row[pk_name]),
                "data-field": title_field,
                "data-viewname": viewname,
                "data-original": String(row[title_field] ?? ""),
              },
              text(String(row[title_field] ?? ""))
            )
          : span({ class: "sc-flowlist-title-text" }, text(String(row[title_field] ?? "")))
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

  // ── bulk toolbar fields ──────────────────────────────────────────────────────
  const bulkFields = [];
  if (showStatus && status_field)
    bulkFields.push({ name: status_field, label: "Status", opts: statusOpts });
  if (showPriority && priority_field)
    bulkFields.push({ name: priority_field, label: "Priority", opts: ["Urgent","High","Medium","Low"] });

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

  // ── bulk action toolbar ──────────────────────────────────────────────────────
  const bulkToolbar = canEdit && bulkFields.length > 0
    ? div(
        {
          class: "sc-flowlist-bulk-bar d-none d-flex align-items-center gap-2 p-2 border rounded bg-light mt-2",
          id: `${listId}-bulk`,
        },
        span({ class: "sc-flowlist-bulk-count small fw-semibold text-muted me-2" }, "0 selected"),
        select(
          { class: "form-select form-select-sm sc-flowlist-bulk-field", style: "width:auto" },
          option({ value: "" }, req.__("— field —")),
          ...bulkFields.map((f) =>
            option({ value: f.name, "data-opts": f.opts.join(",") }, f.label)
          )
        ),
        select(
          {
            class: "form-select form-select-sm sc-flowlist-bulk-value",
            style: "width:auto",
            disabled: "disabled",
          },
          option({ value: "" }, req.__("— value —"))
        ),
        button(
          {
            type: "button",
            class: "btn btn-sm btn-primary sc-flowlist-bulk-apply",
            "data-viewname": viewname,
            disabled: "disabled",
          },
          req.__("Apply")
        ),
        button(
          {
            type: "button",
            class: "btn btn-sm btn-outline-secondary sc-flowlist-bulk-deselect",
          },
          req.__("Clear")
        )
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

  // inline title editing
  listEl.querySelectorAll('.sc-flowlist-title-editable').forEach(function(el) {
    var saved = el.getAttribute('data-original');

    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') {
        el.textContent = saved;
        el.blur();
      }
    });

    el.addEventListener('blur', function() {
      var newVal = el.textContent.trim();
      if (newVal === saved) return;
      if (!newVal) { el.textContent = saved; return; }
      saved = newVal;
      el.setAttribute('data-original', newVal);
      updateField(
        el.getAttribute('data-id'),
        el.getAttribute('data-field'),
        newVal,
        el.getAttribute('data-viewname')
      );
    });

    // prevent drag handle from capturing clicks on the title
    el.addEventListener('mousedown', function(e) { e.stopPropagation(); });
  });

  // ── bulk actions ──────────────────────────────────────────────────────────
  var bulkBar = document.getElementById(${JSON.stringify(listId + "-bulk")});
  if (bulkBar) {
    var selectAll = listEl.querySelector('.sc-flowlist-select-all');
    var bulkCount = bulkBar.querySelector('.sc-flowlist-bulk-count');
    var bulkField = bulkBar.querySelector('.sc-flowlist-bulk-field');
    var bulkValue = bulkBar.querySelector('.sc-flowlist-bulk-value');
    var bulkApply = bulkBar.querySelector('.sc-flowlist-bulk-apply');
    var bulkDesel = bulkBar.querySelector('.sc-flowlist-bulk-deselect');

    function getChecked() {
      return Array.from(listEl.querySelectorAll('.sc-flowlist-row-check:checked'));
    }

    function refreshBulkBar() {
      var checked = getChecked();
      if (checked.length > 0) {
        bulkBar.classList.remove('d-none');
        bulkCount.textContent = checked.length + ' selected';
      } else {
        bulkBar.classList.add('d-none');
        if (selectAll) selectAll.checked = false;
      }
    }

    listEl.querySelectorAll('.sc-flowlist-row-check').forEach(function(chk) {
      chk.addEventListener('change', refreshBulkBar);
    });

    if (selectAll) {
      selectAll.addEventListener('change', function() {
        listEl.querySelectorAll('.sc-flowlist-row-check').forEach(function(chk) {
          chk.checked = selectAll.checked;
        });
        refreshBulkBar();
      });
    }

    bulkField.addEventListener('change', function() {
      var opts = (bulkField.options[bulkField.selectedIndex].getAttribute('data-opts') || '').split(',').filter(Boolean);
      bulkValue.innerHTML = '<option value="">— value —</option>' +
        opts.map(function(o) { return '<option value="' + o + '">' + o + '</option>'; }).join('');
      bulkValue.disabled = opts.length === 0;
      bulkApply.disabled = bulkField.value === '' || bulkValue.value === '';
    });

    bulkValue.addEventListener('change', function() {
      bulkApply.disabled = bulkField.value === '' || bulkValue.value === '';
    });

    bulkApply.addEventListener('click', function() {
      var ids = getChecked().map(function(chk) { return chk.value; });
      if (!ids.length || !bulkField.value || !bulkValue.value) return;
      bulkApply.disabled = true;
      var vn = bulkApply.getAttribute('data-viewname');
      fetch('/view/' + vn + '/bulk_update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CSRF-Token': _sc_get_csrf_token() },
        body: JSON.stringify({ ids: ids, field: bulkField.value, value: bulkValue.value }),
      }).then(function(r) { return r.json(); }).then(function(data) {
        bulkApply.disabled = false;
        if (data.error) notifyAlert({ type: 'danger', text: data.error });
        else location.reload();
      }).catch(function() { bulkApply.disabled = false; });
    });

    bulkDesel.addEventListener('click', function() {
      listEl.querySelectorAll('.sc-flowlist-row-check').forEach(function(chk) { chk.checked = false; });
      if (selectAll) selectAll.checked = false;
      refreshBulkBar();
    });
  }

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

  return posWarn + listHtml + bulkToolbar + editorScript;
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

const bulk_update = async (table_id, _vn, { status_field, priority_field, min_role }, body, { req }) => {
  const role = req.user ? req.user.role_id : 100;
  if (role > parseInt(min_role || "80", 10))
    return { json: { error: "Not authorized" } };

  const { ids, field, value } = body;
  if (!Array.isArray(ids) || !ids.length || !field || value === undefined)
    return { json: { error: "Missing ids, field, or value" } };

  // only allow updating the configured editable fields
  const allowed = [status_field, priority_field].filter(Boolean);
  if (!allowed.includes(field))
    return { json: { error: "Field not allowed for bulk update" } };

  const table = scTable().findOne({ id: parseInt(table_id, 10) });
  try {
    await Promise.all(
      ids.map((id) =>
        table.updateRow({ [field]: value || null }, parseInt(id, 10), req.user)
      )
    );
    return { json: { success: true, updated: ids.length } };
  } catch (e) {
    return { json: { error: e.message || "Bulk update failed" } };
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
  routes: { update_field, reorder, bulk_update },
  getStringsForI18n() { return []; },
};
