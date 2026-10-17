import { create } from 'zustand'

export type DownloadPhase = 'preparing' | 'downloading'

export type ActiveDownload = {
  id: number
  label: string
  phase: DownloadPhase
  loadedBytes: number
  /** Exact (Content-Length) or server estimate; null when unknown. */
  totalBytes: number | null
  /** True when `totalBytes` is an estimate, so the bar must never claim 100%. */
  estimated: boolean
}

type DownloadState = {
  downloads: ActiveDownload[]
  start: (label: string) => number
  update: (id: number, patch: Partial<Omit<ActiveDownload, 'id' | 'label'>>) => void
  finish: (id: number) => void
}

let nextId = 1

/** In-flight file downloads, rendered by the floating progress panel. */
export const useDownloadStore = create<DownloadState>()((set) => ({
  downloads: [],
  start(label) {
    const id = nextId++
    set((state) => ({
      downloads: [
        ...state.downloads,
        { id, label, phase: 'preparing', loadedBytes: 0, totalBytes: null, estimated: false },
      ],
    }))
    return id
  },
  update(id, patch) {
    set((state) => ({
      downloads: state.downloads.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))
  },
  finish(id) {
    set((state) => ({ downloads: state.downloads.filter((item) => item.id !== id) }))
  },
}))
