# Mamburao Lokal

## Goal

Create a responsive local business discovery and marketplace website for visitors and residents in Mamburao, Occidental Mindoro. Organize approved businesses, products, and services by category and help visitors find seller-provided details and contact sellers directly.

## Audience

- Tourists looking for local places, services, food, and shopping
- Residents and buyers browsing Mamburao businesses
- Local business owners who may want to be discovered

## Core experience

- A welcoming landing page with a Mamburao-inspired green palette
- Search and category filters for quickly finding businesses
- Business cards and detail views with name, category, description, location, hours, and contact links
- Clear contact and directions actions where sample business details are available
- Responsive layouts for mobile and desktop

## Application and backend

- Preserve the existing React + Vite application written in JavaScript
- Supabase PostgreSQL, Auth, and Storage with row-level security for backend authorization
- Business and product directory with searchable category filters and price sorting
- Seller registration, business profiles, product listings, image uploads, and availability management
- Administrator seller/listing review, category management, role management, and basic counts
- Direct seller contact; no cart, checkout, payment, or order management
- Clearly labeled illustrative placeholders until actual business owners submit verified details
- Use the supplied screenshots as general UI inspiration only

## Out of scope

- Checkout, payment processing, cart, refunds, and order tracking
- Unverified map pins or claims that unreviewed listing details are verified
- Admin auth-user deletion or self-service administrator-role assignment

## Visual direction

Use the requested palette: forest green (#14532D), fresh green (#22C55E), mint white (#F0FDF4), warm beige (#F5E6C8), main text (#1F2937), and white. Keep typography readable and layouts welcoming, with clear category navigation and prominent search.

## Acceptance criteria

- Visitors can browse and search businesses and products, filter by category, sort, and view detail dialogs
- Demo content is explicitly labeled; seller contacts are never fabricated
- Live account, seller, and administrator actions use Supabase and backend RLS policies
- Only administrator-approved records are public
- The interface works at common mobile and desktop widths
- The app builds and documents the Supabase setup and required environment variables
