<script>
/**
 * CW Label Contacts Bulk — v1.1
 * Importa contatos via CSV e aplica uma etiqueta sem substituir as existentes.
 * Estratégia: GET /contacts/:id/labels -> POST /contacts/:id/labels
 * Restrito aos Account IDs definidos em ALLOWED_ACCOUNTS.
 */
(function () {
  if (window.__cwLabelBulk_v1) return;
  window.__cwLabelBulk_v1 = true;

  // --- TRAVA DE SEGURANÇA ---
  // Se estiver vazio [], libera para todos. Se tiver IDs [1, 2], restringe.
  const ALLOWED_ACCOUNTS = [];

  const log = (...a) => console.log("[CW LabelBulk]", ...a);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const uniq = (arr) => [...new Set((arr || []).map(s => (s || '').trim()).filter(Boolean))];

  let shouldCancel = false;
  let modalOpen = false;

  // Account
  function accountId(){
    return parseInt((location.pathname.match(/accounts\/(\d+)/) || [])[1]) || null;
  }

  function isAllowedAccount() {
    const acc = accountId();
    // Se a lista estiver vazia, retorna true (liberado). 
    // Se tiver IDs, verifica se o ID atual está na lista.
    if (ALLOWED_ACCOUNTS.length === 0) return true;
    return !!acc && ALLOWED_ACCOUNTS.includes(acc);
  }

  const currentAccount = accountId();

  if (!currentAccount) {
    log("Account ID ainda não detectado no carregamento inicial. Aguardando rota...");
  } else if (!isAllowedAccount()) {
    log(`Account ID ${currentAccount} não autorizado no carregamento inicial. Aguardando navegação...`);
    // Se não for autorizado, encerra a execução aqui
    return;
  } else {
    log(`Account ID ${currentAccount} autorizado. Script carregado.`);
  }

  // API
  async function api(path, method="GET", body=null){
    const acc = accountId();
    if(!acc) throw new Error("AccountId não detectado.");
    const url = `/api/v1/accounts/${acc}/${path}`;
    const resp = await window.axios({
      url,
      method: method.toLowerCase(),
      data: body || undefined,
      withCredentials:true
    });
    return resp.data ?? {};
  }

  async function ensureLabel(title){
    const data = await api("labels","GET");
    const list = data?.payload || data?.data || data || [];
    let found = Array.isArray(list) ? list.find(l => (l.title || l.name) === title) : null;
    if (!found){
      const created = await api("labels","POST",{ title, color:"#1e40af" });
      const payload = created?.payload || created?.data || created || {};
      found = payload.label || payload || {};
    }
    return { id: found.id, title: (found.title || found.name || title) };
  }

  function getContactId(obj){
    return obj?.id || obj?.contact_id || obj?.payload?.id || obj?.payload?.contact_id ||
           obj?.payload?.contact?.id || obj?.data?.id || obj?.data?.contact?.id ||
           obj?.resource?.id || obj?.resource?.contact?.id || obj?.contact?.id || null;
  }

  // Labels do contato
  async function getContactLabels(contactId){
    try {
      const data = await api(`contacts/${contactId}/labels`, "GET");
      const labels = data?.payload || data?.data || data || [];
      if (Array.isArray(labels)) {
        return labels
          .map(l => typeof l === "string" ? l : (l?.title || l?.name || ""))
          .filter(Boolean);
      }
      return [];
    } catch (e) {
      log(`Erro ao buscar labels do contato ${contactId}:`, e);
      return [];
    }
  }

  async function findContactByPhone(phone){
    const res = await api(`contacts/search?q=${encodeURIComponent(phone)}`,"GET");
    const arr = res?.payload || res?.data || [];
    const c = Array.isArray(arr) ? arr[0] : null;
    if (!c) return null;

    const contactId = getContactId(c);
    if (!contactId) return null;

    const labels = await getContactLabels(contactId);
    return { id: contactId, labels: uniq(labels) };
  }

  // Adiciona etiqueta preservando as existentes
  async function attachLabel(contactId, labelTitle, existingLabels = []){
    const hasLabel = (existingLabels || []).some(l => (l || "").toLowerCase() === (labelTitle || "").toLowerCase());
    if (hasLabel) return { alreadyHad: true, success: false };

    const allLabels = uniq([...(existingLabels || []), labelTitle]);
    await api(`contacts/${contactId}/labels`, "POST", { labels: allLabels });

    return { alreadyHad: false, success: true };
  }

  function normalizePhone(raw){
    if (!raw) return "";
    let p = (raw+"").trim().replace(/[^\d]/g,"");
    if (!p) return "";
    if (!p.startsWith("55")) p = "55"+p;
    return "+"+p;
  }

  // CSV
  function validateCSV(text) {
    const errors = [];

    if (!text || text.trim().length === 0) {
      errors.push("Arquivo vazio");
      return { valid: false, errors };
    }

    const delimiter = text.includes(";") ? ";" : ",";
    const rows = text.split(/\r?\n/).map(r => r.split(delimiter)).filter(r => r.join("").trim() !== "");

    if (rows.length === 0) {
      errors.push("CSV sem dados válidos");
      return { valid: false, errors };
    }

    const header = rows[0].map(h => h.trim().toLowerCase());
    const hasPhone = header.some(h => ["phone_number","telefone","phone"].includes(h));

    if (!hasPhone) {
      errors.push("Cabeçalho obrigatório ausente: phone_number");
      return { valid: false, errors };
    }

    const dataRows = rows.slice(1);
    if (dataRows.length === 0) {
      errors.push("CSV sem linhas de dados");
      return { valid: false, errors };
    }

    if (dataRows.length > 1000) {
      errors.push(`Muitos contatos! Máximo permitido: 1.000 | Seu arquivo: ${dataRows.length}`);
      errors.push("⚠️ Divida seu arquivo em partes menores para evitar sobrecarga no servidor.");
      return { valid: false, errors };
    }

    const warnings = [];
    if (dataRows.length > 500) {
      warnings.push(`⚠️ Atenção: ${dataRows.length} contatos é uma quantidade alta. Recomendamos dividir em arquivos menores para melhor performance.`);
    }

    return { valid: true, errors: [], warnings, rows, header };
  }

  // UI
  function injectLabelButton() {
    if (!window.location.pathname.includes("/contacts")) return;
    if (!isAllowedAccount()) return;
    if (document.getElementById("cw-label-bulk-btn")) return;

    const sendMessageBtn = Array.from(document.querySelectorAll("button")).find(b =>
      /enviar mensagem/i.test(b.textContent)
    );

    if (!sendMessageBtn) return;

    const actionBar = sendMessageBtn.parentElement;
    actionBar.style.display = "flex";
    actionBar.style.alignItems = "center";
    actionBar.style.flexWrap = "nowrap";
    actionBar.style.gap = "8px";

    const labelBtn = document.createElement("button");
    labelBtn.id = "cw-label-bulk-btn";

    labelBtn.className = "inline-flex items-center min-w-0 gap-2 transition-all duration-100 ease-out disabled:outline disabled:opacity-50 bg-n-brand text-white hover:enabled:brightness-110 focus-visible:brightness-110 outline-transparent h-8 px-3 text-sm active:enabled:scale-[0.97] justify-center truncate";    labelBtn.textContent = "Etiquetar Contatos";

    labelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openLabelModal();
    });

    sendMessageBtn.parentElement.insertBefore(labelBtn, sendMessageBtn.nextSibling);
    log("Botão 'Etiquetar Contatos' adicionado");
  }

  // Modal
  function openLabelModal() {
    if (!isAllowedAccount()) {
      log(`Account ID ${accountId()} não autorizado para abrir o modal.`);
      return;
    }

    if (modalOpen) return;
    modalOpen = true;
    shouldCancel = false;

    const overlay = document.createElement("div");
    overlay.id = "cw-label-modal";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 550px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    `;

    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="margin:0;font-size:20px;color:#1f2937;">🏷️ Etiquetar Contatos em Massa</h2>
        <button id="cw-label-close" style="background:none;border:none;font-size:24px;cursor:pointer;color:#6b7280;">&times;</button>
      </div>

      <div style="background:#dbeafe;border:1px solid #3b82f6;padding:12px;border-radius:8px;margin-bottom:16px;">
        <strong style="color:#1e40af;">ℹ️ Como funciona:</strong>
        <p style="margin:4px 0 0 0;font-size:13px;color:#1e3a8a;">
          • Contatos <strong>novos</strong> serão criados e etiquetados<br>
          • Contatos <strong>existentes</strong> receberão a etiqueta (mantém as antigas)
        </p>
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151;">
          Nome da Etiqueta <span style="color:#dc2626;">*</span>
        </label>
        <input
          type="text"
          id="cw-label-name"
          placeholder="Ex: blackfriday, leads2025, promocao..."
          style="width:100%;padding:10px;border:2px solid #d1d5db;border-radius:6px;font-size:14px;"
        >
        <div id="cw-label-space-warning" style="display:none;margin-top:8px;padding:8px;background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;">
          <small style="color:#92400e;">
            <strong>⚠️ Espaços não são permitidos.</strong> Use hífen (-) ou underscore (_) no lugar.
          </small>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151;">
          Arquivo CSV <span style="color:#dc2626;">*</span>
        </label>
        <span style="font-size:12px;color:#6b7280;display:block;margin-bottom:8px;">
          Colunas: <code>name</code>, <code>email</code>, <code>phone_number</code>, <code>city</code>, <code>company_name</code>
        </span>
        <input
          type="file"
          id="cw-label-csv"
          accept=".csv"
          style="width:100%;padding:8px;border:2px dashed #d1d5db;border-radius:6px;cursor:pointer;"
        >
      </div>

      <div id="cw-label-preview" style="display:none;margin-bottom:16px;padding:12px;background:#f3f4f6;border-radius:6px;">
        <strong style="color:#374151;">📋 Prévia:</strong>
        <p id="cw-label-count" style="margin:4px 0 0 0;color:#6b7280;"></p>
      </div>

      <div id="cw-label-progress" style="display:none;margin-bottom:16px;">
        <div style="height:8px;background:#e5e7eb;border-radius:6px;overflow:hidden;">
          <div id="cw-label-bar" style="height:8px;width:0%;background:#059669;transition:width .3s;"></div>
        </div>
        <small id="cw-label-text" style="display:block;margin-top:6px;color:#6b7280;">0%</small>
      </div>

      <button id="cw-label-cancel" style="display:none;width:100%;padding:10px;margin-bottom:12px;border:2px solid #dc2626;background:white;color:#dc2626;border-radius:6px;cursor:pointer;font-weight:600;">
        ⏸️ Cancelar Processamento
      </button>

      <small id="cw-label-status" style="display:block;margin-bottom:16px;color:#6b7280;">Preencha os campos acima para começar.</small>

      <details id="cw-label-errors" style="display:none;margin-bottom:16px;padding:12px;background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;">
        <summary style="cursor:pointer;font-weight:bold;color:#92400e;">⚠️ Avisos (<span id="cw-label-error-count">0</span>)</summary>
        <div id="cw-label-error-list" style="margin-top:8px;font-size:12px;color:#92400e;max-height:150px;overflow-y:auto;"></div>
      </details>

      <div style="display:flex;gap:12px;">
        <button id="cw-label-confirm" disabled style="flex:1;padding:12px;background:#059669;color:white;border:none;border-radius:6px;cursor:not-allowed;font-weight:600;opacity:0.5;">
          🏷️ Etiquetar Contatos
        </button>
        <button id="cw-label-cancel-modal" style="flex:1;padding:12px;background:#e5e7eb;color:#374151;border:none;border-radius:6px;cursor:pointer;font-weight:600;">
          Cancelar
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const labelInput = modal.querySelector("#cw-label-name");
    const fileInput = modal.querySelector("#cw-label-csv");
    const confirmBtn = modal.querySelector("#cw-label-confirm");
    const cancelBtn = modal.querySelector("#cw-label-cancel-modal");
    const closeBtn = modal.querySelector("#cw-label-close");
    const cancelProcessBtn = modal.querySelector("#cw-label-cancel");
    const preview = modal.querySelector("#cw-label-preview");
    const countEl = modal.querySelector("#cw-label-count");
    const status = modal.querySelector("#cw-label-status");
    const progressWrap = modal.querySelector("#cw-label-progress");
    const progressBar = modal.querySelector("#cw-label-bar");
    const progressText = modal.querySelector("#cw-label-text");
    const errorsBox = modal.querySelector("#cw-label-errors");
    const errorList = modal.querySelector("#cw-label-error-list");
    const errorCount = modal.querySelector("#cw-label-error-count");

    let contactsToLabel = [];
    let labelTitle = "";

    const closeModal = () => {
      overlay.remove();
      modalOpen = false;
    };

    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    cancelProcessBtn.addEventListener("click", () => {
      shouldCancel = true;
      cancelProcessBtn.disabled = true;
      cancelProcessBtn.textContent = "⏸️ Cancelando...";
      status.textContent = "⏸️ Cancelamento solicitado...";
    });

    const checkForm = () => {
      labelTitle = labelInput.value.trim();
      const hasFile = fileInput.files?.length > 0;
      const hasSpaces = labelTitle.includes(" ");
      
      // Mostrar/esconder aviso de espaços
      const spaceWarning = document.getElementById("cw-label-space-warning");
      if (hasSpaces && labelTitle.length > 0) {
        spaceWarning.style.display = "block";
        labelInput.style.borderColor = "#fbbf24";
      } else {
        spaceWarning.style.display = "none";
        labelInput.style.borderColor = "#d1d5db";
      }

      // Validar se pode habilitar o botão (não pode ter espaços)
      if (labelTitle && !hasSpaces && hasFile && contactsToLabel.length > 0) {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = "1";
        confirmBtn.style.cursor = "pointer";
      } else {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = "0.5";
        confirmBtn.style.cursor = "not-allowed";
      }
    };

    labelInput.addEventListener("input", (e) => {
      // Converte automaticamente para minúsculas (igual o Chatwoot)
      const cursorPos = e.target.selectionStart;
      e.target.value = e.target.value.toLowerCase();
      e.target.setSelectionRange(cursorPos, cursorPos);
      
      checkForm();
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      errorsBox.style.display = "none";
      status.textContent = "📋 Validando arquivo...";

      const text = await file.text();
      const validation = validateCSV(text);

      if (!validation.valid) {
        status.textContent = "❌ Arquivo inválido";
        errorList.innerHTML = validation.errors.map(e => `<div>• ${e}</div>`).join("");
        errorCount.textContent = validation.errors.length;
        errorsBox.style.display = "block";
        contactsToLabel = [];
        checkForm();
        return;
      }

      const { rows, header } = validation;
      const dataRows = rows.slice(1);
      const idxName = header.findIndex(h => h==="name" || h==="nome");
      const idxEmail = header.findIndex(h => h==="email");
      const idxPhone = header.findIndex(h => ["phone_number","telefone","phone"].includes(h));
      const idxCity = header.findIndex(h => h==="city" || h==="cidade");
      const idxCompany = header.findIndex(h => h==="company_name" || h==="company" || h==="empresa");

      contactsToLabel = dataRows.map((r, idx) => {
        const name = (r[idxName] || "Sem nome").trim();
        const email = (r[idxEmail] || "").trim().toLowerCase();
        const phone_number = normalizePhone(r[idxPhone]);
        const city = idxCity !== -1 ? (r[idxCity] || "").trim() : "";
        const company_name = idxCompany !== -1 ? (r[idxCompany] || "").trim() : "";
        return phone_number ? { name, email, phone_number, city, company_name, rowIndex: idx + 2 } : null;
      }).filter(Boolean);

      if (!contactsToLabel.length) {
        status.textContent = "❌ Nenhum telefone válido encontrado";
        checkForm();
        return;
      }

      preview.style.display = "block";
      countEl.textContent = `${contactsToLabel.length} contatos serão etiquetados`;
      status.textContent = `✅ Arquivo validado. ${contactsToLabel.length} contatos prontos.`;
      checkForm();
    });

    confirmBtn.addEventListener("click", async () => {
      if (!contactsToLabel.length || !labelTitle) return;

      shouldCancel = false;
      labelInput.disabled = true;
      fileInput.disabled = true;
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      progressWrap.style.display = "block";
      cancelProcessBtn.style.display = "block";
      errorsBox.style.display = "none";

      status.textContent = `🏷️ Processando 0/${contactsToLabel.length} contatos...`;

      let labelObj = null;
      try {
        labelObj = await ensureLabel(labelTitle);
        log(`Etiqueta criada/verificada: ${labelObj.title} (ID: ${labelObj.id})`);
      } catch (e) {
        status.textContent = "❌ Falha ao criar/verificar etiqueta";
        cancelProcessBtn.style.display = "none";
        cancelBtn.disabled = false;
        return;
      }

      const errors = [];
      let processed = 0;
      let created = 0;
      let labeled = 0;
      let alreadyLabeled = 0;

      let BATCH_SIZE = 2;
      let BATCH_DELAY = 350;

      if (contactsToLabel.length > 200) {
        BATCH_SIZE = 1;
        BATCH_DELAY = 600;
      }

      for (let i = 0; i < contactsToLabel.length; i += BATCH_SIZE) {
        if (shouldCancel) break;

        const batch = contactsToLabel.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async c => {
          try {
            const existing = await findContactByPhone(c.phone_number);
            let contactId;
            let existingLabels = [];

            if (existing?.id) {
              contactId = existing.id;
              existingLabels = existing.labels || [];
              log(`Contato ${c.phone_number} encontrado. ID: ${contactId}, Labels atuais: [${existingLabels.join(", ")}]`);
              
              // Atualizar city e company_name se fornecidos no CSV
              const additionalAttrs = {};
              if (c.city) additionalAttrs.city = c.city;
              if (c.company_name) additionalAttrs.company_name = c.company_name;
              
              if (Object.keys(additionalAttrs).length > 0) {
                try {
                  await api(`contacts/${contactId}`, "PUT", {
                    additional_attributes: additionalAttrs
                  });
                } catch (e) {
                  // Ignora erro silenciosamente
                }
              }
            } else {
              const newContact = {
                name: c.name,
                email: c.email,
                phone_number: c.phone_number
              };
              
              // Adicionar additional_attributes se city ou company_name existirem
              const additionalAttrs = {};
              if (c.city) additionalAttrs.city = c.city;
              if (c.company_name) additionalAttrs.company_name = c.company_name;
              
              if (Object.keys(additionalAttrs).length > 0) {
                newContact.additional_attributes = additionalAttrs;
              }
              
              const newC = await api("contacts", "POST", newContact);
              contactId = getContactId(newC);
              if (contactId) created++;
            }

            if (contactId) {
              const result = await attachLabel(contactId, labelObj.title, existingLabels);
              if (result.alreadyHad) {
                alreadyLabeled++;
                log(`✓ Contato ${c.phone_number} já possuía "${labelObj.title}"`);
              } else if (result.success) {
                labeled++;
                log(`Contato ${c.phone_number} recebeu "${labelObj.title}" (mantendo antigas)`);
              } else {
                errors.push(`Linha ${c.rowIndex}: ${c.name} (${c.phone_number}) - Falha ao anexar etiqueta`);
              }
            } else {
              errors.push(`Linha ${c.rowIndex}: ${c.name} (${c.phone_number}) - ID não obtido`);
            }
          } catch (err) {
            errors.push(`Linha ${c.rowIndex}: ${c.name} (${c.phone_number}) - ${err.message || 'Erro'}`);
            log(`Erro ao processar ${c.phone_number}: ${err.message}`);
          }
        });

        await Promise.all(promises);
        processed += batch.length;

        const pct = Math.round((processed / contactsToLabel.length) * 100);
        progressBar.style.width = pct + "%";
        progressText.textContent = `${pct}%`;
        status.textContent = `🏷️ Processando ${processed}/${contactsToLabel.length} contatos...`;

        await wait(BATCH_DELAY);
      }

      progressBar.style.width = "100%";
      progressText.textContent = "100%";
      cancelProcessBtn.style.display = "none";

      const total = contactsToLabel.length;
      let finalMessage = "";
      let finalIcon = "✅";

      if (shouldCancel) {
        finalIcon = "⏸️";
        finalMessage = `Cancelado. `;
      } else if (errors.length > 0) {
        finalIcon = "⚠️";
        finalMessage = `Concluído com avisos. `;
      } else {
        finalMessage = `Concluído! `;
      }

      const details = [];
      if (labeled > 0) details.push(`${labeled} etiquetados`);
      if (created > 0) details.push(`${created} novos criados`);
      if (alreadyLabeled > 0) details.push(`${alreadyLabeled} já tinham a etiqueta`);
      if (errors.length > 0) details.push(`${errors.length} erros`);

      finalMessage += details.join(", ") + `.`;
      status.textContent = `${finalIcon} ${finalMessage}`;

      if (alreadyLabeled === total && errors.length === 0) {
        status.textContent = `ℹ️ Todos os ${total} contatos já possuíam a etiqueta "${labelTitle}".`;
      }

      if (errors.length > 0) {
        errorList.innerHTML = errors.map(e => `<div style="margin:2px 0;">• ${e}</div>`).join("");
        errorCount.textContent = errors.length;
        errorsBox.style.display = "block";
      }

      confirmBtn.textContent = "✅ Etiquetagem Concluída";
      cancelBtn.disabled = false;
      cancelBtn.textContent = "Fechar";

      log(`Etiquetagem finalizada. Etiquetados: ${labeled}, Criados: ${created}, Já tinham: ${alreadyLabeled}, Erros: ${errors.length}`);
    });
  }

  // Observers
  const observer = new MutationObserver(() => {
    if (window.location.pathname.includes("/contacts")) {
      injectLabelButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    if (window.location.pathname.includes("/contacts")) {
      injectLabelButton();
    }
  }, 1000);

  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (url.includes("/contacts")) {
        setTimeout(injectLabelButton, 500);
      }
    }
  }).observe(document, { subtree: true, childList: true });

  log("Script de etiquetagem em massa inicializado");
})();
</script>
