import { useRef, useState } from 'react';
import { CUSTOM_CATALOG_FIELD, isDeviceBudgetField, PIZZA_MODE_FIELD } from './budgetCatalog.js';

export function useDeviceBudget(roomId) {
  // Keep the existing key so saved Pizza purchases and recipes still load.
  const key = `batataria-pizza-v1:${roomId}`;
  const [fields, setFields] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) ?? '{}');
      return Object.fromEntries(Object.entries(saved).filter(([path, value]) => {
        if (!isDeviceBudgetField(path)) return false;
        if (path === PIZZA_MODE_FIELD) return typeof value === 'boolean';
        if (path === CUSTOM_CATALOG_FIELD) return typeof value === 'string';
        return Number.isFinite(value) && value >= 0;
      }));
    } catch {
      return {};
    }
  });
  const current = useRef(fields);
  const [error, setError] = useState('');

  function edit(changes) {
    const next = { ...current.current, ...changes };
    current.current = next;
    setFields(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
      setError('');
    } catch {
      setError('O navegador não guardou as edições deste aparelho. Os valores continuam nesta tela.');
    }
  }

  return { fields, error, edit };
}
