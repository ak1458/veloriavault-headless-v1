# VeloriaVault · Headless Commerce

A Next.js storefront integrated with WordPress and WooCommerce, including account, checkout, payment, and order-tracking routes.

[![Next.js: App Router](https://img.shields.io/badge/Next.js-App%20Router-111827?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript: Typed](https://img.shields.io/badge/TypeScript-Typed-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![WooCommerce: Commerce API](https://img.shields.io/badge/WooCommerce-Commerce%20API-96588A?style=flat-square&logo=woocommerce&logoColor=white)](src/lib/woocommerce.ts)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-64748B?style=flat-square)](LICENSE)

[Storefront](https://www.veloriavault.com/) · [Commerce integration](src/lib/woocommerce.ts) · [Store guide](public/site-guide.html)

## What is here

- Product browsing, account, checkout, and order-tracking interfaces.
- Server-side WooCommerce and WordPress integration helpers.
- Razorpay integration routes, reviews, coupons, and shipping helpers.
- Zustand client state and shared storefront components.

## Run locally

```bash
git clone https://github.com/ak1458/veloriavault-headless-v1.git
cd veloriavault-headless-v1
npm ci
npm run dev
```

A connected storefront requires a configured WordPress/WooCommerce backend and the server-side environment values consumed by `src/lib/woocommerce.ts`, `src/lib/wordpress.ts`, and payment/shipping routes. Review these modules before supplying development credentials; the repository currently has no root environment template.

## Engineering notes

`src/app/` contains page and API routes; `src/lib/` contains commerce, catalog, payment-adjacent, and request helpers. Available checks: `npm run lint` and `npm run build`.

The older `v1` repository name does not establish that this implementation is obsolete: it has recent commits and differs from the archived alternatives. Review the active deployment before consolidating those repositories. Payment and fulfillment behavior require environment-specific verification.

## License

Copyright © 2026 Ashraf Kamal. Reuse is restricted by [LICENSE](LICENSE).
