import type {
  BulkCalcRequestItem,
  BulkCalcResponse,
  ConfigLoadResponse,
} from './types'

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ''}`,
    )
  }
  return (await res.json()) as T
}

export async function loadConfig(): Promise<ConfigLoadResponse> {
  const url = import.meta.env.VITE_CONFIG_LOAD_URL
  if (!url) throw new Error('VITE_CONFIG_LOAD_URL is not set')
  return postJSON<ConfigLoadResponse>(url, {})
}

export async function calculateBulk(
  items: BulkCalcRequestItem[],
): Promise<BulkCalcResponse> {
  const url = import.meta.env.VITE_BULK_CALC_URL
  if (!url) throw new Error('VITE_BULK_CALC_URL is not set')
  return postJSON<BulkCalcResponse>(url, { items })
}
