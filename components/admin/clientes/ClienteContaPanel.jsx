'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import MoneyInput from '@/components/admin/orders/MoneyInput';
import { currency } from '@/components/admin/orders/orderDraftUtils';
import { useAdminToast } from '@/context/AdminToastContext';
import { useCaixa } from '@/hooks/useCaixa';
import { useOrderPrint } from '@/context/OrderPrintContext';
import {
  FIADO_BAIXA_METHODS,
  formatContaPedidoWhen,
  formatSaldoDevedor,
  formatSignedContaMoney,
  listClienteContaMovimentos,
  registrarBaixaFiado,
} from '@/lib/fiado/clienteConta';

function ContaMovimentoCard({ mov }) {
  const when = formatContaPedidoWhen(mov.pedidoCreatedAt || mov.createdAt);
  const isPedido = mov.tipo === 'debito_pedido';

  return (
    <div className="admin-cliente-conta-comanda">
      <div className="admin-cliente-conta-comanda-head">
        {isPedido ? (
          <strong>
            Pedido{mov.pedidoCodigo ? ` #${mov.pedidoCodigo}` : ''} — {when}
          </strong>
        ) : (
          <strong>
            {mov.tipoLabel}
            {mov.formaRecebimentoLabel ? ` · ${mov.formaRecebimentoLabel}` : ''} — {when}
          </strong>
        )}
        {!mov.caixaTurnoId && mov.tipo === 'credito_baixa' ? (
          <span className="admin-order-meta">fora do turno</span>
        ) : null}
      </div>

      {isPedido ? (
        <div className="admin-cliente-conta-comanda-items">
          {(mov.itens || []).length ? (
            mov.itens.map((item, idx) => (
              <div key={`${mov.id}-${idx}`} className="admin-cliente-conta-comanda-item">
                <span>
                  {item.qtd}x {item.nome}
                </span>
                <span>{currency(item.subtotal)}</span>
              </div>
            ))
          ) : (
            <span className="admin-order-meta">Itens não disponíveis</span>
          )}
        </div>
      ) : mov.observacao ? (
        <span className="admin-order-meta">{mov.observacao}</span>
      ) : null}

      <div className="admin-cliente-conta-comanda-total">
        <strong>TOTAL</strong>
        <strong className={mov.signedValor < 0 ? 'is-debt' : 'is-credit'}>
          {formatSignedContaMoney(mov.signedValor)}
        </strong>
      </div>
    </div>
  );
}

export default function ClienteContaPanel({ customer, empresaId, onSaldoChange }) {
  const toast = useAdminToast();
  const { isOpen: caixaOpen, turno, refresh: refreshCaixa } = useCaixa();
  const { printClienteConta } = useOrderPrint();
  const [movimentos, setMovimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [baixaOpen, setBaixaOpen] = useState(false);
  const [baixaValor, setBaixaValor] = useState('');
  const [baixaForma, setBaixaForma] = useState('pix');
  const [baixaObs, setBaixaObs] = useState('');
  const [saving, setSaving] = useState(false);

  const saldo = Number(customer?.saldo_fiado || 0);

  const loadMovimentos = useCallback(async () => {
    if (!customer?.id || !empresaId) {
      setMovimentos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listClienteContaMovimentos(customer.id, empresaId);
      setMovimentos(rows);
    } catch (error) {
      toast.error(error?.message || 'Erro ao carregar extrato.');
    } finally {
      setLoading(false);
    }
  }, [customer?.id, empresaId, toast]);

  useEffect(() => {
    void loadMovimentos();
  }, [loadMovimentos]);

  const sortedForPrint = useMemo(
    () => [...movimentos].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [movimentos]
  );

  function openBaixa() {
    const cents = Math.round(Math.max(0, saldo) * 100);
    setBaixaValor(
      cents
        ? (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : ''
    );
    setBaixaForma('pix');
    setBaixaObs('');
    setBaixaOpen(true);
  }

  async function confirmBaixa() {
    const digits = String(baixaValor || '').replace(/\D/g, '');
    const valor = digits ? Number(digits) / 100 : 0;
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    setSaving(true);
    try {
      const result = await registrarBaixaFiado({
        empresaId,
        clienteId: customer.id,
        valor,
        formaRecebimento: baixaForma,
        observacao: baixaObs,
        caixaTurnoId: caixaOpen ? turno?.id || null : null,
      });
      onSaldoChange?.(result.novoSaldo);
      setBaixaOpen(false);
      await loadMovimentos();
      if (caixaOpen) {
        try {
          await refreshCaixa?.();
        } catch {
          /* ignore */
        }
      }
      toast.success(
        result.foraDoTurno
          ? 'Pagamento registrado (fora do turno de caixa).'
          : 'Pagamento registrado e lançado no caixa.'
      );
    } catch (error) {
      toast.error(error?.message || 'Erro ao registrar pagamento.');
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    printClienteConta?.({
      customer,
      movimentos: sortedForPrint,
      saldo,
    });
  }

  return (
    <div className="admin-cliente-conta">
      <div className="admin-cliente-conta-saldo">
        <div>
          <span className="admin-order-meta">Saldo</span>
          <strong className={`admin-cliente-conta-saldo-value${saldo > 0 ? ' is-debt' : ''}`}>
            {formatSaldoDevedor(saldo)}
          </strong>
        </div>
        <div className="admin-cliente-conta-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={saldo <= 0}
            onClick={openBaixa}
          >
            Registrar pagamento
          </button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={handlePrint}>
            Imprimir extrato
          </button>
        </div>
      </div>

      {!caixaOpen ? (
        <p className="admin-order-meta">
          Caixa fechado: baixas ficam só na conta do cliente (fora do turno).
        </p>
      ) : null}

      <h4 className="admin-order-section-title" style={{ marginTop: 16 }}>
        Extrato
      </h4>
      {loading ? (
        <p className="admin-order-meta">Carregando extrato...</p>
      ) : !movimentos.length ? (
        <p className="admin-order-meta">Nenhum lançamento de conta ainda.</p>
      ) : (
        <div className="admin-cliente-conta-extrato">
          {movimentos.map((mov) => (
            <ContaMovimentoCard key={mov.id} mov={mov} />
          ))}
        </div>
      )}

      {baixaOpen ? (
        <div
          className="admin-confirm-overlay"
          role="presentation"
          onClick={() => !saving && setBaixaOpen(false)}
        >
          <div
            className="admin-confirm-modal"
            style={{ width: 'min(420px, 94vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Registrar pagamento</h3>
            <p className="admin-order-meta">
              Saldo atual: {formatSaldoDevedor(saldo)}
              {caixaOpen ? ' · entrará no caixa aberto' : ' · caixa fechado'}
            </p>
            <MoneyInput label="Valor" value={baixaValor} onChange={setBaixaValor} currencyMask />
            <div className="admin-form-group">
              <label className="admin-label">Forma recebida</label>
              <div className="admin-cliente-conta-formas">
                {FIADO_BAIXA_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    className={`admin-btn admin-btn-ghost${baixaForma === m.value ? ' is-active' : ''}`}
                    onClick={() => setBaixaForma(m.value)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Observação (opcional)</label>
              <input
                className="admin-input"
                value={baixaObs}
                onChange={(e) => setBaixaObs(e.target.value)}
                placeholder="Ex.: pagamento parcial"
              />
            </div>
            <div className="admin-confirm-actions">
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                disabled={saving}
                onClick={() => setBaixaOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                disabled={saving}
                onClick={confirmBaixa}
              >
                {saving ? 'Salvando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
