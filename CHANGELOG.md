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
