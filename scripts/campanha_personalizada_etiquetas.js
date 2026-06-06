/**
 * CW SheetCampaign — v5.10
 * Importa contatos via CSV no modal de campanhas do WhatsApp
 * e aplica uma etiqueta preservando as etiquetas existentes.
 */
(function () {
  if (window.__cwSheetCampaign_v510) return;
  window.__cwSheetCampaign_v510 = true;

  const ALLOWED_ACCOUNTS = [];

  const log  = (...a) => console.log("[CW SheetCampaign v5.10]", ...a);
  const wait = (ms)   => new Promise(r => setTimeout(r, ms));
  const uniq = (arr)  => [...new Set((arr || []).map(s => (s || "").trim()).filter(Boolean))];

  function accountId() {
    return parseInt((location.pathname.match(/accounts\/(\d+)/) || [])[1]) || null;
  }
  function isAllowedAccount() {
    const acc = accountId();
    if (ALLOWED_ACCOUNTS.length === 0) return true;
    return !!acc && ALLOWED_ACCOUNTS.includes(acc);
  }

  const currentAccount = accountId();
  if (!currentAccount) log("Account ID ainda não detectado. Aguardando rota...");
  else if (!isAllowedAccount()) log(`Account ID ${currentAccount} não autorizado.`);
  else log(`Account ID ${currentAccount} autorizado. Script carregado.`);

  async function api(path, method = "GET", body = null) {
    const acc = accountId();
    if (!acc) throw new Error("AccountId não detectado.");
    try {
      const resp = await window.axios({
        url: `/api/v1/accounts/${acc}/${path}`,
        method: method.toLowerCase(),
        data: body || undefined,
        withCredentials: true
      });
      return resp.data ?? {};
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.message
        || err?.response?.data?.error
        || JSON.stringify(err?.response?.data || {}).slice(0, 120);
      throw new Error(`API ${method} /${path} falhou [${status || "?"}]: ${detail || err.message}`);
    }
  }

  async function ensureLabel(title, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const data = await api("labels", "GET");
        const list = data?.payload || data?.data || data || [];
        let found = Array.isArray(list) ? list.find(l => (l.title || l.name) === title) : null;
        if (!found) {
          const created = await api("labels", "POST", { title, color: "#016624" });
          const payload = created?.payload || created?.data || created || {};
          found = payload.label || payload || {};
        }
        return { id: found.id, title: (found.title || found.name || title) };
      } catch (e) {
        if (attempt === retries) throw e;
        await wait(600 * attempt);
      }
    }
  }

  function getContactId(obj) {
    return obj?.id || obj?.contact_id || obj?.payload?.id || obj?.payload?.contact_id ||
           obj?.payload?.contact?.id || obj?.data?.id || obj?.data?.contact?.id ||
           obj?.resource?.id || obj?.resource?.contact?.id || obj?.contact?.id || null;
  }

  function normalizePhone(raw) {
    if (!raw) return "";
    let p = (raw + "").trim().replace(/[^\d]/g, "");
    if (!p) return "";
    if (!p.startsWith("55")) p = "55" + p;
    return "+" + p;
  }

  async function getContactLabels(contactId) {
    try {
      const data = await api(`contacts/${contactId}/labels`, "GET");
      const labels = data?.payload || data?.data || data || [];
      if (Array.isArray(labels)) {
        return labels.map(l => typeof l === "string" ? l : (l?.title || l?.name || "")).filter(Boolean);
      }
      return [];
    } catch (e) {
      log(`Erro ao buscar labels do contato ${contactId}:`, e.message);
      return [];
    }
  }

  function phoneMatchesContact(contact, normalizedPhone) {
    return [
      contact?.phone_number,
      contact?.phone,
      contact?.additional_attributes?.phone_number
    ].map(p => normalizePhone(p || "")).filter(Boolean).includes(normalizedPhone);
  }

  async function findContactByPhone(phone) {
    const res = await api(`contacts/search?q=${encodeURIComponent(phone)}`, "GET");
    const arr = res?.payload || res?.data || [];
    if (!Array.isArray(arr)) return null;
    const matched = arr.find(c => phoneMatchesContact(c, phone));
    if (!matched) return null;
    const id = getContactId(matched);
    if (!id) return null;
    const labels = await getContactLabels(id);
    return { id, labels: uniq(labels) };
  }

  async function attachLabel(contactId, labelTitle, existingLabels = []) {
    const hasLabel = (existingLabels || []).some(
      l => (l || "").toLowerCase() === (labelTitle || "").toLowerCase()
    );
    if (hasLabel) return { alreadyHad: true, success: false };
    await api(`contacts/${contactId}/labels`, "POST", { labels: uniq([...(existingLabels || []), labelTitle]) });
    return { alreadyHad: false, success: true };
  }

  async function withRetry(fn, retries = 2) {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try { return await fn(); } catch (e) {
        if (attempt > retries) throw e;
        await wait(400 * attempt);
      }
    }
  }

  function validateCSV(text) {
    const errors = [];
    if (!text || text.trim().length === 0) { errors.push("Arquivo vazio"); return { valid: false, errors }; }
    const delimiter = text.includes(";") ? ";" : ",";
    const rows = text.split(/\r?\n/).map(r => r.split(delimiter)).filter(r => r.join("").trim() !== "");
    if (!rows.length) { errors.push("CSV sem dados válidos"); return { valid: false, errors }; }
    const header = rows[0].map(h => h.trim().toLowerCase());
    if (!header.some(h => ["phone_number", "telefone", "phone"].includes(h))) {
      errors.push("Cabeçalho obrigatório ausente: phone_number");
      return { valid: false, errors };
    }
    const dataRows = rows.slice(1);
    if (!dataRows.length) { errors.push("CSV sem linhas de dados"); return { valid: false, errors }; }
    if (dataRows.length > 1000) {
      errors.push(`Muitos contatos! Máximo: 1.000 | Seu arquivo: ${dataRows.length}`);
      errors.push("⚠️ Divida seu arquivo em partes menores para evitar sobrecarga.");
      return { valid: false, errors };
    }
    const warnings = [];
    if (dataRows.length > 500) warnings.push(`⚠️ Atenção: ${dataRows.length} contatos é bastante. Recomendo dividir.`);
    return { valid: true, errors: [], warnings, rows, header };
  }

  function findNativeCreateBtn() {
    return Array.from(document.querySelectorAll("button,[role='button'],a"))
      .find(el => (el.textContent || "").toLowerCase().includes("criar campanha")) || null;
  }

  function humanClick(el) {
    if (!el) return false;
    try {
      ["pointerdown", "mousedown", "mouseup", "click"].forEach(ev =>
        el.dispatchEvent(new MouseEvent(ev, { bubbles: true }))
      );
      return true;
    } catch { try { el.click(); return true; } catch { return false; } }
  }

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
    if (r.width < 200 || r.height < 150) return false;
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    return !(r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw);
  }

  function isWhatsAppCampaignsPage() {
    if (!isAllowedAccount()) return false;
    if (!(location.pathname || "").toLowerCase().includes("/campaigns")) return false;
    const all = Array.from(document.querySelectorAll("*"));
    const hasTitle = all.some(el => (el.textContent || "").trim().toLowerCase() === "campanhas do whatsapp");
    const hasWpp   = all.some(el => (el.textContent || "").trim().toLowerCase() === "whatsapp");
    return hasTitle && hasWpp;
  }

  function findCampaignModalByText() {
    const mustHave = ["criar campanha do whatsapp", "modelo do whatsapp", "público"];
    const candidates = Array.from(document.querySelectorAll("div,section,main,form,article"))
      .filter(isVisible)
      .map(el => {
        const txt = (el.innerText || "").toLowerCase();
        const score = mustHave.reduce((s, k) => s + (txt.includes(k) ? 1 : 0), 0);
        const r = el.getBoundingClientRect();
        return { el, score, area: r.width * r.height };
      })
      .filter(x => x.score >= 2)
      .sort((a, b) => (b.score - a.score) || (a.area - b.area));
    for (const c of candidates) {
      if (c.el.querySelector("input,select,textarea,button")) return c.el;
    }
    return candidates[0]?.el || null;
  }

  async function waitForCampaignModal(timeout = 9000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const m = findCampaignModalByText();
      if (m) return m;
      await wait(120);
    }
    return null;
  }

  function findPublicoBlock(modal) {
    const nodes = Array.from(modal.querySelectorAll("label,div,span,p,strong,h1,h2,h3"));
    const pub = nodes.find(el => (el.textContent || "").trim().toLowerCase() === "público");
    if (pub) {
      let c = pub;
      for (let i = 0; i < 10 && c && c !== modal; i++) {
        const t = (c.innerText || "").toLowerCase();
        if (t.includes("selecionar etiquetas") || t.includes("etiquetas dos clientes") || t.includes("público")) return c;
        c = c.parentElement;
      }
      return pub.parentElement || pub;
    }
    const el2 = Array.from(modal.querySelectorAll("div,button,input"))
      .find(el => (el.innerText || el.value || "").toLowerCase().includes("selecionar etiquetas"));
    return el2 ? (el2.closest("div") || el2) : null;
  }

  function lockPublicoBlock(publicoBlock) {
    if (!publicoBlock) return false;
    const overlay = document.createElement("div");
    overlay.id = "cw-publico-overlay";
    overlay.title = "Clique em 'Etiquetar e Continuar' antes de selecionar o Público";
    overlay.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      z-index:999;cursor:not-allowed;background:rgba(255,255,255,0.55);
      border-radius:8px;display:flex;align-items:center;justify-content:center;
    `;
    overlay.innerHTML = `<small style="color:#92400e;background:#fef3c7;padding:4px 8px;border-radius:6px;font-size:11px;text-align:center;">
      ⚠️ Etiquete os contatos primeiro
    </small>`;
    publicoBlock.style.position = "relative";
    publicoBlock.appendChild(overlay);
    return true;
  }

  function unlockPublicoBlock() {
    document.getElementById("cw-publico-overlay")?.remove();
  }

  function buildWrap() {
    const wrap = document.createElement("div");
    wrap.id = "cw-sheet-wrap";
    wrap.style.cssText = "margin-top:12px;margin-bottom:12px;";
    wrap.innerHTML = `
      <div style="border:2px dashed #016624;padding:14px;border-radius:10px;background:#f7fff9;">

        <div id="cw-pending-warning" style="display:none;margin-bottom:12px;padding:10px;background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;color:#92400e;font-size:12px;font-weight:600;">
          ⚠️ Você preencheu o CSV mas ainda não etiquetou os contatos. Clique em "Etiquetar e Continuar" antes de criar a campanha.
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
          <strong style="font-size:14px;color:#0f3d22;">📄 Importar CSV (Personalizada)</strong>
          <span style="font-size:12px;color:#2b5d3f;">colunas: <code>name, email, phone_number, city, company_name</code></span>
        </div>

        <label style="display:block;margin-bottom:6px;font-weight:600;color:#374151;font-size:13px;">
          Nome da Etiqueta <span style="color:#dc2626;">*</span>
        </label>
        <input id="cw-label-name" placeholder="Ex: blackfriday, leads2025..."
          style="width:100%;border:2px solid #cfe8d6;padding:8px;border-radius:8px;background:#fff;font-size:13px;">
        <div id="cw-space-warning" style="display:none;margin-top:6px;padding:8px;background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;">
          <small style="color:#92400e;">⚠️ Espaços não são permitidos. Use hífen (-) ou underscore (_).</small>
        </div>

        <label style="display:block;margin-top:12px;margin-bottom:6px;font-weight:600;color:#374151;font-size:13px;">
          Arquivo CSV <span style="color:#dc2626;">*</span>
        </label>
        <input type="file" id="cw-csv" accept=".csv"
          style="width:100%;border:2px dashed #cfe8d6;padding:8px;border-radius:8px;background:#fff;cursor:pointer;">

        <div id="cw-preview" style="display:none;margin-top:10px;padding:10px;background:#f3f4f6;border-radius:6px;">
          <strong style="color:#374151;font-size:13px;">📋 Prévia:</strong>
          <p id="cw-preview-count" style="margin:4px 0 0 0;color:#6b7280;font-size:13px;"></p>
        </div>

        <div id="cw-warning" style="display:none;margin-top:10px;padding:10px;background:#fff7ed;border:1px solid #fdba74;border-radius:8px;color:#9a3412;font-size:12px;"></div>

        <div id="cw-progress" style="display:none;margin-top:10px;">
          <div style="height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden;">
            <div id="cw-progress-bar" style="height:8px;width:0%;background:#016624;transition:width .25s;"></div>
          </div>
          <small id="cw-progress-text" style="display:block;margin-top:6px;color:#4b5563;">0%</small>
        </div>

        <button id="cw-cancel-btn" type="button"
          style="display:none;margin-top:10px;padding:6px 12px;border:1px solid #dc2626;background:#fff;color:#dc2626;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">
          ⏸️ Cancelar Processamento
        </button>

        <small id="cw-status" style="display:block;margin-top:8px;color:#374151;">Preencha os campos acima para começar.</small>

        <details id="cw-errors" style="display:none;margin-top:10px;padding:10px;background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;">
          <summary style="cursor:pointer;font-weight:bold;color:#92400e;">⚠️ Erros (<span id="cw-error-count">0</span>)</summary>
          <div id="cw-error-list" style="margin-top:8px;font-size:12px;color:#92400e;max-height:160px;overflow:auto;"></div>
        </details>

        <button id="cw-confirm-btn" type="button" disabled
          style="margin-top:14px;width:100%;padding:10px;background:#059669;color:white;border:none;border-radius:8px;cursor:not-allowed;font-weight:700;font-size:14px;opacity:0.5;">
          🏷️ Etiquetar e Continuar
        </button>

      </div>
    `;
    return wrap;
  }

  function bindWrapLogic(wrap, publicoBlock) {
    const labelInput    = wrap.querySelector("#cw-label-name");
    const fileInput     = wrap.querySelector("#cw-csv");
    const confirmBtn    = wrap.querySelector("#cw-confirm-btn");
    const cancelBtn     = wrap.querySelector("#cw-cancel-btn");
    const status        = wrap.querySelector("#cw-status");
    const pWrap         = wrap.querySelector("#cw-progress");
    const pBar          = wrap.querySelector("#cw-progress-bar");
    const pTxt          = wrap.querySelector("#cw-progress-text");
    const warning       = wrap.querySelector("#cw-warning");
    const spaceWarning  = wrap.querySelector("#cw-space-warning");
    const preview       = wrap.querySelector("#cw-preview");
    const previewCount  = wrap.querySelector("#cw-preview-count");
    const errorsBox     = wrap.querySelector("#cw-errors");
    const errorList     = wrap.querySelector("#cw-error-list");
    const errorCount    = wrap.querySelector("#cw-error-count");
    const pendingWarn   = wrap.querySelector("#cw-pending-warning");

    let contactsToProcess = [];
    let cancelFlag = { value: false };
    let etiquetado = false;

    const lockedByOverlay = lockPublicoBlock(publicoBlock);

    function updatePendingWarning() {
      if (!lockedByOverlay && contactsToProcess.length > 0 && !etiquetado) {
        pendingWarn.style.display = "block";
      } else {
        pendingWarn.style.display = "none";
      }
    }

    function checkForm() {
      const label    = (labelInput.value || "").trim();
      const hasSpace = label.includes(" ");
      spaceWarning.style.display   = (hasSpace && label.length > 0) ? "block" : "none";
      labelInput.style.borderColor = (hasSpace && label.length > 0) ? "#fbbf24" : "#cfe8d6";
      const canConfirm = label && !hasSpace && contactsToProcess.length > 0;
      confirmBtn.disabled      = !canConfirm;
      confirmBtn.style.opacity = canConfirm ? "1" : "0.5";
      confirmBtn.style.cursor  = canConfirm ? "pointer" : "not-allowed";
    }

    labelInput.addEventListener("input", (e) => {
      const pos = e.target.selectionStart;
      e.target.value = e.target.value.toLowerCase();
      e.target.setSelectionRange(pos, pos);
      checkForm();
      updatePendingWarning();
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      contactsToProcess = [];
      etiquetado = false;
      preview.style.display   = "none";
      warning.style.display   = "none";
      errorsBox.style.display = "none";
      errorList.innerHTML     = "";
      status.textContent      = "📋 Validando CSV...";

      const text       = await file.text();
      const validation = validateCSV(text);

      if (!validation.valid) {
        status.textContent     = "❌ CSV inválido";
        errorList.innerHTML    = validation.errors.map(e => `<div>• ${e}</div>`).join("");
        errorCount.textContent = validation.errors.length;
        errorsBox.style.display = "block";
        checkForm();
        updatePendingWarning();
        return;
      }

      if (validation.warnings?.length) {
        warning.style.display = "block";
        warning.innerHTML     = validation.warnings.map(w => `<div>${w}</div>`).join("");
      }

      const { rows, header } = validation;
      const idxName    = header.findIndex(h => h === "name"    || h === "nome");
      const idxEmail   = header.findIndex(h => h === "email");
      const idxPhone   = header.findIndex(h => ["phone_number", "telefone", "phone"].includes(h));
      const idxCity    = header.findIndex(h => h === "city"    || h === "cidade");
      const idxCompany = header.findIndex(h => ["company_name", "company", "empresa"].includes(h));

      contactsToProcess = rows.slice(1).map((r, idx) => {
        const phone_number = normalizePhone(r[idxPhone]);
        if (!phone_number) return null;
        return {
          name:         (r[idxName]    || "Sem nome").trim(),
          email:        (r[idxEmail]   || "").trim().toLowerCase(),
          phone_number,
          city:         idxCity    !== -1 ? (r[idxCity]    || "").trim() : "",
          company_name: idxCompany !== -1 ? (r[idxCompany] || "").trim() : "",
          rowIndex:     idx + 2
        };
      }).filter(Boolean);

      if (!contactsToProcess.length) {
        status.textContent = "❌ Nenhum telefone válido encontrado";
        checkForm();
        updatePendingWarning();
        return;
      }

      preview.style.display    = "block";
      previewCount.textContent = `${contactsToProcess.length} contatos prontos para etiquetar`;
      status.textContent       = `✅ Arquivo validado. ${contactsToProcess.length} contatos prontos.`;
      checkForm();
      updatePendingWarning();
    });

    confirmBtn.addEventListener("click", async () => {
      if (!contactsToProcess.length || confirmBtn.disabled) return;
      const labelTitle = (labelInput.value || "").trim();
      if (!labelTitle) return;

      cancelFlag     = { value: false };
      cancelBtn.disabled    = false;
      cancelBtn.textContent = "⏸️ Cancelar Processamento";
      labelInput.disabled   = true;
      fileInput.disabled    = true;
      confirmBtn.disabled   = true;
      confirmBtn.style.opacity = "0.5";
      pWrap.style.display      = "block";
      cancelBtn.style.display  = "inline-block";
      errorsBox.style.display  = "none";
      pBar.style.width         = "0%";
      pTxt.textContent         = "0%";
      status.textContent       = `🏷️ Criando/verificando etiqueta "${labelTitle}"...`;

      let labelObj;
      try {
        labelObj = await ensureLabel(labelTitle);
      } catch (e) {
        status.textContent       = `❌ Falha ao criar etiqueta: ${e.message}`;
        cancelBtn.style.display  = "none";
        labelInput.disabled      = false;
        fileInput.disabled       = false;
        confirmBtn.disabled      = false;
        confirmBtn.style.opacity = "1";
        return;
      }

      const errors       = [];
      let processed      = 0;
      let created        = 0;
      let labeled        = 0;
      let alreadyLabeled = 0;

      let BATCH_SIZE  = 2, BATCH_DELAY = 150;
      if      (contactsToProcess.length > 300) { BATCH_SIZE = 1; BATCH_DELAY = 600; }
      else if (contactsToProcess.length > 100) { BATCH_SIZE = 2; BATCH_DELAY = 300; }

      status.textContent = `🔄 Processando 0/${contactsToProcess.length} contatos...`;

      for (let i = 0; i < contactsToProcess.length; i += BATCH_SIZE) {
        if (cancelFlag.value) break;
        const batch = contactsToProcess.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async c => {
          try {
            await withRetry(async () => {
              const existing = await findContactByPhone(c.phone_number);
              let contactId, existingLabels = [];

              if (existing?.id) {
                contactId      = existing.id;
                existingLabels = existing.labels || [];
                const attrs = {};
                if (c.city)         attrs.city         = c.city;
                if (c.company_name) attrs.company_name = c.company_name;
                if (Object.keys(attrs).length) {
                  try { await api(`contacts/${contactId}`, "PUT", { additional_attributes: attrs }); }
                  catch (e) { log(`Aviso: falha ao atualizar atributos de ${c.phone_number}: ${e.message}`); }
                }
              } else {
                const newContact = { name: c.name, email: c.email, phone_number: c.phone_number };
                const attrs = {};
                if (c.city)         attrs.city         = c.city;
                if (c.company_name) attrs.company_name = c.company_name;
                if (Object.keys(attrs).length) newContact.additional_attributes = attrs;
                const newC = await api("contacts", "POST", newContact);
                contactId = getContactId(newC);
                if (contactId) created++;
              }

              if (contactId) {
                const result = await attachLabel(contactId, labelObj.title, existingLabels);
                if      (result.alreadyHad)  alreadyLabeled++;
                else if (result.success)     labeled++;
                else errors.push(`Linha ${c.rowIndex}: ${c.name} (${c.phone_number}) — Falha ao anexar etiqueta`);
              } else {
                errors.push(`Linha ${c.rowIndex}: ${c.name} (${c.phone_number}) — ID não obtido`);
              }
            });
          } catch (err) {
            errors.push(`Linha ${c.rowIndex}: ${c.name} (${c.phone_number}) — ${err.message || "Erro"}`);
          }
        }));

        processed += batch.length;
        const pct = Math.round((processed / contactsToProcess.length) * 100);
        pBar.style.width   = pct + "%";
        pTxt.textContent   = pct + "%";
        status.textContent = `🔄 Processando ${processed}/${contactsToProcess.length} contatos...`;
        await wait(BATCH_DELAY);
      }

      cancelBtn.style.display  = "none";
      pBar.style.width         = "100%";
      pTxt.textContent         = "100%";

      const total   = contactsToProcess.length;
      const details = [
        labeled        > 0 && `${labeled} etiquetados`,
        created        > 0 && `${created} novos criados`,
        alreadyLabeled > 0 && `${alreadyLabeled} já tinham a etiqueta`,
        errors.length  > 0 && `${errors.length} erros`
      ].filter(Boolean);

      if (cancelFlag.value) {
        status.textContent = `⏸️ Cancelado. ${processed}/${total} processados — ` + details.join(", ") + ".";
      } else if (alreadyLabeled === total && errors.length === 0) {
        status.textContent = `ℹ️ Todos os ${total} contatos já possuíam a etiqueta "${labelTitle}".`;
      } else if (errors.length > 0) {
        status.textContent = `⚠️ Concluído com erros — ` + details.join(", ") + ".";
      } else {
        status.innerHTML = `✅ Concluído! ${details.join(", ")}. Agora selecione <b>"${labelTitle}"</b> em <b>Público</b> e clique em Criar/Agendar.`;
      }

      if (errors.length) {
        errorList.innerHTML    = errors.map(e => `<div style="margin:2px 0;">• ${e}</div>`).join("");
        errorCount.textContent = errors.length;
        errorsBox.style.display = "block";
      }

      etiquetado = true;
      unlockPublicoBlock();
      pendingWarn.style.display = "none";
      confirmBtn.textContent    = "✅ Etiquetagem Concluída";
      confirmBtn.style.opacity  = "1";
      log(`Finalizado. Etiquetados: ${labeled}, Criados: ${created}, Já tinham: ${alreadyLabeled}, Erros: ${errors.length}`);
    });

    cancelBtn.addEventListener("click", () => {
      cancelFlag.value      = true;
      cancelBtn.disabled    = true;
      cancelBtn.textContent = "⏸️ Cancelando...";
      status.textContent    = "⏸️ Cancelamento solicitado...";
    });
  }

  async function injectIntoModal() {
    const modal = await waitForCampaignModal(9000);
    if (!modal) { alert("Não consegui localizar o modal de campanha na tela."); return; }
    if (modal.querySelector("#cw-sheet-wrap")) {
      modal.querySelector("#cw-sheet-wrap").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const publicoBlock = findPublicoBlock(modal);
    const wrap = buildWrap();
    bindWrapLogic(wrap, publicoBlock);
    if (publicoBlock && publicoBlock.parentElement) {
      publicoBlock.parentElement.insertBefore(wrap, publicoBlock);
    } else {
      (modal.querySelector("form") || modal).appendChild(wrap);
    }
    wrap.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function onPersonalizadaClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (findCampaignModalByText()) { await injectIntoModal(); return; }
    const native = findNativeCreateBtn();
    if (native) humanClick(native);
    await injectIntoModal();
  }

  function removeTopButton() { document.getElementById("cw-personalizada-btn")?.remove(); }

  function injectTopButton() {
    if (!isWhatsAppCampaignsPage()) { removeTopButton(); return; }
    const native = findNativeCreateBtn();
    if (!native || document.getElementById("cw-personalizada-btn")) return;
    const btn = document.createElement("button");
    btn.id   = "cw-personalizada-btn";
    btn.type = "button";
    btn.textContent = "+ Personalizada";
    const nativeClass = typeof native.className === "string" ? native.className.trim() : "";
    if (nativeClass) btn.className = nativeClass;
    else btn.style.cssText = `
      margin-left:8px;padding:8px 14px;border-radius:10px;border:none;
      background:#2563eb;color:#fff;font-weight:800;cursor:pointer;
      box-shadow:0 2px 6px rgba(0,0,0,.12);
    `;
    if (!btn.style.marginLeft) btn.style.marginLeft = "8px";
    btn.addEventListener("click", onPersonalizadaClick);
    native.parentElement.insertBefore(btn, native.nextSibling);
    log("Botão + Personalizada adicionado.");
  }

  new MutationObserver(() => { injectTopButton(); }).observe(document.body, { childList: true, subtree: true });
  setTimeout(injectTopButton, 800);

  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) { lastUrl = url; setTimeout(() => { injectTopButton(); }, 300); }
  }).observe(document, { subtree: true, childList: true });

  log("v5.10 iniciado.");
})();