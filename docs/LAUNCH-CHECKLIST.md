# Launch checklist

## Commercial and legal

- Identify the merchant legal entity and its VAT treatment.
- Recover and review the earlier cease-and-desist letters before reusing the old model or claims.
- Have counsel review CTX reseller/API terms, customer terms, refund/failure handling, AML/KYC/sanctions scope, privacy/DPA, registry retirement authority and marketing claims.
- Ban unsupported "carbon neutral", "climate neutral", "offset your impact" and equivalence claims. Sell a documented credit/retirement service, not an outcome the evidence cannot support.
- Confirm who contracts with the buyer, who owns credits in flight, and what happens when a CTX listing moves or the trade fails after customer payment.

## Product controls

- Server-side key storage, rotation and access log.
- Idempotency keys for quote, payment, CTX buy and retirement.
- Inventory reservation or a clear repricing/failure path.
- Project/registry links, serial/retirement evidence and immutable receipts.
- Price and availability timestamps in the UI.
- No payment capture until a fresh CTX quote and inventory check pass.
- Reconciliation queue for payment/CTX split failures and customer refunds.
- Human approval for first live trades and for every new project/methodology.

## EU claims source

Directive (EU) 2024/825 must be applied by member states from 27 September 2026 and targets generic or offset-based environmental claims. Review final site copy against the Latvian implementation and the directive before launch.

Source: https://eur-lex.europa.eu/eli/dir/2024/825/oj/eng
