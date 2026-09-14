import { create } from 'zustand'

interface FilterState {
  province: string | null
  category: string | null
  year: number | null
  setProvince: (p: string | null) => void
  setCategory: (c: string | null) => void
  setYear: (y: number | null) => void
}

export const LATEST_FULL_YEAR = 2024
export const AVAILABLE_YEARS = [2020, 2021, 2022, 2023, 2024, 2025]
export const HEADLINE_TOTAL_CATEGORY = 'Full 17'

export const useFilters = create<FilterState>((set) => ({
  province: null,
  category: null,
  year: LATEST_FULL_YEAR,
  setProvince: (p) => set({ province: p }),
  setCategory: (c) => set({ category: c }),
  setYear: (y) => set({ year: y }),
}))
