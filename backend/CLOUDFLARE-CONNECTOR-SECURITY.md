# BOXPANEL Cloudflare write connector — security contract

This document defines the **intended** private connector. It is not a deployed MCP server and does not grant ChatGPT write access by itself.

## Allowed resources
- Cloudflare account: `7c38999ef8b7043e5629eccdecd9a961`
- Worker script name: **exactly** `boxpanel-api`
- D1 database ID: **exactly** `5fff43be-94a2-4c72-b689-7fd04fdc7d26`
- GitHub source: `juancanta89-tech/BOXPANEL`, directory `backend/`

## Denied resources
- `snapmovienow-edge`, `snapmovienow-edge-staging`, and every other Worker
- All other D1 databases, account settings, DNS zones, R2 buckets, billing and tokens
- Generic Cloudflare REST proxy endpoints and arbitrary URL/path forwarding

## Security requirements
1. Authenticate the ChatGPT connector through OAuth or another platform-supported secret-management flow. Never paste API tokens into a chat or commit them to GitHub.
2. Keep the Cloudflare API token **server-side**, with minimum required account permissions. Some Cloudflare scopes are account-wide, so an application-level allowlist is mandatory.
3. Expose narrow, typed operations only: `get_boxpanel_status`, `deploy_boxpanel_from_reviewed_commit`, `inspect_boxpanel_d1_schema`, `apply_reviewed_boxpanel_migration`.
4. Reject caller-supplied Cloudflare account IDs, Worker names, database IDs, arbitrary SQL, and arbitrary scripts. Use pinned resource IDs and approved artifacts.
5. Restrict database migration to reviewed, versioned SQL files with backup and dry-run/preflight. Never run destructive DDL or broad UPDATE/DELETE automatically.
6. Require explicit approval for deployment and schema mutations; record audit metadata and results. Do not silently modify production.
7. Set request size/time limits and avoid logging secrets, auth headers or customer records.
8. Deploy only after backend schema, authentication, and zero-overage image-storage requirements are satisfied.
9. Do not activate paid resources without explicit approval.

## Implementation status
- Current Cloudflare ChatGPT connection: **read-only**.
- Private write MCP server: **not implemented/deployed**.
- Cloudflare token authorization: **not configured**.
- ChatGPT private plugin: **not connected**.

This contract is a specification for the connector implementation, not evidence of completed setup.
