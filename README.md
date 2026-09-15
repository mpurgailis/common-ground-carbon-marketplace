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
