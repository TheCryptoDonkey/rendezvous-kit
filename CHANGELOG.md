# [1.10.0](https://github.com/forgesworn/rendezvous-kit/compare/v1.9.0...v1.10.0) (2026-03-18)


### Bug Fixes

* add cache-busting query strings to CSS and JS references ([95a4567](https://github.com/forgesworn/rendezvous-kit/commit/95a4567ffc790222f5807abcfb5f1ad7566cc52a))
* add empty guard to envelopePolygon and consistent error messages ([1a82491](https://github.com/forgesworn/rendezvous-kit/commit/1a82491465bf77bec9e15c53b986c220d15ab9a1))
* add explicit language and units to Valhalla route request ([ac60fb5](https://github.com/forgesworn/rendezvous-kit/commit/ac60fb52829aec3f711c477c5d1e568c2a4444a5))
* address code review — JSDoc, stub params, fractional duration test ([69554c0](https://github.com/forgesworn/rendezvous-kit/commit/69554c0c71af4b57d2c262824f375468b87eab44))
* cancel in-flight animation on mode switch ([8bc327b](https://github.com/forgesworn/rendezvous-kit/commit/8bc327b3097da84b656bef8f636b62700d0f9d57))
* cap maxTimeMinutes and venueTypes array length ([2752d27](https://github.com/forgesworn/rendezvous-kit/commit/2752d276b8384819aee104ab8d89d8c46cc8cab4))
* clean up route listeners, sync fairness pickers, add alert role ([4c1697d](https://github.com/forgesworn/rendezvous-kit/commit/4c1697d2503b1403f7172961c306e1548330f66d)), closes [#interactive-error](https://github.com/forgesworn/rendezvous-kit/issues/interactive-error)
* deduplicate consecutive vertices in sutherlandHodgman output ([1746515](https://github.com/forgesworn/rendezvous-kit/commit/17465157e596d4c12520623f3d17365326a98e73))
* escape scenario name in error path for consistent XSS prevention ([12a6327](https://github.com/forgesworn/rendezvous-kit/commit/12a63270f21ac2fb25ef9949da54662e5d8a63ff))
* fade out markers when route popup is open so nothing obscures it ([7a0ddca](https://github.com/forgesworn/rendezvous-kit/commit/7a0ddca518c5b9f962191713aec5994756b5b32c))
* fetch version from npm registry instead of hardcoding ([fe3c003](https://github.com/forgesworn/rendezvous-kit/commit/fe3c0033aee50df545b51d17c7841ddf2b06af12))
* filter degenerate intersection polygons, limit venues to top 5, handle route 402 with payment panel ([5ae0998](https://github.com/forgesworn/rendezvous-kit/commit/5ae09989cb686f1b610bef95efec4e5f2964091b))
* force all map markers below popup with z-index override ([6655bf7](https://github.com/forgesworn/rendezvous-kit/commit/6655bf76ebb9fe1d0ecb8d341d6ed8ebc1f9e81a))
* guard route layer removal with getLayer/getSource checks ([d5dc784](https://github.com/forgesworn/rendezvous-kit/commit/d5dc7843e4b820be20cabc63f73491784b84f7e6))
* harden input validation and add production readiness checks ([458ba6f](https://github.com/forgesworn/rendezvous-kit/commit/458ba6f2516a63eb68cfb807cdf21b6d7216046f))
* harden security and production readiness ([914e54b](https://github.com/forgesworn/rendezvous-kit/commit/914e54bae5fb0d31c9ea1e129d670b11981c89f7))
* marker positioning, intersection lines, and theme swap ([7e9f398](https://github.com/forgesworn/rendezvous-kit/commit/7e9f398dd4e5517901c33f9a2c1c68d1c7157ddd))
* parallelise isochrone calls and add fetch timeouts ([1590b3e](https://github.com/forgesworn/rendezvous-kit/commit/1590b3e1bd5352ebbb838ddef60f5e4677c6131b))
* pass status token when polling invoice-status endpoint ([2348deb](https://github.com/forgesworn/rendezvous-kit/commit/2348debbf732c8a589461c9571fc0973e657fd83))
* pin esm.sh import to rendezvous-kit@1.14.0 for enriched directions ([36c1909](https://github.com/forgesworn/rendezvous-kit/commit/36c190912f11d41ef84c4da422a9ff70ea487e89))
* polish mobile UX — cache bust, wallet button visibility ([c74e754](https://github.com/forgesworn/rendezvous-kit/commit/c74e7542913b803b1ded0c007b30df700877667e))
* prevent initial flash on mobile, use matchMedia for resize ([d7b695f](https://github.com/forgesworn/rendezvous-kit/commit/d7b695fc5bb552b8f985bcc207b554809eb9f16b))
* query way and relation elements in Overpass venue search ([bd69263](https://github.com/forgesworn/rendezvous-kit/commit/bd692634dc1ff956e2e05df5fece29d498387b6e))
* reduce hull buffer size and cap Overpass results ([df3fc47](https://github.com/forgesworn/rendezvous-kit/commit/df3fc47df6964fb5fd830744d05250bcb395d7d2))
* remove intersection sliver outlines from map display ([0a532ed](https://github.com/forgesworn/rendezvous-kit/commit/0a532edd5ece1ef01d988aa7f230dee71e9121a6))
* remove isochrone border lines entirely ([2bae0ba](https://github.com/forgesworn/rendezvous-kit/commit/2bae0bac334bcdd473619c7199e77225c8f988af))
* remove position: relative that overrides MapLibre marker positioning ([6f16739](https://github.com/forgesworn/rendezvous-kit/commit/6f167398d665335e3130a3f4cc805ad2f387bac1))
* replace flaky QR library with dynamic import and lightning: URI ([9d831a9](https://github.com/forgesworn/rendezvous-kit/commit/9d831a9c53b9e677491d913163c826e1574965dd))
* resolve mobile demo page scrolling, QR code, and ride distance issues ([20e2409](https://github.com/forgesworn/rendezvous-kit/commit/20e2409c67c677dccfb7df2fe7be07d15a66f43c))
* route popup z-index to 9999 so it sits above all markers and labels ([22616ca](https://github.com/forgesworn/rendezvous-kit/commit/22616ca1ac99fa9e2139ea0debc6d14fc79e67b4))
* soften isochrone borders, block stale participants, fix theme swap ([7e65487](https://github.com/forgesworn/rendezvous-kit/commit/7e6548718155ce12dfae0bad7ad24f379674b71e))
* unpin esm.sh import, fix theme swap and credit display ([5d836a8](https://github.com/forgesworn/rendezvous-kit/commit/5d836a800c1c718d0ed562de1733c38456c840dc))
* update demo imports to v1.18.0 and bump cache busters ([d7ef5f9](https://github.com/forgesworn/rendezvous-kit/commit/d7ef5f9fd9eddd1ca66479e5a25aad9be12d7d5e))
* update geohash-kit to version with convexHull export ([1026573](https://github.com/forgesworn/rendezvous-kit/commit/10265732842025c78dd4bed9d8cd18aa82e75cd0))
* update version badge and cache-busting params ([12a0979](https://github.com/forgesworn/rendezvous-kit/commit/12a09798aa53b49ba33cf687cc2332c36cfec9a2))
* use string concatenation for Overpass query to avoid esm.sh minifier bug ([b543182](https://github.com/forgesworn/rendezvous-kit/commit/b543182c82d3ce406d0f45a0d844f8d84c2c1d02))
* use topVenues for markers, increase area threshold, filter zero travel times ([0ca3eee](https://github.com/forgesworn/rendezvous-kit/commit/0ca3eee20cd18f092cfef74fa8738248f5628a9c))
* venue positioning, marker stability, and matrix overflow ([24a5792](https://github.com/forgesworn/rendezvous-kit/commit/24a579294adbae83842c4bac1f39f45c224875e9))


### Features

* add bottom sheet drag handle to panel HTML ([5f7a25c](https://github.com/forgesworn/rendezvous-kit/commit/5f7a25cb7cef61f5e1ab7175de2e2a293f0987fe))
* add hull buffer, auto-decision logic, and speed constants ([24e8999](https://github.com/forgesworn/rendezvous-kit/commit/24e89991a0eb9a45b14088adfe18c2b94bbdf787))
* add hull fast-path pipeline to findRendezvous ([d87e394](https://github.com/forgesworn/rendezvous-kit/commit/d87e394061a78c38639516871106b353b44f9778))
* add manoeuvre icons, badges, and timeline to directions UI ([d33d376](https://github.com/forgesworn/rendezvous-kit/commit/d33d37618eac2625da8d95b93a0d43ea7f61d2b6))
* add Overpass API fallback endpoints and timeout ([318ae5e](https://github.com/forgesworn/rendezvous-kit/commit/318ae5e3e995e4e27fef0fe2c89786604a65eba3))
* add route types (GeoJSONLineString, RouteLeg, RouteGeometry) and computeRoute to RoutingEngine ([81064e0](https://github.com/forgesworn/rendezvous-kit/commit/81064e0c6bfc7e634e70ad155887bc3105fdb3e8))
* add scenario regeneration script for real Valhalla data ([8e8371e](https://github.com/forgesworn/rendezvous-kit/commit/8e8371e271575a0062bbee1cfb28cb52e7673c49))
* add strategy option to RendezvousOptions ([933a4ee](https://github.com/forgesworn/rendezvous-kit/commit/933a4ee82e74a69ff78ca1f16263c5bbb98f27a6))
* add stub computeRoute to OpenRouteService, GraphHopper, and OSRM engines ([00ddd7e](https://github.com/forgesworn/rendezvous-kit/commit/00ddd7e09a9c97f29261e39e56c5512bac7fe152))
* add ValhallaError class, custom headers support, and typed error handling ([9e8fa11](https://github.com/forgesworn/rendezvous-kit/commit/9e8fa116b13335b4baa8ad437a672b0efb29cb34))
* bigger panel and text, rich turn-by-turn in route popups ([3851638](https://github.com/forgesworn/rendezvous-kit/commit/3851638060b956bb27f279e1e0637fd16aa1c923))
* bottom sheet CSS with touch targets and mobile header ([fc38d88](https://github.com/forgesworn/rendezvous-kit/commit/fc38d88aa421d9d6e548147bd2b4d0586da68557))
* bottom sheet touch handling with auto-transitions ([066f405](https://github.com/forgesworn/rendezvous-kit/commit/066f4051984b2fe587cba18153214d665dbba8f6))
* centre map on user's GPS location when available ([8ffe0d1](https://github.com/forgesworn/rendezvous-kit/commit/8ffe0d102cdb6acd77c48bdcbef5b730d491d352))
* demo UX overhaul — fix bugs, add credit display and theme toggle ([bbc3824](https://github.com/forgesworn/rendezvous-kit/commit/bbc382491183d88b9566191a196f42d991c642ec))
* enrich RouteLeg type with manoeuvre details and road attributes ([ae09429](https://github.com/forgesworn/rendezvous-kit/commit/ae09429bb14a64c43e72e3ecf58507f4c4829e12))
* expand venue types to 17 with grouped chip picker ([ab68fd6](https://github.com/forgesworn/rendezvous-kit/commit/ab68fd6b02b29d376c3cc971d301587ed1c5eb81))
* export ManoeuvreType from barrel ([537a79a](https://github.com/forgesworn/rendezvous-kit/commit/537a79aef4f88d795e9f858d614c2de881b712be))
* expose map instance for demo recording ([48aa293](https://github.com/forgesworn/rendezvous-kit/commit/48aa2937b762d86a0055c5193f8a153b309a8a05))
* implement computeRoute in ValhallaEngine with polyline6 decoder and manoeuvre legs ([fe4102d](https://github.com/forgesworn/rendezvous-kit/commit/fe4102dc5d125ee57aebf49dab78bb30352d09ee))
* interactive mode — tab switching, markers, live pipeline ([8318b28](https://github.com/forgesworn/rendezvous-kit/commit/8318b288323de392316e2cd87b918c07c328d209))
* interactive mode HTML structure and CSS styles ([f293b51](https://github.com/forgesworn/rendezvous-kit/commit/f293b510afbc883d0dcaad1673925cbca15b6b16))
* make Interactive the default tab in demo page ([83e898a](https://github.com/forgesworn/rendezvous-kit/commit/83e898a6aa2f167b8d5f212da4890c2de77d5c87))
* map enriched manoeuvre fields from Valhalla to RouteLeg ([1446e49](https://github.com/forgesworn/rendezvous-kit/commit/1446e49267b5542fa8621b8b30f39c6537e1e27c))
* mobile UX overhaul — bottom sheet, QR fix, touch targets ([5a07a8b](https://github.com/forgesworn/rendezvous-kit/commit/5a07a8bfa67ee51d4473010c6218e6aad626431b))
* progressive isochrone reveal with hull visualisation ([4f5d945](https://github.com/forgesworn/rendezvous-kit/commit/4f5d9459b5f60016fcc723f053d6937b3b5cdffb))
* prominent route popup with high z-index, shadow, and bigger text ([229afdd](https://github.com/forgesworn/rendezvous-kit/commit/229afdd042d26c93cda7be07c089dde79434d474))
* render turn-by-turn directions in expanded result cards ([eaa9f70](https://github.com/forgesworn/rendezvous-kit/commit/eaa9f7036e0f3cd6a75f5dec1f6c4f5698a4999d))
* sticky action bar on mobile for Find/Clear buttons ([6fc9343](https://github.com/forgesworn/rendezvous-kit/commit/6fc93431261374a2569eca7f3b174151a1b84c3c))
* store route data for turn-by-turn directions display ([b5ac065](https://github.com/forgesworn/rendezvous-kit/commit/b5ac06553586be8dfbebcfd082aa1d7af0d8b3b3))
* style enriched directions with timeline, icons, badges, and progress ([c9ade24](https://github.com/forgesworn/rendezvous-kit/commit/c9ade242f67e0386cbf49a73c2cb954753f36d6a))
* style turn-by-turn directions UI in result cards ([9ddd029](https://github.com/forgesworn/rendezvous-kit/commit/9ddd029dd8d9e34abddf85e3a00f94f68f8a98cb))
* use self-hosted Overpass API for venue search ([385aa0c](https://github.com/forgesworn/rendezvous-kit/commit/385aa0c0bcca4eda8b5308a5acc51c4ae2d8f51a))

# [1.10.0](https://github.com/forgesworn/rendezvous-kit/compare/v1.9.0...v1.10.0) (2026-03-18)


### Bug Fixes

* add cache-busting query strings to CSS and JS references ([95a4567](https://github.com/forgesworn/rendezvous-kit/commit/95a4567ffc790222f5807abcfb5f1ad7566cc52a))
* add empty guard to envelopePolygon and consistent error messages ([1a82491](https://github.com/forgesworn/rendezvous-kit/commit/1a82491465bf77bec9e15c53b986c220d15ab9a1))
* add explicit language and units to Valhalla route request ([ac60fb5](https://github.com/forgesworn/rendezvous-kit/commit/ac60fb52829aec3f711c477c5d1e568c2a4444a5))
* address code review — JSDoc, stub params, fractional duration test ([69554c0](https://github.com/forgesworn/rendezvous-kit/commit/69554c0c71af4b57d2c262824f375468b87eab44))
* cancel in-flight animation on mode switch ([8bc327b](https://github.com/forgesworn/rendezvous-kit/commit/8bc327b3097da84b656bef8f636b62700d0f9d57))
* cap maxTimeMinutes and venueTypes array length ([2752d27](https://github.com/forgesworn/rendezvous-kit/commit/2752d276b8384819aee104ab8d89d8c46cc8cab4))
* clean up route listeners, sync fairness pickers, add alert role ([4c1697d](https://github.com/forgesworn/rendezvous-kit/commit/4c1697d2503b1403f7172961c306e1548330f66d)), closes [#interactive-error](https://github.com/forgesworn/rendezvous-kit/issues/interactive-error)
* deduplicate consecutive vertices in sutherlandHodgman output ([1746515](https://github.com/forgesworn/rendezvous-kit/commit/17465157e596d4c12520623f3d17365326a98e73))
* escape scenario name in error path for consistent XSS prevention ([12a6327](https://github.com/forgesworn/rendezvous-kit/commit/12a63270f21ac2fb25ef9949da54662e5d8a63ff))
* fade out markers when route popup is open so nothing obscures it ([7a0ddca](https://github.com/forgesworn/rendezvous-kit/commit/7a0ddca518c5b9f962191713aec5994756b5b32c))
* fetch version from npm registry instead of hardcoding ([fe3c003](https://github.com/forgesworn/rendezvous-kit/commit/fe3c0033aee50df545b51d17c7841ddf2b06af12))
* filter degenerate intersection polygons, limit venues to top 5, handle route 402 with payment panel ([5ae0998](https://github.com/forgesworn/rendezvous-kit/commit/5ae09989cb686f1b610bef95efec4e5f2964091b))
* force all map markers below popup with z-index override ([6655bf7](https://github.com/forgesworn/rendezvous-kit/commit/6655bf76ebb9fe1d0ecb8d341d6ed8ebc1f9e81a))
* guard route layer removal with getLayer/getSource checks ([d5dc784](https://github.com/forgesworn/rendezvous-kit/commit/d5dc7843e4b820be20cabc63f73491784b84f7e6))
* harden input validation and add production readiness checks ([458ba6f](https://github.com/forgesworn/rendezvous-kit/commit/458ba6f2516a63eb68cfb807cdf21b6d7216046f))
* harden security and production readiness ([914e54b](https://github.com/forgesworn/rendezvous-kit/commit/914e54bae5fb0d31c9ea1e129d670b11981c89f7))
* marker positioning, intersection lines, and theme swap ([7e9f398](https://github.com/forgesworn/rendezvous-kit/commit/7e9f398dd4e5517901c33f9a2c1c68d1c7157ddd))
* parallelise isochrone calls and add fetch timeouts ([1590b3e](https://github.com/forgesworn/rendezvous-kit/commit/1590b3e1bd5352ebbb838ddef60f5e4677c6131b))
* pass status token when polling invoice-status endpoint ([2348deb](https://github.com/forgesworn/rendezvous-kit/commit/2348debbf732c8a589461c9571fc0973e657fd83))
* pin esm.sh import to rendezvous-kit@1.14.0 for enriched directions ([36c1909](https://github.com/forgesworn/rendezvous-kit/commit/36c190912f11d41ef84c4da422a9ff70ea487e89))
* polish mobile UX — cache bust, wallet button visibility ([c74e754](https://github.com/forgesworn/rendezvous-kit/commit/c74e7542913b803b1ded0c007b30df700877667e))
* prevent initial flash on mobile, use matchMedia for resize ([d7b695f](https://github.com/forgesworn/rendezvous-kit/commit/d7b695fc5bb552b8f985bcc207b554809eb9f16b))
* query way and relation elements in Overpass venue search ([bd69263](https://github.com/forgesworn/rendezvous-kit/commit/bd692634dc1ff956e2e05df5fece29d498387b6e))
* reduce hull buffer size and cap Overpass results ([df3fc47](https://github.com/forgesworn/rendezvous-kit/commit/df3fc47df6964fb5fd830744d05250bcb395d7d2))
* remove intersection sliver outlines from map display ([0a532ed](https://github.com/forgesworn/rendezvous-kit/commit/0a532edd5ece1ef01d988aa7f230dee71e9121a6))
* remove isochrone border lines entirely ([2bae0ba](https://github.com/forgesworn/rendezvous-kit/commit/2bae0bac334bcdd473619c7199e77225c8f988af))
* remove position: relative that overrides MapLibre marker positioning ([6f16739](https://github.com/forgesworn/rendezvous-kit/commit/6f167398d665335e3130a3f4cc805ad2f387bac1))
* replace flaky QR library with dynamic import and lightning: URI ([9d831a9](https://github.com/forgesworn/rendezvous-kit/commit/9d831a9c53b9e677491d913163c826e1574965dd))
* resolve mobile demo page scrolling, QR code, and ride distance issues ([20e2409](https://github.com/forgesworn/rendezvous-kit/commit/20e2409c67c677dccfb7df2fe7be07d15a66f43c))
* route popup z-index to 9999 so it sits above all markers and labels ([22616ca](https://github.com/forgesworn/rendezvous-kit/commit/22616ca1ac99fa9e2139ea0debc6d14fc79e67b4))
* soften isochrone borders, block stale participants, fix theme swap ([7e65487](https://github.com/forgesworn/rendezvous-kit/commit/7e6548718155ce12dfae0bad7ad24f379674b71e))
* unpin esm.sh import, fix theme swap and credit display ([5d836a8](https://github.com/forgesworn/rendezvous-kit/commit/5d836a800c1c718d0ed562de1733c38456c840dc))
* update demo imports to v1.18.0 and bump cache busters ([d7ef5f9](https://github.com/forgesworn/rendezvous-kit/commit/d7ef5f9fd9eddd1ca66479e5a25aad9be12d7d5e))
* update geohash-kit to version with convexHull export ([1026573](https://github.com/forgesworn/rendezvous-kit/commit/10265732842025c78dd4bed9d8cd18aa82e75cd0))
* update version badge and cache-busting params ([12a0979](https://github.com/forgesworn/rendezvous-kit/commit/12a09798aa53b49ba33cf687cc2332c36cfec9a2))
* use string concatenation for Overpass query to avoid esm.sh minifier bug ([b543182](https://github.com/forgesworn/rendezvous-kit/commit/b543182c82d3ce406d0f45a0d844f8d84c2c1d02))
* use topVenues for markers, increase area threshold, filter zero travel times ([0ca3eee](https://github.com/forgesworn/rendezvous-kit/commit/0ca3eee20cd18f092cfef74fa8738248f5628a9c))
* venue positioning, marker stability, and matrix overflow ([24a5792](https://github.com/forgesworn/rendezvous-kit/commit/24a579294adbae83842c4bac1f39f45c224875e9))


### Features

* add bottom sheet drag handle to panel HTML ([5f7a25c](https://github.com/forgesworn/rendezvous-kit/commit/5f7a25cb7cef61f5e1ab7175de2e2a293f0987fe))
* add hull buffer, auto-decision logic, and speed constants ([24e8999](https://github.com/forgesworn/rendezvous-kit/commit/24e89991a0eb9a45b14088adfe18c2b94bbdf787))
* add hull fast-path pipeline to findRendezvous ([d87e394](https://github.com/forgesworn/rendezvous-kit/commit/d87e394061a78c38639516871106b353b44f9778))
* add manoeuvre icons, badges, and timeline to directions UI ([d33d376](https://github.com/forgesworn/rendezvous-kit/commit/d33d37618eac2625da8d95b93a0d43ea7f61d2b6))
* add Overpass API fallback endpoints and timeout ([318ae5e](https://github.com/forgesworn/rendezvous-kit/commit/318ae5e3e995e4e27fef0fe2c89786604a65eba3))
* add route types (GeoJSONLineString, RouteLeg, RouteGeometry) and computeRoute to RoutingEngine ([81064e0](https://github.com/forgesworn/rendezvous-kit/commit/81064e0c6bfc7e634e70ad155887bc3105fdb3e8))
* add scenario regeneration script for real Valhalla data ([8e8371e](https://github.com/forgesworn/rendezvous-kit/commit/8e8371e271575a0062bbee1cfb28cb52e7673c49))
* add strategy option to RendezvousOptions ([933a4ee](https://github.com/forgesworn/rendezvous-kit/commit/933a4ee82e74a69ff78ca1f16263c5bbb98f27a6))
* add stub computeRoute to OpenRouteService, GraphHopper, and OSRM engines ([00ddd7e](https://github.com/forgesworn/rendezvous-kit/commit/00ddd7e09a9c97f29261e39e56c5512bac7fe152))
* add ValhallaError class, custom headers support, and typed error handling ([9e8fa11](https://github.com/forgesworn/rendezvous-kit/commit/9e8fa116b13335b4baa8ad437a672b0efb29cb34))
* bigger panel and text, rich turn-by-turn in route popups ([3851638](https://github.com/forgesworn/rendezvous-kit/commit/3851638060b956bb27f279e1e0637fd16aa1c923))
* bottom sheet CSS with touch targets and mobile header ([fc38d88](https://github.com/forgesworn/rendezvous-kit/commit/fc38d88aa421d9d6e548147bd2b4d0586da68557))
* bottom sheet touch handling with auto-transitions ([066f405](https://github.com/forgesworn/rendezvous-kit/commit/066f4051984b2fe587cba18153214d665dbba8f6))
* centre map on user's GPS location when available ([8ffe0d1](https://github.com/forgesworn/rendezvous-kit/commit/8ffe0d102cdb6acd77c48bdcbef5b730d491d352))
* demo UX overhaul — fix bugs, add credit display and theme toggle ([bbc3824](https://github.com/forgesworn/rendezvous-kit/commit/bbc382491183d88b9566191a196f42d991c642ec))
* enrich RouteLeg type with manoeuvre details and road attributes ([ae09429](https://github.com/forgesworn/rendezvous-kit/commit/ae09429bb14a64c43e72e3ecf58507f4c4829e12))
* expand venue types to 17 with grouped chip picker ([ab68fd6](https://github.com/forgesworn/rendezvous-kit/commit/ab68fd6b02b29d376c3cc971d301587ed1c5eb81))
* export ManoeuvreType from barrel ([537a79a](https://github.com/forgesworn/rendezvous-kit/commit/537a79aef4f88d795e9f858d614c2de881b712be))
* expose map instance for demo recording ([48aa293](https://github.com/forgesworn/rendezvous-kit/commit/48aa2937b762d86a0055c5193f8a153b309a8a05))
* implement computeRoute in ValhallaEngine with polyline6 decoder and manoeuvre legs ([fe4102d](https://github.com/forgesworn/rendezvous-kit/commit/fe4102dc5d125ee57aebf49dab78bb30352d09ee))
* interactive mode — tab switching, markers, live pipeline ([8318b28](https://github.com/forgesworn/rendezvous-kit/commit/8318b288323de392316e2cd87b918c07c328d209))
* interactive mode HTML structure and CSS styles ([f293b51](https://github.com/forgesworn/rendezvous-kit/commit/f293b510afbc883d0dcaad1673925cbca15b6b16))
* make Interactive the default tab in demo page ([83e898a](https://github.com/forgesworn/rendezvous-kit/commit/83e898a6aa2f167b8d5f212da4890c2de77d5c87))
* map enriched manoeuvre fields from Valhalla to RouteLeg ([1446e49](https://github.com/forgesworn/rendezvous-kit/commit/1446e49267b5542fa8621b8b30f39c6537e1e27c))
* mobile UX overhaul — bottom sheet, QR fix, touch targets ([5a07a8b](https://github.com/forgesworn/rendezvous-kit/commit/5a07a8bfa67ee51d4473010c6218e6aad626431b))
* progressive isochrone reveal with hull visualisation ([4f5d945](https://github.com/forgesworn/rendezvous-kit/commit/4f5d9459b5f60016fcc723f053d6937b3b5cdffb))
* prominent route popup with high z-index, shadow, and bigger text ([229afdd](https://github.com/forgesworn/rendezvous-kit/commit/229afdd042d26c93cda7be07c089dde79434d474))
* render turn-by-turn directions in expanded result cards ([eaa9f70](https://github.com/forgesworn/rendezvous-kit/commit/eaa9f7036e0f3cd6a75f5dec1f6c4f5698a4999d))
* sticky action bar on mobile for Find/Clear buttons ([6fc9343](https://github.com/forgesworn/rendezvous-kit/commit/6fc93431261374a2569eca7f3b174151a1b84c3c))
* store route data for turn-by-turn directions display ([b5ac065](https://github.com/forgesworn/rendezvous-kit/commit/b5ac06553586be8dfbebcfd082aa1d7af0d8b3b3))
* style enriched directions with timeline, icons, badges, and progress ([c9ade24](https://github.com/forgesworn/rendezvous-kit/commit/c9ade242f67e0386cbf49a73c2cb954753f36d6a))
* style turn-by-turn directions UI in result cards ([9ddd029](https://github.com/forgesworn/rendezvous-kit/commit/9ddd029dd8d9e34abddf85e3a00f94f68f8a98cb))
* use self-hosted Overpass API for venue search ([385aa0c](https://github.com/forgesworn/rendezvous-kit/commit/385aa0c0bcca4eda8b5308a5acc51c4ae2d8f51a))

# [1.10.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.9.0...v1.10.0) (2026-03-15)


### Bug Fixes

* add cache-busting query strings to CSS and JS references ([95a4567](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/95a4567ffc790222f5807abcfb5f1ad7566cc52a))
* add empty guard to envelopePolygon and consistent error messages ([1a82491](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/1a82491465bf77bec9e15c53b986c220d15ab9a1))
* add explicit language and units to Valhalla route request ([ac60fb5](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/ac60fb52829aec3f711c477c5d1e568c2a4444a5))
* address code review — JSDoc, stub params, fractional duration test ([69554c0](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/69554c0c71af4b57d2c262824f375468b87eab44))
* cancel in-flight animation on mode switch ([8bc327b](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8bc327b3097da84b656bef8f636b62700d0f9d57))
* cap maxTimeMinutes and venueTypes array length ([2752d27](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/2752d276b8384819aee104ab8d89d8c46cc8cab4))
* clean up route listeners, sync fairness pickers, add alert role ([4c1697d](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/4c1697d2503b1403f7172961c306e1548330f66d)), closes [#interactive-error](https://github.com/TheCryptoDonkey/rendezvous-kit/issues/interactive-error)
* deduplicate consecutive vertices in sutherlandHodgman output ([1746515](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/17465157e596d4c12520623f3d17365326a98e73))
* escape scenario name in error path for consistent XSS prevention ([12a6327](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/12a63270f21ac2fb25ef9949da54662e5d8a63ff))
* fade out markers when route popup is open so nothing obscures it ([7a0ddca](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/7a0ddca518c5b9f962191713aec5994756b5b32c))
* fetch version from npm registry instead of hardcoding ([fe3c003](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/fe3c0033aee50df545b51d17c7841ddf2b06af12))
* filter degenerate intersection polygons, limit venues to top 5, handle route 402 with payment panel ([5ae0998](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/5ae09989cb686f1b610bef95efec4e5f2964091b))
* force all map markers below popup with z-index override ([6655bf7](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/6655bf76ebb9fe1d0ecb8d341d6ed8ebc1f9e81a))
* guard route layer removal with getLayer/getSource checks ([d5dc784](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d5dc7843e4b820be20cabc63f73491784b84f7e6))
* harden input validation and add production readiness checks ([458ba6f](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/458ba6f2516a63eb68cfb807cdf21b6d7216046f))
* harden security and production readiness ([914e54b](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/914e54bae5fb0d31c9ea1e129d670b11981c89f7))
* marker positioning, intersection lines, and theme swap ([7e9f398](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/7e9f398dd4e5517901c33f9a2c1c68d1c7157ddd))
* parallelise isochrone calls and add fetch timeouts ([1590b3e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/1590b3e1bd5352ebbb838ddef60f5e4677c6131b))
* pass status token when polling invoice-status endpoint ([2348deb](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/2348debbf732c8a589461c9571fc0973e657fd83))
* pin esm.sh import to rendezvous-kit@1.14.0 for enriched directions ([36c1909](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/36c190912f11d41ef84c4da422a9ff70ea487e89))
* polish mobile UX — cache bust, wallet button visibility ([c74e754](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/c74e7542913b803b1ded0c007b30df700877667e))
* prevent initial flash on mobile, use matchMedia for resize ([d7b695f](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d7b695fc5bb552b8f985bcc207b554809eb9f16b))
* query way and relation elements in Overpass venue search ([bd69263](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/bd692634dc1ff956e2e05df5fece29d498387b6e))
* reduce hull buffer size and cap Overpass results ([df3fc47](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/df3fc47df6964fb5fd830744d05250bcb395d7d2))
* remove intersection sliver outlines from map display ([0a532ed](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/0a532edd5ece1ef01d988aa7f230dee71e9121a6))
* remove isochrone border lines entirely ([2bae0ba](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/2bae0bac334bcdd473619c7199e77225c8f988af))
* remove position: relative that overrides MapLibre marker positioning ([6f16739](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/6f167398d665335e3130a3f4cc805ad2f387bac1))
* replace flaky QR library with dynamic import and lightning: URI ([9d831a9](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/9d831a9c53b9e677491d913163c826e1574965dd))
* resolve mobile demo page scrolling, QR code, and ride distance issues ([20e2409](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/20e2409c67c677dccfb7df2fe7be07d15a66f43c))
* route popup z-index to 9999 so it sits above all markers and labels ([22616ca](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/22616ca1ac99fa9e2139ea0debc6d14fc79e67b4))
* soften isochrone borders, block stale participants, fix theme swap ([7e65487](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/7e6548718155ce12dfae0bad7ad24f379674b71e))
* unpin esm.sh import, fix theme swap and credit display ([5d836a8](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/5d836a800c1c718d0ed562de1733c38456c840dc))
* update demo imports to v1.18.0 and bump cache busters ([d7ef5f9](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d7ef5f9fd9eddd1ca66479e5a25aad9be12d7d5e))
* update geohash-kit to version with convexHull export ([1026573](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/10265732842025c78dd4bed9d8cd18aa82e75cd0))
* update version badge and cache-busting params ([12a0979](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/12a09798aa53b49ba33cf687cc2332c36cfec9a2))
* use string concatenation for Overpass query to avoid esm.sh minifier bug ([b543182](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/b543182c82d3ce406d0f45a0d844f8d84c2c1d02))
* use topVenues for markers, increase area threshold, filter zero travel times ([0ca3eee](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/0ca3eee20cd18f092cfef74fa8738248f5628a9c))
* venue positioning, marker stability, and matrix overflow ([24a5792](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/24a579294adbae83842c4bac1f39f45c224875e9))


### Features

* add bottom sheet drag handle to panel HTML ([5f7a25c](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/5f7a25cb7cef61f5e1ab7175de2e2a293f0987fe))
* add hull buffer, auto-decision logic, and speed constants ([24e8999](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/24e89991a0eb9a45b14088adfe18c2b94bbdf787))
* add hull fast-path pipeline to findRendezvous ([d87e394](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d87e394061a78c38639516871106b353b44f9778))
* add manoeuvre icons, badges, and timeline to directions UI ([d33d376](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d33d37618eac2625da8d95b93a0d43ea7f61d2b6))
* add Overpass API fallback endpoints and timeout ([318ae5e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/318ae5e3e995e4e27fef0fe2c89786604a65eba3))
* add route types (GeoJSONLineString, RouteLeg, RouteGeometry) and computeRoute to RoutingEngine ([81064e0](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/81064e0c6bfc7e634e70ad155887bc3105fdb3e8))
* add scenario regeneration script for real Valhalla data ([8e8371e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8e8371e271575a0062bbee1cfb28cb52e7673c49))
* add strategy option to RendezvousOptions ([933a4ee](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/933a4ee82e74a69ff78ca1f16263c5bbb98f27a6))
* add stub computeRoute to OpenRouteService, GraphHopper, and OSRM engines ([00ddd7e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/00ddd7e09a9c97f29261e39e56c5512bac7fe152))
* add ValhallaError class, custom headers support, and typed error handling ([9e8fa11](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/9e8fa116b13335b4baa8ad437a672b0efb29cb34))
* bigger panel and text, rich turn-by-turn in route popups ([3851638](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/3851638060b956bb27f279e1e0637fd16aa1c923))
* bottom sheet CSS with touch targets and mobile header ([fc38d88](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/fc38d88aa421d9d6e548147bd2b4d0586da68557))
* bottom sheet touch handling with auto-transitions ([066f405](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/066f4051984b2fe587cba18153214d665dbba8f6))
* centre map on user's GPS location when available ([8ffe0d1](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8ffe0d102cdb6acd77c48bdcbef5b730d491d352))
* demo UX overhaul — fix bugs, add credit display and theme toggle ([bbc3824](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/bbc382491183d88b9566191a196f42d991c642ec))
* enrich RouteLeg type with manoeuvre details and road attributes ([ae09429](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/ae09429bb14a64c43e72e3ecf58507f4c4829e12))
* expand venue types to 17 with grouped chip picker ([ab68fd6](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/ab68fd6b02b29d376c3cc971d301587ed1c5eb81))
* export ManoeuvreType from barrel ([537a79a](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/537a79aef4f88d795e9f858d614c2de881b712be))
* expose map instance for demo recording ([48aa293](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/48aa2937b762d86a0055c5193f8a153b309a8a05))
* implement computeRoute in ValhallaEngine with polyline6 decoder and manoeuvre legs ([fe4102d](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/fe4102dc5d125ee57aebf49dab78bb30352d09ee))
* interactive mode — tab switching, markers, live pipeline ([8318b28](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8318b288323de392316e2cd87b918c07c328d209))
* interactive mode HTML structure and CSS styles ([f293b51](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/f293b510afbc883d0dcaad1673925cbca15b6b16))
* make Interactive the default tab in demo page ([83e898a](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/83e898a6aa2f167b8d5f212da4890c2de77d5c87))
* map enriched manoeuvre fields from Valhalla to RouteLeg ([1446e49](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/1446e49267b5542fa8621b8b30f39c6537e1e27c))
* mobile UX overhaul — bottom sheet, QR fix, touch targets ([5a07a8b](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/5a07a8bfa67ee51d4473010c6218e6aad626431b))
* progressive isochrone reveal with hull visualisation ([4f5d945](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/4f5d9459b5f60016fcc723f053d6937b3b5cdffb))
* prominent route popup with high z-index, shadow, and bigger text ([229afdd](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/229afdd042d26c93cda7be07c089dde79434d474))
* render turn-by-turn directions in expanded result cards ([eaa9f70](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/eaa9f7036e0f3cd6a75f5dec1f6c4f5698a4999d))
* sticky action bar on mobile for Find/Clear buttons ([6fc9343](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/6fc93431261374a2569eca7f3b174151a1b84c3c))
* store route data for turn-by-turn directions display ([b5ac065](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/b5ac06553586be8dfbebcfd082aa1d7af0d8b3b3))
* style enriched directions with timeline, icons, badges, and progress ([c9ade24](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/c9ade242f67e0386cbf49a73c2cb954753f36d6a))
* style turn-by-turn directions UI in result cards ([9ddd029](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/9ddd029dd8d9e34abddf85e3a00f94f68f8a98cb))
* use self-hosted Overpass API for venue search ([385aa0c](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/385aa0c0bcca4eda8b5308a5acc51c4ae2d8f51a))

# [1.10.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.9.0...v1.10.0) (2026-03-14)


### Bug Fixes

* add cache-busting query strings to CSS and JS references ([95a4567](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/95a4567ffc790222f5807abcfb5f1ad7566cc52a))
* add empty guard to envelopePolygon and consistent error messages ([1a82491](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/1a82491465bf77bec9e15c53b986c220d15ab9a1))
* add explicit language and units to Valhalla route request ([ac60fb5](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/ac60fb52829aec3f711c477c5d1e568c2a4444a5))
* address code review — JSDoc, stub params, fractional duration test ([69554c0](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/69554c0c71af4b57d2c262824f375468b87eab44))
* cancel in-flight animation on mode switch ([8bc327b](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8bc327b3097da84b656bef8f636b62700d0f9d57))
* cap maxTimeMinutes and venueTypes array length ([2752d27](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/2752d276b8384819aee104ab8d89d8c46cc8cab4))
* clean up route listeners, sync fairness pickers, add alert role ([4c1697d](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/4c1697d2503b1403f7172961c306e1548330f66d)), closes [#interactive-error](https://github.com/TheCryptoDonkey/rendezvous-kit/issues/interactive-error)
* deduplicate consecutive vertices in sutherlandHodgman output ([1746515](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/17465157e596d4c12520623f3d17365326a98e73))
* escape scenario name in error path for consistent XSS prevention ([12a6327](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/12a63270f21ac2fb25ef9949da54662e5d8a63ff))
* fade out markers when route popup is open so nothing obscures it ([7a0ddca](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/7a0ddca518c5b9f962191713aec5994756b5b32c))
* fetch version from npm registry instead of hardcoding ([fe3c003](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/fe3c0033aee50df545b51d17c7841ddf2b06af12))
* filter degenerate intersection polygons, limit venues to top 5, handle route 402 with payment panel ([5ae0998](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/5ae09989cb686f1b610bef95efec4e5f2964091b))
* force all map markers below popup with z-index override ([6655bf7](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/6655bf76ebb9fe1d0ecb8d341d6ed8ebc1f9e81a))
* guard route layer removal with getLayer/getSource checks ([d5dc784](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d5dc7843e4b820be20cabc63f73491784b84f7e6))
* harden input validation and add production readiness checks ([458ba6f](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/458ba6f2516a63eb68cfb807cdf21b6d7216046f))
* harden security and production readiness ([914e54b](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/914e54bae5fb0d31c9ea1e129d670b11981c89f7))
* marker positioning, intersection lines, and theme swap ([7e9f398](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/7e9f398dd4e5517901c33f9a2c1c68d1c7157ddd))
* parallelise isochrone calls and add fetch timeouts ([1590b3e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/1590b3e1bd5352ebbb838ddef60f5e4677c6131b))
* pass status token when polling invoice-status endpoint ([2348deb](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/2348debbf732c8a589461c9571fc0973e657fd83))
* pin esm.sh import to rendezvous-kit@1.14.0 for enriched directions ([36c1909](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/36c190912f11d41ef84c4da422a9ff70ea487e89))
* polish mobile UX — cache bust, wallet button visibility ([c74e754](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/c74e7542913b803b1ded0c007b30df700877667e))
* prevent initial flash on mobile, use matchMedia for resize ([d7b695f](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d7b695fc5bb552b8f985bcc207b554809eb9f16b))
* query way and relation elements in Overpass venue search ([bd69263](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/bd692634dc1ff956e2e05df5fece29d498387b6e))
* reduce hull buffer size and cap Overpass results ([df3fc47](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/df3fc47df6964fb5fd830744d05250bcb395d7d2))
* remove intersection sliver outlines from map display ([0a532ed](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/0a532edd5ece1ef01d988aa7f230dee71e9121a6))
* remove isochrone border lines entirely ([2bae0ba](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/2bae0bac334bcdd473619c7199e77225c8f988af))
* remove position: relative that overrides MapLibre marker positioning ([6f16739](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/6f167398d665335e3130a3f4cc805ad2f387bac1))
* replace flaky QR library with dynamic import and lightning: URI ([9d831a9](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/9d831a9c53b9e677491d913163c826e1574965dd))
* resolve mobile demo page scrolling, QR code, and ride distance issues ([20e2409](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/20e2409c67c677dccfb7df2fe7be07d15a66f43c))
* route popup z-index to 9999 so it sits above all markers and labels ([22616ca](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/22616ca1ac99fa9e2139ea0debc6d14fc79e67b4))
* soften isochrone borders, block stale participants, fix theme swap ([7e65487](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/7e6548718155ce12dfae0bad7ad24f379674b71e))
* unpin esm.sh import, fix theme swap and credit display ([5d836a8](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/5d836a800c1c718d0ed562de1733c38456c840dc))
* update demo imports to v1.18.0 and bump cache busters ([d7ef5f9](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d7ef5f9fd9eddd1ca66479e5a25aad9be12d7d5e))
* update geohash-kit to version with convexHull export ([1026573](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/10265732842025c78dd4bed9d8cd18aa82e75cd0))
* update version badge and cache-busting params ([12a0979](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/12a09798aa53b49ba33cf687cc2332c36cfec9a2))
* use string concatenation for Overpass query to avoid esm.sh minifier bug ([b543182](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/b543182c82d3ce406d0f45a0d844f8d84c2c1d02))
* use topVenues for markers, increase area threshold, filter zero travel times ([0ca3eee](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/0ca3eee20cd18f092cfef74fa8738248f5628a9c))
* venue positioning, marker stability, and matrix overflow ([24a5792](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/24a579294adbae83842c4bac1f39f45c224875e9))


### Features

* add bottom sheet drag handle to panel HTML ([5f7a25c](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/5f7a25cb7cef61f5e1ab7175de2e2a293f0987fe))
* add hull buffer, auto-decision logic, and speed constants ([24e8999](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/24e89991a0eb9a45b14088adfe18c2b94bbdf787))
* add hull fast-path pipeline to findRendezvous ([d87e394](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d87e394061a78c38639516871106b353b44f9778))
* add manoeuvre icons, badges, and timeline to directions UI ([d33d376](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d33d37618eac2625da8d95b93a0d43ea7f61d2b6))
* add Overpass API fallback endpoints and timeout ([318ae5e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/318ae5e3e995e4e27fef0fe2c89786604a65eba3))
* add route types (GeoJSONLineString, RouteLeg, RouteGeometry) and computeRoute to RoutingEngine ([81064e0](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/81064e0c6bfc7e634e70ad155887bc3105fdb3e8))
* add scenario regeneration script for real Valhalla data ([8e8371e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8e8371e271575a0062bbee1cfb28cb52e7673c49))
* add strategy option to RendezvousOptions ([933a4ee](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/933a4ee82e74a69ff78ca1f16263c5bbb98f27a6))
* add stub computeRoute to OpenRouteService, GraphHopper, and OSRM engines ([00ddd7e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/00ddd7e09a9c97f29261e39e56c5512bac7fe152))
* add ValhallaError class, custom headers support, and typed error handling ([9e8fa11](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/9e8fa116b13335b4baa8ad437a672b0efb29cb34))
* bigger panel and text, rich turn-by-turn in route popups ([3851638](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/3851638060b956bb27f279e1e0637fd16aa1c923))
* bottom sheet CSS with touch targets and mobile header ([fc38d88](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/fc38d88aa421d9d6e548147bd2b4d0586da68557))
* bottom sheet touch handling with auto-transitions ([066f405](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/066f4051984b2fe587cba18153214d665dbba8f6))
* centre map on user's GPS location when available ([8ffe0d1](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8ffe0d102cdb6acd77c48bdcbef5b730d491d352))
* demo UX overhaul — fix bugs, add credit display and theme toggle ([bbc3824](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/bbc382491183d88b9566191a196f42d991c642ec))
* enrich RouteLeg type with manoeuvre details and road attributes ([ae09429](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/ae09429bb14a64c43e72e3ecf58507f4c4829e12))
* expand venue types to 17 with grouped chip picker ([ab68fd6](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/ab68fd6b02b29d376c3cc971d301587ed1c5eb81))
* export ManoeuvreType from barrel ([537a79a](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/537a79aef4f88d795e9f858d614c2de881b712be))
* expose map instance for demo recording ([48aa293](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/48aa2937b762d86a0055c5193f8a153b309a8a05))
* implement computeRoute in ValhallaEngine with polyline6 decoder and manoeuvre legs ([fe4102d](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/fe4102dc5d125ee57aebf49dab78bb30352d09ee))
* interactive mode — tab switching, markers, live pipeline ([8318b28](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8318b288323de392316e2cd87b918c07c328d209))
* interactive mode HTML structure and CSS styles ([f293b51](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/f293b510afbc883d0dcaad1673925cbca15b6b16))
* make Interactive the default tab in demo page ([83e898a](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/83e898a6aa2f167b8d5f212da4890c2de77d5c87))
* map enriched manoeuvre fields from Valhalla to RouteLeg ([1446e49](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/1446e49267b5542fa8621b8b30f39c6537e1e27c))
* mobile UX overhaul — bottom sheet, QR fix, touch targets ([5a07a8b](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/5a07a8bfa67ee51d4473010c6218e6aad626431b))
* progressive isochrone reveal with hull visualisation ([4f5d945](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/4f5d9459b5f60016fcc723f053d6937b3b5cdffb))
* prominent route popup with high z-index, shadow, and bigger text ([229afdd](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/229afdd042d26c93cda7be07c089dde79434d474))
* render turn-by-turn directions in expanded result cards ([eaa9f70](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/eaa9f7036e0f3cd6a75f5dec1f6c4f5698a4999d))
* sticky action bar on mobile for Find/Clear buttons ([6fc9343](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/6fc93431261374a2569eca7f3b174151a1b84c3c))
* store route data for turn-by-turn directions display ([b5ac065](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/b5ac06553586be8dfbebcfd082aa1d7af0d8b3b3))
* style enriched directions with timeline, icons, badges, and progress ([c9ade24](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/c9ade242f67e0386cbf49a73c2cb954753f36d6a))
* style turn-by-turn directions UI in result cards ([9ddd029](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/9ddd029dd8d9e34abddf85e3a00f94f68f8a98cb))
* use self-hosted Overpass API for venue search ([385aa0c](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/385aa0c0bcca4eda8b5308a5acc51c4ae2d8f51a))

# [1.10.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.9.0...v1.10.0) (2026-03-13)


### Bug Fixes

* add cache-busting query strings to CSS and JS references ([95a4567](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/95a4567ffc790222f5807abcfb5f1ad7566cc52a))
* add empty guard to envelopePolygon and consistent error messages ([1a82491](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/1a82491465bf77bec9e15c53b986c220d15ab9a1))
* add explicit language and units to Valhalla route request ([ac60fb5](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/ac60fb52829aec3f711c477c5d1e568c2a4444a5))
* address code review — JSDoc, stub params, fractional duration test ([69554c0](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/69554c0c71af4b57d2c262824f375468b87eab44))
* cancel in-flight animation on mode switch ([8bc327b](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8bc327b3097da84b656bef8f636b62700d0f9d57))
* cap maxTimeMinutes and venueTypes array length ([2752d27](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/2752d276b8384819aee104ab8d89d8c46cc8cab4))
* clean up route listeners, sync fairness pickers, add alert role ([4c1697d](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/4c1697d2503b1403f7172961c306e1548330f66d)), closes [#interactive-error](https://github.com/TheCryptoDonkey/rendezvous-kit/issues/interactive-error)
* deduplicate consecutive vertices in sutherlandHodgman output ([1746515](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/17465157e596d4c12520623f3d17365326a98e73))
* escape scenario name in error path for consistent XSS prevention ([12a6327](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/12a63270f21ac2fb25ef9949da54662e5d8a63ff))
* fade out markers when route popup is open so nothing obscures it ([7a0ddca](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/7a0ddca518c5b9f962191713aec5994756b5b32c))
* fetch version from npm registry instead of hardcoding ([fe3c003](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/fe3c0033aee50df545b51d17c7841ddf2b06af12))
* filter degenerate intersection polygons, limit venues to top 5, handle route 402 with payment panel ([5ae0998](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/5ae09989cb686f1b610bef95efec4e5f2964091b))
* force all map markers below popup with z-index override ([6655bf7](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/6655bf76ebb9fe1d0ecb8d341d6ed8ebc1f9e81a))
* guard route layer removal with getLayer/getSource checks ([d5dc784](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d5dc7843e4b820be20cabc63f73491784b84f7e6))
* harden input validation and add production readiness checks ([458ba6f](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/458ba6f2516a63eb68cfb807cdf21b6d7216046f))
* harden security and production readiness ([914e54b](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/914e54bae5fb0d31c9ea1e129d670b11981c89f7))
* marker positioning, intersection lines, and theme swap ([7e9f398](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/7e9f398dd4e5517901c33f9a2c1c68d1c7157ddd))
* parallelise isochrone calls and add fetch timeouts ([1590b3e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/1590b3e1bd5352ebbb838ddef60f5e4677c6131b))
* pass status token when polling invoice-status endpoint ([2348deb](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/2348debbf732c8a589461c9571fc0973e657fd83))
* pin esm.sh import to rendezvous-kit@1.14.0 for enriched directions ([36c1909](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/36c190912f11d41ef84c4da422a9ff70ea487e89))
* polish mobile UX — cache bust, wallet button visibility ([c74e754](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/c74e7542913b803b1ded0c007b30df700877667e))
* prevent initial flash on mobile, use matchMedia for resize ([d7b695f](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d7b695fc5bb552b8f985bcc207b554809eb9f16b))
* query way and relation elements in Overpass venue search ([bd69263](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/bd692634dc1ff956e2e05df5fece29d498387b6e))
* reduce hull buffer size and cap Overpass results ([df3fc47](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/df3fc47df6964fb5fd830744d05250bcb395d7d2))
* remove intersection sliver outlines from map display ([0a532ed](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/0a532edd5ece1ef01d988aa7f230dee71e9121a6))
* remove isochrone border lines entirely ([2bae0ba](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/2bae0bac334bcdd473619c7199e77225c8f988af))
* remove position: relative that overrides MapLibre marker positioning ([6f16739](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/6f167398d665335e3130a3f4cc805ad2f387bac1))
* replace flaky QR library with dynamic import and lightning: URI ([9d831a9](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/9d831a9c53b9e677491d913163c826e1574965dd))
* resolve mobile demo page scrolling, QR code, and ride distance issues ([20e2409](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/20e2409c67c677dccfb7df2fe7be07d15a66f43c))
* route popup z-index to 9999 so it sits above all markers and labels ([22616ca](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/22616ca1ac99fa9e2139ea0debc6d14fc79e67b4))
* soften isochrone borders, block stale participants, fix theme swap ([7e65487](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/7e6548718155ce12dfae0bad7ad24f379674b71e))
* unpin esm.sh import, fix theme swap and credit display ([5d836a8](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/5d836a800c1c718d0ed562de1733c38456c840dc))
* update demo imports to v1.18.0 and bump cache busters ([d7ef5f9](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d7ef5f9fd9eddd1ca66479e5a25aad9be12d7d5e))
* update geohash-kit to version with convexHull export ([1026573](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/10265732842025c78dd4bed9d8cd18aa82e75cd0))
* update version badge and cache-busting params ([12a0979](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/12a09798aa53b49ba33cf687cc2332c36cfec9a2))
* use string concatenation for Overpass query to avoid esm.sh minifier bug ([b543182](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/b543182c82d3ce406d0f45a0d844f8d84c2c1d02))
* use topVenues for markers, increase area threshold, filter zero travel times ([0ca3eee](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/0ca3eee20cd18f092cfef74fa8738248f5628a9c))
* venue positioning, marker stability, and matrix overflow ([24a5792](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/24a579294adbae83842c4bac1f39f45c224875e9))


### Features

* add bottom sheet drag handle to panel HTML ([5f7a25c](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/5f7a25cb7cef61f5e1ab7175de2e2a293f0987fe))
* add hull buffer, auto-decision logic, and speed constants ([24e8999](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/24e89991a0eb9a45b14088adfe18c2b94bbdf787))
* add hull fast-path pipeline to findRendezvous ([d87e394](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d87e394061a78c38639516871106b353b44f9778))
* add manoeuvre icons, badges, and timeline to directions UI ([d33d376](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d33d37618eac2625da8d95b93a0d43ea7f61d2b6))
* add Overpass API fallback endpoints and timeout ([318ae5e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/318ae5e3e995e4e27fef0fe2c89786604a65eba3))
* add route types (GeoJSONLineString, RouteLeg, RouteGeometry) and computeRoute to RoutingEngine ([81064e0](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/81064e0c6bfc7e634e70ad155887bc3105fdb3e8))
* add scenario regeneration script for real Valhalla data ([8e8371e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8e8371e271575a0062bbee1cfb28cb52e7673c49))
* add strategy option to RendezvousOptions ([933a4ee](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/933a4ee82e74a69ff78ca1f16263c5bbb98f27a6))
* add stub computeRoute to OpenRouteService, GraphHopper, and OSRM engines ([00ddd7e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/00ddd7e09a9c97f29261e39e56c5512bac7fe152))
* add ValhallaError class, custom headers support, and typed error handling ([9e8fa11](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/9e8fa116b13335b4baa8ad437a672b0efb29cb34))
* bigger panel and text, rich turn-by-turn in route popups ([3851638](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/3851638060b956bb27f279e1e0637fd16aa1c923))
* bottom sheet CSS with touch targets and mobile header ([fc38d88](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/fc38d88aa421d9d6e548147bd2b4d0586da68557))
* bottom sheet touch handling with auto-transitions ([066f405](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/066f4051984b2fe587cba18153214d665dbba8f6))
* centre map on user's GPS location when available ([8ffe0d1](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8ffe0d102cdb6acd77c48bdcbef5b730d491d352))
* demo UX overhaul — fix bugs, add credit display and theme toggle ([bbc3824](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/bbc382491183d88b9566191a196f42d991c642ec))
* enrich RouteLeg type with manoeuvre details and road attributes ([ae09429](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/ae09429bb14a64c43e72e3ecf58507f4c4829e12))
* expand venue types to 17 with grouped chip picker ([ab68fd6](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/ab68fd6b02b29d376c3cc971d301587ed1c5eb81))
* export ManoeuvreType from barrel ([537a79a](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/537a79aef4f88d795e9f858d614c2de881b712be))
* expose map instance for demo recording ([48aa293](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/48aa2937b762d86a0055c5193f8a153b309a8a05))
* implement computeRoute in ValhallaEngine with polyline6 decoder and manoeuvre legs ([fe4102d](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/fe4102dc5d125ee57aebf49dab78bb30352d09ee))
* interactive mode — tab switching, markers, live pipeline ([8318b28](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8318b288323de392316e2cd87b918c07c328d209))
* interactive mode HTML structure and CSS styles ([f293b51](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/f293b510afbc883d0dcaad1673925cbca15b6b16))
* make Interactive the default tab in demo page ([83e898a](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/83e898a6aa2f167b8d5f212da4890c2de77d5c87))
* map enriched manoeuvre fields from Valhalla to RouteLeg ([1446e49](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/1446e49267b5542fa8621b8b30f39c6537e1e27c))
* mobile UX overhaul — bottom sheet, QR fix, touch targets ([5a07a8b](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/5a07a8bfa67ee51d4473010c6218e6aad626431b))
* progressive isochrone reveal with hull visualisation ([4f5d945](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/4f5d9459b5f60016fcc723f053d6937b3b5cdffb))
* prominent route popup with high z-index, shadow, and bigger text ([229afdd](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/229afdd042d26c93cda7be07c089dde79434d474))
* render turn-by-turn directions in expanded result cards ([eaa9f70](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/eaa9f7036e0f3cd6a75f5dec1f6c4f5698a4999d))
* sticky action bar on mobile for Find/Clear buttons ([6fc9343](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/6fc93431261374a2569eca7f3b174151a1b84c3c))
* store route data for turn-by-turn directions display ([b5ac065](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/b5ac06553586be8dfbebcfd082aa1d7af0d8b3b3))
* style enriched directions with timeline, icons, badges, and progress ([c9ade24](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/c9ade242f67e0386cbf49a73c2cb954753f36d6a))
* style turn-by-turn directions UI in result cards ([9ddd029](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/9ddd029dd8d9e34abddf85e3a00f94f68f8a98cb))
* use self-hosted Overpass API for venue search ([385aa0c](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/385aa0c0bcca4eda8b5308a5acc51c4ae2d8f51a))

## [1.21.3](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.21.2...v1.21.3) (2026-03-12)


### Bug Fixes

* cap maxTimeMinutes and venueTypes array length ([73d9fcd](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/73d9fcd5ebdfee32fe22af6b3bea504c7ec19d51))
* harden input validation and add production readiness checks ([5eac7ae](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/5eac7aea8141b9008aa423c9dccc6dd6c6c0f157))

## [1.21.2](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.21.1...v1.21.2) (2026-03-11)


### Bug Fixes

* pass status token when polling invoice-status endpoint ([3d8fcc4](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/3d8fcc426b92cc90140681a1e009c88b39fa6bca))

## [1.21.1](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.21.0...v1.21.1) (2026-03-10)


### Bug Fixes

* update geohash-kit to version with convexHull export ([b26858f](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/b26858f6c52e3e7cf73db66c274ac82c92f7ec7d))

# [1.21.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.20.3...v1.21.0) (2026-03-08)


### Bug Fixes

* polish mobile UX — cache bust, wallet button visibility ([6a44688](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/6a44688d956a2682f1c6119ed1ed3ff636244a11))
* prevent initial flash on mobile, use matchMedia for resize ([01eb176](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/01eb17695dd80fc6aa440a9c848c51196ff5eefd))
* replace flaky QR library with dynamic import and lightning: URI ([2d7e47e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/2d7e47e905f49e3577f61b15190dcffc526e3a98))


### Features

* add bottom sheet drag handle to panel HTML ([6047d1a](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/6047d1a2a88e8904c63e7272ee4dc7fe5d7393cb))
* bottom sheet CSS with touch targets and mobile header ([d7ae484](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/d7ae4841e85819981248da557a31a99d8736a663))
* bottom sheet touch handling with auto-transitions ([ab21523](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/ab2152382abb73c5d3bb4a75f4343a5c32b0fba9))
* mobile UX overhaul — bottom sheet, QR fix, touch targets ([8499f00](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/8499f009b1fa6f9b20e82365a47f5769b27ba76b))

## [1.20.3](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.20.2...v1.20.3) (2026-03-07)


### Bug Fixes

* resolve mobile demo page scrolling, QR code, and ride distance issues ([1885a00](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/1885a00e3bb12f60c3228ea51017fe121e81f88d))

## [1.20.2](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.20.1...v1.20.2) (2026-03-06)


### Bug Fixes

* harden security and production readiness ([c4af3f2](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/c4af3f2a4c2087e45a2605741d9a52267c690731))

## [1.20.1](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.20.0...v1.20.1) (2026-03-05)


### Bug Fixes

* guard route layer removal with getLayer/getSource checks ([2e6f9d5](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/2e6f9d52398af4384b2c3fbe33dd1539f1dec4fd))

# [1.20.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.19.1...v1.20.0) (2026-03-05)


### Features

* centre map on user's GPS location when available ([3771a04](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/3771a04aa3bd3969f021bf229e68e27c17e3d8f7))

## [1.19.1](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.19.0...v1.19.1) (2026-03-05)


### Bug Fixes

* use string concatenation for Overpass query to avoid esm.sh minifier bug ([08f8d47](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/08f8d47e8043455b7156a6e3489d9134fc2b63d1))

# [1.19.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.18.0...v1.19.0) (2026-03-05)


### Bug Fixes

* reduce hull buffer size and cap Overpass results ([fcab096](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/fcab0963a6178f332ec67ea6e3804188ef38b6eb))
* update demo imports to v1.18.0 and bump cache busters ([c64d2ff](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/c64d2ffb145d54ee879f8cd0ca3b9453fa2aab6b))


### Features

* add hull buffer, auto-decision logic, and speed constants ([f124dcf](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/f124dcf9d92e6cd1eb394606f6244a2f316f8802))
* add hull fast-path pipeline to findRendezvous ([ea3f94b](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/ea3f94b9f32bfec6a48b39cc32804e4ce6e798c9))
* add strategy option to RendezvousOptions ([e211c0b](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/e211c0b8d7b1e7a03e000eff83e992f981602df8))
* make Interactive the default tab in demo page ([b126c9e](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/b126c9e0f4ddd8866a586cd821903f3b80fec7e0))
* progressive isochrone reveal with hull visualisation ([3a0cf3c](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/3a0cf3c404be4799efd2431ae7c71e815a367412))

# [1.18.0](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.17.2...v1.18.0) (2026-03-02)


### Features

* expose map instance for demo recording ([77ecd15](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/77ecd155451ec321e9f4f24f142c646acf2d426f))

## [1.17.2](https://github.com/TheCryptoDonkey/rendezvous-kit/compare/v1.17.1...v1.17.2) (2026-03-01)


### Bug Fixes

* add explicit language and units to Valhalla route request ([e676cf4](https://github.com/TheCryptoDonkey/rendezvous-kit/commit/e676cf44125404902599f402b80c3818f3480e49))

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
