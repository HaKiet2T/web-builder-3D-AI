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
- **Build**: `npm run build`
