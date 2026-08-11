# RMS Pro SaaS Foundation — audit boundary

This branch is an isolated preparation area. It must not be deployed to production and does not change the current Barista&Chef workflow.

## Fixed protection rules

- `main` remains the current working product.
- No production database migrations are applied during the audit.
- No existing table, RLS policy, RPC, authentication path, QR Menu, POS or finance module is modified.
- Every later schema change will first be written as a reversible migration and tested in a separate Supabase staging project.
- Existing Barista&Chef data will become the first organization only after an approved migration and validated rollback path.

## First audit

Run `supabase/audits/tenant-readiness-diagnostic.sql` in the current production Supabase SQL Editor and save the results.

The script is SELECT-only. It establishes:

1. which business tables lack a tenant/organization boundary;
2. whether RLS and policies are active;
3. whether anonymous/authenticated grants are broader than intended;
4. which SECURITY DEFINER functions need hardening;
5. existing user, role, branch and organization models;
6. storage policy exposure for QR images and other media.

## Target design, not yet implemented

```
RMS platform
  └── organization (client)
       ├── legal entity
       ├── branch
       ├── user membership + role + branch permissions
       ├── business data
       └── public modules (QR / POS) via narrowly scoped APIs
```

The first implementation milestone after the audit is a *compatibility layer*, not a forced rewrite: introduce organizations, memberships and tenant context while retaining existing Barista&Chef tables and behaviour.