import type { NftCreator } from '@/shared/types'
import { placeholderImage } from './placeholder-image'

/** Criadores fictícios reaproveitados pelas 48 fixtures de NFT (ver `nfts.ts`). */
export const creatorFixtures: NftCreator[] = [
  { id: 'creator-ines-aragao', name: 'Inês Aragão', avatarUrl: placeholderImage('Inês Aragão', '#7c3aed') },
  { id: 'creator-marcos-tavares', name: 'Marcos Tavares', avatarUrl: placeholderImage('Marcos Tavares', '#0ea5e9') },
  { id: 'creator-yuki-sato', name: 'Yuki Sato', avatarUrl: placeholderImage('Yuki Sato', '#f97316') },
  { id: 'creator-dulce-ramirez', name: 'Dulce Ramírez', avatarUrl: placeholderImage('Dulce Ramírez', '#16a34a') },
  { id: 'creator-samuel-okafor', name: 'Samuel Okafor', avatarUrl: placeholderImage('Samuel Okafor', '#db2777') },
  { id: 'creator-lea-fontaine', name: 'Léa Fontaine', avatarUrl: placeholderImage('Léa Fontaine', '#4338ca') },
]
