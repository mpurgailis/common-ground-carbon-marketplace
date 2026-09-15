# Common Ground - carbon marketplace concept

A non-transactional carbon-offset marketplace concept. It supports browsing, filtering, project detail views, tonne quantities, a mixed-project cart, and a demo checkout. It does not take payment or create credits, ownership, retirement, certificates, or environmental claims. All catalog data is illustrative.

## Component provenance

Kobra registry components are vendored from the public `https://kobra.systems/r/{name}.json` registry and used as rendered product features:

- `command-menu`: Cmd/Ctrl-K marketplace search/filter/cart actions
- `navigation-menu`: primary marketplace navigation
- `halftone-dots`: interactive hero landscape treatment
- `toast`: cart and demo-checkout feedback

shadcn components provide supporting primitives including cards, buttons, inputs, dialog, badges, toggle group, and separator.

## Run

```bash
npm ci
npm run dev
npm run build
npm run lint
```

## Production marketplace work

This repository now includes the guarded production boundary and launch work needed to connect real supply without putting credentials or invented inventory in the public demo:

- `src/lib/marketplace.ts` - typed CTX listing/fee/competitor records and strict like-for-like 20%-below pricing gate.
- `docs/CTX-INTEGRATION.md` - server-side CTX adapter, credential and entitlement requirements.
- `docs/PRICING-POLICY.md` - exact comparison and price-display policy.
- `docs/LAUNCH-CHECKLIST.md` - settlement, reconciliation, legal and claims controls.

The catalog remains illustrative until an active CTX Corporate API account, live inventory, fee quotes and resale rights are verified. A buyer-only CTX subscription must not be treated as API/reseller authorization.
