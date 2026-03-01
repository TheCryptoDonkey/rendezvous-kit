## [1.17.1](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.17.0...v1.17.1) (2026-03-01)


### Bug Fixes

* query way and relation elements in Overpass venue search ([b19be81](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/b19be81e9dac3f3afda3bdba4f257479eaf20b2d))

## [1.16.3](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.16.2...v1.16.3) (2026-02-28)


### Bug Fixes

* fade out markers when route popup is open so nothing obscures it ([4655c3d](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/4655c3db477816e7dd1fd2b6b33a1ab3fc3b6ec8))

## [1.16.2](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.16.1...v1.16.2) (2026-02-28)


### Bug Fixes

* force all map markers below popup with z-index override ([eebf6c9](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/eebf6c90f593e2b7fad5448239dce843825c65f6))

## [1.16.1](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.16.0...v1.16.1) (2026-02-28)


### Bug Fixes

* route popup z-index to 9999 so it sits above all markers and labels ([6ecaed3](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/6ecaed3aada255376a25f9d06ef808bd40e9773c))

# [1.16.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.15.0...v1.16.0) (2026-02-28)


### Features

* prominent route popup with high z-index, shadow, and bigger text ([e98a577](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/e98a57758dced14ef6dd67dfc2c4ebd99984237c))

# [1.15.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.14.1...v1.15.0) (2026-02-28)


### Features

* bigger panel and text, rich turn-by-turn in route popups ([58eb174](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/58eb17447ab2728bfff14fe3359e8e92a70b8548))

## [1.14.1](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.14.0...v1.14.1) (2026-02-28)


### Bug Fixes

* pin esm.sh import to rendezvous-kit@1.14.0 for enriched directions ([3595973](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/3595973d550d79650b836521f7a1fc07a2ab3261))

# [1.14.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.13.0...v1.14.0) (2026-02-28)


### Features

* add manoeuvre icons, badges, and timeline to directions UI ([c3b6609](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/c3b660951e05e0810ad8e5d344d617b3d269ac12))
* enrich RouteLeg type with manoeuvre details and road attributes ([488231e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/488231efb836effe32d5a5d2b4134b1fe25d9d0e))
* export ManoeuvreType from barrel ([96e82b3](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/96e82b3ff12f2bd35aa600ccb13df8513b37d783))
* map enriched manoeuvre fields from Valhalla to RouteLeg ([73e242e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/73e242e23509a9941834378e94145967c311319e))
* style enriched directions with timeline, icons, badges, and progress ([515a436](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/515a436dce5b49a12284ce7cf7eb66dca37c2ab1))

# [1.13.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.12.0...v1.13.0) (2026-02-28)


### Bug Fixes

* cancel in-flight animation on mode switch ([82d350e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/82d350ecaecc9b61cd2df463eaff85a14c217cab))


### Features

* render turn-by-turn directions in expanded result cards ([119dd78](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/119dd78e41fc63ca782122dc7324c73f48b7af12))
* sticky action bar on mobile for Find/Clear buttons ([f665922](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/f665922f98f4b8af0f6cfc18e3c0a91412aaea2d))
* store route data for turn-by-turn directions display ([f356531](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/f35653119c9aec109f8ac3ea80a5667cf3322f7e))
* style turn-by-turn directions UI in result cards ([13ce1ca](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/13ce1ca73ce9528ce4461b6b209f72afb7ad171a))
* use self-hosted Overpass API for venue search ([b2e6405](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/b2e640512d3875faf1d20a1154b07b30504f2b4d))

# [1.12.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.11.5...v1.12.0) (2026-02-28)


### Features

* add Overpass API fallback endpoints and timeout ([a8fb8f5](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/a8fb8f52732029e0e634d27ebfd9cbb801cd5a91))

## [1.11.5](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.11.4...v1.11.5) (2026-02-28)


### Bug Fixes

* remove isochrone border lines entirely ([d52d281](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d52d281427c6a0f79329f04928783a7f3e0da5aa))

## [1.11.4](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.11.3...v1.11.4) (2026-02-28)


### Bug Fixes

* unpin esm.sh import, fix theme swap and credit display ([77ffc09](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/77ffc094361718379dcae3b98c660135ff693719))

## [1.11.3](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.11.2...v1.11.3) (2026-02-28)


### Bug Fixes

* soften isochrone borders, block stale participants, fix theme swap ([ee40db5](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/ee40db573fa0e42e5e01f713222bfd45a91e9244))

## [1.11.2](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.11.1...v1.11.2) (2026-02-28)


### Bug Fixes

* fetch version from npm registry instead of hardcoding ([afea2bf](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/afea2bfb1ae27b58961229a9c0eadaa48a7dcde0))
* update version badge and cache-busting params ([e1fb0cd](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/e1fb0cde492c4d84cc4d8de890125eae4a943a32))

## [1.11.1](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.11.0...v1.11.1) (2026-02-28)


### Bug Fixes

* marker positioning, intersection lines, and theme swap ([71e33fc](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/71e33fc962134bae0912544a3a06395f3c3f6676))

# [1.11.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.10.6...v1.11.0) (2026-02-28)


### Features

* demo UX overhaul — fix bugs, add credit display and theme toggle ([3776a8f](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/3776a8f67e7c02da5c110768fa625ccc3bd13d95))

## [1.10.6](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.10.5...v1.10.6) (2026-02-28)


### Bug Fixes

* add cache-busting query strings to CSS and JS references ([57caeae](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/57caeae1305871c2a93cd2fda1bdc8b7b0b51b89))

## [1.10.5](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.10.4...v1.10.5) (2026-02-28)


### Bug Fixes

* remove position: relative that overrides MapLibre marker positioning ([3fbac0b](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/3fbac0b15c8630d8b3c402c1f25176e53d23395a))

## [1.10.4](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.10.3...v1.10.4) (2026-02-28)


### Bug Fixes

* remove intersection sliver outlines from map display ([a312d72](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/a312d728d01d567274f885e87a2e8e6792fc6bed))

## [1.10.3](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.10.2...v1.10.3) (2026-02-28)


### Bug Fixes

* venue positioning, marker stability, and matrix overflow ([cbad5de](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/cbad5de87b6793bd8736046f3cc4188443f6ac72))

## [1.10.2](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.10.1...v1.10.2) (2026-02-28)


### Bug Fixes

* use topVenues for markers, increase area threshold, filter zero travel times ([62c6d7c](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/62c6d7c561fa1a125930c7a006934fb6d5fb2f4f))

## [1.10.1](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.10.0...v1.10.1) (2026-02-28)


### Bug Fixes

* filter degenerate intersection polygons, limit venues to top 5, handle route 402 with payment panel ([10cc97e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/10cc97e5584ea789da3bb45114f24b98128ef0e3))

# [1.10.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.9.0...v1.10.0) (2026-02-28)


### Bug Fixes

* add empty guard to envelopePolygon and consistent error messages ([bbe91f2](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/bbe91f23febb496c3d8caf44382e84729d51d338))
* address code review — JSDoc, stub params, fractional duration test ([b1962a8](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/b1962a861e52a515b8afece79082f47e0f6bf6af))
* clean up route listeners, sync fairness pickers, add alert role ([3f78f17](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/3f78f17f54339b292d1d2723e50e0e99ee1312b8)), closes [#interactive-error](https://github.com/TheCryptoDonkey/rendezvous-kit/issues/interactive-error)
* deduplicate consecutive vertices in sutherlandHodgman output ([a955dd9](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/a955dd962abc4ea35b463fe1d6f38ccaee31d30e))
* escape scenario name in error path for consistent XSS prevention ([fef9f8e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/fef9f8e939c3efba72428a3dba904b9e34182770))


### Features

* add route types (GeoJSONLineString, RouteLeg, RouteGeometry) and computeRoute to RoutingEngine ([eeabf2d](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/eeabf2d4b64a087e4407e05200887899bc418a42))
* add scenario regeneration script for real Valhalla data ([8bf818c](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8bf818c3a2635bc6230a9565da488c33cab1b1fc))
* add stub computeRoute to OpenRouteService, GraphHopper, and OSRM engines ([c9d9f18](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/c9d9f18d128167f2b214f412b409cdb852d07290))
* add ValhallaError class, custom headers support, and typed error handling ([8cbc4eb](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8cbc4ebde50dc42c07b0e07229c1faf1d5d187b7))
* implement computeRoute in ValhallaEngine with polyline6 decoder and manoeuvre legs ([314c4fe](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/314c4fe2b3938f9cc2682ae98b4af8cd84c2f992))
* interactive mode — tab switching, markers, live pipeline ([1281f5c](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/1281f5c31657061d147e7b15d087e204e409805d))
* interactive mode HTML structure and CSS styles ([21522de](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/21522de0a415da5cc24845cb4a1c1b2439f06dc7))

# [1.9.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.8.0...v1.9.0) (2026-02-27)


### Bug Fixes

* address code review findings ([fdcb838](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/fdcb83884fb46648768e446ddfca4e36c67f0cec))
* bump sidebar panel font sizes for readability ([c7217cc](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/c7217cc563773cd61185432aed172f3eb2f374e9))


### Features

* add Lake District scenario (cycling + terrain-irregular isochrones) ([9de3bc9](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/9de3bc9adb0f65aa4443d2f5c6d76a39bbcc2d0a))
* add Manchester Group scenario (5 participants, tight budget, over-budget filtering) ([01e4d28](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/01e4d28258ec5c8a04e21d4d9d3b2a14098180e3))
* add new scenario options to picker dropdown ([9dd5568](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/9dd5568aa0a9ee8a09f5fe2bcb1f44a6d40db60e))
* add Severn Estuary scenario (concave coastline isochrones) ([9cc6607](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/9cc6607b14cc10385d2f47ed3f8b7a97aa123a74))
* add Thames Estuary scenario (disconnected multi-component intersection) ([18eb335](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/18eb3357957e05aa6e0cd33f8ebf0faf8f2e58a7))
* update demo.js to render multi-component intersections ([17a67af](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/17a67afe8d058df272716c73d170edfa6b5ad154))

# [1.8.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.7.0...v1.8.0) (2026-02-27)


### Features

* multi-component intersection, concave clipping, and pipeline hardening ([39702f6](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/39702f6e69129a94681546f24bd463b7e78e39f2))

# [1.7.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.6.0...v1.7.0) (2026-02-27)


### Features

* highlight deciding factors per fairness strategy ([6031e3d](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/6031e3dce720bb3b8a84efc8cdbc811e3100b26b))

# [1.6.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.5.0...v1.6.0) (2026-02-27)


### Features

* bigger participant markers with isochrone highlighting ([1db9308](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/1db9308a1adad6e7ac0a6b551a05057ad556235e))

# [1.5.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.4.1...v1.5.0) (2026-02-27)


### Features

* add circleToPolygon and getDestinationPoint geodesic utilities ([db590c2](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/db590c272674a988df69bfbc3876389e48b5776e))

## [1.4.1](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.4.0...v1.4.1) (2026-02-27)


### Bug Fixes

* remove popups, soften intersection, add fairness descriptions ([1eb0e7a](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/1eb0e7ab6fd80c6583aeb1b6ff8195573101816b))

# [1.4.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.3.0...v1.4.0) (2026-02-27)


### Features

* two-way map/sidebar venue selection ([574539a](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/574539a61166d754af526e453b291aec89fbe20e))

# [1.3.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.2.0...v1.3.0) (2026-02-27)


### Features

* make [#1](https://github.com/TheCryptoDonkey/rendezvous-kit/issues/1) venue unmissable on the map ([14f8e20](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/14f8e206c56c5ea819c6389fe18db154a8eb7a2b))

# [1.2.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.1.0...v1.2.0) (2026-02-27)


### Features

* ranked venue markers, East Midlands scenario, overlay back button ([98a4382](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/98a43824e788f253093ed144618232ca533616ad)), closes [#1](https://github.com/TheCryptoDonkey/rendezvous-kit/issues/1) [#2](https://github.com/TheCryptoDonkey/rendezvous-kit/issues/2)

# [1.1.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.0.0...v1.1.0) (2026-02-27)


### Bug Fixes

* add error handling, HTML escaping, and code panel fairness sync ([1cb79af](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/1cb79afc3f1088daf15cb803affbebcf21e69824))
* address code review — Firefox marker, focus-visible, semantic label ([f54ec02](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/f54ec025cbeea0c5b86c7f9ec4fac0a2a1cf8ecd))
* adjust scenario data — Edinburgh coordinates, London maxTime, trailing newlines ([bed4174](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/bed41744048b836010d21ac9768b5437c01a445a))


### Features

* add demo page application logic with pipeline animation ([cac812c](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/cac812cb5d06cc0a08504b6692f404ce30a02133))
* add demo page HTML shell and dark theme CSS ([b321b14](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/b321b140fbeb62a619a55bd2402628451b4b19ce))
* add scenario generation script and pre-baked JSON data ([eaf0984](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/eaf098429634791c9f617d6674b4c04d0252fb9f))

# 1.0.0 (2026-02-27)


### Bug Fixes

* add distance comment, distanceKm assertion, and matrix error test ([3722670](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/3722670dc95af4d40dc641ad2a96c723d0cfd46a))
* align OSRM computeIsochrone signature with RoutingEngine interface ([19d13b3](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/19d13b33842c27cca54b5185097d041f40550ac4))
* correct description and npmrc to match OIDC publishing ([5353ac1](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/5353ac1bfef931af2dc187921409ba474c109fd8))
* use params helper for GraphHopper matrix URL encoding ([7862353](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/7862353e2b12e619a90151c2fb595248a91f57e7))


### Features

* add GraphHopper routing engine adapter ([0680f7f](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/0680f7f91693ae70e04b02fc521d7d430bb758b7))
* add OpenRouteService routing engine adapter ([8b6b46a](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8b6b46a1aea549af606173e31c37791a11cf4c19))
* add OSRM routing engine adapter (matrix only) ([43dfbaf](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/43dfbaf32c83279e9fae559959c22a6d472f4cff))
* add Overpass API venue search ([a8e4c58](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/a8e4c58b11c4a5f983caca72a71ed2be79531b02))
* add polygon intersection with Sutherland-Hodgman clipping ([2d7a068](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/2d7a06858dce77096fabfd03f679ca506dee2ef2))
* add Valhalla routing engine adapter ([a16a1cc](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/a16a1cc847b958dad8e8241b8d185db54a3eb1a3))
* implement findRendezvous algorithm ([6dc8e90](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/6dc8e90a16f98eaacf574d4a171bbaec383a0365))
* scaffold trott-routing package with types ([0dfa023](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/0dfa02387b38d0ff7c59854897104c0df242f7d4))
* update barrel exports with all engines and geo module ([4bfe1aa](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/4bfe1aa681dda0db90ddf0bfdc18948b7f4c22ce))
* upgrade rendezvous pipeline from bbox to polygon intersection ([e60899a](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/e60899ab4b9f69e1ecacefa65592e64a7daf1e99))
