import { useRef, useState } from 'react';
import { isDeviceMenuField, PIZZA_MODE_FIELD } from './budgetCatalog.js';

export function useDeviceMenu(roomId) {
  const key = `batataria-pizza-v1:${roomId}`;
  const [fields, setFields] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) ?? '{}');
      return Object.fromEntries(Object.entries(saved).filter(([path, value]) => isDeviceMenuField(path) &&
        (path === PIZZA_MODE_FIELD ? typeof value === 'boolean' : Number.isFinite(value) && value >= 0)));
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
      setError('O navegador não guardou as edições da Pizza. Os valores continuam nesta tela.');
    }
  }

  return { fields, error, edit };
}
