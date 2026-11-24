import { useCallback, useEffect, useRef, useState } from 'react';
import { CUSTOM_CATALOG_FIELD, isDeviceMenuField } from './budgetCatalog.js';

const API = 'https://batataria-caderno-compartilhado.murillo-castro.chatgpt.site';
const isCustomField = (path) => path === CUSTOM_CATALOG_FIELD || /^ingredients\.custom-|^recipes\.[^.]+\.custom-/.test(path);

export function useSharedBudget(roomId, defaults) {
  const [cloud, setCloud] = useState(null);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [readError, setReadError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [customRejected, setCustomRejected] = useState(false);
  const cloudRef = useRef(null);
  const draftRef = useRef({});
  const mounted = useRef(false);
  const controllers = useRef(new Set());
  const inFlight = useRef(false);
  const failedOperation = useRef(null);
  const draftBase = useRef(null);
  const uncertain = useRef(false);
  const conflictsRef = useRef([]);
  const conflictReview = useRef(false);
  const epoch = useRef(0);

  const request = useCallback(async (body) => {
    const controller = new AbortController();
    controllers.current.add(controller);
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${API}/api/rooms/${roomId}/budget`, { method: body ? 'PUT' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: controller.signal, credentials: 'omit', mode: 'cors', cache: 'no-store' });
      const value = await response.json();
      if (body && response.status === 400) return { rejected: true };
      if ((!response.ok && response.status !== 409) || value.roomId !== roomId || !Number.isSafeInteger(value.revision) || !value.fields || Array.isArray(value.fields)) throw new Error('Resposta inválida');
      return { conflict: response.status === 409, value };
    } finally { window.clearTimeout(timeout); controllers.current.delete(controller); }
  }, [roomId]);

  const apply = useCallback((snapshot) => {
    if (cloudRef.current && snapshot.revision < cloudRef.current.revision) return;
    cloudRef.current = snapshot;
    setCloud(snapshot);
  }, []);

  const refresh = useCallback(async () => {
    const currentEpoch = epoch.current;
    try {
      const { value } = await request();
      if (!mounted.current || currentEpoch !== epoch.current) return;
      apply(value);
      setLoading(false);
      setReadError('');
    } catch {
      if (mounted.current && currentEpoch === epoch.current) {
        setLoading(false);
        setReadError('Falha ao carregar o caderno. Suas edições continuam nesta aba.');
      }
    }
  }, [request, apply]);

  useEffect(() => {
    mounted.current = true;
    epoch.current += 1;
    refresh();
    const onFocus = () => refresh();
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible' && !inFlight.current) refresh(); }, 15000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { mounted.current = false; epoch.current += 1; window.clearInterval(interval); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisibility); for (const c of controllers.current) c.abort(); };
  }, [refresh]);

  useEffect(() => {
    const warn = (event) => { if (Object.keys(draftRef.current).length) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const editMany = useCallback((changes) => {
    if (!draftBase.current) draftBase.current = cloudRef.current;
    const next = { ...draftRef.current };
    // A unit-price edit carries its conversion basis even when that basis is
    // unchanged. Keep the pair through refreshes/conflicts with older clients.
    const pairedPrices = new Set();
    for (const path of Object.keys(changes)) {
      if (!/^ingredients\.[^.]+\.price$/.test(path)) continue;
      const basis = path.replace(/\.price$/, '.packageSize');
      if (!Object.hasOwn(changes, basis)) continue;
      const differs = [path, basis].some((key) => JSON.stringify(changes[key]) !== JSON.stringify(cloudRef.current?.fields[key] ?? defaults[key]));
      if (differs || uncertain.current || inFlight.current) { pairedPrices.add(path); pairedPrices.add(basis); }
    }
    for (const [path, value] of Object.entries(changes)) {
      const confirmed = cloudRef.current?.fields[path] ?? defaults[path];
      // A write with a lost response may already be committed. Keep the user's
      // intent explicit when they change it, even if it matches an old read.
      if (!pairedPrices.has(path) && !uncertain.current && !inFlight.current && JSON.stringify(value) === JSON.stringify(confirmed)) delete next[path];
      else next[path] = value;
    }
    draftRef.current = next;
    setDraft(next);
    if (!Object.keys(next).length) draftBase.current = null;
    const remainingConflicts = conflictsRef.current.filter((item) => Object.hasOwn(next, item.path) && JSON.stringify(next[item.path]) !== JSON.stringify(item.remote)).map((item) => ({ ...item, local: next[item.path] }));
    conflictsRef.current = remainingConflicts;
    setConflicts(remainingConflicts);
    failedOperation.current = null;
    if (!remainingConflicts.length) { conflictReview.current = false; setError(''); }
    setNotice('');
    setCustomRejected(false);
  }, [defaults]);

  const discardCustomEdits = useCallback(() => {
    const next = Object.fromEntries(Object.entries(draftRef.current).filter(([path]) => !isCustomField(path)));
    draftRef.current = next;
    setDraft(next);
    if (!Object.keys(next).length) draftBase.current = null;
    conflictsRef.current = conflictsRef.current.filter(({ path }) => !isCustomField(path));
    setConflicts(conflictsRef.current);
    conflictReview.current = conflictsRef.current.length > 0;
    setCustomRejected(false);
    setError('');
  }, []);

  const save = useCallback(async () => {
    if (!cloudRef.current || inFlight.current || !Object.keys(draftRef.current).length) return false;
    const base = draftBase.current ?? cloudRef.current;
    // Freeze newly introduced defaults when an older caderno is saved, too.
    // The revision check still protects values added by the other appliance.
    // Older servers need no empty catalog field. Explicit catalog edits still
    // travel with their ingredient and recipe fields in the same request.
    const missingDefaults = Object.fromEntries(Object.entries(defaults).filter(([path]) => path !== CUSTOM_CATALOG_FIELD && !isDeviceMenuField(path) && !Object.hasOwn(base.fields, path)));
    const operation = failedOperation.current ?? { revision: base.revision, mutationId: crypto.randomUUID(), changes: { ...missingDefaults, ...draftRef.current } };
    const currentEpoch = epoch.current;
    inFlight.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    setCustomRejected(false);
    try {
      const { value, conflict, rejected } = await request(operation);
      if (!mounted.current || currentEpoch !== epoch.current) return false;
      if (rejected) {
        failedOperation.current = null;
        uncertain.current = false;
        const hasCustomEdits = Object.keys(operation.changes).some(isCustomField);
        setCustomRejected(hasCustomEdits);
        setError(hasCustomEdits
          ? 'O caderno recusou as alterações. Se precisar salvar os outros preços, desfaça as edições dos itens adicionados.'
          : 'O caderno recusou estes valores. Confira os campos que você alterou.');
        return false;
      }
      apply(value);
      setReadError('');
      const confirmed = Object.entries(operation.changes).every(([path, v]) => JSON.stringify(value.fields[path]) === JSON.stringify(v));
      if (conflict && !confirmed) {
        conflictReview.current = true;
        failedOperation.current = null;
        uncertain.current = false;
        const changed = Object.entries(draftRef.current).filter(([path, local]) => {
          const previous = base.fields[path] ?? defaults[path];
          const remote = value.fields[path] ?? defaults[path];
          return JSON.stringify(previous) !== JSON.stringify(remote) && JSON.stringify(local) !== JSON.stringify(remote);
        }).map(([path, local]) => ({ path, local, remote: value.fields[path] ?? defaults[path] }));
        conflictsRef.current = changed;
        setConflicts(changed);
        draftBase.current = value;
        setError('O outro aparelho atualizou o orçamento. Carregamos as mudanças e mantivemos suas edições. Confira os valores e clique em Salvar novamente.');
        return false;
      }
      const next = { ...draftRef.current };
      for (const [path, v] of Object.entries(operation.changes)) if (JSON.stringify(next[path]) === JSON.stringify(v)) delete next[path];
      draftRef.current = next;
      setDraft(next);
      draftBase.current = Object.keys(next).length ? value : null;
      uncertain.current = false;
      conflictReview.current = false;
      conflictsRef.current = [];
      setConflicts([]);
      failedOperation.current = null;
      setNotice('Orçamento salvo para vocês dois.');
      return true;
    } catch {
      if (mounted.current && currentEpoch === epoch.current) { failedOperation.current = operation; uncertain.current = true; setError('Não foi possível confirmar o salvamento. Suas edições continuam aqui. Clique em Salvar novamente para tentar.'); }
      return false;
    } finally { inFlight.current = false; if (mounted.current && currentEpoch === epoch.current) setSaving(false); }
  }, [request, apply, defaults]);

  return {
    values: { ...defaults, ...cloud?.fields, ...draft },
    cloud, loading, saving, readError, error, notice, conflicts, customRejected,
    dirty: Object.keys(draft).length,
    edit: (path, value) => editMany({ [path]: value }),
    editMany, save, refresh, discardCustomEdits,
  };
}
