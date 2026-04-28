import { useCallback, useState } from 'react'
import type { BulkCalcResponse } from '../api/types'

const REP_KEY = 'car.session.repId.v1'

export interface UseSessionResult {
  selectedRepId: string | null
  setSelectedRepId: (id: string | null) => void
  lastCalc: BulkCalcResponse | null
  setLastCalc: (calc: BulkCalcResponse | null) => void
}

export function useSession(): UseSessionResult {
  const [selectedRepId, setSelectedRepIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(REP_KEY)
    } catch {
      return null
    }
  })
  const [lastCalc, setLastCalc] = useState<BulkCalcResponse | null>(null)

  const setSelectedRepId = useCallback((id: string | null) => {
    setSelectedRepIdState(id)
    try {
      if (id === null) localStorage.removeItem(REP_KEY)
      else localStorage.setItem(REP_KEY, id)
    } catch {
      // localStorage unavailable (e.g., private mode); state still updates
    }
  }, [])

  return { selectedRepId, setSelectedRepId, lastCalc, setLastCalc }
}
