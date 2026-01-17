"use client"

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react"
import {
  getByPath,
  setByPath,
  resolveDynamicValue,
  type DynamicValue,
} from "@yapmate/core/generative-ui"

type DataContextValue = {
  data: Record<string, unknown>
  get: <T = unknown>(path: string) => T
  set: (path: string, value: unknown) => void
  resolve: <T = unknown>(value: DynamicValue<T>) => T
}

const DataContext = createContext<DataContextValue | null>(null)

export type DataProviderProps = {
  initialData?: Record<string, unknown>
  children: ReactNode
}

/**
 * Provides data context for generative UI components
 * Allows path-based data access and dynamic value resolution
 */
export function DataProvider({ initialData = {}, children }: DataProviderProps) {
  const [data, setData] = useState<Record<string, unknown>>(initialData)

  const get = useCallback(
    <T = unknown>(path: string): T => {
      return getByPath(data, path) as T
    },
    [data]
  )

  const set = useCallback((path: string, value: unknown) => {
    setData(prev => setByPath(prev, path, value))
  }, [])

  const resolve = useCallback(
    <T = unknown>(value: DynamicValue<T>): T => {
      return resolveDynamicValue(value, data)
    },
    [data]
  )

  const value = useMemo(
    () => ({ data, get, set, resolve }),
    [data, get, set, resolve]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

/**
 * Access the data context
 */
export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) {
    throw new Error("useData must be used within DataProvider")
  }
  return ctx
}

/**
 * Get a value from the data context by path
 */
export function useDataValue<T = unknown>(path: string): T {
  const { get } = useData()
  return get<T>(path)
}

/**
 * Resolve a dynamic value using the data context
 */
export function useResolvedValue<T = unknown>(value: DynamicValue<T>): T {
  const { resolve } = useData()
  return resolve(value)
}

/**
 * Hook for optional data context (returns null if not in provider)
 */
export function useDataOptional() {
  return useContext(DataContext)
}
