import { useEffect, useState } from 'react';
import { createCostsExport, downloadCostsExport, PURCHASE_UNITS_FIELD } from './exportCosts.js';

const panel = 'https://batatas-da-grazi-admin.pages.dev/#custos';
const statusUrl = 'https://iypbhdcanvjkqqqabzbo.supabase.co/functions/v1/store-api/migration-status';
const movedKey = 'grazi-caderno-moved';

export function useCadernoStatus() {
  const [status, setStatus] = useState(() => {
    if (import.meta.env.DEV) return 'open';
    try { return localStorage.getItem(movedKey) === 'true' ? 'moved' : 'checking'; }
    catch { return 'checking'; }
  });

  useEffect(() => {
    if (status === 'moved' || import.meta.env.DEV) return;
    const controller = new AbortController();
    let busy = false;
    async function refresh() {
      if (busy || document.visibilityState === 'hidden') return;
      busy = true;
      try {
        const response = await fetch(statusUrl, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(6000)]), cache: 'no-store',
        });
        if (!response.ok) throw new Error();
        const { moved } = await response.json();
        if (typeof moved !== 'boolean') throw new Error();
        if (controller.signal.aborted) return;
        if (moved) {
          try { localStorage.setItem(movedKey, 'true'); } catch { /* The status still applies in this tab. */ }
        }
        setStatus(moved ? 'moved' : 'open');
      } catch {
        if (!controller.signal.aborted) setStatus((current) => current === 'open' ? current : 'unavailable');
      } finally {
        busy = false;
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [status === 'moved']);
  return status;
}

export default function CadernoTransfer({ budget, device, unitDraft, moved = false }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function exportData() {
    const room = budget.cloud;
    if (!room || busy) return;
    setBusy(true);
    setError('');
    try {
      const draft = moved && budget.dirty ? budget.values : {};
      const fields = { ...draft, ...device.fields };
      if (moved && Object.keys(unitDraft).length) {
        fields[PURCHASE_UNITS_FIELD] = { ...device.fields[PURCHASE_UNITS_FIELD], ...unitDraft };
      }
      downloadCostsExport(await createCostsExport(room, fields));
    } catch {
      setError('Não conseguimos exportar o caderno. Tente de novo.');
    } finally { setBusy(false); }
  }

  return <section aria-labelledby="caderno-transfer-heading" className="caderno-transfer">
    <h2 id="caderno-transfer-heading">{moved ? 'O caderno mudou de endereço' : 'Painel da Grazi'}</h2>
    <p>{moved ? 'Compras, receitas e preços são editados no painel.' : 'A exportação guarda uma cópia dos dados deste aparelho.'}</p>
    <div className="caderno-transfer-actions">
      <a className="budget-button primary" href={panel}>Abrir Painel da Grazi</a>
      <button className="budget-button secondary" type="button" onClick={exportData}
        disabled={busy || !budget.cloud || (!moved && (Object.keys(unitDraft).length > 0 || budget.dirty > 0))}>
        {busy ? 'Exportando…' : 'Exportar dados deste aparelho'}
      </button>
    </div>
    {!moved && (Object.keys(unitDraft).length > 0 || budget.dirty > 0) && <p>Salve as suas mudanças para incluir no arquivo.</p>}
    {!budget.cloud && (budget.readError
      ? <p>O caderno não carregou. <button className="text-link" type="button" onClick={budget.refresh}>Tentar de novo</button></p>
      : <p role="status">Carregando os dados para exportar…</p>)}
    {error && <p role="alert">{error}</p>}
  </section>;
}
