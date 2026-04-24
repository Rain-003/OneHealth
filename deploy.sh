#!/usr/bin/env bash
# Auto deploy script for your Hostinger Laravel app

set -e

APP_DIR="/home/u739593942/domains/darkturquoise-cheetah-170540.hostingersite.com/public_html"

echo "=== Deploying to $APP_DIR ==="

cd "$APP_DIR"

echo
echo "==> Putting app into maintenance mode (if possible)..."
if command -v php >/dev/null 2>&1; then
    php artisan down || true
fi

echo
echo "==> Installing composer dependencies..."
if command -v composer >/dev/null 2>&1; then
    composer install -o --no-scripts
else
    echo "Composer not found, skipping composer install."
fi



echo
echo "==> Ensuring .env exists and app key set..."
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    cp .env.example .env
    if command -v php >/dev/null 2>&1; then
        php artisan key:generate --force || true
    fi
fi

echo
echo "==> Running migrations (if any)..."
if command -v php >/dev/null 2>&1; then
    php artisan migrate --force || true
fi

echo
echo "==> Clearing and rebuilding caches..."
if command -v php >/dev/null 2>&1; then
    php artisan cache:clear || true
    php artisan config:clear || true
    php artisan route:clear || true
    php artisan view:clear || true
    php artisan optimize || true
fi

echo
echo "==> Building frontend (Vite/React/etc)..."
if command -v npm >/dev/null 2>&1 && [ -f "package.json" ]; then
    npm install
    npm run build
else
    echo "npm or package.json not found, skipping frontend build."
fi

echo
echo "==> Bringing app back up..."
if command -v php >/dev/null 2>&1; then
    php artisan up || true
fi

echo
echo "=== Deployment finished successfully. ✅ ==="
