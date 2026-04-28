import { useCallback, useEffect, useRef, useState } from 'react'
import { loadConfig } from '../api/client'
import type { CoinType, Rep } from '../api/types'

interface ConfigState {
  coinTypes: CoinType[]
  reps: Rep[]
  loading: boolean
  error: Error | null
}

export interface UseConfigResult extends ConfigState {
  refresh: () => Promise<void>
}

export function useConfig(): UseConfigResult {
  const [state, setState] = useState<ConfigState>({
    coinTypes: [],
    reps: [],
    loading: true,
    error: null,
  })

  const callIdRef = useRef(0)

  const refresh = useCallback(async () => {
    const callId = ++callIdRef.current
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await loadConfig()
      if (callId !== callIdRef.current) return
      setState({
        coinTypes: res.coin_types,
        reps: res.reps,
        loading: false,
        error: null,
      })
    } catch (err) {
      if (callId !== callIdRef.current) return
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...state, refresh }
}
