// Monster stat block maker (monster.html). Requires maker-common.js to be loaded first.
(() => {
  const monsterSheet = document.querySelector("#monster-sheet");
  const monsterEntryLists = [...document.querySelectorAll("[data-monster-group]")];
  const npcToggle = document.querySelector('[name="npc"]');
  const npcPanel = document.querySelector("#npc-details");
  const monsterSpellToggle = document.querySelector('[name="monster-spellcaster"]');
  const monsterSpellcastingPanel = document.querySelector("#monster-spellcasting");
  const monsterAtwillList = document.querySelector("[data-monster-atwill-list]");
  const monsterPerDayList = document.querySelector("#monster-per-day-list");
  const monsterSpellTemplate = document.querySelector("#monster-spell-template");
  const monsterPerDayTemplate = document.querySelector("#monster-per-day-template");
  const monsterDraftKey = "manasquid.monster-draft";
  const monsterSheetsKey = "manasquid.monster-sheets";

  const persistMonsterDraft = () => {
    try { localStorage.setItem(monsterDraftKey, JSON.stringify(collectMonster())); } catch { setStatus("Browser storage unavailable"); }
  };

  const collectMonster = () => ({
    version: 1,
    theme: document.querySelector('[name="monster-theme"]').value,
    modifierColor: document.querySelector('[name="monster-modifier-color"]').value,
    npcEnabled: npcToggle.checked,
    spellcastingEnabled: monsterSpellToggle?.checked === true,
    spellcasting: collectMonsterSpellcasting(),
    fields: Object.fromEntries([...monsterSheet.querySelectorAll("[name]")].map((input) => [input.name, input.type === "checkbox" ? (input.checked ? "on" : "") : input.value])),
    customAbilities: monsterCustomRows().map((row) => ({
      abbr: row.querySelector(".custom-ability-abbr").value,
      value: row.querySelector(".custom-ability-score").value,
      saveProficient: row.querySelector(".custom-ability-save").checked
    })),
    entries: monsterEntryData.map((entry) => ({ ...entry }))
  });

  const monsterCrData = [
    ["0", "0 or 10"], ["1/8", "25"], ["1/4", "50"], ["1/2", "100"],
    ["1", "200"], ["2", "450"], ["3", "700"], ["4", "1,100"], ["5", "1,800"],
    ["6", "2,300"], ["7", "2,900"], ["8", "3,900"], ["9", "5,000"], ["10", "5,900"],
    ["11", "7,200"], ["12", "8,400"], ["13", "10,000"], ["14", "11,500"], ["15", "13,000"],
    ["16", "15,000"], ["17", "18,000"], ["18", "20,000"], ["19", "22,000"], ["20", "25,000"],
    ["21", "33,000"], ["22", "41,000"], ["23", "50,000"], ["24", "62,000"], ["25", "75,000"],
    ["26", "90,000"], ["27", "105,000"], ["28", "120,000"], ["29", "135,000"], ["30", "155,000"]
  ];
  const monsterCrSelect = document.querySelector('[name="monster-cr"]');
  monsterCrData.forEach(([cr]) => {
    const option = document.createElement("option");
    option.value = cr;
    option.textContent = `CR ${cr}`;
    monsterCrSelect.appendChild(option);
  });

  let monsterEntryData = [];
  let editingMonsterEntryIndex = null;
  const monsterEntryEditor = document.querySelector("#monster-entry-editor");
  const monsterEntryEditorGroup = document.querySelector("#monster-entry-editor-group");
  const monsterEntryEditorName = document.querySelector("#monster-entry-editor-name");
  const monsterEntryEditorRecharge = document.querySelector("#monster-entry-editor-recharge");
  const monsterEntryEditorAttack = document.querySelector("#monster-entry-editor-attack");
  const monsterEntryEditorDescription = document.querySelector("#monster-entry-editor-description");
  const monsterEntryEditorAttackFields = document.querySelector("#monster-entry-editor-attack-fields");
  const monsterEntryEditorKind = document.querySelector("#monster-entry-editor-kind");
  const monsterEntryEditorAbility = document.querySelector("#monster-entry-editor-ability");
  const monsterEntryEditorBonus = document.querySelector("#monster-entry-editor-bonus");
  const monsterEntryEditorDamage = document.querySelector("#monster-entry-editor-damage");
  const monsterEntryEditorDamageBonus = document.querySelector("#monster-entry-editor-damage-bonus");
  const monsterEntryEditorDamageType = document.querySelector("#monster-entry-editor-damage-type");
  const monsterEntryEditorRange = document.querySelector("#monster-entry-editor-range");
  const monsterEntryCardTemplate = document.querySelector("#monster-entry-card-template");

  const computeMonsterEntryBonuses = (entry) => {
    const computed = { ...entry, attackBonus: "", attackDamageBonus: "" };
    if (!computed.attack) return computed;
    const modifier = monsterAbilityModifier(computed.attackAbility);
    const proficiency = getMonsterProficiency();
    if (modifier === null) return computed;
    const isSave = computed.attackKind === "save";
    computed.attackBonus = proficiency === null ? "" : isSave ? `${modifier + 8 + proficiency}` : `+${modifier + proficiency}`;
    computed.attackDamageBonus = isSave ? "" : `${modifier >= 0 ? "+" : ""}${modifier}`;
    return computed;
  };

  const updateMonsterEntryCard = (card, entry) => {
    const recharge = String(entry.recharge || "").trim();
    card.querySelector(".monster-entry-card-title").textContent = `${entry.name || "Untitled"}${recharge ? ` (Recharge ${recharge})` : ""}`;
    card.querySelector(".monster-entry-card-description").textContent = entry.description || "No description added.";
    const attackTag = card.querySelector(".monster-entry-card-attack-tag");
    attackTag.hidden = !entry.attack;
    if (entry.attack) attackTag.textContent = `${entry.attackKind === "save" ? "Saving throw" : "Attack"} · ${entry.attackAbility}`;
    const detailsTag = card.querySelector(".monster-entry-card-details");
    const details = [];
    if (entry.attack) {
      if (entry.attackBonus) details.push(entry.attackKind === "save" ? `DC ${entry.attackBonus}` : `${entry.attackBonus} to hit`);
      const damage = composeDamage(entry.attackDamage, entry.attackDamageBonus === "+0" ? "" : entry.attackDamageBonus).trim();
      const damageType = String(entry.attackDamageType || "").trim();
      if (damage) details.push(damageType ? `${damage} ${damageType}` : damage);
      if (entry.attackRange) details.push(String(entry.attackRange).trim());
    }
    detailsTag.hidden = details.length === 0;
    detailsTag.textContent = details.join(" · ");
  };

  const renderMonsterEntryCards = () => {
    monsterEntryLists.forEach((list) => list.replaceChildren());
    monsterEntryData.forEach((entry, index) => {
      const list = document.querySelector(`[data-monster-group="${entry.group}"]`);
      if (!list) return;
      const fragment = monsterEntryCardTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".monster-entry-card");
      updateMonsterEntryCard(card, entry);
      card.querySelector(".edit-monster-entry-card").addEventListener("click", () => openMonsterEntryEditor(index));
      card.querySelector(".remove-monster-entry-card").addEventListener("click", () => {
        monsterEntryData.splice(index, 1);
        renderMonsterEntryCards();
        updateMonsterAttackReference();
        persistMonsterDraft();
        setStatus("Entry removed");
      });
      list.appendChild(fragment);
    });
    monsterEntryLists.forEach((list) => { list.closest(".monster-entry-group").hidden = list.children.length === 0; });
    const monsterEntryEmpty = document.querySelector("#monster-entry-empty");
    if (monsterEntryEmpty) monsterEntryEmpty.hidden = monsterEntryData.length > 0;
  };

  const refreshMonsterEntryEditor = () => {
    const isTrait = monsterEntryEditorGroup.value === "traits";
    monsterEntryEditorRecharge.closest(".field").hidden = isTrait;
    monsterEntryEditorAttack.closest(".field").hidden = isTrait;
    monsterEntryEditorAttackFields.hidden = isTrait || !monsterEntryEditorAttack.checked;
    if (!monsterEntryEditorAttack.checked) {
      monsterEntryEditorBonus.value = "";
      monsterEntryEditorDamageBonus.value = "";
      return;
    }
    const preview = computeMonsterEntryBonuses({ attack: true, attackKind: monsterEntryEditorKind.value, attackAbility: monsterEntryEditorAbility.value });
    monsterEntryEditorBonus.value = preview.attackBonus;
    monsterEntryEditorDamageBonus.value = preview.attackDamageBonus;
  };

  const openMonsterEntryEditor = (index = null) => {
    editingMonsterEntryIndex = index;
    const entry = index === null ? {} : monsterEntryData[index];
    monsterEntryEditorGroup.value = entry.group || "traits";
    monsterEntryEditorName.value = entry.name || "";
    monsterEntryEditorRecharge.value = entry.recharge || "";
    monsterEntryEditorAttack.checked = Boolean(entry.attack);
    monsterEntryEditorDescription.value = entry.description || "";
    monsterEntryEditorKind.value = entry.attackKind === "save" ? "save" : "attack";
    monsterEntryEditorAbility.value = entry.attackAbility || "STR";
    monsterEntryEditorDamage.value = entry.attackDamage || "";
    monsterEntryEditorDamageType.value = entry.attackDamageType || "";
    monsterEntryEditorRange.value = entry.attackRange || "";
    refreshMonsterAbilitySelectors();
    refreshMonsterEntryEditor();
    monsterEntryEditor.hidden = false;
    monsterEntryEditorName.focus();
  };

  const closeMonsterEntryEditor = () => {
    editingMonsterEntryIndex = null;
    monsterEntryEditor.hidden = true;
  };

  const saveMonsterEntryFromEditor = () => {
    const isTrait = monsterEntryEditorGroup.value === "traits";
    const entry = computeMonsterEntryBonuses({
      group: monsterEntryEditorGroup.value,
      name: monsterEntryEditorName.value.trim() || "Untitled",
      description: monsterEntryEditorDescription.value,
      recharge: isTrait ? "" : monsterEntryEditorRecharge.value.trim(),
      attack: !isTrait && monsterEntryEditorAttack.checked,
      attackKind: monsterEntryEditorKind.value,
      attackAbility: monsterEntryEditorAbility.value,
      attackDamage: monsterEntryEditorDamage.value,
      attackDamageBonus: "",
      attackDamageType: monsterEntryEditorDamageType.value,
      attackRange: monsterEntryEditorRange.value
    });
    const isEdit = editingMonsterEntryIndex !== null;
    if (isEdit) monsterEntryData[editingMonsterEntryIndex] = entry;
    else monsterEntryData.push(entry);
    renderMonsterEntryCards();
    updateMonsterAttackReference();
    closeMonsterEntryEditor();
    persistMonsterDraft();
    setStatus(isEdit ? "Entry updated" : "Entry added");
  };

  const monsterAttackGroupLabels = { "actions": "Action", "bonus-actions": "Bonus action", "reactions": "Reaction", "legendary-actions": "Legendary action" };

  const updateMonsterAttackReference = () => {
    const reference = document.querySelector("#monster-attack-reference");
    if (!reference) return;
    const attacks = monsterEntryData
      .filter((entry) => entry.attack && entry.group !== "traits")
      .map((entry) => {
        const details = [];
        if (entry.attackBonus) details.push(entry.attackKind === "save" ? `DC ${entry.attackBonus}` : `${entry.attackBonus} to hit`);
        const damage = composeDamage(entry.attackDamage, entry.attackDamageBonus).trim();
        const damageType = String(entry.attackDamageType || "").trim();
        if (damage) details.push(damageType ? `${damage} ${damageType}` : damage);
        if (entry.attackRange) details.push(String(entry.attackRange).trim());
        const recharge = String(entry.recharge || "").trim();
        return {
          group: entry.group,
          name: `${String(entry.name || "").trim() || "Untitled attack"}${recharge ? ` (Recharge ${recharge})` : ""}`,
          description: String(entry.description || "").trim(),
          details: details.join(" · ")
        };
      });
    reference.replaceChildren();
    if (!attacks.length) {
      const empty = document.createElement("p");
      empty.className = "monster-attack-empty";
      empty.textContent = "No attacks flagged yet. Mark an action, bonus action, reaction, or legendary action as an attack to pin it here.";
      reference.appendChild(empty);
      return;
    }
    attacks.forEach((attack) => {
      const item = document.createElement("div");
      item.className = "monster-attack-item";
      const head = document.createElement("div");
      head.className = "monster-attack-item-head";
      const name = document.createElement("strong");
      name.textContent = attack.name;
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = monsterAttackGroupLabels[attack.group] || attack.group;
      head.append(name, tag);
      item.append(head);
      if (attack.details) {
        const detailLine = document.createElement("p");
        detailLine.className = "monster-attack-item-details";
        detailLine.textContent = attack.details;
        item.append(detailLine);
      }
      const text = document.createElement("p");
      text.textContent = attack.description || "No description added.";
      item.append(text);
      reference.appendChild(item);
    });
  };

  const updateMonsterHp = () => {
    const hpInput = monsterSheet.querySelector('[name="monster-hp"]');
    if (!hpInput) return;
    const amount = Number(monsterSheet.querySelector('[name="monster-hit-dice"]').value);
    const size = Number(monsterSheet.querySelector('[name="monster-hit-die-size"]').value);
    const bonus = Number(monsterSheet.querySelector('[name="monster-hp-bonus"]').value) || 0;
    hpInput.value = Number.isFinite(amount) && amount > 0 && Number.isFinite(size) && size > 0
      ? String(Math.floor((amount * (size + 1)) / 2) + bonus)
      : "";
  };

  const monsterCrNumber = (cr) => (String(cr).includes("/") ? Number(String(cr).split("/")[0]) / Number(String(cr).split("/")[1]) : Number(cr));

  const getMonsterProficiency = () => {
    const cr = String(monsterCrSelect.value).trim();
    if (!cr) return null;
    const crNumber = monsterCrNumber(cr);
    if (!Number.isFinite(crNumber)) return null;
    return crNumber >= 1 ? Math.min(9, 2 + Math.floor((crNumber - 1) / 4)) : 2;
  };

  const monsterAbilityModifier = (ability) => {
    const key = String(ability || "").trim();
    const scoreInput = monsterSheet.querySelector(`[name="monster-${key.toLowerCase()}"]`);
    const score = Number(scoreInput?.value);
    if (Number.isFinite(score)) return Math.floor((score - 10) / 2);
    const custom = monsterCustomEntries().find((entry) => entry.key === key.toUpperCase());
    return custom ? Math.floor((custom.score - 10) / 2) : null;
  };

  const monsterCustomContainer = monsterSheet.querySelector("[data-monster-custom-abilities]");
  const monsterCustomAbilityTemplate = document.querySelector("#monster-custom-ability-template");
  const monsterCustomRows = () => [...monsterSheet.querySelectorAll("[data-monster-custom-abilities] .custom-ability-row")];
  const monsterCustomKey = (row) => {
    const raw = row.querySelector(".custom-ability-abbr").value.trim().toUpperCase();
    return raw ? raw.slice(0, 3) : "";
  };
  const monsterCustomEntries = () => monsterCustomRows().map((row) => ({ row, key: monsterCustomKey(row), score: Number(row.querySelector(".custom-ability-score").value) || 0 }));
  const refreshMonsterAbilitySelectors = () => {
    const customKeys = [...new Set(monsterCustomEntries().map((entry) => entry.key).filter(Boolean))];
    monsterSheet.querySelectorAll(".monster-attack-ability, [name=\"monster-spellcasting-ability\"]").forEach((select) => {
      const current = select.value;
      [...select.options].forEach((option) => { if (option.value && !baseAbilityOptions.includes(option.value)) option.remove(); });
      customKeys.forEach((key) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = key;
        select.appendChild(option);
      });
      if ([...select.options].some((option) => option.value === current)) select.value = current;
    });
  };
  const addMonsterCustomAbility = (data = {}) => {
    if (!monsterCustomContainer) return;
    const row = monsterCustomAbilityTemplate.content.cloneNode(true).firstElementChild;
    row.querySelector(".custom-ability-abbr").value = data.abbr || "";
    if (data.value !== undefined && `${data.value}`.trim() !== "") row.querySelector(".custom-ability-score").value = data.value;
    row.querySelector(".custom-ability-save").checked = data.saveProficient === true;
    row.dataset.abilityKey = monsterCustomKey(row);
    row.querySelector(".custom-ability-score").addEventListener("input", () => {
      updateMonsterModifiers();
      updateMonsterAttackBonuses();
    });
    row.querySelector(".custom-ability-save").addEventListener("change", () => {
      updateMonsterModifiers();
      persistMonsterDraft();
    });
    row.querySelector(".custom-ability-abbr").addEventListener("input", () => {
      const oldKey = row.dataset.abilityKey || "";
      const newKey = monsterCustomKey(row);
      row.dataset.abilityKey = newKey;
      const holders = oldKey ? [...monsterSheet.querySelectorAll(".monster-attack-ability, [name=\"monster-spellcasting-ability\"]")].filter((select) => select.value === oldKey) : [];
      refreshMonsterAbilitySelectors();
      holders.forEach((select) => { select.value = newKey; });
      if (oldKey && newKey && oldKey !== newKey) {
        monsterEntryData.forEach((entry) => { if (entry.attackAbility === oldKey) entry.attackAbility = newKey; });
        renderMonsterEntryCards();
      }
      updateMonsterModifiers();
      updateMonsterAttackBonuses();
    });
    row.querySelector(".remove-custom-field").addEventListener("click", () => {
      row.remove();
      refreshMonsterAbilitySelectors();
      persistMonsterDraft();
    });
    monsterCustomContainer.appendChild(row);
    refreshMonsterAbilitySelectors();
  };

  const updateMonsterAttackBonuses = () => {
    monsterEntryData = monsterEntryData.map((entry) => computeMonsterEntryBonuses(entry));
    renderMonsterEntryCards();
    updateMonsterAttackReference();
  };

  const updateMonsterXpReward = () => {
    const xpInput = monsterSheet.querySelector('[name="monster-xp-reward"]');
    if (!xpInput) return;
    const cr = String(monsterCrSelect.value).trim();
    if (!cr) {
      xpInput.value = "";
      return;
    }
    const crNumber = cr.includes("/") ? Number(cr.split("/")[0]) / Number(cr.split("/")[1]) : Number(cr);
    const baseXp = monsterCrData.find(([key]) => key === cr)?.[1] || "";
    const inLair = Boolean(monsterSheet.querySelector('[name="monster-lair"]')?.checked);
    if (inLair && Number.isFinite(crNumber) && crNumber >= 1 && crNumber < 30) {
      const lairCr = String(Math.floor(crNumber) + 1);
      const lairXp = monsterCrData.find(([key]) => key === lairCr)?.[1] || baseXp;
      xpInput.value = `${baseXp} XP (${lairXp} XP)`;
    } else {
      xpInput.value = `${baseXp} XP`;
    }
  };

  const updateMonsterInitiative = () => {
    const input = monsterSheet.querySelector('[name="monster-initiative"]');
    if (!input) return;
    const modifier = monsterAbilityModifier("DEX");
    input.value = modifier === null ? "" : `${modifier >= 0 ? "+" : ""}${modifier}`;
  };

  const updateMonsterSaveBonuses = () => {
    const proficiency = getMonsterProficiency();
    ["str", "dex", "con", "int", "wis", "cha"].forEach((ability) => {
      const output = monsterSheet.querySelector(`[data-msave-for="${ability}"]`);
      if (!output) return;
      const checkbox = monsterSheet.querySelector(`[name="monster-${ability}-save-proficient"]`);
      const modifier = monsterAbilityModifier(ability);
      if (modifier === null) {
        output.textContent = "";
        return;
      }
      const total = modifier + (checkbox?.checked && proficiency !== null ? proficiency : 0);
      output.textContent = `${total >= 0 ? "+" : ""}${total}`;
    });
  };

  const updateMonsterProficiencyBonus = () => {
    const pbInput = monsterSheet.querySelector('[name="monster-proficiency-bonus"]');
    if (!pbInput) return;
    const proficiency = getMonsterProficiency();
    pbInput.value = proficiency === null ? "" : `+${proficiency}`;
  };

  const updateMonsterSpellcastingStats = () => {
    const dcInput = monsterSheet.querySelector('[name="monster-spell-save-dc"]');
    if (!dcInput) return;
    const ability = monsterSheet.querySelector('[name="monster-spellcasting-ability"]')?.value || "";
    const modifier = ability ? monsterAbilityModifier(ability) : null;
    const proficiency = getMonsterProficiency();
    dcInput.value = modifier === null ? "" : String(8 + modifier + (proficiency === null ? 0 : proficiency));
  };

  const updateMonsterModifiers = () => {
    ["str", "dex", "con", "int", "wis", "cha"].forEach((ability) => {
      const scoreInput = monsterSheet.querySelector(`[name="monster-${ability}"]`);
      const modifierInput = monsterSheet.querySelector(`[name="monster-${ability}-mod"]`);
      const score = Number(scoreInput.value);
      if (modifierInput && Number.isFinite(score)) {
        const modifier = Math.floor((score - 10) / 2);
        modifierInput.value = `${modifier >= 0 ? "+" : ""}${modifier}`;
      }
    });
    const proficiency = getMonsterProficiency();
    monsterCustomRows().forEach((row) => {
      const score = Number(row.querySelector(".custom-ability-score").value) || 0;
      const modifier = Math.floor((score - 10) / 2);
      const modOutput = row.querySelector(".custom-ability-mod");
      if (modOutput) modOutput.value = `${modifier >= 0 ? "+" : ""}${modifier}`;
      const saveInput = row.querySelector(".custom-ability-save");
      const saveOutput = row.querySelector(".custom-ability-save-bonus");
      const total = modifier + (saveInput?.checked && proficiency !== null ? proficiency : 0);
      if (saveOutput) saveOutput.textContent = `${total >= 0 ? "+" : ""}${total}`;
    });
    updateMonsterHp();
    updateMonsterProficiencyBonus();
    updateMonsterXpReward();
    updateMonsterAttackBonuses();
    updateMonsterInitiative();
    updateMonsterSaveBonuses();
    updateMonsterSpellcastingStats();
  };

  const applyMonster = (data) => {
    if (!data || typeof data !== "object" || !data.fields) return;
    monsterSheet.reset();
    monsterSheet.querySelectorAll("[name]").forEach((input) => {
      if (!Object.prototype.hasOwnProperty.call(data.fields, input.name)) return;
      if (input.type === "checkbox") input.checked = data.fields[input.name] === true || data.fields[input.name] === "on";
      else input.value = data.fields[input.name];
    });
    ["str", "dex", "con", "int", "wis", "cha"].forEach((ability) => {
      const scoreInput = monsterSheet.querySelector(`[name="monster-${ability}"]`);
      if (scoreInput && scoreInput.value === "") scoreInput.value = "10";
    });
    const dieSizeSelect = monsterSheet.querySelector('[name="monster-hit-die-size"]');
    if (dieSizeSelect && !dieSizeSelect.value) dieSizeSelect.value = "10";
    if (monsterCustomContainer) monsterCustomContainer.replaceChildren();
    (Array.isArray(data.customAbilities) ? data.customAbilities : []).forEach((entry) => addMonsterCustomAbility(entry));
    const monsterSpellAbilitySelect = monsterSheet.querySelector('[name="monster-spellcasting-ability"]');
    if (monsterSpellAbilitySelect && data.fields?.["monster-spellcasting-ability"]) monsterSpellAbilitySelect.value = data.fields["monster-spellcasting-ability"];
    monsterEntryData = (Array.isArray(data.entries) ? data.entries : []).map((entry) => ({
      group: entry.group || "traits",
      name: entry.name || "",
      description: entry.description || "",
      recharge: entry.recharge || "",
      attack: Boolean(entry.attack),
      attackKind: entry.attackKind === "save" ? "save" : "attack",
      attackAbility: entry.attackAbility || "STR",
      attackBonus: entry.attackBonus || "",
      attackDamage: entry.attackDamage || "",
      attackDamageBonus: entry.attackDamageBonus || "",
      attackDamageType: entry.attackDamageType || "",
      attackRange: entry.attackRange || ""
    }));
    renderMonsterEntryCards();
    applyTheme(data.theme || document.querySelector('[name="monster-theme"]').value || "streetlamp");
    document.querySelector('[name="monster-theme"]').value = data.theme || "streetlamp";
    applyModifierColor(data.modifierColor || "default", "monster");
    npcToggle.checked = data.npcEnabled === true;
    updateNpcVisibility();
    monsterSpellToggle.checked = data.spellcastingEnabled === true;
    updateMonsterSpellcastingVisibility();
    renderMonsterSpellcasting(data.spellcasting || {});
    updateMonsterModifiers();
    updateMonsterAttackReference();
  };

  const updateNpcVisibility = () => {
    npcPanel.hidden = !npcToggle.checked;
  };

  const normalizeMonsterSpell = (spell) => typeof spell === "string"
    ? { name: spell, source: "", page: "" }
    : { name: spell?.name || "", source: spell?.source || "", page: spell?.page || "" };

  const addMonsterSpell = (container, spell = {}) => {
    if (!container) return;
    const entry = normalizeMonsterSpell(spell);
    const row = monsterSpellTemplate.content.cloneNode(true).firstElementChild;
    row.querySelector(".monster-spell-name").value = entry.name;
    row.querySelector(".monster-spell-source").value = entry.source;
    row.querySelector(".monster-spell-page").value = entry.page;
    row.querySelector(".remove-monster-spell").addEventListener("click", () => {
      row.remove();
      persistMonsterDraft();
    });
    container.appendChild(row);
  };

  const addMonsterPerDayGroup = (group = {}) => {
    if (!monsterPerDayList) return;
    const row = monsterPerDayTemplate.content.cloneNode(true).firstElementChild;
    row.querySelector(".monster-per-day-count").value = group.count ?? "";
    const spellList = row.querySelector("[data-per-day-spells]");
    (Array.isArray(group.spells) ? group.spells : []).forEach((spell) => addMonsterSpell(spellList, spell));
    row.querySelector(".remove-monster-per-day").addEventListener("click", () => {
      row.remove();
      persistMonsterDraft();
    });
    row.querySelector("[data-per-day-add]").addEventListener("click", () => {
      addMonsterSpell(spellList);
      spellList.lastElementChild?.querySelector(".monster-spell-name")?.focus();
      persistMonsterDraft();
    });
    monsterPerDayList.appendChild(row);
  };

  const collectMonsterSpellcasting = () => ({
    atWill: [...(monsterAtwillList?.querySelectorAll(".monster-spell-row") || [])].map((row) => ({
      name: row.querySelector(".monster-spell-name").value,
      source: row.querySelector(".monster-spell-source").value,
      page: row.querySelector(".monster-spell-page").value
    })).filter((spell) => spell.name.trim()),
    perDay: [...(monsterPerDayList?.querySelectorAll(".monster-per-day-group") || [])].map((group) => ({
      count: group.querySelector(".monster-per-day-count").value,
      spells: [...group.querySelectorAll(".monster-spell-row")].map((row) => ({
        name: row.querySelector(".monster-spell-name").value,
        source: row.querySelector(".monster-spell-source").value,
        page: row.querySelector(".monster-spell-page").value
      })).filter((spell) => spell.name.trim())
    }))
  });

  const renderMonsterSpellcasting = (spellcasting = {}) => {
    if (monsterAtwillList) monsterAtwillList.replaceChildren();
    if (monsterPerDayList) monsterPerDayList.replaceChildren();
    (Array.isArray(spellcasting.atWill) ? spellcasting.atWill : []).forEach((spell) => addMonsterSpell(monsterAtwillList, spell));
    (Array.isArray(spellcasting.perDay) ? spellcasting.perDay : []).forEach((group) => addMonsterPerDayGroup(group));
  };

  const updateMonsterSpellcastingVisibility = () => {
    if (monsterSpellcastingPanel) monsterSpellcastingPanel.hidden = !(monsterSpellToggle?.checked);
  };

  const monsterSpellcastingPdfLines = (data) => {
    if (!data.spellcastingEnabled) return [];
    const fields = data.fields || {};
    const ability = String(fields["monster-spellcasting-ability"] || "").trim().toUpperCase();
    const dc = String(fields["monster-spell-save-dc"] || "").trim();
    const notes = String(fields["monster-spellcasting-notes"] || "").trim();
    const spellRef = (spell) => {
      const entry = typeof spell === "string" ? { name: spell, source: "", page: "" } : spell;
      const name = String(entry.name || "").trim();
      if (!name) return "";
      const parts = [String(entry.source || "").trim(), String(entry.page || "").trim()].filter(Boolean);
      return parts.length ? `${name} (${parts.join(" ")})` : name;
    };
    const atWill = (data.spellcasting?.atWill || []).map(spellRef).filter(Boolean);
    const perDay = (data.spellcasting?.perDay || [])
      .map((group) => ({ count: String(group.count || "").trim(), spells: (group.spells || []).map(spellRef).filter(Boolean) }))
      .filter((group) => group.spells.length);
    const header = `SPELLCASTING${ability ? ` (${ability}${dc ? `, spell save DC ${dc}` : ""})` : ""}`;
    const lines = [];
    if (notes) lines.push(notes);
    if (atWill.length) lines.push(`At will: ${atWill.join(", ")}`);
    perDay.forEach((group) => lines.push(`${group.count || "?"}/day: ${group.spells.join(", ")}`));
    return lines.length || notes ? [header, ...lines, ""] : [""];
  };

  const makeMonsterPdf = (data) => {
    const fields = data.fields || {};
    const cr = fields["monster-cr"];
    const crXp = monsterCrData.find(([key]) => key === cr)?.[1];
    const crNumber = cr && cr.includes("/") ? Number(cr.split("/")[0]) / Number(cr.split("/")[1]) : Number(cr);
    const inLair = fields["monster-lair"] === "on" || fields["monster-lair"] === true;
    const lairCr = inLair && Number.isFinite(crNumber) && crNumber >= 1 && crNumber < 30 ? String(Math.floor(crNumber) + 1) : "";
    const lairXp = lairCr ? monsterCrData.find(([key]) => key === lairCr)?.[1] : "";
    const crLabel = cr ? `CR ${cr}${crXp ? ` (${crXp} XP${lairXp ? `; lair: ${lairXp} XP` : ""})` : ""}` : "—";
    const signedInt = (value) => { const n = Number.parseInt(value, 10); return Number.isFinite(n) ? n : 0; };
    const saveLine = [
      ...["str", "dex", "con", "int", "wis", "cha"]
        .filter((ability) => fields[`monster-${ability}-save-proficient`] === "on" || fields[`monster-${ability}-save-proficient`] === true)
        .map((ability) => `${ability.toUpperCase()} +${signedInt(fields[`monster-${ability}-mod`]) + signedInt(fields["monster-proficiency-bonus"])}`),
      ...(data.customAbilities || [])
        .filter((entry) => entry.saveProficient)
        .map((entry) => `${String(entry.abbr || entry.name || "CUS").toUpperCase().slice(0, 3)} +${Math.floor(((signedInt(entry.value) || 10) - 10) / 2) + signedInt(fields["monster-proficiency-bonus"])}`)
    ].join(", ");
    const lines = [
      fields["monster-name"] || "Unnamed monster",
      `${fields["monster-size"] || "Medium"} ${fields["monster-type"] || "creature"} · ${fields["monster-alignment"] || "Unaligned"} · ${crLabel}`,
      "",
      `AC ${fields["monster-ac"] || "—"}  HP ${fields["monster-hp"] || "—"}  PB ${fields["monster-proficiency-bonus"] || "—"}  Init ${fields["monster-initiative"] || "—"}  Speed ${fields["monster-speed"] || "—"}`,
      `Skills: ${fields["monster-skills"] || "—"}`,
      `Resistances: ${fields["monster-resistances"] || "—"}`,
      `Immunities: ${fields["monster-immunities"] || "—"}`,
      `Vulnerabilities: ${fields["monster-vulnerabilities"] || "—"}`,
      `Gear: ${fields["monster-gear"] || "—"}`,
      `Senses: ${fields["monster-senses"] || "—"}`,
      `Languages: ${fields["monster-languages"] || "—"}`,
      "",
      "ABILITY SCORES",
      ...["str", "dex", "con", "int", "wis", "cha"].map((ability) => `${ability.toUpperCase()} ${fields[`monster-${ability}`] || "—"} (${fields[`monster-${ability}-mod`] || "+0"})`),
      ...(data.customAbilities || []).map((entry) => {
        const modifier = Math.floor(((signedInt(entry.value) || 10) - 10) / 2);
        return `${String(entry.abbr || entry.name || "Custom").toUpperCase().slice(0, 3)} ${entry.value || "—"} (${modifier >= 0 ? "+" : ""}${modifier})`;
      }),
      ...(saveLine ? [`SAVING THROWS  ${saveLine}`] : []),
      ...monsterSpellcastingPdfLines(data),
      ...(data.entries || []).flatMap((entry) => {
        const title = `${entry.name || "Untitled"}${entry.recharge ? ` (Recharge ${entry.recharge})` : ""}${entry.attack ? " [Attack]" : ""}`;
        if (!entry.attack) return [entry.group.toUpperCase(), title, entry.description || ""];
        const detailParts = [
          entry.attackBonus ? (entry.attackKind === "save" ? `DC ${entry.attackBonus}` : `${entry.attackBonus} to hit`) : "",
          [composeDamage(entry.attackDamage, entry.attackDamageBonus), entry.attackDamageType].filter((part) => String(part || "").trim()).join(" "),
          entry.attackRange
        ].filter((part) => String(part || "").trim());
        return [entry.group.toUpperCase(), title, ...detailParts, entry.description || ""];
      }),
      ...(data.npcEnabled ? [
        "",
        "NPC DETAILS",
        `Alignment: ${fields["npc-alignment"] || "—"}`,
        `Goals: ${fields["npc-goals"] || "—"}`,
        `Personality: ${fields["npc-personality"] || "—"}`,
        `Secret: ${fields["npc-secret"] || "—"}`
      ] : []),
      "",
      fields["monster-notes"] || ""
    ];
    const wrappedLines = lines.flatMap((line) => {
      const words = String(line).split(/\s+/);
      const result = [];
      let current = "";
      words.forEach((word) => {
        if ((current + " " + word).trim().length > 88 && current) {
          result.push(current);
          current = word;
        } else current = `${current} ${word}`.trim();
      });
      result.push(current);
      return result;
    });
    const metadata = `MANASQUID_MONSTER_JSON:${encodeSheet(data)}`;
    const pages = [];
    for (let index = 0; index < wrappedLines.length; index += 48) pages.push(wrappedLines.slice(index, index + 48));
    const pageContents = pages.map((page) => [
      "BT", "/F1 10 Tf", "50 742 Td",
      ...page.flatMap((line, index) => [`(${pdfEscape(line)}) Tj`, index < page.length - 1 ? "0 -14 Td" : ""]),
      "ET"
    ].join("\n"));
    const pageNumbers = pages.map((_, index) => 4 + index * 2);
    const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
    pageContents.forEach((content, index) => {
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageNumbers[index] + 1} 0 R >>`);
      objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });
    const infoNumber = objects.length + 1;
    objects[1] = `<< /Type /Pages /Kids [${pageNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pages.length} >>`;
    objects.push(`<< /Title (${pdfEscape(fields["monster-name"] || "Monster Stat Block")}) /Subject (${metadata}) >>`);
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoNumber} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  };

  const readPdfMonster = async (file) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    const match = binary.match(/MANASQUID_MONSTER_JSON:([A-Za-z0-9+/=]+)/);
    if (!match) throw new Error("This PDF was not created by Manasquid.");
    return decodeSheet(match[1]);
  };

  const readSavedMonsters = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(monsterSheetsKey) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  };

  const writeSavedMonsters = (saved) => localStorage.setItem(monsterSheetsKey, JSON.stringify(saved));

  const renderSavedMonsters = () => {
    const savedList = document.querySelector("#monster-saved-list");
    const saved = readSavedMonsters();
    savedList.replaceChildren();
    if (!saved.length) {
      savedList.innerHTML = '<span class="saved-empty">No saved stat blocks yet. Save a snapshot to keep a version here.</span>';
      return;
    }
    saved.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "saved-item";
      const date = new Date(entry.updatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
      item.innerHTML = `<div><strong></strong><small>Saved ${date}</small></div><div class="saved-actions"><button class="button load-saved" type="button">Load</button><button class="button subtle delete-saved" type="button">Delete</button></div>`;
      item.querySelector("strong").textContent = entry.name;
      item.querySelector(".load-saved").addEventListener("click", () => {
        applyMonster(entry.sheet);
        persistMonsterDraft();
        setStatus(`Loaded ${entry.name}`);
      });
      item.querySelector(".delete-saved").addEventListener("click", () => {
        writeSavedMonsters(readSavedMonsters().filter((savedEntry) => savedEntry.id !== entry.id));
        renderSavedMonsters();
        setStatus("Saved stat block deleted");
      });
      savedList.appendChild(item);
    });
  };

  document.querySelector('[name="monster-theme"]').addEventListener("change", () => {
    applyTheme(document.querySelector('[name="monster-theme"]').value);
    persistMonsterDraft();
  });
  document.querySelector('[name="monster-modifier-color"]').addEventListener("change", () => {
    applyModifierColor(document.querySelector('[name="monster-modifier-color"]').value, "monster");
    persistMonsterDraft();
  });
  npcToggle.addEventListener("change", () => {
    updateNpcVisibility();
    persistMonsterDraft();
  });
  monsterSpellToggle.addEventListener("change", () => {
    updateMonsterSpellcastingVisibility();
    persistMonsterDraft();
  });
  document.querySelector('[name="monster-spellcasting-ability"]').addEventListener("change", updateMonsterSpellcastingStats);
  document.querySelector("#add-monster-atwill").addEventListener("click", () => {
    addMonsterSpell(monsterAtwillList);
    monsterAtwillList.lastElementChild?.querySelector(".monster-spell-name")?.focus();
    persistMonsterDraft();
  });
  document.querySelector("#add-monster-per-day").addEventListener("click", () => {
    addMonsterPerDayGroup();
    monsterPerDayList.lastElementChild?.querySelector(".monster-per-day-count")?.focus();
    persistMonsterDraft();
  });
  document.querySelector("#save-character").addEventListener("click", () => {
    document.querySelector("#monster-save-name").focus();
    document.querySelector("#monster-storage-heading").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector("#save-named-monster").addEventListener("click", () => {
    const nameInput = document.querySelector("#monster-save-name");
    const name = nameInput.value.trim() || monsterSheet.querySelector('[name="monster-name"]').value.trim() || "Unnamed monster";
    const saved = readSavedMonsters();
    const existing = saved.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
    const id = existing?.id || (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    const entry = { id, name, updatedAt: new Date().toISOString(), sheet: collectMonster() };
    writeSavedMonsters([entry, ...saved.filter((savedEntry) => savedEntry.id !== entry.id)]);
    nameInput.value = "";
    renderSavedMonsters();
    setStatus(`Saved ${name}`);
  });
  document.querySelector("#add-monster-entry").addEventListener("click", () => openMonsterEntryEditor());
  document.querySelector("#cancel-monster-entry").addEventListener("click", closeMonsterEntryEditor);
  document.querySelector("#save-monster-entry").addEventListener("click", saveMonsterEntryFromEditor);
  [monsterEntryEditorGroup, monsterEntryEditorAttack, monsterEntryEditorKind, monsterEntryEditorAbility].forEach((input) => {
    input.addEventListener("change", refreshMonsterEntryEditor);
    input.addEventListener("input", refreshMonsterEntryEditor);
  });
  document.querySelector("#add-monster-ability").addEventListener("click", () => {
    addMonsterCustomAbility();
    monsterCustomContainer?.lastElementChild?.querySelector(".custom-ability-name")?.focus();
    persistMonsterDraft();
  });
  monsterSheet.querySelectorAll('[name^="monster-"]').forEach((input) => input.addEventListener("input", () => {
    if (input.name.match(/^monster-(str|dex|con|int|wis|cha)$/)) updateMonsterModifiers();
    if (input.name.match(/^monster-(hit-dice|hit-die-size|hp-bonus)$/)) updateMonsterHp();
    if (input.name === "monster-cr") {
      updateMonsterProficiencyBonus();
      updateMonsterXpReward();
      updateMonsterAttackBonuses();
      updateMonsterSpellcastingStats();
    }
    if (input.name === "monster-lair") updateMonsterXpReward();
    persistMonsterDraft();
  }));
  monsterSheet.addEventListener("input", () => {
    persistMonsterDraft();
    updateMonsterAttackReference();
    updateMonsterSaveBonuses();
  });
  document.querySelector("#export-monster").addEventListener("click", () => {
    downloadFile(new Blob([JSON.stringify(collectMonster(), null, 2)], { type: "application/json" }), "monster-stat-block.json");
    setStatus("Monster JSON backup downloaded");
  });
  document.querySelector("#print-monster").addEventListener("click", () => {
    downloadFile(makeMonsterPdf(collectMonster()), "monster-stat-block.pdf");
    setStatus("Importable monster PDF downloaded");
  });
  document.querySelector("#import-monster").addEventListener("click", () => document.querySelector("#import-monster-file").click());
  document.querySelector("#import-monster-file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
        ? await readPdfMonster(file)
        : JSON.parse(await file.text());
      applyMonster(imported);
      persistMonsterDraft();
      setStatus(`${file.name.toLowerCase().endsWith(".pdf") ? "Monster PDF" : "Monster JSON"} imported`);
    } catch {
      setStatus("Monster import failed: choose a Manasquid monster PDF or JSON");
    }
    event.target.value = "";
  });
  document.querySelector("#clear-sheet").addEventListener("click", () => {
    if (!window.confirm("Clear the whole stat block, including traits and actions?")) return;
    monsterSheet.reset();
    if (monsterCustomContainer) monsterCustomContainer.replaceChildren();
    refreshMonsterAbilitySelectors();
    renderMonsterSpellcasting();
    monsterSpellToggle.checked = false;
    updateMonsterSpellcastingVisibility();
    closeMonsterEntryEditor();
    monsterEntryData = [];
    renderMonsterEntryCards();
    npcToggle.checked = false;
    updateNpcVisibility();
    localStorage.removeItem(monsterDraftKey);
    applyTheme("streetlamp");
    document.querySelector('[name="monster-theme"]').value = "streetlamp";
    applyModifierColor("red", "monster");
    updateMonsterModifiers();
    updateMonsterAttackReference();
    setStatus("Stat block cleared");
  });

  try {
    const monsterDraft = JSON.parse(localStorage.getItem(monsterDraftKey) || "null");
    if (monsterDraft) applyMonster(monsterDraft);
  } catch { setStatus("Could not restore monster draft"); }
  updateMonsterModifiers();
  updateMonsterAttackReference();
  renderSavedMonsters();
  updateNpcVisibility();
  updateMonsterSpellcastingVisibility();
  try { scrapNotes.value = localStorage.getItem(scrapKey) || ""; } catch { setStatus("Could not restore scrap sheet"); }
  applyTheme(document.querySelector('[name="monster-theme"]').value || "streetlamp");
  applyModifierColor(document.querySelector('[name="monster-modifier-color"]').value || "default", "monster");
})();
