import { WyvernV2 } from '@reservoir0x/sdk'
import { Signer } from 'ethers'
import { paths } from 'interfaces/apiTypes'
import setParams from './params'

/**
 *
 * @param apiBase The Reservoir API base url
 * @param chainId The Ethereum chain ID (eg: 1 - Ethereum Mainnet, 4 - Rinkeby Testnet)
 * @param signer An Ethereum signer object
 * @param contract The contract address for the collection
 * @param tokenId The token ID
 * @returns `true` if the transaction was succesful, `fasle` otherwise
 */
async function instantBuy(
  apiBase: string,
  chainId: ChainId,
  signer: Signer,
  query: paths['/orders/fill']['get']['parameters']['query']
) {
  try {
    // Fetch the best sell order for this token
    let url = new URL('/orders/fill', apiBase)

    setParams(url, query)

    const res = await fetch(url.href)

    const { order } =
      (await res.json()) as paths['/orders/fill']['get']['responses']['200']['schema']

    if (!order?.params) {
      throw new ReferenceError('Could not retrieve order params')
    }

    // Use SDK to create order object
    const sellOrder = new WyvernV2.Order(chainId, order.params)

    const signerAddress = await signer.getAddress()

    // Create a matching buy order
    const buyOrder = sellOrder.buildMatching(
      signerAddress,
      order.buildMatchingArgs
    )

    const exch = new WyvernV2.Exchange(chainId)

    // Execute order match
    const { wait } = await exch.match(signer, buyOrder, sellOrder)

    // Wait for the transaction to be mined
    await wait()

    return true
  } catch (err) {
    console.error(err)
  }

  return false
}

export { instantBuy }