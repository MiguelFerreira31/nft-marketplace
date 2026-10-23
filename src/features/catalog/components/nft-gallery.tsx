import { useState } from 'react'
import { cn } from '@/lib/utils'

interface NftGalleryProps {
  images: string[]
  title: string
}

/**
 * Galeria do detalhe do NFT (readme §3: "Detalhes do NFT | Galeria...").
 * Imagem principal + miniaturas navegáveis por teclado (botões nativos,
 * sem nenhuma lib de carrossel) — `aria-current` marca a miniatura ativa
 * sem depender só de cor (readme §8).
 */
export function NftGallery({ images, title }: NftGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const safeIndex = activeIndex < images.length ? activeIndex : 0
  const activeImage = images[safeIndex]

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square overflow-hidden rounded-xl bg-muted">
        {activeImage ? (
          <img src={activeImage} alt={`${title} — imagem ${safeIndex + 1} de ${images.length}`} className="h-full w-full object-cover" />
        ) : null}
      </div>
      {images.length > 1 ? (
        <div role="group" aria-label="Miniaturas da galeria" className="flex gap-2">
          {images.map((image, index) => (
            <button
              key={image + index}
              type="button"
              aria-current={index === safeIndex}
              aria-label={`Ver imagem ${index + 1} de ${images.length}`}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'size-16 shrink-0 overflow-hidden rounded-lg border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                index === safeIndex ? 'border-primary' : 'border-transparent hover:border-border',
              )}
            >
              <img src={image} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
