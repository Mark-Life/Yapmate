"use client"

import {
  createContext,
  useContext,
  useRef,
  useMemo,
  useCallback,
  useState,
  type ReactNode,
} from "react"
import {
  resolveDynamicValue,
  type Action,
  type ActionCallback,
  type DynamicValue,
} from "@yapmate/core/generative-ui"
import { useDataOptional } from "./data-context"

type ActionHandler = (params: Record<string, unknown>) => void | Promise<void>

type ActionContextValue = {
  register: (name: string, handler: ActionHandler) => void
  unregister: (name: string) => void
  execute: (action: Action) => Promise<void>
  isExecuting: boolean
}

const ActionContext = createContext<ActionContextValue | null>(null)

export type ActionProviderProps = {
  /** Pre-registered action handlers */
  handlers?: Record<string, ActionHandler>
  /** Callback for navigation actions */
  onNavigate?: (url: string) => void
  /** Callback for confirmation dialogs */
  onConfirm?: (config: Action["confirm"]) => Promise<boolean>
  children: ReactNode
}

/**
 * Provides action execution context for generative UI components
 */
export function ActionProvider({
  handlers: initialHandlers = {},
  onNavigate,
  onConfirm,
  children,
}: ActionProviderProps) {
  const dataCtx = useDataOptional()
  const handlersRef = useRef(new Map<string, ActionHandler>(Object.entries(initialHandlers)))
  const [isExecuting, setIsExecuting] = useState(false)

  const register = useCallback((name: string, handler: ActionHandler) => {
    handlersRef.current.set(name, handler)
  }, [])

  const unregister = useCallback((name: string) => {
    handlersRef.current.delete(name)
  }, [])

  const resolveParams = useCallback(
    (params: Record<string, DynamicValue> | undefined): Record<string, unknown> => {
      if (!params) return {}
      const data = dataCtx?.data ?? {}
      return Object.fromEntries(
        Object.entries(params).map(([key, value]) => [
          key,
          resolveDynamicValue(value, data),
        ])
      )
    },
    [dataCtx?.data]
  )

  const handleCallback = useCallback(
    async (callback: ActionCallback) => {
      if ("navigate" in callback) {
        onNavigate?.(callback.navigate)
      } else if ("set" in callback && dataCtx) {
        const value = resolveDynamicValue(callback.set.value, dataCtx.data)
        dataCtx.set(callback.set.path, value)
      } else if ("action" in callback) {
        await execute(callback.action)
      }
    },
    [dataCtx, onNavigate]
  )

  const execute = useCallback(
    async (action: Action) => {
      const handler = handlersRef.current.get(action.name)
      if (!handler) {
        console.warn(`Unknown action: ${action.name}`)
        return
      }

      // Show confirmation if needed
      if (action.confirm && onConfirm) {
        const confirmed = await onConfirm(action.confirm)
        if (!confirmed) return
      }

      const resolvedParams = resolveParams(action.params)

      setIsExecuting(true)
      try {
        await handler(resolvedParams)

        if (action.onSuccess) {
          await handleCallback(action.onSuccess)
        }
      } catch (error) {
        console.error(`Action ${action.name} failed:`, error)
        if (action.onError) {
          await handleCallback(action.onError)
        }
      } finally {
        setIsExecuting(false)
      }
    },
    [resolveParams, handleCallback, onConfirm]
  )

  const value = useMemo(
    () => ({ register, unregister, execute, isExecuting }),
    [register, unregister, execute, isExecuting]
  )

  return (
    <ActionContext.Provider value={value}>{children}</ActionContext.Provider>
  )
}

/**
 * Access the action context
 */
export function useActions() {
  const ctx = useContext(ActionContext)
  if (!ctx) {
    throw new Error("useActions must be used within ActionProvider")
  }
  return ctx
}

/**
 * Hook for optional action context (returns null if not in provider)
 */
export function useActionsOptional() {
  return useContext(ActionContext)
}

/**
 * Hook for executing an action with a simple callback
 */
export function useActionHandler(action: Action | undefined) {
  const actionsCtx = useActionsOptional()

  return useCallback(() => {
    if (action && actionsCtx) {
      actionsCtx.execute(action)
    }
  }, [action, actionsCtx])
}
