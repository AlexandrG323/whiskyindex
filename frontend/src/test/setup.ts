import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

/**
 * Node's experimental Web Storage is undefined unless --localstorage-file is
 * set, which shadows jsdom's implementation. An in-memory stub keeps tests
 * independent of that flag.
 */
function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear() {
      map.clear()
    },
    getItem(key: string) {
      return map.get(key) ?? null
    },
    key(index: number) {
      return [...map.keys()][index] ?? null
    },
    removeItem(key: string) {
      map.delete(key)
    },
    setItem(key: string, value: string) {
      map.set(key, String(value))
    },
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: createMemoryStorage(),
})

afterEach(() => {
  cleanup()
})
