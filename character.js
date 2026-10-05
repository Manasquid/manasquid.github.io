// Character sheet maker (index.html). Requires maker-common.js to be loaded first.
(() => {
  const sheet = document.querySelector("#character-sheet");
  const featureList = document.querySelector("#feature-list");
  const emptyState = document.querySelector("#empty-state");
  const template = document.querySelector("#feature-template");
  const skillTemplate = document.querySelector("#skill-template");
  const skillList = document.querySelector("#skill-list");
  const currencyTemplate = document.querySelector("#currency-template");
  const currencyList = document.querySelector("#currency-list");
  const customFieldTemplate = document.querySelector("#custom-field-template");
  const customFieldTextareaTemplate = document.querySelector("#custom-field-textarea-template");
  const customAbilityTemplate = document.querySelector("#custom-ability-template");
  const attackTemplate = document.querySelector("#attack-template");
  const attackList = document.querySelector("#attack-list");
  const attackEditor = document.querySelector("#attack-editor");
  const attackEmpty = document.querySelector("#attack-empty-state");
  const attackNameInput = document.querySelector("#attack-name");
  const attackKindInput = document.querySelector("#attack-kind");
  const attackAbilityInput = document.querySelector("#attack-ability");
  const attackDamageInput = document.querySelector("#attack-damage");
  const attackDamageTypeInput = document.querySelector("#attack-damage-type");
  const attackRangeInput = document.querySelector("#attack-range");
  const attackNotesInput = document.querySelector("#attack-notes");
  let editingAttackIndex = null;

  const openAttackEditor = (index = null) => {
    editingAttackIndex = index;
    const attack = index === null ? {} : attacks[index];
    attackNameInput.value = attack.name || "";
    attackKindInput.value = attack.kind || "attack";
    attackAbilityInput.value = attack.ability || "STR";
    attackDamageInput.value = attack.damage || "";
    attackDamageTypeInput.value = attack.type || "";
    attackRangeInput.value = attack.range || "";
    attackNotesInput.value = attack.notes || "";
    attackEditor.hidden = false;
    attackNameInput.focus();
  };

  const closeAttackEditor = () => {
    editingAttackIndex = null;
    attackEditor.hidden = true;
    attackNameInput.value = "";
    attackKindInput.value = "attack";
    attackAbilityInput.value = "STR";
    attackDamageInput.value = "";
    attackDamageTypeInput.value = "";
    attackRangeInput.value = "";
    attackNotesInput.value = "";
  };
  const spellTemplate = document.querySelector("#spell-template");
  const spellcastingPanel = document.querySelector("#spellcasting");
  const spellcasterToggle = document.querySelector('[name="spellcaster"]');
  const spellList = document.querySelector("#spell-list");
  const storageKey = "manasquid.character-sheets";
  const draftKey = "manasquid.character-draft";

  const persistDraft = () => {
    try { localStorage.setItem(draftKey, JSON.stringify(collectSheet())); } catch { setStatus("Browser storage unavailable"); }
  };

  const syncManualOverrides = () => {
    updateProficiencyBonus();
    const autoHealth = document.querySelector('[name="auto-health"]').checked;
    const autoModifiers = document.querySelector('[name="auto-modifiers"]').checked;
    const autoSpellcasting = document.querySelector('[name="auto-spellcasting"]').checked;
    const maxHp = document.querySelector('[name="max-hp"]');
    if (maxHp) maxHp.readOnly = autoHealth && document.querySelector('[name="health-mode"]').value === "calculated";
    const initiativeInput = document.querySelector('[name="initiative"]');
    if (initiativeInput) {
      initiativeInput.readOnly = autoModifiers;
      initiativeInput.setAttribute("aria-readonly", String(autoModifiers));
    }
    document.querySelectorAll("[data-mod-for]").forEach((output) => {
      output.readOnly = autoModifiers;
      output.setAttribute("aria-readonly", String(autoModifiers));
    });
    document.querySelectorAll("[data-save-for]").forEach((output) => {
      output.contentEditable = String(!autoModifiers);
      output.setAttribute("aria-readonly", String(autoModifiers));
    });
    document.querySelectorAll(".skill-bonus, .tool-bonus, .weapon-bonus").forEach((input) => {
      input.readOnly = autoModifiers;
      input.setAttribute("aria-readonly", String(autoModifiers));
    });
    document.querySelectorAll('[name="spell-save-dc"], [name="spell-attack-bonus"]').forEach((input) => {
      input.readOnly = autoSpellcasting;
      input.setAttribute("aria-readonly", String(autoSpellcasting));
    });
  };

  const updateProficiencyBonus = () => {
    const input = document.querySelector('[name="proficiency-bonus"]');
    const toggle = document.querySelector('[name="auto-proficiency"]');
    if (!input || !toggle) return;
    const auto = toggle.checked;
    input.readOnly = auto;
    input.setAttribute("aria-readonly", String(auto));
    if (!auto) return;
    const level = Number.parseInt(document.querySelector('[name="level"]').value, 10);
    const bonus = Number.isFinite(level) && level >= 1 ? Math.floor((level - 1) / 4) + 2 : null;
    input.value = bonus === null ? "" : `${bonus}`;
  };

  const updateModifiers = () => {
    if (!document.querySelector('[name="auto-modifiers"]').checked) return;
    const proficiencyBonus = Number(document.querySelector('[name="proficiency-bonus"]').value) || 0;
    document.querySelectorAll(".score").forEach((input) => {
      const score = Number(input.value) || 0;
      const modifier = Math.floor((score - 10) / 2);
      const sign = modifier >= 0 ? "+" : "";
      const output = document.querySelector(`[data-mod-for="${input.name}"]`);
      if (output) output.value = `${sign}${modifier}`;
      const saveInput = document.querySelector(`[name="${input.name}-save-proficient"]`);
      const saveOutput = document.querySelector(`[data-save-for="${input.name}"]`);
      const saveBonus = modifier + (saveInput?.checked ? proficiencyBonus : 0);
      if (saveOutput) saveOutput.textContent = `${saveBonus >= 0 ? "+" : ""}${saveBonus}`;
    });
    document.querySelectorAll('[data-custom-fields-for="abilities"] .custom-ability-row').forEach((row) => {
      const score = Number(row.querySelector(".custom-ability-score").value) || 0;
      const modifier = Math.floor((score - 10) / 2);
      const modOutput = row.querySelector(".custom-ability-mod");
      if (modOutput) modOutput.value = `${modifier >= 0 ? "+" : ""}${modifier}`;
      const saveInput = row.querySelector(".custom-ability-save");
      const saveOutput = row.querySelector(".custom-ability-save-bonus");
      const saveBonus = modifier + (saveInput?.checked ? proficiencyBonus : 0);
      if (saveOutput) saveOutput.textContent = `${saveBonus >= 0 ? "+" : ""}${saveBonus}`;
    });
    document.querySelectorAll(".skill-row").forEach((row) => {
      const ability = row.querySelector(".skill-ability").value;
      const modifier = characterAbilityModifier(ability) ?? 0;
      const proficient = row.querySelector(".skill-proficient").checked;
      const expertise = row.querySelector(".skill-expertise").checked;
      const altEnabled = row.querySelector(".skill-alt-enabled");
      const altAbility = altEnabled?.checked ? row.querySelector(".skill-alt-ability").value : null;
      const altModifier = altAbility ? (characterAbilityModifier(altAbility) ?? 0) : 0;
      const bonus = modifier + altModifier + (proficient ? proficiencyBonus * (expertise ? 2 : 1) : 0);
      row.querySelector(".skill-bonus").value = `${bonus >= 0 ? "+" : ""}${bonus}`;
    });
    document.querySelectorAll(".tool-row, .weapon-row").forEach((row) => {
      const isWeapon = row.classList.contains("weapon-row");
      const ability = row.querySelector(isWeapon ? ".weapon-ability" : ".tool-ability").value;
      const bonusInput = row.querySelector(isWeapon ? ".weapon-bonus" : ".tool-bonus");
      if (!ability) {
        bonusInput.value = "";
        return;
      }
      const modifier = characterAbilityModifier(ability) ?? 0;
      const bonus = modifier + proficiencyBonus;
      bonusInput.value = `${bonus >= 0 ? "+" : ""}${bonus}`;
    });
    const initiativeInput = document.querySelector('[name="initiative"]');
    if (initiativeInput) {
      const dexModifier = characterAbilityModifier("DEX");
      initiativeInput.value = dexModifier === null ? "" : `${dexModifier >= 0 ? "+" : ""}${dexModifier}`;
    }
    updateHealth();
  };

  const updateHealth = () => {
    const mode = document.querySelector('[name="health-mode"]');
    const maxHp = document.querySelector('[name="max-hp"]');
    if (!mode || !maxHp) return;
    const calculated = mode.value === "calculated" && document.querySelector('[name="auto-health"]').checked;
    maxHp.readOnly = calculated;
    maxHp.setAttribute("aria-readonly", String(calculated));
    if (!calculated) return;
    const level = Number.parseInt(document.querySelector('[name="level"]').value, 10);
    const dieSize = Number.parseInt(document.querySelector('[name="hit-dice-size"]').value, 10);
    const constitution = Number(document.querySelector('[name="constitution"]').value) || 0;
    if (!Number.isFinite(level) || level < 1 || !Number.isFinite(dieSize) || dieSize < 1) {
      maxHp.value = "";
      return;
    }
    const constitutionModifier = Math.floor((constitution - 10) / 2);
    const averageAfterFirstLevel = Math.ceil((dieSize + 1) / 2);
    const firstLevelHp = dieSize + constitutionModifier;
    const higherLevelHp = level * (averageAfterFirstLevel + constitutionModifier);
    maxHp.value = Math.max(0, level === 1 ? firstLevelHp : higherLevelHp);
  };

  const updateHitDieRules = () => {
    const hitDie = document.querySelector('[name="hit-dice-size"]');
    const allowOdd = document.querySelector('[name="allow-odd-hit-dice"]');
    if (!hitDie || !allowOdd) return;
    hitDie.step = allowOdd.checked ? "1" : "2";
    if (!allowOdd.checked && hitDie.value && Number(hitDie.value) % 2 !== 0) {
      hitDie.value = String(Math.max(2, Number(hitDie.value) - 1));
    }
    updateHealth();
  };

  const updateSpellcastingVisibility = () => {
    spellcastingPanel.hidden = !spellcasterToggle.checked;
    updateSpellSlots();
    updateSpellcastingStats();
  };

  const updateSpellSlots = () => {
    const fullCaster = document.querySelector('[name="caster-progression"]').value === "full";
    document.querySelectorAll(".spell-slot-field").forEach((field) => {
      field.hidden = !fullCaster && Number(field.dataset.slotLevel) > 5;
    });
  };

  const updateSpellcastingStats = () => {
    if (!document.querySelector('[name="auto-spellcasting"]').checked) return;
    const ability = document.querySelector('[name="spellcasting-ability"]').value;
    const modifier = ability ? characterAbilityModifier(ability) : null;
    const proficiency = Number(document.querySelector('[name="proficiency-bonus"]').value) || 0;
    document.querySelector('[name="spell-save-dc"]').value = modifier === null ? "" : String(8 + modifier + proficiency);
    document.querySelector('[name="spell-attack-bonus"]').value = modifier === null ? "" : `${modifier + proficiency >= 0 ? "+" : ""}${modifier + proficiency}`;
  };

  const addSpell = (spell = {}) => {
    const row = spellTemplate.content.cloneNode(true).firstElementChild;
    row.querySelector(".spell-name").value = spell.name || "";
    row.querySelector(".spell-level").value = spell.level ?? "";
    row.querySelector(".spell-school").value = spell.school || "";
    row.querySelector(".spell-casting-time").value = spell.castingTime || "";
    row.querySelector(".spell-range").value = spell.range || "";
    row.querySelector(".spell-duration").value = spell.duration || "";
    row.querySelector(".spell-components").value = spell.components || "";
    row.querySelector(".spell-effects").value = spell.effects || "";
    row.querySelector(".spell-reference").value = spell.reference || [spell.source, spell.page ? `p. ${spell.page}` : ""].filter(Boolean).join(" ");
    row.querySelector(".spell-prepared-input").checked = Boolean(spell.prepared);
    row.querySelector(".remove-spell").addEventListener("click", () => {
      row.remove();
      persistDraft();
    });
    spellList.appendChild(row);
  };

  const collectSpells = () => [...spellList.querySelectorAll(".spell-row")].map((row) => ({
    name: row.querySelector(".spell-name").value,
    level: row.querySelector(".spell-level").value,
    school: row.querySelector(".spell-school").value,
    castingTime: row.querySelector(".spell-casting-time").value,
    range: row.querySelector(".spell-range").value,
    duration: row.querySelector(".spell-duration").value,
    components: row.querySelector(".spell-components").value,
    effects: row.querySelector(".spell-effects").value,
    reference: row.querySelector(".spell-reference").value,
    prepared: row.querySelector(".spell-prepared-input").checked
  }));

  const featureEditor = document.querySelector("#feature-editor");
  const featureName = document.querySelector("#feature-name");
  const featureDescription = document.querySelector("#feature-description");
  const featureSource = document.querySelector("#feature-source");
  const featureUses = document.querySelector("#feature-uses");
  let editingCard = null;

  const openFeatureEditor = (card = null) => {
    editingCard = card;
    featureName.value = card ? card.dataset.title : "";
    featureDescription.value = card ? card.dataset.description : "";
    featureSource.value = card ? card.dataset.source : "";
    featureUses.value = card ? card.dataset.uses : "";
    featureEditor.hidden = false;
    featureName.focus();
  };

  const closeFeatureEditor = () => {
    editingCard = null;
    featureEditor.hidden = true;
    featureName.value = "";
    featureDescription.value = "";
    featureSource.value = "";
    featureUses.value = "";
  };

  const makeFeature = (title, description, source, uses) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".feature-card");
    card.dataset.title = title;
    card.dataset.description = description;
    card.dataset.source = source;
    card.dataset.uses = uses;
    card.querySelector(".feature-title").textContent = title;
    card.querySelector(".feature-description").textContent = description;
    card.querySelector(".feature-source").textContent = source;
    card.querySelector(".feature-uses").textContent = uses;
    card.querySelector(".edit-feature").addEventListener("click", () => openFeatureEditor(card));
    card.querySelector(".remove-feature").addEventListener("click", () => {
      card.remove();
      updateEmptyState();
      persistDraft();
      setStatus("Feature removed");
    });
    featureList.appendChild(fragment);
    updateEmptyState();
    return featureList.lastElementChild;
  };

  const updateFeatureCard = (card) => {
    card.dataset.title = featureName.value.trim() || "Untitled feature";
    card.dataset.description = featureDescription.value.trim() || "No description added.";
    card.dataset.source = featureSource.value.trim() || "Other";
    card.dataset.uses = featureUses.value.trim() || "Always available";
    card.querySelector(".feature-title").textContent = card.dataset.title;
    card.querySelector(".feature-description").textContent = card.dataset.description;
    card.querySelector(".feature-source").textContent = card.dataset.source;
    card.querySelector(".feature-uses").textContent = card.dataset.uses;
  };

  const updateEmptyState = () => {
    emptyState.hidden = featureList.querySelectorAll(".feature-card").length > 0;
  };

  const standardSkills = [
    ["Acrobatics", "DEX"], ["Animal Handling", "WIS"], ["Arcana", "INT"], ["Athletics", "STR"],
    ["Deception", "CHA"], ["History", "INT"], ["Insight", "WIS"], ["Intimidation", "CHA"],
    ["Investigation", "INT"], ["Medicine", "WIS"], ["Nature", "INT"], ["Perception", "WIS"],
    ["Performance", "CHA"], ["Persuasion", "CHA"], ["Religion", "INT"], ["Sleight of Hand", "DEX"],
    ["Stealth", "DEX"], ["Survival", "WIS"]
  ];

  const standardWeapons = [];

  const toolList = document.querySelector("#tool-list");
  const toolTemplate = document.querySelector("#tool-template");

  const syncToolRow = (row) => {
    row.querySelector(".tool-cell-bonus").hidden = row.querySelector(".tool-ability").value === "";
  };

  const addTool = (name = "", ability = "") => {
    const row = toolTemplate.content.cloneNode(true).firstElementChild;
    row.querySelector(".tool-name").value = name;
    row.querySelector(".tool-ability").value = ability;
    syncToolRow(row);
    row.querySelector(".remove-tool").addEventListener("click", () => {
      row.remove();
      persistDraft();
    });
    row.querySelector(".tool-ability").addEventListener("change", () => {
      syncToolRow(row);
      updateModifiers();
      persistDraft();
    });
    toolList.appendChild(row);
    refreshAbilitySelectors();
    row.querySelector(".tool-ability").value = ability;
  };

  const collectTools = () => [...toolList.querySelectorAll(".tool-row")].map((row) => ({
    name: row.querySelector(".tool-name").value,
    ability: row.querySelector(".tool-ability").value,
    bonus: row.querySelector(".tool-bonus").value
  }));

  const weaponList = document.querySelector("#weapon-list");
  const weaponTemplate = document.querySelector("#weapon-template");

  const syncWeaponRow = (row) => {
    row.querySelector(".tool-cell-bonus").hidden = row.querySelector(".weapon-ability").value === "";
  };

  const addWeapon = (name = "", ability = "") => {
    const row = weaponTemplate.content.cloneNode(true).firstElementChild;
    row.querySelector(".weapon-name").value = name;
    row.querySelector(".weapon-ability").value = ability;
    syncWeaponRow(row);
    row.querySelector(".remove-weapon").addEventListener("click", () => {
      row.remove();
      persistDraft();
    });
    row.querySelector(".weapon-ability").addEventListener("change", () => {
      syncWeaponRow(row);
      updateModifiers();
      persistDraft();
    });
    weaponList.appendChild(row);
    refreshAbilitySelectors();
    row.querySelector(".weapon-ability").value = ability;
  };

  const collectWeapons = () => [...weaponList.querySelectorAll(".weapon-row")].map((row) => ({
    name: row.querySelector(".weapon-name").value,
    ability: row.querySelector(".weapon-ability").value,
    bonus: row.querySelector(".weapon-bonus").value
  }));

  const syncArmorProficiencies = () => {
    const light = document.querySelector('[name="armor-light"]');
    const medium = document.querySelector('[name="armor-medium"]');
    const heavy = document.querySelector('[name="armor-heavy"]');
    if (heavy.checked) {
      medium.checked = true;
      light.checked = true;
    } else if (medium.checked) {
      light.checked = true;
    }
  };

  const addSkill = (name = "Custom skill", ability = "INT", bonus = "", proficient = false, expertise = false, removable = true, altEnabled = false, altAbility = "STR") => {
    const row = skillTemplate.content.cloneNode(true).firstElementChild;
    row.querySelector(".skill-name").value = name;
    row.querySelector(".skill-ability").value = ability;
    row.querySelector(".skill-bonus").value = bonus;
    row.querySelector(".skill-proficient").checked = proficient;
    row.querySelector(".skill-expertise").checked = expertise;
    row.querySelector(".skill-alt-ability").value = altAbility;
    row.querySelector(".skill-alt-enabled").checked = Boolean(altEnabled);
    row.querySelector(".skill-alt-ability").hidden = !altEnabled;
    row.querySelector(".remove-skill").hidden = !removable;
    row.querySelector(".remove-skill").addEventListener("click", () => {
      row.remove();
      persistDraft();
    });
    skillList.appendChild(row);
    refreshAbilitySelectors();
    row.querySelector(".skill-ability").value = ability;
    if (altEnabled) row.querySelector(".skill-alt-ability").value = altAbility;
  };

  const collectSkills = () => [...skillList.querySelectorAll(".skill-row")].map((row) => ({
    name: row.querySelector(".skill-name").value,
    ability: row.querySelector(".skill-ability").value,
    bonus: row.querySelector(".skill-bonus").value,
    proficient: row.querySelector(".skill-proficient").checked,
    expertise: row.querySelector(".skill-expertise").checked,
    altEnabled: row.querySelector(".skill-alt-enabled").checked,
    altAbility: row.querySelector(".skill-alt-ability").value,
    removable: !row.querySelector(".remove-skill").hidden
  }));

  const addCurrency = (name = "", amount = "") => {
    const row = currencyTemplate.content.cloneNode(true).firstElementChild;
    row.querySelector(".currency-name").value = name;
    row.querySelector(".currency-amount").value = amount;
    row.querySelector(".remove-currency").addEventListener("click", () => {
      row.remove();
      persistDraft();
    });
    currencyList.appendChild(row);
  };

  const collectCurrencies = () => [...currencyList.querySelectorAll(".currency-row")].map((row) => ({
    name: row.querySelector(".currency-name").value,
    amount: row.querySelector(".currency-amount").value
  }));

  let attacks = [];

  const normalizeAttack = (attack = {}) => ({
    name: attack.name || "",
    kind: attack.kind === "save" ? "save" : "attack",
    ability: attack.ability || "STR",
    damage: attack.damage || "",
    damageBonus: "",
    type: attack.type || "",
    range: attack.range || "",
    notes: attack.notes || "",
    bonus: ""
  });

  const setAttacks = (list) => {
    attacks = (Array.isArray(list) ? list : []).map(normalizeAttack);
    renderAttacks();
    updateCharacterAttackBonuses();
  };

  const renderAttacks = () => {
    attackList.replaceChildren();
    attacks.forEach((attack, index) => {
      const fragment = attackTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".attack-card");
      updateAttackCard(card, attack);
      card.querySelector(".edit-attack").addEventListener("click", () => openAttackEditor(index));
      card.querySelector(".remove-attack").addEventListener("click", () => {
        attacks.splice(index, 1);
        updateCharacterAttackBonuses();
        renderAttacks();
        persistDraft();
        setStatus("Attack removed");
      });
      attackList.appendChild(fragment);
    });
    attackEmpty.hidden = attacks.length > 0;
  };

  const updateAttackCard = (card, attack) => {
    const parts = [];
    if (attack.kind === "save") {
      if (attack.bonus) parts.push(`DC ${attack.bonus}`);
    } else if (attack.bonus) {
      parts.push(`${attack.bonus} to hit`);
    }
    const damage = composeDamage(attack.damage, attack.damageBonus === "+0" ? "" : attack.damageBonus).trim();
    if (damage) parts.push(damage);
    if (attack.type) parts.push(attack.type);
    if (attack.notes) parts.push(attack.notes);
    card.querySelector(".attack-title").textContent = attack.name || "Untitled attack";
    card.querySelector(".attack-line").textContent = parts.join(" · ") || "No damage added.";
    card.querySelector(".attack-kind-tag").textContent = attack.kind === "save" ? "Saving throw" : "Attack roll";
    card.querySelector(".attack-ability-tag").textContent = attack.ability;
    card.querySelector(".attack-range-tag").textContent = attack.range || "Any range";
  };

  const customAbilityRows = () => [...document.querySelectorAll('[data-custom-fields-for="abilities"] .custom-ability-row')];
  const customAbilityKey = (row) => {
    const raw = (row.querySelector(".custom-ability-abbr").value.trim() || row.querySelector(".custom-ability-name").value.trim()).toUpperCase();
    return raw ? raw.slice(0, 3) : "";
  };
  const customAbilityEntries = () => customAbilityRows().map((row) => ({ row, key: customAbilityKey(row), score: Number(row.querySelector(".custom-ability-score").value) || 0 }));
  const syncAbilityKeys = (row) => {
    const key = customAbilityKey(row);
    row.dataset.abilityKey = key;
    row.querySelector(".custom-ability-mod").dataset.modFor = key;
    row.querySelector(".custom-ability-save-bonus").dataset.saveFor = key;
  };
  const refreshAbilitySelectors = () => {
    const customKeys = [...new Set(customAbilityEntries().map((entry) => entry.key).filter(Boolean))];
    document.querySelectorAll("#attack-ability, #armor-ability, #armor-ability-b, #armor-bonus-ability, #armor-req-ability, #spellcasting-ability, .skill-ability, .skill-alt-ability, .tool-ability, .weapon-ability").forEach((select) => {
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
  const remapAbilityData = (oldKey, newKey) => {
    if (!oldKey || !newKey || oldKey === newKey) return;
    attacks.forEach((attack) => { if (attack.ability === oldKey) attack.ability = newKey; });
    armors.forEach((armor) => {
      if (armor.ability === oldKey) armor.ability = newKey;
      if (armor.abilityB === oldKey) armor.abilityB = newKey;
      if (armor.bonusAbility === oldKey) armor.bonusAbility = newKey;
      if (armor.reqAbility === oldKey) armor.reqAbility = newKey;
    });
  };

  const characterAbilityModifier = (ability) => {
    const abilityFields = { STR: "strength", DEX: "dexterity", CON: "constitution", INT: "intelligence", WIS: "wisdom", CHA: "charisma" };
    if (abilityFields[ability]) {
      const score = Number(document.querySelector(`[name="${abilityFields[ability]}"]`)?.value);
      return Number.isFinite(score) ? Math.floor((score - 10) / 2) : null;
    }
    const custom = customAbilityEntries().find((entry) => entry.key === String(ability || "").trim().toUpperCase());
    return custom ? Math.floor((custom.score - 10) / 2) : null;
  };

  const attackBonusFor = (attack) => {
    const modifier = characterAbilityModifier(attack.ability);
    const proficiency = Number.parseInt(document.querySelector('[name="proficiency-bonus"]')?.value, 10);
    const proficiencyValue = Number.isFinite(proficiency) ? proficiency : 0;
    if (modifier === null) return "";
    return attack.kind === "save" ? `${modifier + 8 + proficiencyValue}` : `+${modifier + proficiencyValue}`;
  };

  const updateCharacterAttackBonuses = () => {
    if (!attackList) return;
    const proficiency = Number.parseInt(document.querySelector('[name="proficiency-bonus"]')?.value, 10);
    const proficiencyValue = Number.isFinite(proficiency) ? proficiency : 0;
    attacks.forEach((attack) => {
      const modifier = characterAbilityModifier(attack.ability);
      const isSave = attack.kind === "save";
      attack.bonus = modifier === null ? "" : isSave ? `${modifier + 8 + proficiencyValue}` : Number.isFinite(proficiency) ? `+${modifier + proficiencyValue}` : "";
      attack.damageBonus = modifier === null || isSave ? "" : `${modifier >= 0 ? "+" : ""}${modifier}`;
    });
    attackList.querySelectorAll(".attack-card").forEach((card, index) => {
      if (attacks[index]) updateAttackCard(card, attacks[index]);
    });
  };

  const collectAttacks = () => attacks.map((attack) => ({
    name: attack.name,
    kind: attack.kind,
    ability: attack.ability,
    bonus: attack.bonus,
    damage: attack.damage,
    damageBonus: attack.damageBonus,
    type: attack.type,
    range: attack.range,
    notes: attack.notes
  }));

  let armors = [];
  let lastArmorAbility = "DEX";
  let editingArmorIndex = null;
  const armorTemplate = document.querySelector("#armor-template");
  const armorList = document.querySelector("#armor-list");
  const armorEditor = document.querySelector("#armor-editor");
  const armorEmpty = document.querySelector("#armor-empty-state");
  const armorNameInput = document.querySelector("#armor-name");
  const armorTypeInput = document.querySelector("#armor-type");
  const armorBonusInput = document.querySelector("#armor-bonus");
  const armorBonusField = document.querySelector("#armor-bonus-field");
  const armorBonusAbilityInput = document.querySelector("#armor-bonus-ability");
  const armorBonusAbilityField = document.querySelector("#armor-bonus-ability-field");
  const armorModeInput = document.querySelector("#armor-mode");
  const armorAbilityBInput = document.querySelector("#armor-ability-b");
  const armorCapInput = document.querySelector("#armor-cap");
  const armorCapField = document.querySelector("#armor-cap-field");
  const armorAcPreview = document.querySelector("#armor-ac-preview");
  const armorBaseAcInput = document.querySelector("#armor-base-ac");
  const armorStealthInput = document.querySelector("#armor-stealth");
  const armorDonInput = document.querySelector("#armor-don");
  const armorDoffInput = document.querySelector("#armor-doff");
  const armorReqToggle = document.querySelector("#armor-req-toggle");
  const armorReqAbilityInput = document.querySelector("#armor-req-ability");
  const armorReqScoreInput = document.querySelector("#armor-req-score");
  const armorAbilityField = document.querySelector("#armor-ability-field");
  const armorAbilityInput = document.querySelector(`#armor-ability`);
  const armorAbilityBField = document.querySelector("#armor-ability-b-field");
  const armorReqFields = document.querySelector("#armor-req-fields");
  const armorModeText = { fixed: "Flat AC", ability: "Base + Ability", abilityCapped: "Base + Ability (capped)", dual: "Base + Dual ability" };

  const isBonusArmor = (type) => type === "Shield" || type === "AC Bonus";
  const signedBonus = (value) => { const n = Number.parseInt(value, 10); return Number.isFinite(n) ? (n < 0 ? `${n}` : `+${n}`) : `${value}`; };
  const scoreModifierLabel = (score) => { const n = Number.isFinite(Number(score)) ? Number(score) : 10; const mod = Math.floor((n - 10) / 2); return `${mod >= 0 ? "+" : ""}${mod}`; };

  const equippedBaseAC = () => {
    const equippedArmor = armors.find((entry) => entry.equipped && !isBonusArmor(entry.type));
    const base = equippedArmor && equippedArmor.ac ? Number.parseInt(equippedArmor.ac, 10) : 10;
    return Number.isFinite(base) ? base : 10;
  };

  const computeArmorAC = (armor, getModifier) => {
    const mod = (ability) => { const value = getModifier(ability); return Number.isFinite(value) ? value : 0; };
    if (isBonusArmor(armor.type)) {
      const bonus = Number.parseInt(armor.bonus, 10);
      if (!Number.isFinite(bonus)) return null;
      return bonus + (armor.bonusAbility && armor.bonusAbility !== "none" ? mod(armor.bonusAbility) : 0);
    }
    const baseEntry = Number.parseInt(armor.baseAc, 10);
    const base = Number.isFinite(baseEntry) ? baseEntry : 10;
    if (armor.mode === "ability") return base + mod(armor.ability);
    if (armor.mode === "abilityCapped") { const cap = Number.parseInt(armor.cap, 10); return base + Math.min(mod(armor.ability), Number.isFinite(cap) ? cap : 2); }
    if (armor.mode === "dual") return base + mod(armor.ability) + mod(armor.abilityB);
    return base;
  };

  const normalizeArmor = (armor = {}) => {
    const type = isBonusArmor(armor.type) ? "Shield" : armor.type;
    const mode = ["fixed", "ability", "abilityCapped", "dual"].includes(armor.mode) ? armor.mode : "fixed";
    const legacyTimes = armor.don || armor.doff ? [] : `${armor.dondoff || ""}`.split("/");
    return {
      name: armor.name || "",
      type: ["Light", "Medium", "Heavy", "Shield", "Other"].includes(type) ? type : "Light",
      bonus: armor.bonus === undefined || armor.bonus === null || `${armor.bonus}`.trim() === "" ? (type === "Shield" ? "2" : "") : `${armor.bonus}`,
      bonusAbility: ["none", "STR", "DEX", "CON", "INT", "WIS", "CHA"].includes(armor.bonusAbility) ? armor.bonusAbility : "none",
      mode,
      baseAc: armor.baseAc || (mode === "fixed" ? armor.fixedAc : "") || "",
      cap: armor.cap || "2",
      ability: armor.ability || lastArmorAbility,
      abilityB: armor.abilityB || "CON",
      reqEnabled: armor.reqEnabled === true,
      reqAbility: armor.reqAbility || "STR",
      reqScore: armor.reqScore || "",
      baseAc: armor.baseAc || "",
      equipped: armor.equipped === true,
      stealth: ["neutral", "disadvantage", "advantage"].includes(armor.stealth) ? armor.stealth : "neutral",
      don: armor.don || (legacyTimes[0] || "").trim(),
      doff: armor.doff || (legacyTimes[1] || "").trim(),
      ac: "", modeText: "", stealthText: "", reqText: ""
    };
  };

  const refreshArmorEditor = () => {
    const isBonus = armorTypeInput.value === "Shield";
    const mode = armorModeInput.value;
    armorModeInput.closest(".field").hidden = isBonus;
    armorBonusField.hidden = !isBonus;
    armorBonusAbilityField.hidden = !isBonus;
    armorAbilityField.hidden = isBonus || !(mode === "ability" || mode === "abilityCapped");
    armorAbilityBField.hidden = isBonus || mode !== "dual";
    armorCapField.hidden = isBonus || mode !== "abilityCapped";
    armorReqFields.hidden = !armorReqToggle.checked;
    if (isBonus) {
      const bonus = computeArmorAC({ type: armorTypeInput.value, bonus: armorBonusInput.value || "2", bonusAbility: armorBonusAbilityInput.value }, characterAbilityModifier);
      armorAcPreview.value = bonus === null ? "" : `${equippedBaseAC() + bonus}`;
      return;
    }
    const ac = computeArmorAC({ mode, baseAc: armorBaseAcInput.value, cap: armorCapInput.value, ability: armorAbilityInput.value, abilityB: armorAbilityBInput.value }, characterAbilityModifier);
    armorAcPreview.value = ac === null ? "" : `${ac}`;
  };

  const updateArmorCard = (card, armor) => {
    const parts = [];
    if (armor.ac) parts.push(isBonusArmor(armor.type) ? `AC ${signedBonus(armor.ac)}` : `AC ${armor.ac}`);
    if (armor.stealthText) parts.push(armor.stealthText);
    if (armor.reqText) parts.push(armor.reqText);
    card.querySelector(".armor-title").textContent = armor.name || "Unnamed armor";
    card.querySelector(".armor-line").textContent = parts.join(" · ") || "Set an AC to finish this piece.";
    card.querySelector(".armor-type-tag").textContent = armor.type;
    card.querySelector(".armor-mode-tag").textContent = armor.modeText;
    card.classList.toggle("equipped", armor.equipped);
    const equippedTag = card.querySelector(".armor-equipped-tag");
    equippedTag.hidden = !armor.equipped;
    equippedTag.textContent = "Equipped";
    card.querySelector(".equip-armor").textContent = armor.equipped ? "Unequip" : "Equip";
    const donTag = card.querySelector(".armor-don-tag");
    const doffTag = card.querySelector(".armor-doff-tag");
    donTag.hidden = !armor.don;
    donTag.textContent = `Don ${armor.don}`;
    doffTag.hidden = !armor.doff;
    doffTag.textContent = `Doff ${armor.doff}`;
    const baseTag = card.querySelector(".armor-base-tag");
    baseTag.hidden = !armor.baseAc || armor.mode === "fixed";
    baseTag.textContent = `Base AC ${armor.baseAc}`;
  };

  const updateEquippedAC = () => {
    const input = document.querySelector('[name="armor-class"]');
    if (!input) return;
    const equippedArmor = armors.find((armor) => armor.equipped && !isBonusArmor(armor.type));
    const equippedShield = armors.find((armor) => armor.equipped && isBonusArmor(armor.type));
    const base = equippedArmor && equippedArmor.ac ? Number.parseInt(equippedArmor.ac, 10) : null;
    const bonus = equippedShield && equippedShield.ac ? Number.parseInt(equippedShield.ac, 10) : null;
    const total = base === null && bonus === null ? null : (base === null ? 10 : base) + (bonus || 0);
    if (total !== null) {
      input.value = `${total}`;
      input.readOnly = true;
      input.setAttribute("aria-readonly", "true");
    } else {
      if (input.readOnly) input.value = "";
      input.readOnly = false;
      input.removeAttribute("aria-readonly");
    }
  };

  const updateArmorACs = () => {
    armors.forEach((armor) => {
      const ac = computeArmorAC(armor, characterAbilityModifier);
      armor.ac = ac === null ? "" : `${ac}`;
      armor.modeText = isBonusArmor(armor.type) ? `Bonus ${armor.bonus || 0}${armor.bonusAbility && armor.bonusAbility !== "none" ? ` (${armor.bonusAbility})` : ""}` : armor.mode === "abilityCapped" && Number.isFinite(Number.parseInt(armor.cap, 10)) ? `Base + Ability (max +${Number.parseInt(armor.cap, 10)})` : armorModeText[armor.mode] || "Flat AC";
      armor.stealthText = armor.stealth === "disadvantage" ? "Disadvantage on Stealth" : armor.stealth === "advantage" ? "Advantage on Stealth" : "";
      armor.reqText = armor.reqEnabled ? `Requires ${armor.reqAbility} ${armor.reqScore}` : "";
    });
    armorList.querySelectorAll(".armor-card").forEach((card, index) => {
      if (armors[index]) updateArmorCard(card, armors[index]);
    });
    updateEquippedAC();
  };

  const renderArmors = () => {
    armorList.replaceChildren();
    armors.forEach((armor, index) => {
      const fragment = armorTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".armor-card");
      updateArmorCard(card, armor);
      card.querySelector(".equip-armor").addEventListener("click", () => {
        const bonusSlot = isBonusArmor(armor.type);
        armors.forEach((entry, entryIndex) => {
          if (entryIndex === index) entry.equipped = !armor.equipped;
          else if (isBonusArmor(entry.type) === bonusSlot) entry.equipped = false;
        });
        updateArmorACs();
        renderArmors();
        persistDraft();
        setStatus(armors[index].equipped ? `Equipped ${armor.name || "armor"}` : "Armor unequipped");
      });
      card.querySelector(".edit-armor").addEventListener("click", () => openArmorEditor(index));
      card.querySelector(".remove-armor").addEventListener("click", () => {
        armors.splice(index, 1);
        updateArmorACs();
        renderArmors();
        persistDraft();
        setStatus("Armor removed");
      });
      armorList.appendChild(fragment);
    });
    armorEmpty.hidden = armors.length > 0;
  };

  const setArmors = (list) => {
    armors = (Array.isArray(list) ? list : []).map(normalizeArmor);
    updateArmorACs();
    renderArmors();
  };

  const openArmorEditor = (index = null) => {
    editingArmorIndex = index;
    const armor = index === null ? {} : armors[index];
    armorNameInput.value = armor.name || "";
    armorTypeInput.value = isBonusArmor(armor.type) ? "Shield" : (armor.type || "Light");
    armorBonusInput.value = isBonusArmor(armor.type) ? (armor.bonus || "2") : "";
    armorBonusAbilityInput.value = armor.bonusAbility || "none";
    armorModeInput.value = armor.mode || "fixed";
    armorBaseAcInput.value = armor.baseAc || "";
    armorAbilityInput.value = armor.ability || "DEX";
    armorAbilityBInput.value = armor.abilityB || "CON";
    armorStealthInput.value = armor.stealth || "neutral";
    armorDonInput.value = armor.don || "";
    armorDoffInput.value = armor.doff || "";
    armorBaseAcInput.value = armor.baseAc || "";
    armorReqToggle.checked = armor.reqEnabled === true;
    armorReqAbilityInput.value = armor.reqAbility || "STR";
    armorReqScoreInput.value = armor.reqScore || "";
    armorAbilityInput.value = armor.ability || lastArmorAbility;
    refreshArmorEditor();
    armorEditor.hidden = false;
    armorNameInput.focus();
  };

  const closeArmorEditor = () => {
    editingArmorIndex = null;
    armorEditor.hidden = true;
    armorNameInput.value = "";
    armorTypeInput.value = "Light";
    armorBonusInput.value = "";
    armorBonusAbilityInput.value = "none";
    armorModeInput.value = "fixed";
    armorBaseAcInput.value = "";
    armorAbilityInput.value = "DEX";
    armorAbilityBInput.value = "CON";
    armorStealthInput.value = "neutral";
    armorDonInput.value = "";
    armorDoffInput.value = "";
    armorBaseAcInput.value = "";
    armorReqToggle.checked = false;
    armorReqAbilityInput.value = "STR";
    armorReqScoreInput.value = "";
    armorAbilityInput.value = lastArmorAbility;
    refreshArmorEditor();
  };

  const collectArmors = () => armors.map((armor) => ({
    name: armor.name,
    type: armor.type,
    bonus: armor.bonus,
    bonusAbility: armor.bonusAbility,
    mode: armor.mode,
    baseAc: armor.baseAc,
    cap: armor.cap,
    ability: armor.ability,
    abilityB: armor.abilityB,
    reqEnabled: armor.reqEnabled,
    reqAbility: armor.reqAbility,
    reqScore: armor.reqScore,
    stealth: armor.stealth,
    don: armor.don,
    doff: armor.doff,
    baseAc: armor.baseAc,
    equipped: armor.equipped,
    ac: armor.ac,
    modeText: armor.modeText,
    stealthText: armor.stealthText,
    reqText: armor.reqText
  }));

  const addCustomField = (section, data = {}) => {
    const container = document.querySelector(`[data-custom-fields-for="${section}"]`);
    if (!container) return;
    const kind = data.kind || (section === "abilities" ? "ability" : "field");
    let row;
    if (kind === "ability") {
      row = customAbilityTemplate.content.cloneNode(true).firstElementChild;
      row.querySelector(".custom-ability-name").value = data.name || "";
      row.querySelector(".custom-ability-abbr").value = data.abbr || "";
      if (data.value !== undefined && `${data.value}`.trim() !== "") row.querySelector(".custom-ability-score").value = data.value;
      row.querySelector(".custom-ability-save").checked = data.saveProficient === true;
      syncAbilityKeys(row);
      row.querySelector(".custom-ability-score").addEventListener("input", () => {
        updateModifiers();
        updateCharacterAttackBonuses();
        updateArmorACs();
        updateSpellcastingStats();
      });
      row.querySelector(".custom-ability-save").addEventListener("change", updateModifiers);
      row.querySelector(".custom-ability-abbr").addEventListener("input", () => {
        const oldKey = row.dataset.abilityKey || "";
        const newKey = customAbilityKey(row);
        syncAbilityKeys(row);
        const holders = oldKey ? [...document.querySelectorAll(".skill-ability, .skill-alt-ability, .tool-ability, .weapon-ability, #attack-ability, #armor-ability, #armor-ability-b, #armor-bonus-ability, #armor-req-ability, #spellcasting-ability")].filter((select) => select.value === oldKey) : [];
        refreshAbilitySelectors();
        remapAbilityData(oldKey, newKey);
        holders.forEach((select) => { select.value = newKey; });
        updateModifiers();
        updateCharacterAttackBonuses();
        updateArmorACs();
        updateSpellcastingStats();
      });
    } else {
      const template = section === "background" ? customFieldTextareaTemplate : customFieldTemplate;
      row = template.content.cloneNode(true).firstElementChild;
      row.querySelector(".custom-field-name").value = data.name || "";
      row.querySelector(".custom-field-value").value = data.value ?? "";
    }
    row.querySelector(".remove-custom-field").addEventListener("click", () => {
      row.remove();
      refreshAbilitySelectors();
      persistDraft();
    });
    container.appendChild(row);
    if (kind === "ability") refreshAbilitySelectors();
  };

  const collectCustomFields = () => [...document.querySelectorAll("[data-custom-fields-for]")].flatMap((container) => [...container.children].filter((row) => row.matches(".custom-field-row, .custom-ability-row")).map((row) => {
    const section = container.dataset.customFieldsFor;
    if (row.classList.contains("custom-ability-row")) {
      return {
        section,
        kind: "ability",
        name: row.querySelector(".custom-ability-name").value,
        value: row.querySelector(".custom-ability-score").value,
        abbr: row.querySelector(".custom-ability-abbr").value,
        saveProficient: row.querySelector(".custom-ability-save").checked
      };
    }
    return {
      section,
      kind: "field",
      name: row.querySelector(".custom-field-name").value,
      value: row.querySelector(".custom-field-value").value
    };
  }));

  const renderCustomFields = (customFields = []) => {
    document.querySelectorAll("[data-custom-fields-for]").forEach((container) => container.replaceChildren());
    customFields.forEach((field) => addCustomField(field.section, { kind: "field", ...field }));
    refreshAbilitySelectors();
  };

  const collectSheet = () => {
    const fields = {};
    document.querySelectorAll('#character-sheet [name], #configuration [name]:not([name="monster-theme"]):not([name="monster-modifier-color"])').forEach((input) => {
      fields[input.name] = input.type === "checkbox" ? (input.checked ? "on" : "") : input.value;
    });
    const features = [...featureList.querySelectorAll(".feature-card")].map((card) => ({
      title: card.dataset.title,
      description: card.dataset.description,
      source: card.dataset.source,
      uses: card.dataset.uses
    }));
    const manualModifiers = {};
    document.querySelectorAll("[data-mod-for]").forEach((output) => { manualModifiers[output.dataset.modFor] = output.value; });
    const manualSaves = {};
    document.querySelectorAll("[data-save-for]").forEach((output) => { manualSaves[output.dataset.saveFor] = output.textContent; });
    return { version: 1, fields, features, attacks: collectAttacks(), armors: collectArmors(), skills: collectSkills(), tools: collectTools(), weapons: collectWeapons(), currencies: collectCurrencies(), customFields: collectCustomFields(), spells: collectSpells(), manualModifiers, manualSaves };
  };

  const resetCharacterFields = () => {
    sheet.reset();
    document.querySelectorAll('#configuration [name]:not([name="monster-theme"]):not([name="monster-modifier-color"])').forEach((input) => {
      if (input.type === "checkbox") input.checked = ["auto-health", "auto-modifiers", "auto-proficiency", "auto-spellcasting"].includes(input.name);
      else if (input.tagName === "SELECT") input.selectedIndex = 0;
      else input.value = "";
    });
    applyTheme("office");
    applyModifierColor("default");
  };

  const applySheet = (data) => {
    if (!data || typeof data !== "object" || !data.fields || !Array.isArray(data.features)) throw new Error("Invalid character sheet");
    resetCharacterFields();
    document.querySelectorAll('#character-sheet [name], #configuration [name]:not([name="monster-theme"]):not([name="monster-modifier-color"])').forEach((input) => {
      if (!Object.prototype.hasOwnProperty.call(data.fields, input.name)) return;
      if (input.type === "checkbox") {
        input.checked = data.fields[input.name] === true || data.fields[input.name] === "on";
      } else {
        input.value = data.fields[input.name];
      }
    });
    applyTheme(data.fields.theme || "office");
    applyModifierColor(data.fields["modifier-color"] || "default");
    featureList.querySelectorAll(".feature-card").forEach((card) => card.remove());
    data.features.forEach((feature) => makeFeature(feature.title, feature.description, feature.source, feature.uses));
    skillList.replaceChildren();
    (Array.isArray(data.skills) ? data.skills : standardSkills.map(([name, ability]) => ({ name, ability, bonus: "", proficient: false, expertise: false, removable: false })))
      .forEach((skill) => addSkill(skill.name, skill.ability, skill.bonus, skill.proficient, skill.expertise, Object.prototype.hasOwnProperty.call(skill, "removable") ? skill.removable : true, Boolean(skill.altEnabled), skill.altAbility || "STR"));
    currencyList.replaceChildren();
    const currencies = Array.isArray(data.currencies) ? data.currencies : [
      { name: "Copper (CP)", amount: data.fields["currency-copper"] || "" },
      { name: "Silver (SP)", amount: data.fields["currency-silver"] || "" },
      { name: "Electrum (EP)", amount: data.fields["currency-electrum"] || "" },
      { name: "Gold (GP)", amount: data.fields["currency-gold"] || "" }
    ];
    currencies.forEach((currency) => addCurrency(currency.name, currency.amount));
    renderCustomFields(Array.isArray(data.customFields) ? data.customFields : []);
    const spellAbilitySelect = document.querySelector('[name="spellcasting-ability"]');
    if (spellAbilitySelect && data.fields?.["spellcasting-ability"]) spellAbilitySelect.value = data.fields["spellcasting-ability"];
    (Array.isArray(data.skills) ? data.skills : []).forEach((skill, index) => {
      const row = skillList.querySelectorAll(".skill-row")[index];
      if (!row) return;
      row.querySelector(".skill-ability").value = skill.ability || "STR";
      if (skill.altEnabled && skill.altAbility) row.querySelector(".skill-alt-ability").value = skill.altAbility;
    });
    toolList.replaceChildren();
    if (Array.isArray(data.tools)) {
      data.tools.forEach((tool) => addTool(tool.name || "", tool.ability || ""));
    } else if (String(data.fields?.["tool-proficiencies"] || "").trim()) {
      String(data.fields["tool-proficiencies"]).split(",").map((name) => name.trim()).filter(Boolean).forEach((name) => addTool(name, ""));
    }
    weaponList.replaceChildren();
    if (Array.isArray(data.weapons)) {
      data.weapons.forEach((weapon) => addWeapon(weapon.name || "", weapon.ability || ""));
    } else if (String(data.fields?.["weapon-proficiencies"] || "").trim()) {
      String(data.fields["weapon-proficiencies"]).split(",").map((name) => name.trim()).filter(Boolean).forEach((name) => addWeapon(name, ""));
    }
    attackList.replaceChildren();
    setAttacks(Array.isArray(data.attacks) ? data.attacks : []);
    setArmors(Array.isArray(data.armors) ? data.armors : []);
    spellList.replaceChildren();
    (Array.isArray(data.spells) ? data.spells : []).forEach(addSpell);
    Object.entries(data.manualModifiers || {}).forEach(([ability, value]) => {
      const output = document.querySelector(`[data-mod-for="${ability}"]`);
      if (output) output.value = value;
    });
    Object.entries(data.manualSaves || {}).forEach(([ability, value]) => {
      const output = document.querySelector(`[data-save-for="${ability}"]`);
      if (output) output.textContent = value;
    });
    syncArmorProficiencies();
    updateModifiers();
    syncManualOverrides();
    updateSpellcastingVisibility();
    updateEmptyState();
  };

  const getHitDice = (fields) => {
    const level = Number.parseInt(fields.level, 10);
    const size = String(fields["hit-dice-size"] || "").trim();
    if (!Number.isFinite(level) || level < 1 || !size) return "";
    return `${level}d${size}`;
  };
  const fileName = (extension) => {
    const name = sheet.querySelector('[name="character-name"]').value.trim() || "character-sheet";
    return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "character-sheet"}.${extension}`;
  };

  const makeSheetPdf = (data) => {
    const fields = data.fields;
    const pdfValue = (value) => {
      const text = String(value ?? "").trim();
      return text || "null";
    };
    const section = (title) => [``, title];
    const lines = [
      pdfValue(fields["character-name"]),
      `${pdfValue(fields.class)}${fields.subclass ? ` (${fields.subclass})` : ""} · Level ${pdfValue(fields.level)} · ${pdfValue(fields.species)}`,
      `Background: ${pdfValue(fields.background)}`,
      `Size: ${pdfValue(fields.size)}  Creature type: ${pdfValue(fields["creature-type"])}`,
      ...section("ABILITY SCORES"),
      ...["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].map((name) => `${name[0].toUpperCase()}${name.slice(1)}: ${pdfValue(fields[name])}`),
      ...section("COMBAT"),
      `AC ${pdfValue(fields["armor-class"])}  Initiative ${pdfValue(fields.initiative)}  Speed ${pdfValue(fields.speed)}`,
      `HP ${pdfValue(fields["current-hp"])} / ${pdfValue(fields["max-hp"])}  Hit dice ${pdfValue(getHitDice(fields))}`,
      `Proficiency bonus: ${pdfValue(fields["proficiency-bonus"])}`,
      ...((data.attacks || []).some((attack) => String(attack.name || "").trim()) ? [
        ...section("ATTACK REFERENCE"),
        ...(data.attacks || []).map((attack) => [attack.name, attack.bonus ? (attack.kind === "save" ? `DC ${attack.bonus}` : `${attack.bonus} to hit`) : "", composeDamage(attack.damage, attack.damageBonus), attack.type, attack.range, attack.notes].filter((part) => String(part || "").trim()).join(" · "))
      ] : []),
      ...((data.armors || []).some((armor) => String(armor.name || "").trim()) ? [
        ...section("ARMOR"),
        ...(data.armors || []).map((armor) => [armor.name, armor.equipped ? "Equipped" : "", armor.ac ? (isBonusArmor(armor.type) ? `AC ${signedBonus(armor.ac)}` : `AC ${armor.ac}`) : "", armor.baseAc ? `Base AC ${armor.baseAc}` : "", armor.type, armor.modeText, armor.stealthText, armor.reqText, armor.don ? `Don ${armor.don}` : "", armor.doff ? `Doff ${armor.doff}` : ""].filter((part) => String(part || "").trim()).join(" · "))
      ] : []),
      `Armor: ${pdfValue(["armor-light", "armor-medium", "armor-heavy", "armor-shields"].filter((name) => fields[name] === "on").map((name) => name.replace("armor-", "")).join(", "))}`,
      `Saving throw proficiencies: ${pdfValue(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].filter((name) => fields[`${name}-save-proficient`] === "on").join(", "))}`,
      ...section("FEATURES & TRAITS"),
      ...data.features.flatMap((feature) => [pdfValue(feature.title), `${pdfValue(feature.source)} · ${pdfValue(feature.uses)}`, pdfValue(feature.description), ""]),
      "SKILL PROFICIENCIES",
      ...(data.skills || []).map((skill) => `${pdfValue(skill.name)}: ${pdfValue(skill.ability)} ${pdfValue(skill.bonus)}${skill.proficient ? skill.expertise ? " (Expertise)" : " (Proficient)" : ""}`),
      ...((data.weapons || []).filter((weapon) => String(weapon.name || "").trim()).length ? [
        `Weapon proficiencies: ${(data.weapons || []).filter((weapon) => String(weapon.name || "").trim()).map((weapon) => {
          const name = pdfValue(weapon.name);
          const ability = String(weapon.ability || "").trim().toUpperCase();
          const bonus = String(weapon.bonus || "").trim();
          if (!ability) return name;
          return `${name}: ${ability} ${bonus}`;
        }).join(", ")}`
      ] : [`Weapon proficiencies: ${pdfValue(fields["weapon-proficiencies"])}`]),
      ...((data.tools || []).filter((tool) => String(tool.name || "").trim()).length ? [
        `Tool proficiencies: ${(data.tools || []).filter((tool) => String(tool.name || "").trim()).map((tool) => {
          const name = pdfValue(tool.name);
          const ability = String(tool.ability || "").trim().toUpperCase();
          const bonus = String(tool.bonus || "").trim();
          if (!ability) return name;
          return `${name}: ${ability} ${bonus}`;
        }).join(", ")}`
      ] : [`Tool proficiencies: ${pdfValue(fields["tool-proficiencies"])}`]),
      ...section("CHARACTER BACKGROUND"),
      `Appearance: ${pdfValue(fields.appearance)}`,
      `Languages: ${pdfValue(fields.languages)}`,
      `Background story: ${pdfValue(fields["background-story"])}`,
      ...(fields.spellcaster === "on" ? [
        ...section("SPELLCASTING"),
        `Ability: ${pdfValue(fields["spellcasting-ability"])}  Save DC: ${pdfValue(fields["spell-save-dc"])}  Attack: ${pdfValue(fields["spell-attack-bonus"])}`,
        `Caster progression: ${pdfValue(fields["caster-progression"])}`,
        `Maximum spell slots: ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => `${level}:${pdfValue(fields[`spell-slot-${level}`])}`).join("  ")}`,
        ...(data.spells || []).map((spell) => `${pdfValue(spell.name)} (Level ${pdfValue(spell.level)}${spell.school ? `, ${spell.school}` : ""})${spell.prepared ? " [Prepared]" : ""} · Cast: ${pdfValue(spell.castingTime)} · Range: ${pdfValue(spell.range)} · Duration: ${pdfValue(spell.duration)} · ${pdfValue(spell.components)} · ${pdfValue(spell.effects)} · ${pdfValue(spell.reference || [spell.source, spell.page ? `p. ${spell.page}` : ""].filter(Boolean).join(" "))}`),
        `Notes: ${pdfValue(fields["spellcasting-notes"])}`
      ] : []),
      ...section("INVENTORY & CURRENCY"),
      `Inventory: ${pdfValue(fields.inventory)}`,
      ...(data.currencies || []).map((currency) => `${pdfValue(currency.name)}: ${pdfValue(currency.amount)}`),
      ...(data.customFields || []).map((field) => field.kind === "ability" ? `${pdfValue(field.name)}${field.abbr ? ` (${field.abbr})` : ""}: ${pdfValue(field.value)} (${scoreModifierLabel(field.value)})` : `${pdfValue(field.name)}: ${pdfValue(field.value)}`),
      ...section("NOTES"),
      ...(fields.notes || "null").split(/\r?\n/).map(pdfValue)
    ];
    const wrappedLines = lines.flatMap((line) => {
      const text = String(line);
      if (!text) return [""];
      const words = text.split(/\s+/);
      const result = [];
      let current = "";
      words.forEach((word) => {
        if ((current + " " + word).trim().length > 88 && current) {
          result.push(current);
          current = word;
        } else {
          current = `${current} ${word}`.trim();
        }
      });
      if (current) result.push(current);
      return result;
    });
    const linesPerPage = 45;
    const pages = [];
    for (let index = 0; index < wrappedLines.length; index += linesPerPage) pages.push(wrappedLines.slice(index, index + linesPerPage));
    const pageContents = pages.map((pageLines) => {
      let content = ["BT", "/F1 10 Tf", "50 750 Td"];
      pageLines.forEach((line, index) => {
        content.push(`(${pdfEscape(line)}) Tj`);
        content.push(index === pageLines.length - 1 ? "ET" : "0 -15 Td");
      });
      return content.join("\n");
    });
    const metadata = `MANASQUID_SHEET_JSON:${encodeSheet(data)}`;
    const pageObjectNumbers = pages.map((_, index) => 4 + index * 2);
    const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
    pageContents.forEach((content, index) => {
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageObjectNumbers[index] + 1} 0 R >>`);
      objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });
    const infoObjectNumber = objects.length + 1;
    objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pages.length} >>`;
    objects.push(`<< /Title (${pdfEscape(fields["character-name"] || "Character Sheet")}) /Subject (${metadata}) >>`);
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoObjectNumber} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  };

  const readPdfSheet = async (file) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    const match = binary.match(/MANASQUID_SHEET_JSON:([A-Za-z0-9+/=]+)/);
    if (!match) throw new Error("This PDF was not created by Manasquid.");
    return decodeSheet(match[1]);
  };

  const readSavedSheets = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  };

  const writeSavedSheets = (saved) => localStorage.setItem(storageKey, JSON.stringify(saved));

  const renderSavedSheets = () => {
    const savedList = document.querySelector("#saved-list");
    const saved = readSavedSheets();
    savedList.replaceChildren();
    if (!saved.length) {
      savedList.innerHTML = '<span class="saved-empty">No saved characters yet. Save a snapshot to keep a version here.</span>';
      return;
    }
    saved.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "saved-item";
      const date = new Date(entry.updatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
      item.innerHTML = `<div><strong></strong><small>Saved ${date}</small></div><div class="saved-actions"><button class="button load-saved" type="button">Load</button><button class="button subtle delete-saved" type="button">Delete</button></div>`;
      item.querySelector("strong").textContent = entry.name;
      item.querySelector(".load-saved").addEventListener("click", () => {
        applySheet(entry.sheet);
        setStatus(`Loaded ${entry.name}`);
      });
      item.querySelector(".delete-saved").addEventListener("click", () => {
        writeSavedSheets(readSavedSheets().filter((savedEntry) => savedEntry.id !== entry.id));
        renderSavedSheets();
        setStatus("Saved character deleted");
      });
      savedList.appendChild(item);
    });
  };

  document.querySelector("#add-feature").addEventListener("click", () => {
    openFeatureEditor();
  });
  document.querySelector("#add-attack").addEventListener("click", () => {
    openAttackEditor();
  });
  document.querySelector("#cancel-attack").addEventListener("click", closeAttackEditor);
  document.querySelector("#save-attack").addEventListener("click", () => {
    const isEdit = editingAttackIndex !== null;
    const attack = normalizeAttack({
      name: attackNameInput.value.trim() || "Untitled attack",
      kind: attackKindInput.value,
      ability: attackAbilityInput.value,
      damage: attackDamageInput.value.trim(),
      type: attackDamageTypeInput.value.trim(),
      range: attackRangeInput.value.trim(),
      notes: attackNotesInput.value.trim()
    });
    attack.bonus = attackBonusFor(attack);
    if (isEdit) attacks[editingAttackIndex] = attack;
    else attacks.push(attack);
    updateCharacterAttackBonuses();
    renderAttacks();
    closeAttackEditor();
    persistDraft();
    setStatus(isEdit ? "Attack updated" : "Attack added");
  });
  document.querySelector("#add-armor").addEventListener("click", () => openArmorEditor());
  document.querySelector("#cancel-armor").addEventListener("click", closeArmorEditor);
  document.querySelector("#save-armor").addEventListener("click", () => {
    const isEdit = editingArmorIndex !== null;
    const armor = normalizeArmor({
      name: armorNameInput.value.trim() || "Unnamed armor",
      type: armorTypeInput.value,
      bonus: armorBonusInput.value.trim(),
      bonusAbility: armorBonusAbilityInput.value,
      mode: armorModeInput.value,
      baseAc: armorBaseAcInput.value.trim(),
      cap: armorCapInput.value.trim(),
      ability: armorAbilityInput.value,
      abilityB: armorAbilityBInput.value,
      reqEnabled: armorReqToggle.checked,
      reqAbility: armorReqAbilityInput.value,
      reqScore: armorReqScoreInput.value.trim(),
      stealth: armorStealthInput.value,
      don: armorDonInput.value.trim(),
      doff: armorDoffInput.value.trim(),
      baseAc: armorBaseAcInput.value.trim()
    });
    armor.equipped = isEdit ? armors[editingArmorIndex].equipped : false;
    lastArmorAbility = armor.ability;
    if (armor.equipped) armors.forEach((existing) => { if (isBonusArmor(existing.type) === isBonusArmor(armor.type)) existing.equipped = false; });
    if (isEdit) armors[editingArmorIndex] = armor;
    else armors.push(armor);
    updateArmorACs();
    renderArmors();
    closeArmorEditor();
    persistDraft();
    setStatus(isEdit ? "Armor updated" : "Armor added");
  });
  [armorTypeInput, armorModeInput, armorBonusInput, armorBonusAbilityInput, armorAbilityInput, armorAbilityBInput, armorBaseAcInput, armorCapInput, armorReqToggle, armorReqAbilityInput, armorReqScoreInput].forEach((input) => {
    input.addEventListener("input", refreshArmorEditor);
    input.addEventListener("change", refreshArmorEditor);
  });
  document.querySelectorAll('.score, [name="proficiency-bonus"]').forEach((input) => input.addEventListener("input", () => {
    updateCharacterAttackBonuses();
    updateArmorACs();
    refreshArmorEditor();
  }));
  document.querySelector("#add-skill").addEventListener("click", () => {
    addSkill();
    skillList.lastElementChild.querySelector(".skill-name").focus();
    persistDraft();
  });
  document.querySelector("#add-tool").addEventListener("click", () => {
    addTool();
    toolList.lastElementChild?.querySelector(".tool-name")?.focus();
    persistDraft();
  });
  document.querySelector("#add-weapon").addEventListener("click", () => {
    addWeapon();
    weaponList.lastElementChild?.querySelector(".weapon-name")?.focus();
    persistDraft();
  });
  document.querySelector("#add-currency").addEventListener("click", () => {
    addCurrency();
    currencyList.lastElementChild.querySelector(".currency-name").focus();
    persistDraft();
  });
  document.querySelector("#add-spell").addEventListener("click", () => {
    addSpell();
    spellList.lastElementChild.querySelector(".spell-name").focus();
    persistDraft();
  });
  document.querySelectorAll("[data-add-custom-field]").forEach((button) => button.addEventListener("click", () => {
    addCustomField(button.dataset.addCustomField);
    const container = document.querySelector(`[data-custom-fields-for="${button.dataset.addCustomField}"]`);
    container.lastElementChild.querySelector(".custom-field-name, .custom-ability-name")?.focus();
    persistDraft();
  }));
  document.querySelector("#save-feature").addEventListener("click", () => {
    if (editingCard) {
      updateFeatureCard(editingCard);
      setStatus("Feature updated");
    } else {
      makeFeature(
        featureName.value.trim() || "Untitled feature",
        featureDescription.value.trim() || "No description added.",
        featureSource.value.trim() || "Other",
        featureUses.value.trim() || "Always available"
      );
      setStatus("Feature added");
    }
    closeFeatureEditor();
    persistDraft();
  });
  document.querySelector("#cancel-feature").addEventListener("click", () => {
    closeFeatureEditor();
  });
  document.querySelector("#save-character").addEventListener("click", () => {
    document.querySelector("#save-name").focus();
    document.querySelector("#storage-heading").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector("#save-named-sheet").addEventListener("click", () => {
    const nameInput = document.querySelector("#save-name");
    const name = nameInput.value.trim() || sheet.querySelector('[name="character-name"]').value.trim() || "Unnamed character";
    const saved = readSavedSheets();
    const existing = saved.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
    const id = existing?.id || (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    const entry = { id, name, updatedAt: new Date().toISOString(), sheet: collectSheet() };
    writeSavedSheets([entry, ...saved.filter((savedEntry) => savedEntry.id !== entry.id)]);
    nameInput.value = "";
    renderSavedSheets();
    setStatus(`Saved ${name}`);
  });
  document.querySelector("#export-sheet").addEventListener("click", () => {
    downloadFile(new Blob([JSON.stringify(collectSheet(), null, 2)], { type: "application/json" }), fileName("json"));
    setStatus("JSON backup downloaded");
  });
  document.querySelector("#import-sheet").addEventListener("click", () => document.querySelector("#import-file").click());
  document.querySelector("#import-file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
        ? await readPdfSheet(file)
        : JSON.parse(await file.text());
      applySheet(imported);
      persistDraft();
      setStatus(`${file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "JSON"} imported`);
    } catch {
      setStatus("Import failed: choose a Manasquid PDF or sheet JSON");
    }
    event.target.value = "";
  });
  document.querySelectorAll(".score").forEach((input) => input.addEventListener("input", updateModifiers));
  document.querySelectorAll('[name="level"], [name="hit-dice-size"]').forEach((input) => input.addEventListener("input", updateHealth));
  document.querySelector('[name="level"]').addEventListener("input", () => {
    updateProficiencyBonus();
    updateModifiers();
    updateCharacterAttackBonuses();
    updateSpellcastingStats();
  });
  document.querySelector('[name="health-mode"]').addEventListener("change", updateHealth);
  document.querySelectorAll('[name="auto-health"], [name="auto-modifiers"], [name="auto-proficiency"], [name="auto-spellcasting"]').forEach((input) => input.addEventListener("change", () => {
    syncManualOverrides();
    updateModifiers();
    updateHealth();
    updateSpellcastingStats();
    persistDraft();
  }));
  document.querySelector('[name="theme"]').addEventListener("change", () => {
    applyTheme(document.querySelector('[name="theme"]').value);
    persistDraft();
  });
  document.querySelector('[name="modifier-color"]').addEventListener("change", () => {
    applyModifierColor(document.querySelector('[name="modifier-color"]').value, "character");
    persistDraft();
  });
  document.querySelector('[name="allow-odd-hit-dice"]').addEventListener("change", () => {
    updateHitDieRules();
    persistDraft();
  });
  spellcasterToggle.addEventListener("change", () => {
    if (spellcasterToggle.checked) {
      document.querySelector('[name="caster-progression"]').value = "full";
      updateSpellSlots();
    }
    updateSpellcastingVisibility();
    persistDraft();
  });
  document.querySelector('[name="spellcasting-ability"]').addEventListener("change", updateSpellcastingStats);
  document.querySelector('[name="caster-progression"]').addEventListener("change", () => {
    updateSpellSlots();
    persistDraft();
  });
  document.querySelectorAll(".score, [name=\"proficiency-bonus\"]").forEach((input) => input.addEventListener("input", () => {
    updateModifiers();
    updateSpellcastingStats();
  }));
  document.querySelectorAll(".save-proficient, .skill-proficient, .skill-expertise, .skill-ability, [name=\"proficiency-bonus\"]").forEach((input) => input.addEventListener("change", updateModifiers));
  skillList.addEventListener("change", (event) => {
    if (event.target.classList.contains("skill-alt-enabled")) {
      const row = event.target.closest(".skill-row");
      row.querySelector(".skill-alt-ability").hidden = !event.target.checked;
    }
    updateModifiers();
  });
  document.querySelectorAll(".armor-proficient").forEach((input) => input.addEventListener("change", () => {
    if (input.name === "armor-heavy" && input.checked) {
      document.querySelector('[name="armor-medium"]').checked = true;
      document.querySelector('[name="armor-light"]').checked = true;
    } else if (input.name === "armor-medium" && input.checked) {
      document.querySelector('[name="armor-light"]').checked = true;
    } else if (input.name === "armor-light" && !input.checked) {
      document.querySelector('[name="armor-medium"]').checked = false;
      document.querySelector('[name="armor-heavy"]').checked = false;
    } else if (input.name === "armor-medium" && !input.checked) {
      document.querySelector('[name="armor-heavy"]').checked = false;
    }
    syncArmorProficiencies();
    persistDraft();
  }));
  sheet.addEventListener("input", () => {
    persistDraft();
  });
  document.querySelector("#print-sheet").addEventListener("click", () => {
    downloadFile(makeSheetPdf(collectSheet()), fileName("pdf"));
    setStatus("Importable PDF downloaded");
  });
  document.querySelector("#clear-sheet").addEventListener("click", () => {
    if (!window.confirm("Clear all fields and remove every feature?")) return;
    sheet.reset();
    applyTheme("office");
    document.querySelector('[name="theme"]').value = "office";
    spellcasterToggle.checked = false;
    featureList.querySelectorAll(".feature-card").forEach((card) => card.remove());
    skillList.replaceChildren();
    standardSkills.forEach(([name, ability]) => addSkill(name, ability, "", false, false, false));
    toolList.replaceChildren();
    setAttacks([]);
    setArmors([]);
    currencyList.replaceChildren();
    [["Copper (CP)", ""], ["Silver (SP)", ""], ["Electrum (EP)", ""], ["Gold (GP)", ""]].forEach(([name, amount]) => addCurrency(name, amount));
    renderCustomFields();
    spellList.replaceChildren();
    closeFeatureEditor();
    localStorage.removeItem(draftKey);
    updateModifiers();
    syncManualOverrides();
    updateSpellcastingVisibility();
    updateEmptyState();
    setStatus("Sheet cleared");
  });

  try {
    const draft = JSON.parse(localStorage.getItem(draftKey) || "null");
    if (draft) applySheet(draft);
    else {
      standardSkills.forEach(([name, ability]) => addSkill(name, ability, "", false, false, false));
      standardWeapons.forEach(([name, ability]) => addWeapon(name, ability));
    }
  } catch { setStatus("Could not restore browser draft"); }
  updateCharacterAttackBonuses();
  renderSavedSheets();
  updateModifiers();
  syncManualOverrides();
  updateHitDieRules();
  updateSpellcastingVisibility();
  try { scrapNotes.value = localStorage.getItem(scrapKey) || ""; } catch { setStatus("Could not restore scrap sheet"); }
  applyTheme(document.querySelector('[name="theme"]').value || "office");
  applyModifierColor(document.querySelector('[name="modifier-color"]').value || "default", "character");
})();
