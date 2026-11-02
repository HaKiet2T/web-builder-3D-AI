# Setup Script for E-commerce 3D Next.js (PowerShell)
# Architecture: Next.js App Router + Three.js / R3F + Zustand + Tailwind CSS

$ErrorActionPreference = "Stop"

$ProjectName = if ($args[0]) { $args[0] } else { "ecommerce-3d" }

Write-Host ">>> [1/5] Khoi tao du an Next.js voi App Router, TypeScript, Tailwind CSS..." -ForegroundColor Cyan
npx create-next-app@latest $ProjectName --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes

Set-Location $ProjectName

Write-Host ">>> [2/5] Cai dat he sinh thai 3D, State, UI va Email dependencies..." -ForegroundColor Cyan
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing maath gsap zustand react-hook-form zod @hookform/resolvers clsx tailwind-merge resend @react-email/components
npm install -D @types/three

Write-Host ">>> [3/5] Tao cau truc thu muc chuan kien truc 3D E-commerce..." -ForegroundColor Cyan
$folders = @(
    "src/components/canvas",
    "src/components/ui",
    "src/store",
    "src/app/api/webhooks/payment",
    "src/types",
    "src/components/dom",
    "src/app/api/checkout",
    "src/app/api/email",
    "src/hooks",
    "src/lib",
    "public/models",
    "public/textures"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host "  [+] Da tao: $folder"
    }
}

Write-Host ">>> [4/5] Khoi tao file .env.local..." -ForegroundColor Cyan
@"
NEXT_PUBLIC_APP_URL=http://localhost:3000
PAYMENT_WEBHOOK_SECRET=whsec_your_payment_webhook_secret_key_here
RESEND_API_KEY=re_123456789_abcdefghijklmnopqrstuvwxyz
"@ | Set-Content -Path ".env.local" -Encoding UTF8

Write-Host ">>> [5/5] Hoan tat khoi tao Giai doan 1!" -ForegroundColor Green
Write-Host "[INIT_CORE_3D]" -ForegroundColor Yellow
