#!/usr/bin/env bash
# Setup Script for E-commerce 3D Next.js (Bash)
# Architecture: Next.js App Router + Three.js / R3F + Zustand + Tailwind CSS

set -e

PROJECT_NAME="${1:-ecommerce-3d}"

echo ">>> [1/5] Khoi tao du an Next.js voi App Router, TypeScript, Tailwind CSS..."
npx create-next-app@latest "$PROJECT_NAME" --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes

cd "$PROJECT_NAME"

echo ">>> [2/5] Cai dat he sinh thai 3D, State, UI va Email dependencies..."
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing maath gsap zustand react-hook-form zod @hookform/resolvers clsx tailwind-merge resend @react-email/components
npm install -D @types/three

echo ">>> [3/5] Tao cau truc thu muc chuan kien truc 3D E-commerce..."
mkdir -p src/components/canvas
mkdir -p src/components/ui
mkdir -p src/store
mkdir -p src/app/api/webhooks/payment
mkdir -p src/types

# Cac thu muc mo rong cho du an
mkdir -p src/components/dom
mkdir -p src/app/api/checkout
mkdir -p src/app/api/email
mkdir -p src/hooks
mkdir -p src/lib
mkdir -p public/models
mkdir -p public/textures

echo ">>> [4/5] Khoi tao file .env.local..."
cat << 'EOF' > .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
PAYMENT_WEBHOOK_SECRET=whsec_your_payment_webhook_secret_key_here
RESEND_API_KEY=re_123456789_abcdefghijklmnopqrstuvwxyz
EOF

echo ">>> [5/5] Hoan tat khoi tao Giai doan 1!"
echo "[INIT_CORE_3D]"
