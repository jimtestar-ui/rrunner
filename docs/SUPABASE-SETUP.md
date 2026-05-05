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

## First Data Model

This creates the first product-ready foundation:

- user profiles
- saved destinations
- plan overrides
- discount codes
- discount redemptions

The app will keep using local storage until we wire screens into Supabase, but these tables prepare the backend.
