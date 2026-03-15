# Changelog

## [1.6.0](https://github.com/arcade-cabinet/will-it-blow/compare/v1.5.0...v1.6.0) (2026-03-15)


### Features

* Capacitor + R3F pivot — complete game with automated playtesting ([1e585ae](https://github.com/arcade-cabinet/will-it-blow/commit/1e585ae5785844bd81dcccf8ef9d90721f976251))
* dual-zone touch controls (move left / look right) ([#33](https://github.com/arcade-cabinet/will-it-blow/issues/33)) ([ce22ada](https://github.com/arcade-cabinet/will-it-blow/commit/ce22ada2e5f657711e5581e4a4e38716a3831019))
* phase-directed diegetic text — dialogue appears near active station ([#45](https://github.com/arcade-cabinet/will-it-blow/issues/45)) ([7402458](https://github.com/arcade-cabinet/will-it-blow/commit/74024589c4633603aa9d00c8c3769b442ce31341))
* swipe/tap FPS controls + loading flash fix ([#32](https://github.com/arcade-cabinet/will-it-blow/issues/32)) ([00fc449](https://github.com/arcade-cabinet/will-it-blow/commit/00fc4497e38682676be9110ca2719ee616419da2))


### Bug Fixes

* add packageManager field for CI pnpm setup, skip tsc in build ([#37](https://github.com/arcade-cabinet/will-it-blow/issues/37)) ([6e77f9f](https://github.com/arcade-cabinet/will-it-blow/commit/6e77f9f84c4bd5e1782bd39a7e187207ca21a7d7))
* camera initial rotation looks UP at ceiling during intro ([#49](https://github.com/arcade-cabinet/will-it-blow/issues/49)) ([d2e6022](https://github.com/arcade-cabinet/will-it-blow/commit/d2e60224ec06b018cf4463c6067439bc3fc9779c))
* ceiling visible — box slab geometry + emissive + bounce light ([#51](https://github.com/arcade-cabinet/will-it-blow/issues/51)) ([74d9d38](https://github.com/arcade-cabinet/will-it-blow/commit/74d9d3867258e5a4d55f4975744fe4322c5aee9e))
* comprehensive visual QA — SurrealText rendering, camera pitch, code splitting, fog, intro timing ([#50](https://github.com/arcade-cabinet/will-it-blow/issues/50)) ([e8a906a](https://github.com/arcade-cabinet/will-it-blow/commit/e8a906aeedc47da4132c32aed6c1d9083859fafb))
* deployment polish — LFS, responsive canvas, intro sequence, FPS movement ([#41](https://github.com/arcade-cabinet/will-it-blow/issues/41)) ([6cafed4](https://github.com/arcade-cabinet/will-it-blow/commit/6cafed4c18288edaedff1f627aa6218eaddfb6fa))
* enable Git LFS checkout in CI/CD for GitHub Pages ([#39](https://github.com/arcade-cabinet/will-it-blow/issues/39)) ([06fc47a](https://github.com/arcade-cabinet/will-it-blow/commit/06fc47afc31ca32be1eb8aa36600a824dc57aa70))
* headed Playwright with xvfb, remove LFS for web assets ([#42](https://github.com/arcade-cabinet/will-it-blow/issues/42)) ([0fd1840](https://github.com/arcade-cabinet/will-it-blow/commit/0fd1840ca7bb7d8f82768cbfaf57aa1c3660aac5))
* intro camera looks UP at ceiling, posture-based eye height ([#46](https://github.com/arcade-cabinet/will-it-blow/issues/46)) ([0b95ae8](https://github.com/arcade-cabinet/will-it-blow/commit/0b95ae88e803f1fcd7fa5211e008a9d0bbf404e5))
* intro looks up at ceiling, SurrealText centered on ceiling, freezer ingredients contained ([#43](https://github.com/arcade-cabinet/will-it-blow/issues/43)) ([d7aee26](https://github.com/arcade-cabinet/will-it-blow/commit/d7aee26065c02012a2d3a363b1c7570ffe7411fa))
* intro looks up at ceiling, SurrealText centered on ceiling, freezer ingredients contained ([#44](https://github.com/arcade-cabinet/will-it-blow/issues/44)) ([6c088dc](https://github.com/arcade-cabinet/will-it-blow/commit/6c088dc02e5b56cadf5e8d4b2a4272202094202d))
* prefix all asset paths with BASE_URL for GitHub Pages ([#38](https://github.com/arcade-cabinet/will-it-blow/issues/38)) ([be8f35e](https://github.com/arcade-cabinet/will-it-blow/commit/be8f35ea56a5833cd0484bfdfbf911a23f606424))
* read introActive from store.getState() in useFrame to avoid stale closure ([#48](https://github.com/arcade-cabinet/will-it-blow/issues/48)) ([819762c](https://github.com/arcade-cabinet/will-it-blow/commit/819762ceb79d8b1e1d47242e4c59991e5abc7761))
* use sql-wasm.wasm instead of sql-wasm-browser.wasm (LFS pointer issue) ([#40](https://github.com/arcade-cabinet/will-it-blow/issues/40)) ([ebf01f1](https://github.com/arcade-cabinet/will-it-blow/commit/ebf01f1c1081a17f6216fb6190bccae69b29b990))
* useMouseLook yields to IntroSequence — camera looks UP at ceiling ([#47](https://github.com/arcade-cabinet/will-it-blow/issues/47)) ([17c71f9](https://github.com/arcade-cabinet/will-it-blow/commit/17c71f9371ce9217ba7d1b3e89acc07871135418))
* visual polish + GLB artifact mesh culling ([#30](https://github.com/arcade-cabinet/will-it-blow/issues/30)) ([faeb864](https://github.com/arcade-cabinet/will-it-blow/commit/faeb86492cfefadfe0f75e87cbe49eb292db06da))

## [1.5.0](https://github.com/arcade-cabinet/will-it-blow/compare/v1.4.0...v1.5.0) (2026-03-03)


### Features

* **ecs:** complete sausage factory kitchen — ECS machines + orchestrator game drivers ([#25](https://github.com/arcade-cabinet/will-it-blow/issues/25)) ([716881f](https://github.com/arcade-cabinet/will-it-blow/commit/716881f3c98f893a972d4a55be3033f4fd16a3dc))


### Bug Fixes

* add blowout to ChallengeRegistry ([#28](https://github.com/arcade-cabinet/will-it-blow/issues/28)) ([2af9fc9](https://github.com/arcade-cabinet/will-it-blow/commit/2af9fc9fb88a3bc9d7f3b3009537a39d8d293787))
* responsive layout for mobile/foldable viewports ([#29](https://github.com/arcade-cabinet/will-it-blow/issues/29)) ([e2f9f5e](https://github.com/arcade-cabinet/will-it-blow/commit/e2f9f5ec59fd96f58c2f6564055961d2888ec35b))

## [1.4.0](https://github.com/arcade-cabinet/will-it-blow/compare/v1.3.0...v1.4.0) (2026-03-01)


### Features

* add Rapier physics engine with dynamic rigid bodies for all stations ([#22](https://github.com/arcade-cabinet/will-it-blow/issues/22)) ([1e0c1f3](https://github.com/arcade-cabinet/will-it-blow/commit/1e0c1f3665c753f94d4b0e18b505bb36d0a2d22a))
* physics gameplay, documentation overhaul, and CodeRabbit fixes ([bf7394d](https://github.com/arcade-cabinet/will-it-blow/commit/bf7394d9a3a54c0a2854cea0643bf2f44ca54dce))

## [1.3.0](https://github.com/arcade-cabinet/will-it-blow/compare/v1.2.0...v1.3.0) (2026-03-01)


### Features

* kitchen diorama target system + FPS free-roam ([#21](https://github.com/arcade-cabinet/will-it-blow/issues/21)) ([59bc65f](https://github.com/arcade-cabinet/will-it-blow/commit/59bc65fc96044ae359b4ba9d3d2e45b2022fe5f5))
* upgrade deps, add station models, fix TS stack overflow ([#19](https://github.com/arcade-cabinet/will-it-blow/issues/19)) ([cf0fe41](https://github.com/arcade-cabinet/will-it-blow/commit/cf0fe41fa5b397b36332305766cf0341c0a6500b))

## [1.2.0](https://github.com/arcade-cabinet/will-it-blow/compare/v1.1.4...v1.2.0) (2026-02-28)


### Features

* WebGPU + React Three Fiber migration ([09ad9bd](https://github.com/arcade-cabinet/will-it-blow/commit/09ad9bda09fde5de853e8f5f977185cea94697a3))


### Bug Fixes

* derive Expo baseUrl from script tags for asset loading ([#18](https://github.com/arcade-cabinet/will-it-blow/issues/18)) ([1f4ad10](https://github.com/arcade-cabinet/will-it-blow/commit/1f4ad10dd4e16c9ddb6ded2e8b7e7667b17a804a))

## [1.1.4](https://github.com/arcade-cabinet/will-it-blow/compare/v1.1.3...v1.1.4) (2026-02-28)


### Bug Fixes

* enable LFS checkout for Pages deploy, add async-storage Maven repo ([#13](https://github.com/arcade-cabinet/will-it-blow/issues/13)) ([948522d](https://github.com/arcade-cabinet/will-it-blow/commit/948522d64c274ed3181c0d360cde245fb4c25b23))

## [1.1.3](https://github.com/arcade-cabinet/will-it-blow/compare/v1.1.2...v1.1.3) (2026-02-28)


### Bug Fixes

* remove stale android/ dir, use expo prebuild --clean in CI ([#11](https://github.com/arcade-cabinet/will-it-blow/issues/11)) ([178c5e1](https://github.com/arcade-cabinet/will-it-blow/commit/178c5e1a52ea67cbcd494ce27abe002f6f6ace61))

## [1.1.2](https://github.com/arcade-cabinet/will-it-blow/compare/v1.1.1...v1.1.2) (2026-02-28)


### Bug Fixes

* move Pages deploy to cd.yml, fix Android pnpm hoisting ([4d405db](https://github.com/arcade-cabinet/will-it-blow/commit/4d405db1fc335f3564dddb25a0e5f76c72de5160))

## [1.1.1](https://github.com/arcade-cabinet/will-it-blow/compare/v1.1.0...v1.1.1) (2026-02-28)


### Bug Fixes

* release workflow — checkout main for Pages, expo prebuild for Android ([#7](https://github.com/arcade-cabinet/will-it-blow/issues/7)) ([6a113de](https://github.com/arcade-cabinet/will-it-blow/commit/6a113de49003666e2cc06d6f8da3dbae4a8641c8))

## [1.1.0](https://github.com/arcade-cabinet/will-it-blow/compare/v1.0.0...v1.1.0) (2026-02-28)


### Features

* CRT TV overhaul, facial rigging, e2e testing ([#5](https://github.com/arcade-cabinet/will-it-blow/issues/5)) ([3758fbb](https://github.com/arcade-cabinet/will-it-blow/commit/3758fbbc246e4ab8a9766dae546af45dc24aed16))
