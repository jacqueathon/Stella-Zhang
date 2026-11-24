# Hydra Stack customer accounts

From the landing page choose **Open my customer workspace**. A confirmed account can save one career goal and one next step. Another browser can sign in to the same account and read those values. The three fictional profiles and their tasks, leads, drafts and exports continue to use demo storage. Account setup starts with empty fields and creates a database row only on the first explicit save.

## Connect a staging environment

1. Use a team-authorized Supabase staging project and an isolated Vercel preview. Record their project identifiers and the stable HTTPS preview origin. Set the Supabase Site URL and allow the exact callback URL `https://YOUR-STAGING-HOST/account/`, including its trailing slash. Configure the preview so the synthetic testers can open callback links. Vercel Deployment Protection controls access to deployments. Supabase Auth supplies customer identity.
2. Enable Email/password and Confirm Email in Supabase Auth. Configure a mail sender permitted to deliver to your synthetic inboxes. In the **Confirm signup** template use `<a href="{{ .RedirectTo }}#type=email&amp;token_hash={{ .TokenHash }}">Confirm email</a>`. In **Reset password** use `<a href="{{ .RedirectTo }}#type=recovery&amp;token_hash={{ .TokenHash }}">Reset password</a>`. The app sends its own account URL as the redirect. The fragment keeps the one-time hash out of HTTP request paths. The customer must continue from the page before the SDK redeems it. Disable mail-provider link tracking that rewrites these links. Default Supabase confirmation URLs use a different callback flow.
3. As a database migration administrator, apply `supabase/migrations/202611240001_customer_workspaces.sql` once. Expose the `public` schema through the Supabase Data API and confirm that the migration grants are effective. The application uses the browser's authenticated role for reads and writes. Owner ID defaults to `auth.uid()`. Policies check it on reads, inserts and updates. Clients can write only the two text columns. The database assigns a new revision on every update.
4. In Vercel's **Preview** environment, configure only the following two **public** values for the build. The build publishes these values in static assets. Keep privileged keys, database passwords and mail credentials outside this configuration.

   ```dotenv
   SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_WITH_STAGING_PUBLIC_KEY
   ```

5. Use the **Other** preset, repository root, Node 22+, install command `npm ci --ignore-scripts`, build command `npm run build:account`, and output directory `dist`. The build copies the lockfile-pinned SDK from npm to the same origin and writes the public configuration into the output copy of `dist/account/config.mjs`. Use a disposable build checkout. With the checked-in blank config the account page shows an unavailable message and the demo works with the existing no-build settings.
6. In staging test signup, actual email delivery, confirmation, recovery, expiry, sign-out and independent sign-ins with two synthetic accounts. Verify that anonymous requests fail and each signed-in account can read and update only its own row. Check the preview URL, redirect allowlist, mail templates, confirmed email redirect, effective migration and the deployed asset revision together.

## Persistence and failure behavior

The SDK stores its session under its project-specific browser storage key and handles refresh and cross-tab auth events. Signing out clears the page immediately. If server revocation fails after the SDK clears the local session, the page reports that distinction. A failure before local sign-out leaves a retry button. The account form clears on identity change, expiry or page exit. Each request carries the access token captured for its owner. Generation checks ignore stale responses. Workspace data stays in memory until an explicit remote save. Rejection of the current access token locks the editor and clears private fields. If a request used a token that has since been refreshed for the same account, its 401 leaves any loaded draft and revision intact. The customer can explicitly retry the read or save with the current token. A first read must succeed to enable editing. After a failed write, the draft stays visible until sign-out, navigation or reload. A declined duplicate insert or stale revision cannot replace another device's newer value. Use **Reload saved workspace** to replace the draft after confirmation and a successful read. Email links run in a separate in-memory auth session, so a link opened while another account is signed in cannot change that account's password.

## Independent checks

From the repository root, run:

```sh
npm ci --ignore-scripts
node --test tests/*.test.mjs
CHROMIUM_PATH=/path/to/chromium python tests/account/browser.py
CHROMIUM_PATH=/path/to/chromium python tests/account/refresh_401.py
```

The browser check requires Python Playwright and a compatible Chromium executable. It uses loopback HTTP, the installed real SDK, synthetic Auth/Data API responses, and two temporary regular browser profiles. No inbox or Supabase project is contacted.

For SQL, create a **fresh disposable PostgreSQL database with an isolated role catalog**. The fixture creates roles named `anon` and `authenticated` and a minimal `auth.users` table and `auth.uid()` function. It is exclusively for a local standalone cluster. Using an administrator connection to that empty cluster:

```sh
psql "$DISPOSABLE_DB_URL" -X -v ON_ERROR_STOP=1 \
  -f tests/account/local-auth-fixture.sql \
  -f supabase/migrations/202611240001_customer_workspaces.sql \
  -f tests/account/rls.sql
```

These checks deny the PostgreSQL `anon` role used for unauthenticated requests. A Supabase anonymous sign-in uses the `authenticated` role with an `is_anonymous` JWT claim. The ownership policies do not filter that claim. If anonymous sign-ins are enabled, such a user can access their own row. Hosted anonymous sign-in was not exercised.

The SQL tests execute the migration policies with real PostgreSQL role changes and synthetic claim values. They roll their records and test-only grants back. Supabase Auth, PostgREST JWT verification, SMTP delivery and Vercel callback routing need a connected staging run.

## Implementation references

- [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords)
- [Supabase auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates) and [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) and [public API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)
