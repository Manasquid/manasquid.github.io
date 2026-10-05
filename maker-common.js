// Shared helpers for the character sheet maker (index.html) and the monster
// stat block maker (monster.html). Loaded before character.js / monster.js;
// these bindings are intentionally global so both page scripts can use them.

const saveStatus = document.querySelector("#save-status");

const setStatus = (message) => {
  saveStatus.textContent = message;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => { saveStatus.textContent = ""; }, 1800);
};

const baseAbilityOptions = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

const applyTheme = (themeName) => {
  const validThemes = new Set(["streetlamp", "ember", "depths", "starlight", "monochrome", "office", "void", "venom", "parchment", "radiation", "neontech", "sunset", "moonwalk", "beeswax", "rosethorn", "teapot", "forge", "sharp"]);
  const theme = validThemes.has(themeName) ? themeName : "office";
  document.body.dataset.theme = theme;
};

const applyModifierColor = (modifierColor, target = "character") => {
  const validColors = new Set(["default", "red", "Scarlet", "Orange", "Amber", "Yellow", "Lime", "Green", "Turquoise", "Cyan", "Blue", "Purple", "Rose", "Maroon"]);
  const color = validColors.has(modifierColor) ? modifierColor : "default";
  if (color === "default") delete document.body.dataset.modifierColor;
  else document.body.dataset.modifierColor = color;
  const modifierSelect = document.querySelector(target === "monster" ? '[name="monster-modifier-color"]' : '[name="modifier-color"]');
  if (modifierSelect) modifierSelect.value = color;
};

const composeDamage = (dice, bonus) => {
  const d = String(dice || "").trim();
  const b = String(bonus || "").trim();
  if (!d) return b;
  if (!b) return d;
  return `${d} ${b[0]} ${b.slice(1)}`;
};

const encodeSheet = (data) => {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary);
};

const decodeSheet = (encoded) => {
  const binary = window.atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

const pdfEscape = (value) => String(value)
  .replace(/[—–]/g, "-")
  .replace(/·/g, "/")
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, "\"")
  .replace(/…/g, "...")
  .replace(/×/g, "x")
  .replace(/[^\x20-\x7E]/g, "")
  .replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const downloadFile = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// --- Scrap sheet (kept in this browser only) ---
const scrapToggle = document.querySelector("#scrap-toggle");
const scrapPanel = document.querySelector("#scrap-panel");
const scrapNotes = document.querySelector("#scrap-notes");
const scrapKey = "manasquid.scrap-notes";

const positionScrapPanel = () => {
  if (scrapPanel.hidden) return;
  scrapPanel.style.top = `${document.querySelector(".topbar").getBoundingClientRect().bottom + 10}px`;
};
scrapToggle.addEventListener("click", () => {
  scrapPanel.hidden = !scrapPanel.hidden;
  scrapToggle.setAttribute("aria-expanded", String(!scrapPanel.hidden));
  positionScrapPanel();
  if (!scrapPanel.hidden) scrapNotes.focus();
});
scrapNotes.addEventListener("input", () => {
  try { localStorage.setItem(scrapKey, scrapNotes.value); } catch { setStatus("Browser storage unavailable"); }
});
window.addEventListener("resize", positionScrapPanel);
