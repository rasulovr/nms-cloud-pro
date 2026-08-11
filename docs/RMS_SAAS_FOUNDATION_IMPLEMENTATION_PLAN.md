# RMS Pro SaaS Foundation — safe implementation plan

Status: **design only**. This document does not change the production database, current Barista&Chef data, Vercel deployment or `main`.

## Observed facts

- The repository is currently **public**.
- The browser client connects with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- QR Menu is a public-facing client and uses that Supabase client.
- Therefore, tenant isolation must be enforced by database RLS, policies and narrowly scoped RPCs; hiding UI controls is not a security boundary.
- The live Supabase diagnostic is still pending because this workspace is not permitted to access the Supabase dashboard. No workaround is used.

## Non-negotiable rollout rules

1. Never deploy a SaaS migration directly to `main` or production.
2. Create a separate Supabase **staging project** first.
3. Run the read-only diagnostic in staging and production; save outputs with date and project identifier.
4. Test with two synthetic organizations and confirm that neither can read, write, export or reference the other’s data.
5. Create and test a database recovery point before each migration.
6. Merge only a reviewed, reversible migration. Keep the current Barista&Chef login and operations unchanged throughout the transition.

## Compatibility-first design

| New entity | Purpose |
|---|---|
| `rms_organizations` | One RMS client/company; Barista&Chef becomes organization one only after approved migration. |
| `rms_organization_memberships` | Associates a user with an organization, role and status. |
| `rms_organization_branch_access` | Optional branch-level restrictions for managers/cashiers. |
| `rms_support_access_grants` | Time-limited, auditable support access; disabled by default. |

Do **not** add `organization_id` to all historic tables in one release. First add the organizations and memberships, then map the existing Barista&Chef records in staging, then migrate one module at a time with verified policies.

## Prioritized security decisions

1. Make the source repository private after verifying that no public integration depends on it.
2. Keep only the publishable anon key in browser builds; service-role keys must exist only in server-side secrets.
3. Force RLS on tenant data tables and use server-side RPC/Edge Functions for sensitive writes.
4. Separate public QR/POS reads from internal finance, staff and supplier operations.
5. Require MFA for RMS platform administrators and tenant administrators.
6. Record immutable audit events for privilege changes, exports, financial edits, deletes/restores and support access.
7. Keep production, staging and development as separate Supabase and Vercel environments.
8. Establish daily encrypted database backup plus a monthly restore test outside the primary Supabase account.

## First implementation gate

The next step is **not** a deployment. It is to collect the diagnostic output and use it to generate a staging-only migration plan tailored to the actual current tables and RPCs.
