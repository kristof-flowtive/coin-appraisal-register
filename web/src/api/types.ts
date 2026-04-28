export type Metal = 'silver' | 'gold' | 'platinum'
export type PricedBy = 'each_metal' | 'weight_grams'

export interface CoinType {
  id: string
  name: string
  metal_type: Metal
  priced_by: PricedBy
  unit_label: string
  face_value?: number
}

export interface Rep {
  id: string
  name: string
}

export interface ConfigLoadResponse {
  coin_types: CoinType[]
  reps: Rep[]
}

export type BulkCalcRequestItem =
  | { coin_type_id: string; quantity: number }
  | { coin_type_id: string; weight_grams: number }

export interface Spot {
  gold: number
  silver: number
  platinum: number
}

export interface BulkCalcLine {
  coin_type_id: string
  unit_value: number
  line_total: number
  name?: string
  units?: number
}

export interface BulkCalcResponse {
  spot: Spot
  lines: BulkCalcLine[]
  total: number
}

interface CartLineBase {
  id: string
  coin_type_id: string
  name: string
  metal_type: Metal
  unit_label: string
}

export type CartLine =
  | (CartLineBase & { priced_by: 'each_metal'; quantity: number })
  | (CartLineBase & { priced_by: 'weight_grams'; weight_grams: number })

type DistributiveOmit<T, K extends keyof CartLineBase | keyof CartLine> =
  T extends unknown ? Omit<T, K> : never

export type CartLineInput = DistributiveOmit<CartLine, 'id'>

export function cartLineToRequestItem(line: CartLine): BulkCalcRequestItem {
  return line.priced_by === 'each_metal'
    ? { coin_type_id: line.coin_type_id, quantity: line.quantity }
    : { coin_type_id: line.coin_type_id, weight_grams: line.weight_grams }
}
