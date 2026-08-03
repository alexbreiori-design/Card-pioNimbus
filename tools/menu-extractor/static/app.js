const urlInput = document.getElementById("url");
const slugInput = document.getElementById("slug");
const extractBtn = document.getElementById("extractBtn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const metaEl = document.getElementById("meta");
const warningsEl = document.getElementById("warnings");
const jsonPreview = document.getElementById("jsonPreview");
const tableWrap = document.getElementById("tableWrap");
const downloadBtn = document.getElementById("downloadBtn");
const copyBtn = document.getElementById("copyBtn");
const platformSelect = document.getElementById("platform");
const merchantIdInput = document.getElementById("merchantId");
const rawJsonInput = document.getElementById("rawJson");
const tabUrl = document.getElementById("tab-url");
const tabRaw = document.getElementById("tab-raw");

let lastPayload = null;
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
  resultEl.classList.remove("hidden");
  const counts = data.counts || {};
  metaEl.textContent = [
    `Plataforma: ${platformLabel(data.platform)}`,
    data.store_name ? `Loja: ${data.store_name}` : null,
    `${counts.categorias || 0} categorias · ${counts.produtos || 0} produtos`,
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
        body: JSON.stringify({ url, slug: slugInput.value.trim() }),
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

copyBtn.addEventListener("click", async () => {
  if (!lastPayload) return;
  await navigator.clipboard.writeText(JSON.stringify(lastPayload, null, 2));
  setStatus("JSON copiado para a área de transferência.");
});
