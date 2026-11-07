<p align="center"><img src=".github/assets/readme-header.svg" alt="VeloriaVault — Headless WooCommerce storefront · Accounts &amp; checkout" width="100%" /></p>

# VeloriaVault

VeloriaVault places a Next.js storefront in front of WordPress and WooCommerce services. It includes catalog/account views, checkout and payment-related routes, order tracking, reviews, coupons, and shipping helpers. The commerce backend remains an external system: frontend installation does not create the WooCommerce store or supply payment credentials. Despite the v1 repository name, this source has changes beyond the archived alternatives and must be matched to its intended deployment before consolidation.

[![Stars](https://img.shields.io/github/stars/ak1458/veloriavault-headless-v1?style=flat-square)](https://github.com/ak1458/veloriavault-headless-v1/stargazers)
[![Watching](https://img.shields.io/github/watchers/ak1458/veloriavault-headless-v1?style=flat-square&label=watching)](https://github.com/ak1458/veloriavault-headless-v1/watchers)
[![Forks](https://img.shields.io/github/forks/ak1458/veloriavault-headless-v1?style=flat-square)](https://github.com/ak1458/veloriavault-headless-v1/forks)
[![Activity](https://img.shields.io/github/last-commit/ak1458/veloriavault-headless-v1?style=flat-square)](https://github.com/ak1458/veloriavault-headless-v1/activity)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-64748b?style=flat-square)](LICENSE)

**[How it works](#how-it-works) · [Run locally](#run-locally) · [Configuration](#configuration) · [Commands](#development-commands) · [Versions](#versions-and-distribution) · [License](#license)**

## How it works

1. Configure the development WordPress/WooCommerce backend and its server-side credentials.
2. Browse catalog data through the storefront and use the account routes for the supported customer flow.
3. Submit checkout data through server routes and use sandbox payment/shipping integrations for verification.
4. Inspect the returned order state and tracking information in the backend as well as the interface.

## Architecture

| Path | Purpose |
| --- | --- |
| [src/app/](<src/app/>) | Storefront, account, and API routes. |
| [src/lib/woocommerce.ts](<src/lib/woocommerce.ts>) | WooCommerce integration. |
| [src/lib/wordpress.ts](<src/lib/wordpress.ts>) | WordPress integration. |
| [src/lib/catalog.ts](<src/lib/catalog.ts>) | Catalog data helpers. |
| [src/lib/shiprocket.ts](<src/lib/shiprocket.ts>) | Shipping-provider helper. |
| [public/site-guide.html](<public/site-guide.html>) | Checked-in site guide. |

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


## Configuration

There is no root environment template in this snapshot. Follow the linked setup documentation and the module that consumes each setting. Keep credentials server-side and use development or sandbox accounts while validating an integration.

## Development commands

Workspace: [package.json](<package.json>). Run these commands from its directory.

| Command | Script defined in manifest |
| --- | --- |
| `npm run dev` | `next dev` |
| `npm run build` | `next build` |
| `npm run start` | `next start` |
| `npm run lint` | `eslint` |

These are available commands, not a claim that all checks passed in this documentation pass. Connected checks require the services, credentials, and isolated data described above.

## Operational notes

There is no root environment template in the snapshot. Configure variables by checking the server modules and route handlers, not by copying settings from a different archived iteration. Keep WooCommerce secrets and payment-provider keys out of public-prefixed variables. The storefront URL currently redirects to the public shop; that does not prove every route in this source matches the deployed build. Payment, refund, coupon, and fulfillment changes need targeted sandbox tests.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Products are absent | Verify the backend endpoint, credentials, catalog mapping, and upstream response before altering UI state. |
| Checkout returns a provider error | Confirm sandbox credentials and expected request formats in the corresponding server handler. |
| A legacy repository looks similar | Compare history and live configuration; naming and visual similarity are not evidence that its source can be deleted. |

## Versions and distribution

Manifest versions are application/workspace metadata, not a certification of release readiness.

| Manifest | Declared version |
| --- | --- |
| [package.json](<package.json>) | `0.1.0` |

No published GitHub Release or version tag was recorded in this snapshot. The default branch is a development/source snapshot; it must not be described as a stable downloadable release merely to populate the sidebar.

GitHub Packages is a separate registry. This README does not imply that a registry package exists; use the installation path documented here rather than an invented package-install command.

## Documentation and maintenance

- [public/site-guide.html](<public/site-guide.html>)
- [src/lib/woocommerce.ts](<src/lib/woocommerce.ts>)
- [CHATBOT_ORDER_PLAN.md](<CHATBOT_ORDER_PLAN.md>)
- [SEO_AUDIT.md](<SEO_AUDIT.md>)

Include the affected workflow, reproduction steps, and relevant check output when reporting a problem. Do not include credentials or live customer data.

## License

This repository’s project code is **proprietary / all rights reserved**. Public visibility does not grant unrestricted reuse. Read [LICENSE](<LICENSE>) for the exact terms. Third-party dependencies and bundled components retain their own notices.
