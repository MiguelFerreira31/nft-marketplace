import { useId } from 'react'
import { cn } from '@/lib/utils'
import type { Edition } from '@/shared/types'

interface EditionPickerProps {
  editions: Edition[]
  selectedEditionId: Edition['id']
  onSelect: (edition: Edition) => void
}

/**
 * Seletor de edição do detalhe do NFT (readme §3: "Detalhes do NFT |
 * ...edição..."). Um NFT pode ter 1-3 edições (Fase 2, fixtures); cada uma
 * com preço/disponibilidade próprios. "Esgotado" é texto explícito, nunca
 * só uma cor diferente (readme §8: "estados não dependentes apenas de
 * cor").
 */
export function EditionPicker({ editions, selectedEditionId, onSelect }: EditionPickerProps) {
  const groupId = useId()

  if (editions.length <= 1) return null

  return (
    <fieldset className="flex flex-col gap-2">
      <legend id={groupId} className="text-sm font-medium">
        Edição
      </legend>
      <div role="radiogroup" aria-labelledby={groupId} className="flex flex-col gap-2">
        {editions.map((edition) => {
          const soldOut = edition.availableQuantity <= 0
          const checked = edition.id === selectedEditionId
          return (
            <label
              key={edition.id}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                checked ? 'border-primary bg-primary/5' : 'border-border',
                soldOut ? 'cursor-not-allowed opacity-60' : 'hover:border-primary/60',
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={groupId}
                  checked={checked}
                  disabled={soldOut}
                  onChange={() => onSelect(edition)}
                  className="size-4"
                />
                <span>
                  <span className="block font-medium text-foreground">{edition.name}</span>
                  <span className="block text-xs text-muted-foreground">{edition.priceEth} ETH</span>
                </span>
              </span>
              <span className={cn('text-xs font-medium', soldOut ? 'text-destructive' : 'text-muted-foreground')}>
                {soldOut ? 'Esgotado' : `${edition.availableQuantity} de ${edition.totalQuantity} disponíveis`}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
