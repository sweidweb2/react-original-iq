npm run format:check
npm run lint
npm run typecheck
npm test --prefix backend
npm run test:unit --prefix web-app
npm run test:e2e --prefix web-app
npm run audit:deps:ci --prefix web-app
npm run audit:deps:ci --prefix backend

If the Playwright browser is not installed, run the end-to-end command like this:

$env:PLAYWRIGHT_CHANNEL='chrome'
npm run test:e2e --prefix web-app
