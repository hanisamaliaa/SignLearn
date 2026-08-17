import { useEffect, useState } from "react";

/**
 * Debounces a value by `delay` ms.
 * Returns the debounced value which only updates after the delay
 * has elapsed without the source value changing.
 */
export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
