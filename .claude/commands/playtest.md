---
description: Launch dev server and open Playwright for playtesting
---

Run the following sequence:
1. Check if dev server is running: `curl -s http://localhost:8082 | head -1`
2. If not running: `npx expo start --web --port 8082` (background)
3. Navigate Playwright to http://localhost:8082
4. Take screenshot to verify title screen loads
5. Start game via `window.__gov.startGameDirect()`
6. Report game state
