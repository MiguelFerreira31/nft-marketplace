import { type FormEvent, useId, useState } from 'react'
import { Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { describeQueryError } from '@/features/catalog/lib/api-error-message'
import { getApiErrorBody } from '@/shared/api/http'
import { useApplyCouponMutation, useRemoveCouponMutation } from '../hooks/useQuoteQuery'

interface CouponFormProps {
  cartId: string
  couponCode: string | null
  couponDiscountPercent: number | null
}

/** Traduz o erro de aplicar cupom (readme §3: "tratamento de código inválido ou expirado"). */
function describeCouponError(error: unknown): string {
  const body = getApiErrorBody(error)
  if (!body) return describeQueryError(error)
  if (body.code === 'NOT_FOUND' && body.resource === 'coupon') return 'Cupom inválido ou inexistente.'
  if (body.code === 'CONFLICT' && body.reason === 'COUPON_UNAVAILABLE') return body.message
  return describeQueryError(error)
}

/**
 * Aplicar/remover cupom (readme §3 "Carrinho": "Aplicar e remover cupom,
 * com tratamento de código inválido ou expirado"). `couponCode`/
 * `couponDiscountPercent` vêm da `Quote` (API) — nunca inventados aqui; o
 * formulário só envia o código digitado e espera a cotação atualizada de
 * volta (`useApplyCouponMutation`/`useRemoveCouponMutation` já escrevem a
 * resposta diretamente no cache da cotação, Fase 0).
 */
export function CouponForm({ cartId, couponCode, couponDiscountPercent }: CouponFormProps) {
  const [code, setCode] = useState('')
  const inputId = useId()
  const errorId = useId()
  const applyCoupon = useApplyCouponMutation(cartId)
  const removeCoupon = useRemoveCouponMutation(cartId)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed || applyCoupon.isPending) return
    applyCoupon.mutate(trimmed, {
      onSuccess: () => setCode(''),
    })
  }

  if (couponCode) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">Cupom aplicado</p>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Tag aria-hidden="true" className="size-4" />
            {couponCode}
            {couponDiscountPercent != null ? ` (-${couponDiscountPercent}%)` : null}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remover cupom"
            disabled={removeCoupon.isPending}
            onClick={() => removeCoupon.mutate()}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <p role="status" aria-live="polite" className="min-h-4 text-sm text-destructive">
          {removeCoupon.isError ? describeQueryError(removeCoupon.error) : ''}
        </p>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      <Label htmlFor={inputId}>Cupom de desconto</Label>
      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          name="coupon"
          placeholder="Ex.: BEMVINDO10"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          disabled={applyCoupon.isPending}
          aria-invalid={applyCoupon.isError || undefined}
          aria-describedby={applyCoupon.isError ? errorId : undefined}
        />
        <Button type="submit" variant="outline" disabled={applyCoupon.isPending || code.trim().length === 0}>
          {applyCoupon.isPending ? 'Aplicando…' : 'Aplicar'}
        </Button>
      </div>
      <p id={errorId} role="alert" className="min-h-4 text-sm text-destructive">
        {applyCoupon.isError ? describeCouponError(applyCoupon.error) : ''}
      </p>
    </form>
  )
}
