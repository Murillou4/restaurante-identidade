import { useCallback, useEffect, useRef, useState } from 'react';
import { names, references } from './data';

const API_ORIGIN = 'https://batataria-caderno-compartilhado.murillo-castro.chatgpt.site';
const PERSON_STORAGE_KEY = 'nossa-batataria-pessoa-v1';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ITEM_IDS = {
  names: new Set(names.map((item) => item.id)),
  references: new Set(references.map((item) => item.id)),
};
const isPerson = (value) => value === 'eu' || value === 'mae';
const cellKey = (person, collection, id) => `${person}:${collection}:${id}`;

function readBoard() {
  const url = new URL(window.location.href);
  const requestedId = url.searchParams.get('caderno');
  const roomId = UUID_V4.test(requestedId || '') ? requestedId.toLowerCase() : crypto.randomUUID();
  if (requestedId !== roomId) {
    url.searchParams.set('caderno', roomId);
    window.history.replaceState(window.history.state, '', url);
  }
  const invitedPerson = url.searchParams.get('pessoa');
  return { roomId, invitedPerson: isPerson(invitedPerson) ? invitedPerson : null };
}

function readPerson() {
  try {
    const saved = localStorage.getItem(PERSON_STORAGE_KEY);
    return isPerson(saved) ? saved : null;
  } catch {
    return null;
  }
}

function parseSnapshot(value, roomId) {
  if (value?.roomId !== roomId || !Number.isSafeInteger(value.revision) || value.revision < 0) {
    throw new Error('Resposta inválida do caderno.');
  }
  const people = {};
  for (const person of ['eu', 'mae']) {
    people[person] = {};
    for (const collection of ['names', 'references']) {
      const selected = value.people?.[person]?.[collection];
      if (!Array.isArray(selected) || selected.some((id) => !ITEM_IDS[collection].has(id))) {
        throw new Error('Resposta inválida do caderno.');
      }
      people[person][collection] = [...new Set(selected)];
    }
  }
  return { roomId, revision: value.revision, people };
}

/**
 * Backend snapshots are authoritative. Failed writes retain their explicit
 * desired value so retrying never turns an uncertain save into a second toggle.
 */
export function useSharedChoices() {
  const [board] = useState(readBoard);
  const { roomId } = board;
  const [person, setPersonState] = useState(() => board.invitedPerson || readPerson());
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingKeys, setPendingKeys] = useState(() => new Set());
  const [failedKeys, setFailedKeys] = useState(() => new Set());
  const [readError, setReadError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [copyState, setCopyState] = useState('idle');

  const personRef = useRef(person);
  const roomRef = useRef(null);
  const pendingRef = useRef(new Map());
  const failuresRef = useRef(new Map());
  const controllers = useRef(new Set());
  const readFlight = useRef(null);
  const mounted = useRef(false);
  const epoch = useRef(0);
  const alive = useCallback((requestEpoch) => mounted.current && epoch.current === requestEpoch, []);

  const publishFailures = useCallback(() => {
    setFailedKeys(new Set(failuresRef.current.keys()));
  }, []);

  const applySnapshot = useCallback((value) => {
    const snapshot = parseSnapshot(value, roomId);
    if (roomRef.current && snapshot.revision < roomRef.current.revision) return roomRef.current;
    roomRef.current = snapshot;
    setRoom(snapshot);
    // A later read can confirm a write whose response was lost in transit.
    let confirmedFailure = false;
    for (const [key, operation] of failuresRef.current) {
      const choices = snapshot.people[operation.person];
      const confirmed = operation.reset
        ? choices.names.length === 0 && choices.references.length === 0
        : choices[operation.collection].includes(operation.id) === operation.selected;
      if (confirmed) {
        failuresRef.current.delete(key);
        confirmedFailure = true;
      }
    }
    if (confirmedFailure) publishFailures();
    return snapshot;
  }, [roomId, publishFailures]);

  const request = useCallback(async (path, options = {}) => {
    const controller = new AbortController();
    controllers.current.add(controller);
    const timeout = window.setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), 10000);
    try {
      const response = await fetch(`${API_ORIGIN}${path}`, {
        ...options,
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`O servidor respondeu ${response.status}.`);
      return await response.json();
    } finally {
      window.clearTimeout(timeout);
      controllers.current.delete(controller);
    }
  }, []);

  const refresh = useCallback(() => {
    const requestEpoch = epoch.current;
    if (!alive(requestEpoch)) return Promise.resolve(false);
    if (readFlight.current?.epoch === requestEpoch) return readFlight.current.promise;
    setLoading(true);
    const flight = { epoch: requestEpoch, promise: null };
    flight.promise = (async () => {
      try {
        const snapshot = await request(`/api/rooms/${roomId}`);
        if (!alive(requestEpoch)) return false;
        applySnapshot(snapshot);
        setReadError(null);
        setNotice(null);
        return true;
      } catch {
        if (alive(requestEpoch)) setReadError('Não foi possível atualizar o caderno. Tente novamente.');
        return false;
      } finally {
        if (readFlight.current === flight) {
          readFlight.current = null;
          if (alive(requestEpoch)) setLoading(false);
        }
      }
    })();
    readFlight.current = flight;
    return flight.promise;
  }, [alive, request, roomId, applySnapshot]);

  const execute = useCallback(async (operation) => {
    const requestEpoch = epoch.current;
    if (!alive(requestEpoch) || pendingRef.current.has(operation.key)) return false;
    const resetPending = [...pendingRef.current.values()].some((item) => item.reset);
    if (resetPending || (operation.reset && pendingRef.current.size > 0)) return false;
    pendingRef.current.set(operation.key, operation);
    setPendingKeys(new Set(pendingRef.current.keys()));
    setNotice(null);
    try {
      const path = operation.reset
        ? `/api/rooms/${roomId}/people/${operation.person}/reset`
        : `/api/rooms/${roomId}/favorites/${operation.person}/${operation.collection}/${operation.id}`;
      const snapshot = await request(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operation.reset ? {} : { selected: operation.selected }),
      });
      if (!alive(requestEpoch)) return false;
      applySnapshot(snapshot);
      failuresRef.current.delete(operation.key);
      publishFailures();
      setReadError(null);
      return true;
    } catch {
      if (alive(requestEpoch)) {
        failuresRef.current.set(operation.key, operation);
        publishFailures();
      }
      return false;
    } finally {
      if (alive(requestEpoch)) {
        pendingRef.current.delete(operation.key);
        setPendingKeys(new Set(pendingRef.current.keys()));
      }
    }
  }, [alive, request, roomId, applySnapshot, publishFailures]);

  const setPerson = useCallback((nextPerson) => {
    if (!isPerson(nextPerson)) return false;
    personRef.current = nextPerson;
    setPersonState(nextPerson);
    setNotice(null);
    try { localStorage.setItem(PERSON_STORAGE_KEY, nextPerson); } catch { /* Session choice still works. */ }
    // An invitation selects the person once; future reloads use this device's choice.
    const url = new URL(window.location.href);
    if (url.searchParams.has('pessoa')) {
      url.searchParams.delete('pessoa');
      window.history.replaceState(window.history.state, '', url);
    }
    return true;
  }, []);

  const toggle = useCallback((collection, id) => {
    const currentPerson = personRef.current;
    if (!currentPerson) {
      setNotice('Escolha primeiro quem está marcando: você ou sua mãe.');
      return Promise.resolve(false);
    }
    if (!ITEM_IDS[collection]?.has(id) || !roomRef.current) return Promise.resolve(false);
    const key = cellKey(currentPerson, collection, id);
    if (failuresRef.current.has(key) || [...failuresRef.current.values()].some((item) => item.reset)) return Promise.resolve(false);
    return execute({
      key, person: currentPerson, collection, id,
      selected: !roomRef.current.people[currentPerson][collection].includes(id),
    });
  }, [execute]);

  const clearPerson = useCallback(() => {
    const currentPerson = personRef.current;
    if (!currentPerson) {
      setNotice('Escolha primeiro de quem são as marcações que você quer limpar.');
      return Promise.resolve(false);
    }
    if (!roomRef.current || pendingRef.current.size > 0 || failuresRef.current.size > 0) return Promise.resolve(false);
    return execute({ key: `${currentPerson}:reset`, person: currentPerson, reset: true });
  }, [execute]);

  const retry = useCallback(async () => {
    if (pendingRef.current.size > 0) return false;
    const failed = [...failuresRef.current.values()];
    if (!failed.length) return refresh();
    const results = await Promise.all(failed.map((operation) => execute(operation)));
    return results.every(Boolean);
  }, [execute, refresh]);

  useEffect(() => {
    mounted.current = true;
    epoch.current += 1;
    if (board.invitedPerson) setPerson(board.invitedPerson);
    refresh();
    const onFocus = () => refresh();
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 10000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      mounted.current = false;
      epoch.current += 1;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      for (const controller of controllers.current) controller.abort();
      pendingRef.current.clear();
    };
  }, [board.invitedPerson, refresh, setPerson]);

  const shareUrl = (() => {
    const url = new URL(window.location.href);
    url.searchParams.set('caderno', roomId);
    url.searchParams.set('pessoa', 'mae');
    url.hash = 'projeto';
    return url.href;
  })();

  const copyLink = useCallback(async () => {
    const requestEpoch = epoch.current;
    if (!alive(requestEpoch)) return false;
    setCopyState('copying');
    try {
      await navigator.clipboard.writeText(shareUrl);
      if (alive(requestEpoch)) setCopyState('copied');
      return true;
    } catch {
      if (alive(requestEpoch)) setCopyState('error');
      return false;
    }
  }, [alive, shareUrl]);

  const hasFailedReset = [...failuresRef.current.values()].some((item) => item.reset);
  const error = failedKeys.size > 0
    ? (hasFailedReset
      ? 'Não foi possível confirmar a limpeza das marcações. Tente novamente.'
      : 'Não foi possível confirmar todas as marcações. Tente novamente para salvar.')
    : readError || notice;

  return {
    roomId, person, setPerson, room, loading,
    pendingKeys, failedKeys, isBusy: pendingKeys.size > 0,
    error, retry, refresh, toggle, clearPerson,
    shareUrl, copyState, copyLink,
  };
}

export default useSharedChoices;
