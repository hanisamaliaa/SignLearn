import { useState, useCallback } from "react";
import { getItem, setItem, removeItem } from "../utils/storage";

/**
 * useState synced with localStorage.
 * @param {string} key
 * @param {unknown} initialValue
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = getItem(key);
    return stored !== null && stored !== undefined ? stored : initialValue;
  });

  const setStoredValue = useCallback(
    (updater) => {
      setValue((prev) => {
        const next = updater instanceof Function ? updater(prev) : updater;
        setItem(key, next);
        return next;
      });
    },
    [key],
  );

  const removeStoredValue = useCallback(() => {
    removeItem(key);
    setValue(undefined);
  }, [key]);

  return [value, setStoredValue, removeStoredValue];
}
