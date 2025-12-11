import { useState, useEffect, useCallback } from 'react';

const STORAGE_PREFIX = 'bthunder_';

export interface OfflineStorageOptions<T> {
  key: string;
  defaultValue: T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
}

export function useOfflineStorage<T>({
  key,
  defaultValue,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
}: OfflineStorageOptions<T>): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const storageKey = `${STORAGE_PREFIX}${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return deserialize(stored);
      }
    } catch (error) {
      console.warn(`Error reading from localStorage key "${storageKey}":`, error);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, serialize(value));
    } catch (error) {
      console.warn(`Error writing to localStorage key "${storageKey}":`, error);
    }
  }, [storageKey, value, serialize]);

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolvedValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prev) 
        : newValue;
      return resolvedValue;
    });
  }, []);

  const clearValue = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setValue(defaultValue);
    } catch (error) {
      console.warn(`Error clearing localStorage key "${storageKey}":`, error);
    }
  }, [storageKey, defaultValue]);

  return [value, updateValue, clearValue];
}

// Utility to save any data offline
export function saveOfflineData(key: string, data: any): boolean {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn(`Error saving offline data for key "${key}":`, error);
    return false;
  }
}

// Utility to retrieve offline data
export function getOfflineData<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn(`Error retrieving offline data for key "${key}":`, error);
  }
  return defaultValue;
}

// Utility to clear all offline data
export function clearAllOfflineData(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Error clearing offline data:', error);
  }
}

export default useOfflineStorage;
