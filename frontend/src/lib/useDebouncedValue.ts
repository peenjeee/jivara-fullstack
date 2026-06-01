"use client";

import { useEffect, useState } from "react";

export const useDebouncedValue = <T>(value: T, delayMs = 250) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timerId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timerId);
  }, [delayMs, value]);

  return debouncedValue;
};
