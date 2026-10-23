import { Minus, Plus } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface QuantityStepperProps {
  value: number
  max: number
  onChange: (next: number) => void
  disabled?: boolean
}

/**
 * Seletor de quantidade do detalhe do NFT (readme §3: "...quantidade...").
 * `max` é `availableQuantity` da edição selecionada — readme §3 "Catálogo e
 * detalhe": "o detalhe deve suportar... limite de quantidade". O limite é
 * aplicado tanto pelo atributo `max`/desabilitação do botão "+" quanto por
 * clamping defensivo em `onChange`, para nunca deixar passar um valor acima
 * do disponível, seja por clique rápido ou digitação direta.
 */
export function QuantityStepper({ value, max, onChange, disabled = false }: QuantityStepperProps) {
  const id = useId()
  const isDisabled = disabled || max <= 0

  function clamp(next: number): number {
    if (!Number.isFinite(next)) return 1
    return Math.min(Math.max(1, Math.trunc(next)), Math.max(1, max))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Quantidade</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Diminuir quantidade"
          disabled={isDisabled || value <= 1}
          onClick={() => onChange(clamp(value - 1))}
        >
          <Minus aria-hidden="true" />
        </Button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={Math.max(1, max)}
          value={value}
          disabled={isDisabled}
          onChange={(event) => onChange(clamp(Number(event.target.value)))}
          className="h-7 w-14 rounded-lg border border-input bg-transparent px-2 text-center text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Aumentar quantidade"
          disabled={isDisabled || value >= max}
          onClick={() => onChange(clamp(value + 1))}
        >
          <Plus aria-hidden="true" />
        </Button>
        <span className="text-xs text-muted-foreground">{max > 0 ? `${max} disponíveis` : 'Esgotado'}</span>
      </div>
    </div>
  )
}
