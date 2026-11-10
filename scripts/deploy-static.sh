#!/usr/bin/env bash
# Builds the SPA twice and publishes it to the host nginx static roots. The old container deploy
# is gone: mani-backend/frontend containers are stopped, /api is served by salaryReview.
#   /var/www/landing-spa           -> book.pmu-annakara.com (base "/")
#   /var/www/akl-mani/mani         -> akluxnails.com/mani   (base "/mani/", API under /mani/api)
set -euo pipefail
cd "$(dirname "$0")/.."
(cd frontend && npm ci --no-audit --no-fund)
cd frontend
rm -rf dist dist-mani
npm run build
VITE_BASE=/mani/ VITE_API_BASE_URL=/mani npx vite build --outDir dist-mani
test -f dist/index.html && test -f dist-mani/index.html
sudo mkdir -p /var/www/landing-spa /var/www/akl-mani/mani
sudo rsync -a --delete dist/ /var/www/landing-spa/
sudo rsync -a --delete dist-mani/ /var/www/akl-mani/mani/
echo "static deploy done"
