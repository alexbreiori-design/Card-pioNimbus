'use client';

import { useRef, useState } from 'react';
import styles from './StoreDetailModal.module.css';

function formatCounts(counts = {}) {
  const parts = [];
  if (counts.adicionaisCategorias) {
    parts.push(`${counts.adicionaisCategorias} cat. adicionais`);
  }
  if (counts.adicionaisItens) {
    parts.push(`${counts.adicionaisItens} adicionais`);
  }
  if (counts.categorias) {
    parts.push(`${counts.categorias} cat. produtos`);
  }
  if (counts.produtos) {
    parts.push(`${counts.produtos} produtos`);
  }
  if (counts.pizzaTamanhos) {
    parts.push(`${counts.pizzaTamanhos} tam. pizza`);
  }
  if (counts.pizzaSabores) {
    parts.push(`${counts.pizzaSabores} sabores`);
  }
  if (counts.pizzaCategorias) {
    parts.push(`${counts.pizzaCategorias} cat. pizza`);
  }
  if (counts.marmitaGrupos) {
    parts.push(`${counts.marmitaGrupos} grupos marmita`);
  }
  if (counts.marmitas) {
    parts.push(`${counts.marmitas} marmitas`);
  }
  return parts.length ? parts.join(' · ') : 'Nenhum item detectado';
}

export default function StoreCatalogImportPanel({ slug, onImported }) {
  const fileRef = useRef(null);
  const [payloadText, setPayloadText] = useState('');
  const [mode, setMode] = useState('replace');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(null);

  function downloadExport(template = false) {
    if (!slug) return;
    const query = template ? '?template=1' : '';
    window.location.href = `/api/super-admin/stores/${encodeURIComponent(slug)}/catalog-export${query}`;
  }

  async function readPayloadFromFile(file) {
    const text = await file.text();
    setPayloadText(text);
    return JSON.parse(text);
  }

  async function runImport({ dryRun }) {
    if (!slug) return;
    setLoading(true);
    setError('');
    setSuccess('');
    if (!dryRun) setPreview(null);

    try {
      let payload;
      if (payloadText.trim()) {
        payload = JSON.parse(payloadText);
      } else if (fileRef.current?.files?.[0]) {
        payload = await readPayloadFromFile(fileRef.current.files[0]);
      } else {
        throw new Error('Selecione um arquivo JSON ou cole o conteúdo no campo abaixo.');
      }

      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(slug)}/catalog-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, mode, dryRun }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Não foi possível processar o arquivo.');
      }

      setPreview(result.preview);
      if (!dryRun) {
        const imageNote = result.preview?.images
          ? ` Imagens: ${result.preview.images.resolved} enviada(s)${result.preview.images.missing ? `, ${result.preview.images.missing} não encontrada(s)` : ''}.`
          : '';
        setSuccess(`Cardápio importado com sucesso.${imageNote} Exporte um JSON novo como backup.`);
        onImported?.();
      }
    } catch (importError) {
      setError(importError?.message || 'Erro ao importar cardápio.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.catalogImport}>
      <p className={`${styles.muted} ${styles.tabIntro}`}>
        <strong>Backup com fotos:</strong> clique em &quot;Exportar cardápio atual&quot; — o JSON inclui{' '}
        <code>imagemUrl</code> de cada item (URL já salva no Supabase Storage). Para restaurar, importe o mesmo
        arquivo no modo <strong>Substituir</strong>; as imagens voltam pelos links, sem cadastrar de novo.
        Alternativa: em Detalhes da loja, &quot;Exportar backup JSON&quot; (arquivo maior, inclui pedidos/clientes).
      </p>

      <div className={styles.catalogImportActions}>
        <button type="button" className={styles.btnGhost} onClick={() => downloadExport(false)}>
          Exportar cardápio atual
        </button>
        <button type="button" className={styles.btnGhost} onClick={() => downloadExport(true)}>
          Baixar modelo vazio
        </button>
      </div>

      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>Importar JSON</h3>

        <div className={styles.catalogImportField}>
          <label className={styles.metaLabel} htmlFor={`catalog-file-${slug}`}>
            Arquivo JSON
          </label>
          <input
            id={`catalog-file-${slug}`}
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className={styles.catalogFileInput}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setError('');
              setSuccess('');
              setPreview(null);
              try {
                const text = await file.text();
                setPayloadText(text);
              } catch {
                setError('Não foi possível ler o arquivo.');
              }
            }}
          />
        </div>

        <div className={styles.catalogImportField}>
          <label className={styles.metaLabel} htmlFor={`catalog-json-${slug}`}>
            Ou cole o JSON aqui
          </label>
          <textarea
            id={`catalog-json-${slug}`}
            className={styles.catalogTextarea}
            value={payloadText}
            onChange={(event) => {
              setPayloadText(event.target.value);
              setPreview(null);
              setError('');
              setSuccess('');
            }}
            placeholder='{ "version": 1, "modules": { ... } }'
            rows={10}
            spellCheck={false}
          />
        </div>

        <div className={styles.catalogImportModes}>
          <label className={styles.catalogModeOption}>
            <input
              type="radio"
              name={`catalog-mode-${slug}`}
              value="replace"
              checked={mode === 'replace'}
              onChange={() => setMode('replace')}
            />
            <span>
              <strong>Substituir módulos do arquivo</strong>
              <small>Apaga e recria apenas os módulos presentes no JSON (recomendado em loja nova).</small>
            </span>
          </label>
          <label className={styles.catalogModeOption}>
            <input
              type="radio"
              name={`catalog-mode-${slug}`}
              value="merge"
              checked={mode === 'merge'}
              onChange={() => setMode('merge')}
            />
            <span>
              <strong>Mesclar</strong>
              <small>Adiciona itens novos e atualiza itens com mesmo nome na mesma categoria.</small>
            </span>
          </label>
        </div>

        <div className={styles.catalogImportButtons}>
          <button
            type="button"
            className={styles.btnGhost}
            disabled={loading}
            onClick={() => runImport({ dryRun: true })}
          >
            Validar arquivo
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={loading || !preview || preview.errors?.length > 0}
            onClick={() => {
              const confirmed = window.confirm(
                mode === 'replace'
                  ? 'Substituir os módulos presentes no JSON? Itens atuais desses módulos serão removidos.'
                  : 'Mesclar o JSON com o cardápio atual?'
              );
              if (!confirmed) return;
              runImport({ dryRun: false });
            }}
          >
            {loading ? 'Processando...' : 'Importar agora'}
          </button>
        </div>
      </section>

      {preview ? (
        <section className={styles.panelAccent}>
          <h3 className={styles.panelTitle}>Prévia</h3>
          <p className={styles.catalogPreviewLine}>
            <span className={styles.metaLabel}>Módulos</span>
            <span className={styles.metaValue}>{(preview.modules || []).join(', ') || '—'}</span>
          </p>
          <p className={styles.catalogPreviewLine}>
            <span className={styles.metaLabel}>Itens</span>
            <span className={styles.metaValue}>{formatCounts(preview.counts)}</span>
          </p>
          {preview.warnings?.length ? (
            <ul className={styles.catalogMessageList}>
              {preview.warnings.map((item) => (
                <li key={item} className={styles.catalogWarning}>
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
          {preview.errors?.length ? (
            <ul className={styles.catalogMessageList}>
              {preview.errors.map((item) => (
                <li key={item} className={styles.alertError}>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.alertSuccess}>Arquivo válido — pronto para importar.</p>
          )}
        </section>
      ) : null}

      {error ? <p className={styles.alertError}>{error}</p> : null}
      {success ? <p className={styles.alertSuccess}>{success}</p> : null}
    </div>
  );
}
