# Wallet

A responsive expense-sharing web app, with a shared foundation for future iOS and Android applications.

## Product decisions

- Expo, React Native Web, Expo Router, and TypeScript.
- Supabase PostgreSQL and email/password authentication with verified email.
- Every accepted group member can add expenses to their groups.
- Equal splits across all current group members; one currency per group, initially INR by default.
- Members edit their own expenses; group admins manage membership and group expenses.
- Record full or partial repayments made outside the app.
- The first release requires an internet connection to save changes.

## Build milestones

1. Application foundation and responsive navigation.
2. Authentication, email verification, and password recovery.
3. Database migrations and membership access controls.
4. Groups and email invitation acceptance.
5. Expenses, exact split calculations, and balances.
6. Settlements, activity history, and editing rules.
7. Responsive browser testing, authorization testing, and launch preparation.
8. Future native device testing, deep links, and store release preparation.

## Backend setup

Create a Supabase project named Wallet. Keep the database password in your password manager.
The app needs the project URL and public publishable key. Never use a secret or service-role key in the application.
Copy `.env.example` to `.env` when connecting the app. Local environment files are excluded from Git.

## Financial rules

- Store amounts as integer minor units (paise for INR).
- Shares must sum exactly to the expense total; round deterministically.
- Calculate balances from expenses and settlements.
- Save financial mutations atomically and validate them on the backend.
- Enforce group membership access on the backend.
- Preserve financial history when a member leaves.
- Invitations are accepted only by an authenticated user with the matching verified email.

## Current status

Account signup and sign-in were verified by the user. Implemented the group dashboard, group creation, invitations to verified email addresses, invitation acceptance, equal group expense splits, membership-based recalculation, member balances, and repayment records. The user confirmed the latest database update is applied and the live group balance matches the expected ₹65.

Open http://localhost:8081/setup for guided database setup and a copy button. Paste the setup into the Wallet project's Supabase SQL Editor and run it, then return to the groups page.

Invitations are sent by a server-side Vercel Function using Resend. The API verifies the signed-in user with Supabase and relies on the database admin check before sending. Keep `RESEND_API_KEY` in Vercel Environment Variables; never put it in browser code or Git. For actual delivery from a branded sender address, the email provider needs a verified sending domain. That domain is separate from Wallet's free `vercel.app` web address.

Every group expense is split equally across the current members. When someone joins, Wallet re-splits all earlier expenses across the new membership too. The latest update also re-splits expenses already saved in Supabase across the members who are there now; repayment records are kept.

The latest combined setup installs migration 002. It re-splits old expenses, serializes joining and expense changes with a group lock, and computes whole-group splits on the backend. Stored repayments remain part of the recalculated balances. Verified regression: ₹470 and ₹600 shared by two people produces a ₹65 repayment.

## Vercel web hosting

`vercel.json` builds the Expo Router web app with `npm run build:web`, serves `dist`, and supports app routes. No purchased domain is needed; Vercel assigns a `vercel.app` address. Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, and `APP_BASE_URL` in Vercel Project Settings > Environment Variables. `INVITATION_FROM` is optional and defaults to Resend's test sender. Add the Vercel address, `/auth/callback`, and `/reset-password` to Supabase Authentication > URL Configuration after the first deployment.

The web invitation email links to Wallet. Recipients sign up or sign in with the invited email and then accept the pending invitation from their groups page. Local preview stores invites in-app; the deployed app sends email.

## Running locally

Install dependencies with `npm install`, then run `npm run web -- --port 8081`.
Open http://localhost:8081 on this computer. This preview is not a publicly hosted website.

In Supabase, open Authentication > URL Configuration:

- Site URL: `http://localhost:8081`
- Allowed redirect URL: `http://localhost:8081/auth/callback`
- Allowed redirect URL: `http://localhost:8081/reset-password`

Run `npm run typecheck` and `npm run build:web` to verify the application.
Use the browser version for this milestone. Native email callback handling and secure native session storage must be completed and tested before native release.

The Supabase default email service is for initial testing. Configure production SMTP before inviting public users. Actual email delivery, confirmation, and recovery require an end-to-end test with a real account.

## Verification completed

- TypeScript checks and web export passed.
- Signup rejects an empty email with a visible validation message.
- Sign-in and password-recovery navigation checked in the browser.
- Recovery without a valid session shows an invalid-link message.
- Signed-out visits to `/home` redirect to the account screen.
- Layout visually checked at desktop size and a 390-pixel phone width.
- Local `.env` is excluded from Git.
- User confirmed local Supabase redirect URLs are saved.

The user reached the signed-in welcome screen. Password recovery and sign-out still need a real-account test.

Group verification: monetary calculations and split conservation tests pass. A temporary PostgreSQL-compatible PGlite database verified repeatable migration, email verification, outsider denial, invitation ownership, admin permissions, expense creation by an invited member, invalid split rollback, expense/repayment retry deduplication, and anonymous denial. These checks do not replace live Supabase integration testing after the migration is applied.

All storage tables are in a private schema, have RLS enabled, and have no grants to browser roles. Public database functions enforce verified identity and membership before reading or writing. The setup page's SQL is generated from `supabase/migrations/001_wallet.sql`.
