# Supabase Setup

Use this setup if the Codex Supabase connector is not working.

## App Environment Variables

In your local `.env`, add:

```text
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Use the publishable key, not the service role key. Never put the service role key in the mobile app.

## Database Setup

1. Open your Supabase project.
2. Go to SQL Editor.
3. Paste the SQL from `docs/supabase-schema.sql`.
4. Run it.

Then run `docs/supabase-phase1-auth.sql`. It adds the policy needed for the app to create a safe Free profile after sign-in.

Run `docs/supabase-phase1-destination-sync.sql` before testing Save My Locations. It adds a safe sync key so tapping save twice updates the same saved locations instead of duplicating them.

## Auth Email Setup

If the Supabase email tries to open `localhost:3000`, that is coming from Supabase Auth URL Configuration.

For this Phase 1 beta, use the email code in the app and ignore the link.

Recommended Supabase settings:

1. Go to Authentication > URL Configuration.
2. Change Site URL from `http://localhost:3000` to your deployed app or website URL when available.
3. Add redirect URLs for development if you want links to work later:
   - `http://localhost:19006/**`
   - your Vercel URL, for example `https://your-project.vercel.app/**`

For the current app flow, the important part is the one-time code. Supabase sends a link by default unless the email template includes `{{ .Token }}`.

Update these templates:

- `Authentication > Email Templates > Magic Link`
- `Authentication > Email Templates > Confirm signup`

If you create users through a Supabase invite flow, update `Invite user` too.

Use a template like this:

```html
<h2>Your RoadeRunner sign-in code</h2>

<p>Enter this code in RoadeRunner:</p>

<p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">{{ .Token }}</p>

<p>This code expires soon. If you did not request it, you can ignore this email.</p>
```

The key piece is `{{ .Token }}`. If the template only uses `{{ .ConfirmationURL }}`, the email will only show a link.

Supabase limits repeated OTP requests. If you just requested a code, wait at least 60 seconds before trying again.

## Google Sign-In Setup

Google sign-in is the preferred user flow. Email code sign-in should stay as a backup only.

In Google Cloud:

1. Go to Google Auth Platform.
2. Configure Branding, Audience, and Data Access.
3. Add these scopes:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
4. Create an OAuth Client ID.
5. Choose `Web application`.
6. Add the Supabase callback URL under Authorized redirect URIs.
   - Find it in Supabase under `Authentication > Providers > Google`.
   - It usually looks like `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
7. Copy the Google Client ID and Client Secret.

In Supabase:

1. Go to `Authentication > Providers > Google`.
2. Enable Google.
3. Paste the Google Client ID and Client Secret.
4. Go to `Authentication > URL Configuration`.
5. Add redirect URLs for the app:
   - `roaderunner://**`
   - your current Expo redirect URL if testing in Expo Go
   - your deployed web URL when available

Expo Go may generate a changing development redirect URL. If Google opens but does not return to the app, check the error in Supabase Auth logs, copy the redirect URL from the failed request, and add it to Supabase Redirect URLs.

## Admin Tools Phase 1

Run `docs/supabase-admin-tools-phase1.sql` in the Supabase SQL Editor.

Then update your owner account email at the bottom of that SQL file and run that owner update statement once. This gives your account permission to use Owner Tools for:

- viewing users
- checking Free/Pro status
- switching users between Free and Pro
- confirming saved location limits

## First Data Model

This creates the first product-ready foundation:

- user profiles
- saved destinations
- plan overrides
- discount codes
- discount redemptions

The app will keep using local storage until we wire screens into Supabase, but these tables prepare the backend.
