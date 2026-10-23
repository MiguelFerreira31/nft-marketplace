import { HttpResponse, http } from 'msw'
import { WALLET_NETWORKS } from '@/shared/types'
import type { UpsertWalletRequest, UpsertWalletResponse, Wallet, WalletId, WalletKind, WalletsListResponse } from '@/shared/types'
import { getDb, persistDb } from '../db/store'
import { requireUser } from '../utils/auth'
import { validationError } from '../utils/http-error'
import { createMockId } from '../utils/ids'
import { withScenario } from '../utils/with-scenario'

const VALID_KINDS: WalletKind[] = ['primary', 'secondary']
const WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

export const walletsHandlers = [
  http.get(
    '/api/wallets',
    withScenario('wallets.list', async () => {
      const db = await getDb()
      const user = requireUser(db)
      const response: WalletsListResponse = { items: user.wallets }
      return HttpResponse.json(response)
    }),
  ),

  http.put(
    '/api/wallets/:kind',
    withScenario('wallets.upsert', async ({ request, params }) => {
      const db = await getDb()
      const user = requireUser(db)
      const kindParam = params.kind as WalletKind
      const body = (await request.json()) as UpsertWalletRequest

      const fieldErrors: Record<string, string[]> = {}
      if (!VALID_KINDS.includes(kindParam)) fieldErrors.kind = ['Tipo de carteira inválido.']
      if (body.kind !== kindParam) fieldErrors.kind = ['O tipo de carteira não corresponde à rota solicitada.']
      if (!body.address || !WALLET_ADDRESS_PATTERN.test(body.address.trim())) {
        fieldErrors.address = ['Informe um endereço EVM válido (0x seguido de 40 caracteres hexadecimais).']
      }
      if (!WALLET_NETWORKS.some((network) => network.id === body.network)) {
        fieldErrors.network = ['Selecione uma rede disponível.']
      }
      if ((body.label?.trim().length ?? 0) > 40) fieldErrors.label = ['O nome da carteira deve ter até 40 caracteres.']
      if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors)

      const now = new Date().toISOString()
      const existing = user.wallets.find((wallet) => wallet.kind === kindParam)
      const wallet: Wallet = existing
        ? { ...existing, address: body.address.trim(), network: body.network, label: body.label?.trim() || null, updatedAt: now }
        : {
            id: createMockId('wallet') as WalletId,
            kind: kindParam,
            address: body.address.trim(),
            network: body.network,
            label: body.label?.trim() || null,
            createdAt: now,
            updatedAt: now,
          }

      user.wallets = existing ? user.wallets.map((candidate) => (candidate.kind === kindParam ? wallet : candidate)) : [...user.wallets, wallet]
      persistDb(db)

      const response: UpsertWalletResponse = wallet
      return HttpResponse.json(response, { status: existing ? 200 : 201 })
    }),
  ),
]
