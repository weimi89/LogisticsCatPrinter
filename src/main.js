const { invoke } = window.__TAURI__.tauri;
const { open: openDialog } = window.__TAURI__.dialog;

const PRINT_KEYS = ["port", "size", "cmd", "org", "retry", "retryIntv"];

const el = (id) => document.getElementById(id);
const state = {
  path: null,
  config: null,
};

function setMsg(text, kind = "info") {
  const m = el("msg");
  m.textContent = text || "";
  m.className = "msg " + (kind || "");
}

function openFilePicker() {
  return openDialog({
    title: "選擇 gkconfig.json",
    multiple: false,
    directory: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
}

async function loadConfig(path) {
  try {
    setMsg("讀取中…", "info");
    const data = await invoke("read_config", { path });
    state.path = path;
    state.config = data;
    await invoke("set_last_path", { path });
    el("pathLabel").textContent = path;
    el("btnReload").disabled = false;
    renderEditor();
    setMsg("已載入", "ok");
  } catch (e) {
    setMsg("載入失敗: " + e, "error");
  }
}

function renderEditor() {
  const cfg = state.config || {};
  el("editor").classList.remove("hidden");
  el("multi7").value = cfg.multi7 ?? "";
  el("apiurl").value = cfg.apiurl ?? "";
  renderGkTable(cfg.gk || {});
  refreshPreview();
}

function renderGkTable(gk) {
  const tbody = el("gkBody");
  tbody.innerHTML = "";
  Object.keys(gk).forEach((key) => {
    tbody.appendChild(buildRow(key, gk[key]));
  });
}

function parseSize(s) {
  if (s == null) return { w: 100, h: 150 };
  const m = String(s).match(/(-?\d+(?:\.\d+)?)\s*(?:mm)?\s*,\s*(-?\d+(?:\.\d+)?)\s*(?:mm)?/);
  if (m) return { w: parseFloat(m[1]), h: parseFloat(m[2]) };
  return { w: 100, h: 150 };
}

function parseOrg(s) {
  if (s == null) return { x: 0, y: 0 };
  const parts = String(s).split(",").map((x) => parseFloat(x.trim()));
  return {
    x: Number.isFinite(parts[0]) ? parts[0] : 0,
    y: Number.isFinite(parts[1]) ? parts[1] : 0,
  };
}

function buildRow(key, item) {
  const tmpl = el("gkRowTmpl");
  const node = tmpl.content.firstElementChild.cloneNode(true);
  const q = (sel) => node.querySelector(sel);
  q(".f-key").value = key ?? "";
  q(".f-chute").value = item?.chute ?? "";
  q(".f-gkcid").value = item?.gkcid ?? "";
  const p = item?.print || {};
  q(".f-port").value = p.port ?? "";
  const sz = parseSize(p.size);
  q(".f-sizeW").value = sz.w;
  q(".f-sizeH").value = sz.h;
  q(".f-cmd").value = p.cmd ?? "";
  const og = parseOrg(p.org);
  q(".f-orgX").value = og.x;
  q(".f-orgY").value = og.y;
  q(".f-retry").value = p.retry ?? 30;
  q(".f-retryIntv").value = p.retryIntv ?? 200;

  q(".btn-del").addEventListener("click", () => {
    node.remove();
    refreshPreview();
  });
  return node;
}

function collectRow(row) {
  const q = (sel) => row.querySelector(sel);
  const w = q(".f-sizeW").value;
  const h = q(".f-sizeH").value;
  const ox = q(".f-orgX").value;
  const oy = q(".f-orgY").value;
  return {
    chute: q(".f-chute").value,
    gkcid: q(".f-gkcid").value,
    print: {
      port: q(".f-port").value,
      size: `${w}mm, ${h}mm`,
      cmd: q(".f-cmd").value,
      org: `${ox},${oy}`,
      retry: toInt(q(".f-retry").value, 30),
      retryIntv: toInt(q(".f-retryIntv").value, 200),
    },
  };
}

function collectGk() {
  const rows = el("gkBody").querySelectorAll("tr");
  const gk = {};
  const errors = [];
  rows.forEach((row, idx) => {
    const key = row.querySelector(".f-key").value.trim();
    if (!key) {
      errors.push(`第 ${idx + 1} 列缺少代號`);
      return;
    }
    if (gk[key]) {
      errors.push(`第 ${idx + 1} 列代號 "${key}" 重複`);
      return;
    }
    gk[key] = collectRow(row);
  });
  return { gk, errors };
}

function collectConfig() {
  const { gk, errors } = collectGk();
  const cfg = {
    ...(state.config || {}),
    multi7: toInt(el("multi7").value, state.config?.multi7 ?? 1),
    apiurl: el("apiurl").value,
    gk,
  };
  return { cfg, errors };
}

function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function refreshPreview() {
  const { cfg, errors } = collectConfig();
  const previewEl = el("preview");
  try {
    previewEl.textContent = JSON.stringify(cfg, null, 2);
  } catch (e) {
    previewEl.textContent = "(序列化失敗)";
  }
  if (errors.length) {
    setMsg("注意: " + errors.join("; "), "error");
  }
}

async function onSave() {
  if (!state.path) {
    setMsg("尚未選擇檔案", "error");
    return;
  }
  const { cfg, errors } = collectConfig();
  if (errors.length) {
    setMsg("無法儲存: " + errors.join("; "), "error");
    return;
  }
  const btn = el("btnSave");
  btn.disabled = true;
  try {
    setMsg("寫入檔案…", "info");
    await invoke("write_config", { path: state.path, data: cfg });
    state.config = cfg;
    setMsg("已儲存 ✓", "ok");
  } catch (e) {
    setMsg(String(e), "error");
  } finally {
    btn.disabled = false;
  }
}

async function onRestart() {
  if (!state.path) {
    setMsg("尚未選擇檔案,無法定位 c4000.sh", "error");
    return;
  }
  const btn = el("btnRestart");
  btn.disabled = true;
  try {
    setMsg("正在重啟設備…", "info");
    const out = await invoke("restart_service", { configPath: state.path });
    setMsg("已重啟設備 ✓  " + (out || ""), "ok");
  } catch (e) {
    setMsg(String(e), "error");
  } finally {
    btn.disabled = false;
  }
}

async function onPick() {
  try {
    const picked = await openFilePicker();
    if (!picked) return;
    const path = typeof picked === "string" ? picked : picked.path;
    await loadConfig(path);
  } catch (e) {
    setMsg("選檔失敗: " + e, "error");
  }
}

async function onReload() {
  if (state.path) await loadConfig(state.path);
}

function onAddGk() {
  const row = buildRow("NEW", {
    chute: "",
    gkcid: "",
    print: {
      port: "",
      size: "100mm, 150mm",
      cmd: "DENSITY 15",
      org: "0,0",
      retry: 30,
      retryIntv: 200,
    },
  });
  el("gkBody").appendChild(row);
  row.querySelector(".f-key").focus();
  refreshPreview();
}

async function init() {
  el("btnPick").addEventListener("click", onPick);
  el("btnReload").addEventListener("click", onReload);
  el("btnAddGk").addEventListener("click", onAddGk);
  el("btnSave").addEventListener("click", onSave);
  el("btnRestart").addEventListener("click", onRestart);

  ["multi7", "apiurl"].forEach((id) => {
    el(id).addEventListener("input", refreshPreview);
  });
  el("gkBody").addEventListener("input", refreshPreview);

  try {
    const last = await invoke("get_last_path");
    if (last) {
      await loadConfig(last);
    }
  } catch (e) {
    console.warn("get_last_path failed:", e);
  }
}

init();
