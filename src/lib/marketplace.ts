/**
 * Production marketplace boundary.
 *
 * CTX credentials must stay in a server-side adapter. GitHub Pages is static and
 * must never receive the API key or call the trade endpoint directly.
 */
export type Standard = "VCS" | "GOLD_STANDARD" | "UN_CER" | "GCR" | "UCR" | "BIOCARBON"

export type ExchangeListing = {
  exchange: "CTX"
  listingId: string
  projectId: string
  projectName: string
  standard: Standard
  methodology: string
  vintage: string
  country: string
  availableTonnes: number
  unitPrice: number
  currency: string
  negotiable: boolean
  fetchedAt: string
}

export type CostQuote = {
  listingId: string
  tonnes: number
  exchangeUnitPrice: number
  exchangeTransactionFee: number
  registryFee: number
  tax: number
  totalCost: number
  currency: string
  quotedAt: string
  expiresAt?: string
}

export type CompetitorOffer = {
  merchant: string
  url: string
  projectId: string
  standard: Standard
  methodology: string
  vintage: string
  tonnes: number
  subtotal: number
  retirementFee: number
  transactionFee: number
  tax: number
  total: number
  currency: string
  immediatePurchase: boolean
  checkedAt: string
}

export type RetailPriceDecision = {
  listingId: string
  competitor: CompetitorOffer
  targetTotal: number
  targetUnitPrice: number
  exchangeQuote: CostQuote
  grossMargin: number
  approvedForDisplay: boolean
  blockers: string[]
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export function isLikeForLike(listing: ExchangeListing, offer: CompetitorOffer) {
  return (
    same(listing.projectId, offer.projectId) &&
    listing.standard === offer.standard &&
    same(listing.methodology, offer.methodology) &&
    same(listing.vintage, offer.vintage) &&
    listing.currency === offer.currency &&
    offer.immediatePurchase
  )
}

/**
 * Calculate the target from the competitor's checkout total, never a headline
 * unit price. A decision cannot be displayed if it loses money, is stale, or is
 * not an exact project/standard/methodology/vintage match.
 */
export function priceTwentyPercentBelow(
  listing: ExchangeListing,
  exchangeQuote: CostQuote,
  competitor: CompetitorOffer,
  now = Date.now(),
): RetailPriceDecision {
  const blockers: string[] = []
  if (!isLikeForLike(listing, competitor)) blockers.push("not_like_for_like")
  if (competitor.tonnes <= 0 || exchangeQuote.tonnes !== competitor.tonnes) blockers.push("quantity_mismatch")
  if (listing.availableTonnes < competitor.tonnes) blockers.push("insufficient_exchange_inventory")
  if (now - Date.parse(listing.fetchedAt) > 15 * 60_000) blockers.push("exchange_listing_stale")
  if (now - Date.parse(competitor.checkedAt) > 24 * 60 * 60_000) blockers.push("competitor_checkout_stale")

  const targetTotal = Math.round(competitor.total * 0.8 * 100) / 100
  const targetUnitPrice = Math.round((targetTotal / competitor.tonnes) * 100) / 100
  const grossMargin = Math.round((targetTotal - exchangeQuote.totalCost) * 100) / 100
  if (grossMargin <= 0) blockers.push("target_below_cost")

  return {
    listingId: listing.listingId,
    competitor,
    targetTotal,
    targetUnitPrice,
    exchangeQuote,
    grossMargin,
    approvedForDisplay: blockers.length === 0,
    blockers,
  }
}
