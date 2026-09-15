# CTX integration gate

The public site is a static GitHub Pages application. It cannot safely hold a CTX API key. A live marketplace needs a small server-side service that:

1. Authenticates with an individually issued CTX Corporate API key.
2. Reads the live listings feed and stores the CTX listing ID, project ID, standard, methodology, vintage, quantity, currency and fetched time.
3. Calls CTX's fee calculator for the exact listing and quantity. The returned total, including CTX transaction fee, registry fee and currency conversion, is the acquisition cost.
4. Stores a same-project competitor checkout observation with subtotal, retirement fee, transaction fee, tax and final total.
5. Displays a retail price only when project ID, standard, methodology, vintage, quantity and currency all match; exchange data is under 15 minutes old; competitor checkout is under 24 hours old; inventory covers the order; and the 20%-below target remains above the CTX all-in cost.
6. Creates a short-lived server quote at cart review. Recheck inventory, CTX fees, competitor checkout and margin before any payment screen.
7. Calls the CTX Buy endpoint only after the customer's payment is authorized and the merchant has enough funds or credit at CTX. Make the operation idempotent and record the CTX trade ID.
8. Reconcile settlement and retirement/transfer status before issuing a receipt. A sales receipt must not be described as a registry retirement certificate.

## Credentials and entitlement required

- Active CTX Corporate API membership for the legal entity operating the store.
- API key issued for that entity and approved origins/IPs.
- Written confirmation that the account may resell through the intended B2B/B2C storefront.
- Current transaction, registry, transfer, retirement, currency and tax fee schedule.
- Funding/settlement workflow and limits.
- Current CTX API documentation or OpenAPI schema.

A normal buyer-only account is not enough. CTX's published fee sheet lists an API Corporate Account separately from buyer-only and full-member accounts.

## Current public CTX facts checked 16 September 2026

- CTX says its API can return live listings, exact cost breakdowns and execute purchases.
- CTX says browser origins can be allow-listed, but keeping the key server-side is still safer.
- Public fees list a USD 5,000 annual API Corporate Account and 10% API transaction fee, plus registry charges. Commercial terms can vary by agreement.
- CTX rules say completed trades are binding, only members/authorized representatives can trade, and the member is liable for use through its credentials.
- CTX rules allow CTX to buy to hold, resell or retire for a member under the applicable agreement and fees.

Sources:
- https://ctxglobal.com/ctx-api-solution/
- https://ctxglobal.com/global-carbon-sales-solution/
- https://ctxglobal.com/fees/
- https://ctxglobal.com/wp-content/uploads/2025/06/Carbon_Trade_Exchange_Rules.pdf
