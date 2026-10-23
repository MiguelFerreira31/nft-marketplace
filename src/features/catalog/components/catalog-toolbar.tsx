import { Check, Search, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { NftListQuery } from '@/shared/types'
import { CATALOG_CATEGORY_OPTIONS, CATALOG_SORT_OPTIONS, sortOptionId } from '../constants'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

interface CatalogToolbarProps {
  search: NftListQuery
  /** Aplica um patch de filtro — SEMPRE reinicia a paginação (readme §3: "mudança de filtro deve reiniciar a paginação"). */
  onApplyFilters: (patch: Partial<NftListQuery>) => void
  onClearFilters: () => void
}

const SEARCH_DEBOUNCE_MS = 400
const PRICE_DEBOUNCE_MS = 500

function SearchField({ value, onApply }: { value: string; onApply: (next: string | undefined) => void }) {
  const id = useId()
  const [draft, setDraft] = useState(value)
  const debounced = useDebouncedValue(draft, SEARCH_DEBOUNCE_MS)

  // Sincroniza quando o valor vem de fora (navegação pelo histórico, "limpar filtros").
  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (debounced === value) return
    onApply(debounced.trim().length > 0 ? debounced.trim() : undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só deve reagir à mudança do próprio debounced.
  }, [debounced])

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Buscar</Label>
      <div className="relative">
        <Search aria-hidden="true" className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="search"
          placeholder="Título, coleção ou criador"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="pl-8"
        />
      </div>
    </div>
  )
}

function PriceField({
  idSuffix,
  label,
  value,
  onApply,
}: {
  idSuffix: string
  label: string
  value: string | undefined
  onApply: (next: string | undefined) => void
}) {
  const id = useId()
  const [draft, setDraft] = useState(value ?? '')
  const debounced = useDebouncedValue(draft, PRICE_DEBOUNCE_MS)

  useEffect(() => {
    setDraft(value ?? '')
  }, [value])

  useEffect(() => {
    const normalized = debounced.trim().length > 0 ? debounced.trim() : undefined
    if (normalized === (value ?? undefined)) return
    onApply(normalized)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-${idSuffix}`}>{label}</Label>
      <Input
        id={`${id}-${idSuffix}`}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.001"
        placeholder="0.00"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="w-24"
      />
    </div>
  )
}

export function CatalogToolbar({ search, onApplyFilters, onClearFilters }: CatalogToolbarProps) {
  const categoryGroupId = useId()
  const sortId = useId()
  const selectedCategories = new Set(search.category ?? [])

  function toggleCategory(value: string) {
    const next = new Set(selectedCategories)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onApplyFilters({ category: next.size > 0 ? Array.from(next) : undefined })
  }

  const hasActiveFilters = Boolean(
    search.search || (search.category && search.category.length > 0) || search.priceMinEth || search.priceMaxEth || search.sortKey,
  )

  return (
    <section aria-label="Busca e filtros do catálogo" className="flex flex-col gap-4 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-sm flex-1">
          <SearchField value={search.search ?? ''} onApply={(next) => onApplyFilters({ search: next })} />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <PriceField idSuffix="min" label="Preço mín. (ETH)" value={search.priceMinEth} onApply={(next) => onApplyFilters({ priceMinEth: next })} />
          <PriceField idSuffix="max" label="Preço máx. (ETH)" value={search.priceMaxEth} onApply={(next) => onApplyFilters({ priceMaxEth: next })} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={sortId}>Ordenar por</Label>
            <select
              id={sortId}
              value={sortOptionId(search.sortKey, search.sortOrder)}
              onChange={(event) => {
                const option = CATALOG_SORT_OPTIONS.find((candidate) => candidate.id === event.target.value)
                if (option) onApplyFilters({ sortKey: option.sortKey, sortOrder: option.sortOrder })
              }}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {CATALOG_SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend id={categoryGroupId} className="text-sm font-medium">
          Categorias
        </legend>
        <div role="group" aria-labelledby={categoryGroupId} className="flex flex-wrap gap-2">
          {CATALOG_CATEGORY_OPTIONS.map((option) => {
            const checked = selectedCategories.has(option.value)
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  checked
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggleCategory(option.value)}
                />
                {checked ? <Check aria-hidden="true" className="size-3" /> : null}
                {option.label}
              </label>
            )
          })}
        </div>
      </fieldset>

      {hasActiveFilters ? (
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={onClearFilters}>
            <X aria-hidden="true" />
            Limpar filtros
          </Button>
        </div>
      ) : null}
    </section>
  )
}
