const { scTable, scView, scField, scForm, scWorkflow, scHelper } = require("./_resolve");
const {
  div,
  span,
  small,
  a,
  script,
  domReady,
  text,
} = require("@saltcorn/markup/tags");

// ─── helpers ──────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── configuration workflow ───────────────────────────────────────────────────

const configuration_workflow = (req) => {
  const Workflow = scWorkflow();
  return new Workflow({
    steps: [
      {
        name: req.__("Matrix settings"),
        form: async (context) => {
          const Table = scTable();
          const View = scView();
          const Form = scForm();
          const table = Table.findOne({ id: parseInt(context.table_id, 10) });
          const fields = table.getFields();
          const axisFields = fields.filter(
            (f) =>
              !f.primary_key &&
              (f.type?.name === "String" || f.type?.name === "Integer")
          );
          const allFields = fields.filter((f) => !f.primary_key);

          const show_views = await View.find_table_views_where(
            context.table_id,
            ({ state_fields, viewrow }) =>
              viewrow.name !== context.viewname &&
              state_fields.some((sf) => sf.name === "id")
          );

          return new Form({
            fields: [
              {
                name: "x_field",
                label: req.__("X axis field"),
                sublabel: req.__("String or Integer field mapped to matrix columns"),
                type: "String",
                required: true,
                attributes: { options: axisFields.map((f) => f.name) },
              },
              {
                name: "x_values",
                label: req.__("X axis values"),
                sublabel: req.__("Comma-separated column values (left → right), e.g. Low,High"),
                type: "String",
                required: true,
              },
              {
                name: "x_label",
                label: req.__("X axis label"),
                sublabel: req.__("Optional header label shown above columns"),
                type: "String",
                required: false,
              },
              {
                name: "y_field",
                label: req.__("Y axis field"),
                sublabel: req.__("String or Integer field mapped to matrix rows"),
                type: "String",
                required: true,
                attributes: { options: axisFields.map((f) => f.name) },
              },
              {
                name: "y_values",
                label: req.__("Y axis values"),
                sublabel: req.__("Comma-separated row values (top → bottom), e.g. High,Low"),
                type: "String",
                required: true,
              },
              {
                name: "y_label",
                label: req.__("Y axis label"),
                sublabel: req.__("Optional label shown to the left of rows"),
                type: "String",
                required: false,
              },
              {
                name: "card_title_field",
                label: req.__("Card title field"),
                type: "String",
                required: true,
                attributes: { options: allFields.map((f) => f.name) },
              },
              {
                name: "card_subtitle_field",
                label: req.__("Card subtitle field"),
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
                name: "show_view",
                label: req.__("Card detail view"),
                sublabel: req.__("Optional: clicking a card opens this view in a modal"),
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
                name: "min_role",
                label: req.__("Minimum role to drag cards"),
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
  cfg,
  state,
  { req }
) => {
  const {
    x_field,
    x_values: xValuesRaw,
    x_label,
    y_field,
    y_values: yValuesRaw,
    y_label,
    card_title_field,
    card_subtitle_field,
    show_view,
    min_role,
  } = cfg || {};

  if (!x_field || !xValuesRaw || !y_field || !yValuesRaw) {
    return div(
      { class: "alert alert-warning" },
      "FlowMatrix: x_field, x_values, y_field, and y_values are all required."
    );
  }

  const xVals = xValuesRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const yVals = yValuesRaw.split(",").map((s) => s.trim()).filter(Boolean);

  const Table = scTable();
  const { stateFieldsToWhere, stateFieldsToQuery } = scHelper();
  const table = Table.findOne({ id: parseInt(table_id, 10) });
  const pk_name = table.pk_name;
  const fields = table.getFields();

  const where = stateFieldsToWhere({ fields, state, table });
  const q = stateFieldsToQuery({ state, fields });
  const rows = await table.getRows(where, {
    ...q,
    forUser: req.user,
    forPublic: !req.user,
  });

  const role = req.user ? req.user.role_id : 100;
  const canDrag = role <= parseInt(min_role || "80", 10);

  // ── group rows into cells: key = "x__y" ────────────────────────────────────
  const cells = {};
  for (const xv of xVals)
    for (const yv of yVals)
      cells[`${xv}__${yv}`] = [];

  for (const row of rows) {
    const xv = String(row[x_field] ?? "");
    const yv = String(row[y_field] ?? "");
    const key = `${xv}__${yv}`;
    if (cells[key] !== undefined) cells[key].push(row);
  }

  // ── card HTML ───────────────────────────────────────────────────────────────
  const cardHtml = (row) => {
    const title = escHtml(String(row[card_title_field] ?? row[pk_name]));
    const subtitle =
      card_subtitle_field && row[card_subtitle_field] != null
        ? small({ class: "text-muted d-block mt-1" }, text(String(row[card_subtitle_field])))
        : "";

    const cardBody = div(
      { class: "card-body p-2" },
      span({ class: "fw-semibold sc-flowmatrix-title" }, title),
      subtitle
    );

    const attrs = {
      class: "card sc-flowmatrix-card mb-1" + (canDrag ? " sc-flowmatrix-draggable" : ""),
      "data-id": String(row[pk_name]),
      "data-x": String(row[x_field] ?? ""),
      "data-y": String(row[y_field] ?? ""),
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

  // ── build grid ──────────────────────────────────────────────────────────────
  const numCols = xVals.length;

  // X axis header row
  const xHeader = div(
    { class: "sc-flowmatrix-x-header" },
    div({ class: "sc-flowmatrix-corner" }, ""),
    ...xVals.map((xv) =>
      div(
        { class: "sc-flowmatrix-x-label text-center fw-semibold py-1 border-bottom" },
        text(xv)
      )
    )
  );

  // Y axis label (rotated, shown above the row labels column)
  const yAxisLabel = y_label
    ? div({ class: "sc-flowmatrix-y-axis-label text-muted small" }, text(y_label))
    : "";

  // Matrix rows
  const matrixRows = yVals.map((yv) =>
    div(
      { class: "sc-flowmatrix-row" },
      div(
        { class: "sc-flowmatrix-y-label fw-semibold d-flex align-items-center justify-content-end pe-2 text-end" },
        text(yv)
      ),
      ...xVals.map((xv) =>
        div(
          {
            class: "sc-flowmatrix-cell p-2",
            "data-x": xv,
            "data-y": yv,
            "data-viewname": viewname,
          },
          ...(cells[`${xv}__${yv}`] || []).map(cardHtml)
        )
      )
    )
  );

  const matrixId = `sc-flowmatrix-${viewname.replace(/\W/g, "_")}`;

  const xAxisHeader = x_label
    ? div(
        { class: "sc-flowmatrix-x-axis-label text-muted small text-center mb-1" },
        text(x_label)
      )
    : "";

  const boardHtml = div(
    { class: "sc-flowmatrix-wrapper" },
    xAxisHeader,
    div(
      {
        class: "sc-flowmatrix-board",
        id: matrixId,
        style: `--sc-matrix-cols: ${numCols}`,
      },
      xHeader,
      ...matrixRows
    )
  );

  if (!canDrag) return boardHtml;

  // ── drag script ─────────────────────────────────────────────────────────────
  const dragScript = script(
    domReady(`
(function() {
  var board = document.getElementById(${JSON.stringify(matrixId)});
  if (!board) return;

  board.querySelectorAll('.sc-flowmatrix-cell').forEach(function(cell) {
    new Sortable(cell, {
      group: ${JSON.stringify(matrixId)},
      animation: 150,
      ghostClass: 'sc-flowmatrix-ghost',
      onEnd: function(evt) {
        var id = evt.item.getAttribute('data-id');
        var newX = evt.to.getAttribute('data-x');
        var newY = evt.to.getAttribute('data-y');
        var vn = evt.to.getAttribute('data-viewname');
        if (!id || newX === null || newY === null || !vn) return;

        evt.item.setAttribute('data-x', newX);
        evt.item.setAttribute('data-y', newY);

        fetch('/view/' + vn + '/move_card', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': _sc_get_csrf_token(),
          },
          body: JSON.stringify({ id: id, x: newX, y: newY }),
        })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.error) {
              notifyAlert({ type: 'danger', text: data.error });
              location.reload();
            }
          })
          .catch(function() { location.reload(); });
      },
    });
  });
})();
`)
  );

  return boardHtml + dragScript;
};

// ─── route: move_card ─────────────────────────────────────────────────────────

const move_card = async (
  table_id,
  _vn,
  { x_field, y_field, min_role },
  body,
  { req }
) => {
  const role = req.user ? req.user.role_id : 100;
  if (role > parseInt(min_role || "80", 10))
    return { json: { error: "Not authorized" } };

  const { id, x, y } = body;
  if (!id || x === undefined || y === undefined)
    return { json: { error: "Missing id, x, or y" } };

  const table = scTable().findOne({ id: parseInt(table_id, 10) });
  try {
    await table.updateRow(
      { [x_field]: x, [y_field]: y },
      parseInt(id, 10),
      req.user
    );
    return { json: { success: true } };
  } catch (e) {
    return { json: { error: e.message || "Move failed" } };
  }
};

// ─── export ───────────────────────────────────────────────────────────────────

module.exports = {
  name: "FlowMatrix",
  description:
    "2D drag-and-drop matrix — map two fields to X/Y axes; dropping a card into a cell updates both fields simultaneously. Classic use: Eisenhower priority matrix (urgency × importance).",
  configuration_workflow,
  run,
  get_state_fields,
  routes: { move_card },
  getStringsForI18n() { return []; },
};
