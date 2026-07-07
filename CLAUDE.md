# Veloria Vault — headless storefront

Next.js 16 headless frontend for WooCommerce at api.veloriavault.com (Hostinger).
Live: www.veloriavault.com (Vercel). Live repo: github.com/ak1458/veloria-headless.

## Critical constraints
- Never break the live Razorpay path: `_headless_charge_amount` is the authoritative charge source.
- Hostinger firewall stalls non-browser fetches — server-side fetches to api.veloriavault.com need care with User-Agent.
- Every change ships branch → Vercel preview → owner QA → merge. No direct pushes to master.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
