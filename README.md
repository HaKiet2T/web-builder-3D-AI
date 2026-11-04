# web-builder-3D-AI

Modern 3D E-Commerce & Interactive Workspace Builder powered by Next.js (App Router), Three.js, React Three Fiber (R3F), Zustand, and Tailwind CSS.

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router, React 19, TypeScript)
- **3D Engine**: Three.js, `@react-three/fiber`, `@react-three/drei`, GSAP
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Validation & APIs**: Zod, React Hook Form, Resend
- **Security**: HMAC-SHA256 signature verification for Payment Webhooks

## 📦 Project Structure

```
├── .github/workflows/       # GitHub Actions CI workflow (typecheck & lint)
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── api/checkout/    # Zod-validated checkout & Dual Shipping calculation
│   │   └── api/webhooks/    # HMAC-SHA256 protected payment webhooks
│   ├── components/
│   │   ├── canvas/          # 3D R3F Canvas components (SceneCanvas, Camera, Lighting)
│   │   └── dom/             # UI overlay controls & components
│   ├── store/               # Zustand state stores (useWorkspaceStore)
│   ├── types/               # TypeScript interfaces (Order, Fulfillment, Workspace)
│   └── lib/                 # Utility functions & helpers
└── public/
    └── models/              # 3D GLTF/GLB models & textures
```

## 🛠️ Getting Started

First, install dependencies:

```bash
npm install
```

Copy the environment variables:

```bash
cp .env.example .env.local
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🧪 Quality Gates & CI

- **Typecheck**: `npm run typecheck`
- **Lint**: `npm run lint`
- **Unit tests**: `npm test`
- **Build**: `npm run build`

## Supabase & admin

The catalogue uses sample records when Supabase is not configured. If Supabase
is configured, database errors are reported rather than silently switching to
sample data. Checkout is only persisted when `SUPABASE_SERVICE_ROLE_KEY` is
available; without a Supabase project checkout is explicitly marked as a
non-persistent preview.

1. Copy the project URL, anon/publishable key, and service-role key from the
   Supabase project settings into `.env.local` using `.env.example` as a guide.
   The service-role key must remain server-only and must never use a
   `NEXT_PUBLIC_` prefix.
2. Apply `supabase/migrations/20261104180000_storefront.sql` in the Supabase SQL
   Editor, then run `supabase/seed.sql` to add the storefront categories.
3. Create a user under **Authentication → Users**. In the SQL Editor, grant
   admin access to that account:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where email = 'admin@example.com';
   ```

   The role is read from trusted `app_metadata`; user-editable metadata does
   not grant admin access. Sign out and back in after changing the role.
4. Restart the Next.js server and open `/admin/login`. The admin dashboard,
   product/variant editor, media uploader, and order manager all use the DAL
   and Supabase RLS policies.

## Product image processing

Put original ASUS monitor/product photos in `picture/monitor/asus/Image/` at the repository root. The folder name you requested is preserved, but it sits outside `public/`, so originals are not exposed by the Next.js web server and are ignored by Git. The processor writes transparent PNGs with a soft drop shadow to `public/products/asus/`; use those generated files in the storefront with URLs such as `/products/asus/product-name.png`.

The processor uses local CPU inference with `rembg` and Pillow. It does not send images to a cloud API. `rembg` supports Python 3.11-3.13; the setup script installs Python 3.13 with Python Install Manager if there is no compatible runtime, then creates an isolated project environment and installs the dependencies:

```powershell
.\scripts\setup-image-processor.ps1
```

Process the current images once:

```powershell
.\.venv-product-images\Scripts\python.exe scripts\process_product_images.py
```

Keep the processor running to automatically handle new or changed images:

```powershell
.\.venv-product-images\Scripts\python.exe scripts\process_product_images.py --watch
```

Add `--force` to regenerate outputs. The default model is `u2net`; pass `--model <name>` to select another model supported by rembg. Model weights have separate licenses from the rembg package. In particular, rembg documents a paid commercial-use requirement for its default BRIA RMBG-2.0 model, so verify the selected model's terms before using outputs commercially.
