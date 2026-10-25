# Mamburao Lokal

A responsive local business discovery and marketplace frontend for Mamburao, Occidental Mindoro. Built with React, Vite, and JavaScript. Buyers can browse businesses and products, search, filter by category, review listing details, and contact sellers when approved contact details are available. Checkout, payment, carts, and delivery tracking are intentionally not included.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```powershell
npm install
npm run dev
```

The app runs in **demo mode** until Supabase is configured. Demo businesses and products are illustrative placeholders, visibly labeled as samples, with no invented seller contact information.

## Supabase setup

1. Create a Supabase project and copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project's URL and public anon/publishable key. Never put a service-role key in a browser environment file.
3. Apply `supabase/migrations/202610240001_mamburao_lokal.sql` using the Supabase SQL editor or Supabase CLI.
4. Apply `supabase/migrations/202610240002_enable_realtime.sql` too. If the first migration was already run, run this new Realtime migration now to enable live listing/account updates.
5. Apply `supabase/migrations/202610240003_require_product_photos.sql` to require a real uploaded image before any product can be approved and let administrators inspect submitted photos.
6. Enable email/password authentication and configure the project's email confirmation and site URL settings.
7. Create the first administrator account through the normal signup flow, then promote its profile from the Supabase SQL editor using its verified auth user ID:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = 'REPLACE_WITH_VERIFIED_AUTH_USER_UUID';
   ```

   Run this privileged operation only from the Supabase SQL editor. Admin roles cannot be assigned through the public app.
8. Restart Vite after changing `.env`.

The SQL migrations define PostgreSQL tables, seeded categories, signup profiles, seller applications, RLS policies, administrator review functions, Realtime publication, and a private image bucket limited to JPEG/PNG/WebP files up to 5 MB. Product photos are required for approval and are checked against uploaded Storage objects in the database. Public listing cards display the seller-uploaded photo; no stock photo is presented as an actual seller product. Public listings are limited to approved businesses and products. Sellers can manage their own records, and their edits return to pending review. Role and moderation enforcement is performed by database policies/functions, not only by the interface.

## Features and current limits

- Responsive home, categories, business and product discovery, listing details, search, filtering, and sort controls
- Email/password signup and sign-in when connected to Supabase
- After signup with email confirmation enabled, the dialog switches to sign-in and keeps the registered email filled in
- Login routes users to the right account workspace; the Dashboard/Home navigation switches between the workspace and public discovery page
- Supabase Realtime refreshes public listings and the signed-in seller/admin workspace when database records change
- Seller applications, seller business/profile editing, product submissions, and availability management
- Admin review of sellers/businesses/products, category activation, role management, and basic listing statistics
- Business and required product photo uploads with previews, client validation, and server-side bucket size/type restrictions
- Live data reads only administrator-approved records; errors are displayed instead of silently falling back to demo data
- No cart, checkout, payments, delivery management, admin account deletion, or map-pin verification

Business and product listings, prices, contact details, locations, and hours must be submitted by their owners and reviewed before publication. Directions use a map search query based on the submitted location; the app does not assert that a map result is verified.

## Validation

```powershell
npm run build
npm audit
```
