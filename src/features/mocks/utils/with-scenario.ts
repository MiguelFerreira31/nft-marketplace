import { delay, HttpResponse } from 'msw'
import type { PathParams } from 'msw'
import { HTTP_CLIENT_TIMEOUT_MS } from '@/shared/api/http'
import type { MockEndpointKey } from '../scenario'
import { getScenario, latencyFor, randomLatencyMs } from '../scenario'
import { toHttpResponse } from './http-error'

/**
 * Shape comum dos argumentos recebidos por um resolver `http.*` do MSW
 * (request Fetch real + params de path + cookies). Fixo (não genérico) de
 * propósito: a inferência de um parâmetro de função genérico a partir de um
 * literal `async ({ request }) => ...` sem anotação de tipo não flui bem
 * através de uma função de ordem superior como esta — ver discussão em
 * `ARCHITECTURE.md`. Cada handler só desestrutura o que precisa.
 */
export interface HttpResolverArgs {
  request: Request
  params: PathParams
  cookies: Record<string, string>
}

/**
 * Margem acima do timeout do client Axios (`HTTP_CLIENT_TIMEOUT_MS`) usada
 * para simular um timeout real: o mock atrasa a resposta além do que o
 * client está dispostos a esperar, então o Axios rejeita com `ECONNABORTED`
 * antes dela chegar. O valor exato da resposta tardia não importa — ela é
 * descartada pelo client.
 */
export const TIMEOUT_SCENARIO_DELAY_MS = HTTP_CLIENT_TIMEOUT_MS + 5_000

/**
 * Envolve todo handler de recurso com os cenários de rede/falha globais
 * (seção 6 do readme): indisponibilidade de conexão, erro forçado, timeout e
 * latência variável. Nenhum componente/hook decide isso — é
 * 100% configuração do MSW (`scenario.ts`), lida aqui uma vez por requisição.
 */
export function withScenario(endpoint: MockEndpointKey, handler: (args: HttpResolverArgs) => Promise<Response> | Response) {
  return async (args: HttpResolverArgs): Promise<Response> => {
    const scenario = getScenario()

    if (scenario.networkDown.includes(endpoint)) {
      return HttpResponse.error()
    }

    const forced = scenario.forceError[endpoint]
    if (forced) {
      return HttpResponse.json({ error: forced.body }, { status: forced.status })
    }

    if (scenario.forceTimeout.includes(endpoint)) {
      await delay(TIMEOUT_SCENARIO_DELAY_MS)
    } else {
      await delay(randomLatencyMs(latencyFor(endpoint)))
    }

    try {
      return await handler(args)
    } catch (error) {
      return toHttpResponse(error)
    }
  }
}
