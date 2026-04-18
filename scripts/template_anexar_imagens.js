
<script>
(function () {
  const LOG = "[CW-B2-TOOL]";

  // ==========================================================
  // CONFIGURAÇÃO
  // ==========================================================

  // Deixe vazio [] para rodar em todas as contas.
  const ALLOWED_ACCOUNTS = [];

  // Dados do contato interno de upload.
  // Crie este contato uma vez em cada conta do Chatwoot.
  const UPLOAD_CONTACT_PHONE = "+5511900000001";
  const UPLOAD_CONTACT_NAME  = "Upload Interno";

  // Chave de cache no sessionStorage (por conta)
  const cacheKey = () => `cw_upload_conv_${getAccountId()}`;

  // ==========================================================
  // TRAVA DE SEGURANÇA
  // ==========================================================

  const getAccountId = () =>
    location.pathname.match(/\/app\/accounts\/(\d+)\//)?.[1];

  const currentAccount = getAccountId();

  if (!currentAccount) return;

  if (
    ALLOWED_ACCOUNTS.length > 0 &&
    !ALLOWED_ACCOUNTS.includes(parseInt(currentAccount))
  ) {
    console.info(LOG, "Conta não permitida, script ignorado.");
    return;
  }

  // ==========================================================
  // HELPERS
  // ==========================================================

  function getAuthHeaders() {
    try {
      const raw = document.cookie.match(/(^|;\s*)cw_d_session_info=([^;]+)/);
      if (!raw) throw new Error("Cookie cw_d_session_info não encontrado.");

      const obj = JSON.parse(decodeURIComponent(raw[2]));

      const required = ["access-token", "client", "uid", "token-type"];
      for (const key of required) {
        if (!obj[key]) throw new Error(`Header ausente no cookie: ${key}`);
      }

      return {
        "access-token": obj["access-token"],
        "client":       obj["client"],
        "uid":          obj["uid"],
        "token-type":   obj["token-type"],
        ...(obj["authorization"] && { authorization: obj["authorization"] }),
      };
    } catch (e) {
      throw new Error(`Falha de autenticação: ${e.message}`);
    }
  }

  function setReactValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    setter.call(input, value);
    input.dispatchEvent(new Event("input",  { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // ==========================================================
  // BUSCA / CACHE DA CONVERSA DE UPLOAD
  // ==========================================================

  async function getUploadConversationId(headers) {
    // 1. Tenta cache da sessão
    const cached = sessionStorage.getItem(cacheKey());
    if (cached) {
      console.info(LOG, "Conversa de upload (cache):", cached);
      return cached;
    }

    // 2. Busca o contato pelo telefone
    const searchResp = await fetch(
      `/api/v1/accounts/${currentAccount}/contacts/search?q=${encodeURIComponent(UPLOAD_CONTACT_PHONE)}&page=1`,
      { headers }
    );

    if (!searchResp.ok) throw new Error(`Erro ao buscar contato: ${searchResp.status}`);

    const searchData = await searchResp.json();
    const contact = (searchData?.payload || []).find(
      (c) =>
        c.phone_number === UPLOAD_CONTACT_PHONE ||
        c.name === UPLOAD_CONTACT_NAME
    );

    if (!contact) {
      throw new Error(
        `Contato "${UPLOAD_CONTACT_NAME}" (${UPLOAD_CONTACT_PHONE}) não encontrado. ` +
        `Crie este contato na conta ${currentAccount} para usar o upload.`
      );
    }

    // 3. Busca conversas do contato
    const convResp = await fetch(
      `/api/v1/accounts/${currentAccount}/contacts/${contact.id}/conversations`,
      { headers }
    );

    if (!convResp.ok) throw new Error(`Erro ao buscar conversas do contato: ${convResp.status}`);

    const convData = await convResp.json();
    const conversations = convData?.payload || [];

    if (conversations.length === 0) {
      throw new Error(
        `Nenhuma conversa encontrada para "${UPLOAD_CONTACT_NAME}". ` +
        `Abra uma conversa com este contato para ativar o upload.`
      );
    }

    // Prefere a mais recente (primeira da lista)
    const conversationId = String(conversations[0].id);

    // 4. Salva no cache da sessão
    sessionStorage.setItem(cacheKey(), conversationId);
    console.info(LOG, "Conversa de upload encontrada:", conversationId);

    return conversationId;
  }

  // ==========================================================
  // UPLOAD
  // ==========================================================

  async function uploadFile(file, urlInput, statusEl) {
    try {
      statusEl.textContent = "⏳ Enviando arquivo...";
      statusEl.style.color = "#1e40af";

      const headers = getAuthHeaders();
      const conversationId = await getUploadConversationId(headers);

      const fd = new FormData();
      fd.append("content", `Upload: ${file.name}`);
      fd.append("private", "true");
      fd.append("attachments[]", file, file.name);

      const resp = await fetch(
        `/api/v1/accounts/${currentAccount}/conversations/${conversationId}/messages`,
        { method: "POST", headers, body: fd }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(`Erro ${resp.status}: ${err?.message || resp.statusText}`);
      }

      const data = await resp.json();
      const attachment =
        data?.attachments?.[0] ?? data?.payload?.attachments?.[0];
      const url = attachment?.data_url ?? attachment?.file_url;

      if (!url) throw new Error("URL não retornada pelo servidor.");

      setReactValue(urlInput, url);

      const fnInput = document.querySelector(
        'input[placeholder*="filename"], input[placeholder*="Invoice"]'
      );
      if (fnInput) setReactValue(fnInput, file.name);

      statusEl.textContent = "✅ Pronto! URL preenchida.";
      statusEl.style.color = "#10b981";

      console.info(LOG, "Upload concluído:", url);
    } catch (e) {
      statusEl.textContent = "❌ " + e.message;
      statusEl.style.color = "#ef4444";
      console.error(LOG, e);

      // Se o erro for de contato/conversa não encontrado, limpa o cache
      // para forçar nova busca na próxima tentativa
      if (e.message.includes("não encontrado") || e.message.includes("Nenhuma conversa")) {
        sessionStorage.removeItem(cacheKey());
      }
    }
  }

  // ==========================================================
  // INJEÇÃO NA UI
  // ==========================================================

  function inject() {
    const urlInput = document.querySelector(
      'input[placeholder*="URL Document"], ' +
      'input[placeholder*="Digite a URL"]'
    );

    if (!urlInput || urlInput.dataset.uploadInjected) return;
    urlInput.dataset.uploadInjected = "true";

    const container = document.createElement("div");
    container.style.cssText = `
      margin: 8px 0;
      padding: 10px;
      border: 2px dashed #1f93ff;
      border-radius: 8px;
      background: #eff6ff;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: background 0.2s;
    `;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = "<strong>⬆️ Clique para anexar arquivo</strong>";
    btn.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #1f93ff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    `;

    const status = document.createElement("div");
    status.style.cssText = "font-size: 11px; color: #1e40af; text-align: center;";
    status.textContent = "Arraste o arquivo ou clique acima";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*,video/*,application/pdf";
    fileInput.style.display = "none";

    container.addEventListener("dragover",  (e) => { e.preventDefault(); container.style.background = "#dbeafe"; });
    container.addEventListener("dragleave", ()  => { container.style.background = "#eff6ff"; });
    container.addEventListener("drop", (e) => {
      e.preventDefault();
      container.style.background = "#eff6ff";
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file, urlInput, status);
    });

    btn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) uploadFile(file, urlInput, status);
      fileInput.value = "";
    });

    container.appendChild(btn);
    container.appendChild(status);
    container.appendChild(fileInput);

    urlInput.parentNode.insertBefore(container, urlInput.nextSibling);

    console.info(LOG, "UI injetada com sucesso.");
  }

  // ==========================================================
  // OBSERVER
  // ==========================================================

  const observer = new MutationObserver(() => inject());
  observer.observe(document.body, { childList: true, subtree: true });

  console.info(LOG, `Iniciado na conta ${currentAccount}.`);
})();
</script>

