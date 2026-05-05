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

## Auth Email Setup

If the Supabase email tries to open `localhost:3000`, that is coming from Supabase Auth URL Configuration.

For this Phase 1 beta, use the email code in the app and ignore the link.

Recommended Supabase settings:

1. Go to Authentication > URL Configuration.
2. Change Site URL from `http://localhost:3000` to your deployed app or website URL when available.
3. Add redirect URLs for development if you want links to work later:
   - `http://localhost:19006/**`
   - your Vercel URL, for example `https://your-project.vercel.app/**`

For the current app flow, the important part is the one-time code. In Authentication > Email Templates, make sure the sign-in email includes `{{ .Token }}` so users can copy the code into RoadeRunner.

## First Data Model

This creates the first product-ready foundation:

- user profiles
- saved destinations
- plan overrides
- discount codes
- discount redemptions

The app will keep using local storage until we wire screens into Supabase, but these tables prepare the backend.
