'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './StoreDetailModal.module.css';

function formatCounts(counts = {}) {
  const parts = [];
  if (counts.adicionaisCategorias) parts.push(`${counts.adicionaisCategorias} cat. adicionais`);
  if (counts.adicionaisItens) parts.push(`${counts.adicionaisItens} adicionais`);
  if (counts.categorias) parts.push(`${counts.categorias} cat. produtos`);
  if (counts.produtos) parts.push(`${counts.produtos} produtos`);
  if (counts.pizzaTamanhos) parts.push(`${counts.pizzaTamanhos} tam. pizza`);
  if (counts.pizzaSabores) parts.push(`${counts.pizzaSabores} sabores`);
  if (counts.pizzaCategorias) parts.push(`${counts.pizzaCategorias} cat. pizza`);
  if (counts.marmitaGrupos) parts.push(`${counts.marmitaGrupos} grupos marmita`);
  if (counts.marmitas) parts.push(`${counts.marmitas} marmitas`);
  return parts.length ? parts.join(' · ') : 'Nenhum item detectado';
}

function formatBackupDateLabel(isoDate) {
  const [year, month, day] = String(isoDate || '').slice(0, 10).split('-');
  if (!year || !month || !day) return String(isoDate || '—');
  return `${day}/${month}/${year}`;
}

function formatBackupTime(isoDateTime) {
  if (!isoDateTime) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(isoDateTime));
  } catch {
    return '';
  }
}

export default function StoreCatalogImportPanel({ slug, onImported }) {
  const fileRef = useRef(null);
  const [payloadText, setPayloadText] = useState('');
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState('replace');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(null);
  const [outlineModules, setOutlineModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState({});
  const [selectedCats, setSelectedCats] = useState({});
  const [backups, setBackups] = useState([]);
  const [backupRetentionDays, setBackupRetentionDays] = useState(7);
  const [selectedBackupDate, setSelectedBackupDate] = useState('');
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [backupsError, setBackupsError] = useState('');
  const [backupGenerating, setBackupGenerating] = useState(false);
  const [backupNotice, setBackupNotice] = useState('');

  useEffect(() => {
    if (!slug) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/super-admin/stores/${encodeURIComponent(slug)}/catalog-export?outline=1`
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok || cancelled) return;
        const modules = payload.outline?.modules || [];
        setOutlineModules(modules);
        const nextModules = {};
        const nextCats = {};
        for (const mod of modules) {
          nextModules[mod.key] = true;
          nextCats[mod.key] = Object.fromEntries(
            (mod.categories || []).map((cat) => [cat.id, true])
          );
        }
        setSelectedModules(nextModules);
        setSelectedCats(nextCats);
      } catch {
        /* ignore outline load */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function loadBackups({ signalCancelled } = {}) {
    if (!slug) return;
    setBackupsLoading(true);
    setBackupsError('');
    try {
      const response = await fetch(
        `/api/super-admin/stores/${encodeURIComponent(slug)}/catalog-backups`
      );
      const payload = await response.json().catch(() => ({}));
      if (signalCancelled?.()) return;
      if (!response.ok || !payload.ok) {
        setBackups([]);
        setSelectedBackupDate('');
        setBackupsError(payload.error || 'Não foi possível carregar os backups.');
        return;
      }
      const rows = payload.backups || [];
      setBackups(rows);
      setBackupRetentionDays(Number(payload.retentionDays) || 7);
      setSelectedBackupDate(rows[0]?.backupDate || '');
    } catch {
      if (!signalCancelled?.()) {
        setBackups([]);
        setSelectedBackupDate('');
        setBackupsError('Não foi possível carregar os backups.');
      }
    } finally {
      if (!signalCancelled?.()) setBackupsLoading(false);
    }
  }

  useEffect(() => {
    if (!slug) return undefined;
    let cancelled = false;
    void loadBackups({ signalCancelled: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function toggleModule(key, checked) {
    setSelectedModules((prev) => ({ ...prev, [key]: checked }));
    if (checked) {
      const mod = outlineModules.find((item) => item.key === key);
      if (mod) {
        setSelectedCats((prev) => ({
          ...prev,
          [key]: Object.fromEntries((mod.categories || []).map((cat) => [cat.id, true])),
        }));
      }
    }
  }

  function toggleCategory(moduleKey, catId, checked) {
    setSelectedCats((prev) => ({
      ...prev,
      [moduleKey]: {
        ...(prev[moduleKey] || {}),
        [catId]: checked,
      },
    }));
    if (checked) {
      setSelectedModules((prev) => ({ ...prev, [moduleKey]: true }));
    }
  }

  function buildExportQuery() {
    const modules = [];
    const categoryIds = {};

    for (const mod of outlineModules) {
      if (!selectedModules[mod.key]) continue;
      const cats = mod.categories || [];
      if (cats.length) {
        const selected = cats
          .filter((cat) => selectedCats[mod.key]?.[cat.id])
          .map((cat) => cat.id);
        if (!selected.length) continue;
        modules.push(mod.key);
        if (selected.length < cats.length) {
          categoryIds[mod.key] = selected;
        }
      } else {
        modules.push(mod.key);
      }
    }

    if (!modules.length) return null;
    const params = new URLSearchParams();
    params.set('modules', modules.join(','));
    if (Object.keys(categoryIds).length) {
      params.set('categoryIds', JSON.stringify(categoryIds));
    }
    return params.toString();
  }

  function downloadExport(template = false) {
    if (!slug) return;
    if (template) {
      window.location.href = `/api/super-admin/stores/${encodeURIComponent(slug)}/catalog-export?template=1`;
      return;
    }
    const query = buildExportQuery();
    if (!query) {
      setError('Selecione ao menos um módulo/categoria para exportar.');
      return;
    }
    setError('');
    window.location.href = `/api/super-admin/stores/${encodeURIComponent(slug)}/catalog-export?${query}`;
  }

  function downloadDailyBackup() {
    if (!slug || !selectedBackupDate) {
      setError('Selecione uma data de backup para baixar.');
      return;
    }
    setError('');
    window.location.href = `/api/super-admin/stores/${encodeURIComponent(slug)}/catalog-backups?date=${encodeURIComponent(selectedBackupDate)}`;
  }

  async function generateBackupNow() {
    if (!slug) return;
    setBackupGenerating(true);
    setBackupsError('');
    setBackupNotice('');
    try {
      const response = await fetch(
        `/api/super-admin/stores/${encodeURIComponent(slug)}/catalog-backups`,
        { method: 'POST' }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível gerar o backup.');
      }
      const rows = payload.backups || [];
      setBackups(rows);
      setBackupRetentionDays(Number(payload.retentionDays) || 7);
      setSelectedBackupDate(payload.backupDate || rows[0]?.backupDate || '');
      setBackupNotice(
        `Backup de ${formatBackupDateLabel(payload.backupDate)} gerado. Já pode baixar.`
      );
    } catch (generateError) {
      setBackupsError(generateError?.message || 'Erro ao gerar backup.');
    } finally {
      setBackupGenerating(false);
    }
  }

  const selectedBackup = backups.find((row) => row.backupDate === selectedBackupDate);

  async function readPayloadFromFile(file) {
    const text = await file.text();
    setPayloadText(text);
    setFileName(file.name || 'arquivo.json');
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
        throw new Error('Selecione um arquivo JSON ou cole o conteúdo no campo ao lado.');
      }

      const response = await fetch(
        `/api/super-admin/stores/${encodeURIComponent(slug)}/catalog-import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload, mode, dryRun }),
        }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Não foi possível processar o arquivo.');
      }

      setPreview(result.preview);
      if (!dryRun) {
        const imageNote = result.preview?.images
          ? ` Imagens: ${result.preview.images.resolved} enviada(s)${
              result.preview.images.missing
                ? `, ${result.preview.images.missing} não encontrada(s)`
                : ''
            }.`
          : '';
        setSuccess(`Cardápio importado com sucesso.${imageNote}`);
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
      <div className={styles.catalogExportBox}>
        <h3 className={styles.panelTitle}>Backups automáticos (por data)</h3>
        <p className={styles.muted}>
          Cópias diárias geradas à meia-noite (horário de Brasília). Ficam disponíveis por{' '}
          {backupRetentionDays} dias. Se ainda não houver nenhum, gere o de hoje abaixo.
        </p>
        {backupsLoading ? (
          <p className={styles.muted}>Carregando backups…</p>
        ) : backups.length ? (
          <>
            <div className={styles.catalogBackupRow}>
              <label className={styles.metaLabel} htmlFor={`catalog-backup-date-${slug}`}>
                Data do backup
              </label>
              <select
                id={`catalog-backup-date-${slug}`}
                className={styles.catalogBackupSelect}
                value={selectedBackupDate}
                onChange={(event) => setSelectedBackupDate(event.target.value)}
              >
                {backups.map((row) => (
                  <option key={row.backupDate} value={row.backupDate}>
                    {formatBackupDateLabel(row.backupDate)}
                  </option>
                ))}
              </select>
            </div>
            {selectedBackup?.createdAt ? (
              <p className={styles.catalogBackupMeta}>
                Gerado em {formatBackupTime(selectedBackup.createdAt)}
              </p>
            ) : null}
            <div className={styles.catalogImportActions}>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={!selectedBackupDate}
                onClick={downloadDailyBackup}
              >
                Baixar backup de {formatBackupDateLabel(selectedBackupDate)}
              </button>
              <button
                type="button"
                className={styles.btnGhost}
                disabled={backupGenerating}
                onClick={generateBackupNow}
              >
                {backupGenerating ? 'Gerando…' : 'Atualizar backup de hoje'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.muted}>
              Ainda não há backup salvo desta loja. Clique abaixo para criar o de hoje — depois o
              botão de download aparece.
            </p>
            <div className={styles.catalogImportActions}>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={backupGenerating}
                onClick={generateBackupNow}
              >
                {backupGenerating ? 'Gerando…' : 'Gerar backup de hoje'}
              </button>
            </div>
          </>
        )}
        {backupNotice ? <p className={styles.alertSuccess}>{backupNotice}</p> : null}
        {backupsError ? <p className={styles.alertError}>{backupsError}</p> : null}
      </div>

      <div className={styles.catalogExportBox}>
        <h3 className={styles.panelTitle}>Exportar cardápio (agora)</h3>
        <p className={styles.muted}>
          Escolha módulos e categorias. O JSON inclui <code>imagemUrl</code> para restaurar fotos.
        </p>
        {outlineModules.length ? (
          <div className={styles.catalogModuleList}>
            {outlineModules.map((mod) => (
              <div key={mod.key} className={styles.catalogModuleRow}>
                <label className={styles.catalogModuleCheck}>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedModules[mod.key])}
                    onChange={(event) => toggleModule(mod.key, event.target.checked)}
                  />
                  {mod.label}
                </label>
                {selectedModules[mod.key] && mod.categories?.length ? (
                  <div className={styles.catalogCatList}>
                    {mod.categories.map((cat) => (
                      <label key={cat.id} className={styles.catalogCatCheck}>
                        <input
                          type="checkbox"
                          checked={Boolean(selectedCats[mod.key]?.[cat.id])}
                          onChange={(event) =>
                            toggleCategory(mod.key, cat.id, event.target.checked)
                          }
                        />
                        {cat.nome}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.muted}>Nenhum módulo de cardápio encontrado nesta loja.</p>
        )}
        <div className={styles.catalogImportActions}>
          <button type="button" className={styles.btnPrimary} onClick={() => downloadExport(false)}>
            Exportar seleção
          </button>
          <button type="button" className={styles.btnGhost} onClick={() => downloadExport(true)}>
            Baixar modelo vazio
          </button>
        </div>
      </div>

      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>Importar JSON</h3>

        <div className={styles.catalogFileRow}>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className={styles.catalogFileHidden}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setError('');
              setSuccess('');
              setPreview(null);
              try {
                const text = await file.text();
                setPayloadText(text);
                setFileName(file.name || 'arquivo.json');
              } catch {
                setError('Não foi possível ler o arquivo.');
              }
            }}
          />
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => fileRef.current?.click()}
          >
            Selecionar arquivo
          </button>
          <span className={styles.catalogFileName}>
            {fileName || 'Nenhum arquivo selecionado'}
          </span>
        </div>

        <div className={styles.catalogImportGrid}>
          <div className={styles.catalogImportField}>
            <label className={styles.metaLabel} htmlFor={`catalog-json-${slug}`}>
              Colar JSON
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
              placeholder="Cole o JSON aqui…"
              rows={4}
              spellCheck={false}
            />
          </div>

          <div className={styles.catalogImportSide}>
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
                  <strong>Substituir</strong>
                  <small>Recria só os módulos do JSON.</small>
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
                  <small>Adiciona/atualiza sem apagar o resto.</small>
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
                Validar
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={loading || !preview || preview.errors?.length > 0}
                onClick={() => {
                  const confirmed = window.confirm(
                    mode === 'replace'
                      ? 'Substituir os módulos presentes no JSON?'
                      : 'Mesclar o JSON com o cardápio atual?'
                  );
                  if (!confirmed) return;
                  runImport({ dryRun: false });
                }}
              >
                {loading ? 'Processando...' : 'Importar'}
              </button>
            </div>
          </div>
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
