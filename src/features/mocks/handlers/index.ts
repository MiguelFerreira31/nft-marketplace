import type { AnyHandler } from 'msw'
import { cartHandlers } from './cart'
import { controlHandlers } from './control'
import { favoritesHandlers } from './favorites'
import { nftHandlers } from './nfts'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
import { quoteHandlers } from './quote'
import { sessionHandlers } from './session'
import { walletsHandlers } from './wallets'
import { realtimeHandler } from '../realtime/events'

export const handlers: AnyHandler[] = [
  ...sessionHandlers,
  ...nftHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletsHandlers,
  ...controlHandlers,
  realtimeHandler,
]
