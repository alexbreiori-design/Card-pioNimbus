const urlInput = document.getElementById("url");
const modeSelect = document.getElementById("mode");
const slugInput = document.getElementById("slug");
const extractBtn = document.getElementById("extractBtn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const metaEl = document.getElementById("meta");
const warningsEl = document.getElementById("warnings");
const jsonPreview = document.getElementById("jsonPreview");
const tableWrap = document.getElementById("tableWrap");
const downloadBtn = document.getElementById("downloadBtn");
const downloadImagesBtn = document.getElementById("downloadImagesBtn");
const copyBtn = document.getElementById("copyBtn");
const imagesStatusEl = document.getElementById("imagesStatus");
const platformSelect = document.getElementById("platform");
const merchantIdInput = document.getElementById("merchantId");
const rawJsonInput = document.getElementById("rawJson");
const tabUrl = document.getElementById("tab-url");
const tabRaw = document.getElementById("tab-raw");

let lastPayload = null;
let lastImageCount = 0;
let activeTab = "url";

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    activeTab = btn.dataset.tab;
    document.querySelectorAll(".tab").forEach((t) => {
      const on = t === btn;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    tabUrl.classList.toggle("hidden", activeTab !== "url");
    tabRaw.classList.toggle("hidden", activeTab !== "raw");
  });
});

function setStatus(text, isError = false) {
  statusEl.textContent = text || "";
  statusEl.classList.toggle("error", Boolean(isError));
}

function platformLabel(platform) {
  if (platform === "ifood") return "iFood";
  if (platform === "anota_ai") return "Anota AI";
  if (platform === "generic") return "Genérico";
  return platform || "—";
}

function renderTable(payload) {
  const cats = payload?.modules?.produtos?.categorias || [];
  const rows = [];
  for (const cat of cats) {
    for (const item of cat.itens || []) {
      rows.push({
        categoria: cat.nome,
        nome: item.nome,
        preco: item.preco,
        descricao: item.descricao || "",
      });
    }
  }
  if (!rows.length) {
    tableWrap.innerHTML = "<p>Nenhum produto.</p>";
    return;
  }
  const body = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.categoria)}</td>
        <td>${escapeHtml(r.nome)}</td>
        <td>R$ ${Number(r.preco).toFixed(2)}</td>
        <td>${escapeHtml(r.descricao)}</td>
      </tr>`
    )
    .join("");
  tableWrap.innerHTML = `<table>
    <thead><tr><th>Categoria</th><th>Produto</th><th>Preço</th><th>Descrição</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showResult(data) {
  lastPayload = data.payload;
  lastImageCount = Number(data.imageCount || 0);
  resultEl.classList.remove("hidden");
  const counts = data.counts || {};
  metaEl.textContent = [
    `Modo: ${platformLabel(data.platform)}`,
    data.store_name ? `Loja: ${data.store_name}` : null,
    `${counts.categorias || 0} cat. produtos · ${counts.produtos || 0} produtos`,
    counts.adicionaisCategorias
      ? `${counts.adicionaisCategorias} cat. adicionais · ${counts.adicionaisItens || 0} itens`
      : null,
    lastImageCount ? `${lastImageCount} fotos` : "sem fotos",
  ]
    .filter(Boolean)
    .join(" · ");

  if (data.warnings?.length) {
    warningsEl.innerHTML = `<p>Avisos</p><ul>${data.warnings
      .slice(0, 40)
      .map((w) => `<li>${escapeHtml(w)}</li>`)
      .join("")}</ul>`;
  } else {
    warningsEl.innerHTML = "";
  }

  jsonPreview.textContent = JSON.stringify(data.payload, null, 2);
  renderTable(data.payload);
  downloadImagesBtn.disabled = lastImageCount === 0;
  imagesStatusEl.textContent = lastImageCount
    ? `${lastImageCount} fotos disponíveis para download em ZIP.`
    : "Nenhuma foto encontrada nesta extração.";
}

extractBtn.addEventListener("click", async () => {
  extractBtn.disabled = true;
  resultEl.classList.add("hidden");
  setStatus(
    activeTab === "url"
      ? "Extraindo… isso pode levar cerca de 30–90 segundos."
      : "Interpretando JSON bruto…"
  );

  try {
    let res;
    if (activeTab === "url") {
      const url = urlInput.value.trim();
      if (!url) {
        setStatus("Informe a URL do cardápio.", true);
        return;
      }
      res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          slug: slugInput.value.trim(),
          mode: modeSelect.value || "auto",
        }),
      });
    } else {
      let payload;
      try {
        payload = JSON.parse(rawJsonInput.value);
      } catch {
        setStatus("JSON bruto inválido.", true);
        return;
      }
      res = await fetch("/api/extract-raw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: platformSelect.value,
          payload,
          slug: slugInput.value.trim(),
          merchant_id: merchantIdInput.value.trim() || null,
        }),
      });
    }

    const data = await res.json();
    if (!res.ok || !data.ok) {
      const msg = data.detail || data.error || "Falha na extração.";
      setStatus(typeof msg === "string" ? msg : JSON.stringify(msg), true);
      return;
    }
    setStatus("Pronto. Revise o JSON antes de importar no super-admin.");
    showResult(data);
  } catch (err) {
    setStatus(err?.message || "Erro de rede.", true);
  } finally {
    extractBtn.disabled = false;
  }
});

downloadBtn.addEventListener("click", () => {
  if (!lastPayload) return;
  const blob = new Blob([JSON.stringify(lastPayload, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `nimbus-catalog-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

downloadImagesBtn.addEventListener("click", async () => {
  if (!lastPayload) return;
  downloadImagesBtn.disabled = true;
  imagesStatusEl.textContent = "Baixando fotos e montando ZIP… isso pode levar um minuto.";
  try {
    const res = await fetch("/api/images-zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: lastPayload,
        slug: slugInput.value.trim() || lastPayload.slug || "cardapio",
      }),
    });
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || !contentType.includes("zip")) {
      let msg = "Falha ao gerar ZIP de fotos.";
      try {
        const data = await res.json();
        msg = data.error || msg;
        if (data.meta?.failures?.length) {
          msg += ` (${data.meta.failures.length} falhas)`;
        }
      } catch {
        /* ignore */
      }
      imagesStatusEl.textContent = msg;
      imagesStatusEl.classList.add("error");
      return;
    }
    imagesStatusEl.classList.remove("error");
    const blob = await res.blob();
    const downloaded = res.headers.get("X-Images-Downloaded") || "?";
    const failed = res.headers.get("X-Images-Failed") || "0";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nimbus-fotos-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    imagesStatusEl.textContent =
      Number(failed) > 0
        ? `ZIP pronto: ${downloaded} fotos baixadas, ${failed} falharam.`
        : `ZIP pronto: ${downloaded} fotos.`;
  } catch (err) {
    imagesStatusEl.textContent = err?.message || "Erro ao baixar fotos.";
    imagesStatusEl.classList.add("error");
  } finally {
    downloadImagesBtn.disabled = lastImageCount === 0;
  }
});

copyBtn.addEventListener("click", async () => {
  if (!lastPayload) return;
  await navigator.clipboard.writeText(JSON.stringify(lastPayload, null, 2));
  setStatus("JSON copiado para a área de transferência.");
});
