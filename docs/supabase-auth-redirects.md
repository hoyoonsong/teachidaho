# Supabase auth: localhost vs production (same as apply-hub pattern)

The app **does not** hardcode `teachidaho.vercel.app`. Google OAuth uses:

`redirectTo = ${window.location.origin}/login?redirectTo=…`

So **whatever site you’re on** (localhost or Vercel) is what the client asks Supabase to send the user back to.

If you still end up on **production while developing on localhost**, Supabase is **overriding** that because the return URL is not allowed—or **Site URL** is set only to production.

## Fix in Supabase Dashboard

**Authentication → URL Configuration**

1. **Redirect URLs** — include **both** (wildcards are supported):

   - `http://localhost:5173/**`  
   - `https://teachidaho.vercel.app/**`  
   - (optional) `https://*.vercel.app/**` for preview deployments  

   If `http://localhost:5173/...` is missing, Supabase may fall back to **Site URL** (often production), which feels like “it always sends me to Vercel.”

2. **Site URL** — pick one primary canonical site:

   - Many teams set this to **production** for email links and still add localhost under **Redirect URLs** so OAuth works locally.  
   - If you mostly work locally on auth, you can temporarily set Site URL to `http://localhost:5173` (email links then point at local—usually not what you want long-term).

3. **Google Cloud Console** (if you use Google sign-in): authorized redirect URI should stay the **Supabase** callback, e.g.  
   `https://<project-ref>.supabase.co/auth/v1/callback`  
   — not your app URL. The app URL is controlled by Supabase `redirect_to` + **Redirect URLs** allow list above.

## Same pattern as other apps (e.g. apply-hub)

Same rules apply to any Vite + Supabase SPA:

- Client: `window.location.origin` (or `import.meta.env` only if you intentionally split dev/prod clients).  
- Server (Supabase): allow every origin you use under **Redirect URLs**.

We can’t read projects on your Desktop from here; if **apply-hub** does something different, copy its **Supabase URL settings** (screenshot or list of Redirect URLs + Site URL) into this project’s dashboard to match.
