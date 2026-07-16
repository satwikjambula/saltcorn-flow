const { scTable, scField, scForm, scWorkflow, scHelper } = require("./_resolve");
const {
  div,
  span,
  small,
  a,
  button,
  script,
  domReady,
  text,
} = require("@saltcorn/markup/tags");

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseZones(cfg) {
  const names = (cfg.zones || "").split(",").map((s) => s.trim()).filter(Boolean);
  const labels = (cfg.zone_labels || "").split(",").map((s) => s.trim());
  const colors = (cfg.zone_colors || "").split(",").map((s) => s.trim());
  const maxArr = (cfg.zone_max || "").split(",").map((s) => parseInt(s.trim(), 10) || 0);

  return names.map((name, i) => ({
    name,
    label: labels[i] || name,
    color: colors[i] || "secondary",
    max: maxArr[i] || 0,
  }));
}

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
        name: req.__("Zone settings"),
        form: async (context) => {
          const Table = scTable();
          const View = scView();
          const Form = scForm();
          const table = Table.findOne({ id: parseInt(context.table_id, 10) });
          const fields = table.getFields();
          const allFields = fields.filter((f) => !f.primary_key);
          const stringIntFields = allFields.filter(
            (f) => f.type?.name === "String" || f.type?.name === "Integer"
          );

          const show_views = await View.find_table_views_where(
            context.table_id,
            ({ state_fields, viewrow }) =>
              viewrow.name !== context.viewname &&
              state_fields.some((sf) => sf.name === "id")
          );

          return new Form({
            fields: [
              {
                name: "container_field",
                label: req.__("Container field"),
                sublabel: req.__(
                  "The field updated when an item is dropped into a zone (String or Integer)"
                ),
                type: "String",
                required: true,
                attributes: { options: stringIntFields.map((f) => f.name) },
              },
              {
                name: "zones",
                label: req.__("Zone names"),
                sublabel: req.__(
                  "Comma-separated zone identifiers — these are the values written to the container field, e.g. wishlist,cart,purchased"
                ),
                type: "String",
                required: true,
              },
              {
                name: "zone_labels",
                label: req.__("Zone display labels"),
                sublabel: req.__(
                  "Optional comma-separated display names (same order as zones). Defaults to zone names."
                ),
                type: "String",
                required: false,
              },
              {
                name: "zone_colors",
                label: req.__("Zone colors"),
                sublabel: req.__(
                  "Optional comma-separated Bootstrap colors per zone: primary, success, warning, danger, info, secondary"
                ),
                type: "String",
                required: false,
              },
              {
                name: "zone_max",
                label: req.__("Max items per zone"),
                sublabel: req.__(
                  "Optional comma-separated max item counts per zone (0 = unlimited), e.g. 0,5,1"
                ),
                type: "String",
                required: false,
              },
              {
                name: "card_title_field",
                label: req.__("Card title field"),
                sublabel: req.__("Field shown as the item label on each card"),
                type: "String",
                required: true,
                attributes: { options: allFields.map((f) => f.name) },
              },
              {
                name: "card_subtitle_field",
                label: req.__("Card subtitle field"),
                sublabel: req.__("Optional second field shown below the title"),
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
                name: "show_unassigned",
                label: req.__("Show unassigned bin"),
                sublabel: req.__(
                  "Show items with no container value in an Unassigned zone at the top"
                ),
                type: "Bool",
                required: false,
              },
              {
                name: "min_role",
                label: req.__("Minimum role to drag items"),
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
              {
                name: "submit_zones",
                label: req.__("Zones with a Submit button"),
                sublabel: req.__(
                  "Comma-separated zone names — each listed zone gets a Submit button in its header. Leave blank to disable."
                ),
                type: "String",
                required: false,
              },
              {
                name: "submit_label",
                label: req.__("Submit button label"),
                sublabel: req.__('Text shown on each Submit button (default: "Submit")'),
                type: "String",
                required: false,
              },
              {
                name: "submit_action_name",
                label: req.__("Submit trigger name"),
                sublabel: req.__(
                  'Saltcorn trigger "When" name fired on submit. Create a Custom trigger on this table with a matching "When" value — it receives { zone, rows, count }. Leave blank to return rows as JSON only.'
                ),
                type: "String",
                required: false,
              },
              {
                name: "submit_min_role",
                label: req.__("Minimum role to submit"),
                sublabel: req.__("Lowest role that can click Submit (defaults to same as drag role)"),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { label: req.__("(same as drag role)"), value: "" },
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
    container_field,
    zones: zonesRaw,
    card_title_field,
    card_subtitle_field,
    show_view,
    show_unassigned,
    min_role,
    submit_zones: submitZonesRaw,
    submit_label,
    submit_action_name,
    submit_min_role,
  } = cfg || {};

  if (!container_field || !zonesRaw) {
    return div(
      { class: "alert alert-warning" },
      "FlowZone: container_field and zones are required."
    );
  }

  const zones = parseZones(cfg);
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
  const canSubmit = role <= parseInt(submit_min_role || min_role || "80", 10);

  const submitZoneSet = new Set(
    (submitZonesRaw || "").split(",").map((s) => s.trim()).filter(Boolean)
  );
  const hasSubmitZones = submitZoneSet.size > 0;

  // ── group rows by container value ───────────────────────────────────────────
  const grouped = {};
  for (const z of zones) grouped[z.name] = [];
  const unassigned = [];

  for (const row of rows) {
    const val = String(row[container_field] ?? "");
    if (grouped[val] !== undefined) {
      grouped[val].push(row);
    } else {
      unassigned.push(row);
    }
  }

  // ── card HTML ───────────────────────────────────────────────────────────────
  const cardHtml = (row) => {
    const title = escHtml(String(row[card_title_field] ?? row[pk_name]));
    const subtitle =
      card_subtitle_field && row[card_subtitle_field] != null
        ? small(
            { class: "text-muted d-block mt-1" },
            text(String(row[card_subtitle_field]))
          )
        : "";

    const cardBody = div({ class: "card-body p-2" },
      span({ class: "sc-flowzone-title fw-semibold" }, title),
      subtitle
    );

    const cardAttrs = {
      class:
        "card sc-flowzone-item mb-2" +
        (canDrag ? " sc-flowzone-draggable" : ""),
      "data-id": String(row[pk_name]),
      "data-container": String(row[container_field] ?? ""),
    };

    if (show_view) {
      return div(
        cardAttrs,
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

    return div(cardAttrs, cardBody);
  };

  // ── zone panel HTML ─────────────────────────────────────────────────────────
  const zoneHtml = (zone, items) => {
    const maxAttr = zone.max > 0 ? { "data-max": String(zone.max) } : {};
    const maxLabel =
      zone.max > 0
        ? span({ class: "sc-flowzone-max-label small opacity-75" }, `max ${zone.max}`)
        : "";

    const submitBtn =
      hasSubmitZones && submitZoneSet.has(zone.name) && canSubmit
        ? button(
            {
              class: "btn btn-sm btn-light sc-flowzone-submit-btn py-0 px-2",
              "data-zone": zone.name,
              "data-viewname": viewname,
              title: req.__("Submit zone contents to server"),
            },
            text(submit_label || "Submit")
          )
        : "";

    return div(
      { class: "sc-flowzone-panel card" },
      div(
        {
          class: `card-header sc-flowzone-header bg-${zone.color} text-white d-flex justify-content-between align-items-center`,
        },
        span({ class: "fw-semibold" }, text(zone.label)),
        div(
          { class: "d-flex align-items-center gap-2" },
          maxLabel,
          span(
            { class: "badge bg-white text-dark sc-flowzone-count" },
            String(items.length)
          ),
          submitBtn
        )
      ),
      div(
        {
          class: "sc-flowzone-drop-area p-2",
          "data-zone": zone.name,
          "data-viewname": viewname,
          ...maxAttr,
        },
        ...items.map(cardHtml)
      )
    );
  };

  // ── unassigned bin ──────────────────────────────────────────────────────────
  const unassignedHtml = show_unassigned
    ? div(
        { class: "sc-flowzone-panel sc-flowzone-unassigned card" },
        div(
          {
            class:
              "card-header sc-flowzone-header bg-light d-flex justify-content-between align-items-center",
          },
          span({ class: "fw-semibold text-muted" }, "Unassigned"),
          span(
            { class: "badge bg-secondary sc-flowzone-count" },
            String(unassigned.length)
          )
        ),
        div(
          {
            class: "sc-flowzone-drop-area p-2",
            "data-zone": "",
            "data-viewname": viewname,
          },
          ...unassigned.map(cardHtml)
        )
      )
    : "";

  const boardId = `sc-flowzone-${viewname.replace(/\W/g, "_")}`;

  const boardHtml = div(
    { class: "sc-flowzone-board", id: boardId },
    unassignedHtml,
    div(
      { class: "sc-flowzone-grid" },
      ...zones.map((z) => zoneHtml(z, grouped[z.name] || []))
    )
  );

  if (!canDrag && !(hasSubmitZones && canSubmit)) return boardHtml;

  // ── interaction script ───────────────────────────────────────────────────────
  const interactionScript = script(
    domReady(`
(function() {
  var board = document.getElementById(${JSON.stringify(boardId)});
  if (!board) return;

  ${canDrag ? `
  board.querySelectorAll('.sc-flowzone-drop-area').forEach(function(area) {
    new Sortable(area, {
      group: ${JSON.stringify(boardId)},
      animation: 150,
      ghostClass: 'sc-flowzone-ghost',
      onMove: function(evt) {
        var target = evt.to;
        var max = parseInt(target.getAttribute('data-max') || '0', 10);
        if (max > 0) {
          var count = target.querySelectorAll('.sc-flowzone-item').length;
          if (count >= max) {
            notifyAlert({ type: 'warning', text: 'Zone is full (max ' + max + ' items)' });
            return false;
          }
        }
        return true;
      },
      onEnd: function(evt) {
        var id = evt.item.getAttribute('data-id');
        var newZone = evt.to.getAttribute('data-zone');
        var vn = evt.to.getAttribute('data-viewname');
        if (id === null || newZone === null || !vn) return;

        // update count badges
        [evt.from, evt.to].forEach(function(area) {
          var panel = area.closest('.sc-flowzone-panel');
          if (panel) {
            panel.querySelector('.sc-flowzone-count').textContent =
              area.querySelectorAll('.sc-flowzone-item').length;
          }
        });

        fetch('/view/' + vn + '/drop_item', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': _sc_get_csrf_token(),
          },
          body: JSON.stringify({ id: id, zone: newZone }),
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
  ` : ""}

  ${hasSubmitZones && canSubmit ? `
  board.querySelectorAll('.sc-flowzone-submit-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var zone = btn.getAttribute('data-zone');
      var vn = btn.getAttribute('data-viewname');
      var origText = btn.textContent.trim();
      btn.disabled = true;
      btn.textContent = '…';
      fetch('/view/' + vn + '/submit_zone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': _sc_get_csrf_token(),
        },
        body: JSON.stringify({ zone: zone }),
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          btn.disabled = false;
          btn.textContent = origText;
          if (data.error) {
            notifyAlert({ type: 'danger', text: data.error });
          } else {
            notifyAlert({ type: 'success', text: origText + ': ' + data.count + ' item(s) submitted' });
          }
        })
        .catch(function() {
          btn.disabled = false;
          btn.textContent = origText;
          notifyAlert({ type: 'danger', text: 'Submit failed' });
        });
    });
  });
  ` : ""}
})();
`)
  );

  return boardHtml + interactionScript;
};

// ─── route: drop_item ─────────────────────────────────────────────────────────

const drop_item = async (
  table_id,
  _vn,
  { container_field, zones: zonesRaw, zone_max, min_role },
  body,
  { req }
) => {
  const role = req.user ? req.user.role_id : 100;
  if (role > parseInt(min_role || "80", 10))
    return { json: { error: "Not authorized" } };

  const { id, zone } = body;
  if (id === undefined || zone === undefined)
    return { json: { error: "Missing id or zone" } };

  const table = scTable().findOne({ id: parseInt(table_id, 10) });

  // server-side max validation
  if (zone && zonesRaw && zone_max) {
    const zoneNames = zonesRaw.split(",").map((s) => s.trim());
    const maxArr = zone_max.split(",").map((s) => parseInt(s.trim(), 10) || 0);
    const zoneIdx = zoneNames.indexOf(zone);
    if (zoneIdx >= 0 && maxArr[zoneIdx] > 0) {
      const count = await table.countRows({ [container_field]: zone });
      if (count >= maxArr[zoneIdx])
        return {
          json: { error: `Zone is full (max ${maxArr[zoneIdx]} items)` },
        };
    }
  }

  try {
    const parsedId = parseInt(id, 10);
    const oldRow = await table.getRow({ id: parsedId });
    await table.updateRow(
      { [container_field]: zone || null },
      parsedId,
      req.user
    );
    // Fire standard Saltcorn update triggers — builders hook business rules here
    const newRow = { ...oldRow, [container_field]: zone || null };
    if (typeof table.runTriggers === "function") {
      await table.runTriggers("Update", newRow, oldRow, req.user);
    }
    return { json: { success: true } };
  } catch (e) {
    return { json: { error: e.message || "Drop failed" } };
  }
};

// ─── route: submit_zone ───────────────────────────────────────────────────────

const submit_zone = async (
  table_id,
  _vn,
  { container_field, submit_action_name, submit_min_role, min_role },
  body,
  { req }
) => {
  const role = req.user ? req.user.role_id : 100;
  if (role > parseInt(submit_min_role || min_role || "80", 10))
    return { json: { error: "Not authorized" } };

  const { zone } = body;
  if (zone === undefined || zone === null)
    return { json: { error: "Missing zone" } };

  const table = scTable().findOne({ id: parseInt(table_id, 10) });

  // empty string means the unassigned bin — query for null container value
  const zoneFilter =
    zone === "" ? { [container_field]: null } : { [container_field]: zone };

  const rows = await table.getRows(zoneFilter, {
    forUser: req.user,
    forPublic: !req.user,
  });

  if (submit_action_name && typeof table.runTriggers === "function") {
    await table.runTriggers(
      submit_action_name,
      { zone, rows, count: rows.length },
      null,
      req.user
    );
  }

  return { json: { success: true, zone, count: rows.length, rows } };
};

// ─── export ───────────────────────────────────────────────────────────────────

module.exports = {
  name: "FlowZone",
  description:
    "Drag-and-drop zone containers — arrange items across named zones with optional max-item limits. Fires Saltcorn update triggers on drop so builders can attach business rules (award badges, update scores, send notifications) without custom code.",
  configuration_workflow,
  run,
  get_state_fields,
  routes: { drop_item, submit_zone },
  getStringsForI18n() {
    return [];
  },
};
