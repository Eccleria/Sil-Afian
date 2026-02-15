# 1.3.0
- Feat: add a new `spam` channel where to report bot status (online and process errors) ([#41](https://github.com/Eccleria/Sil-Afian/pull/41))
- Feat: add a `copypasta` mod command to send pre written messages ([#59](https://github.com/Eccleria/Sil-Afian/issues/59)) ([#61](https://github.com/Eccleria/Sil-Afian/pull/61))

# 1.2.0
- CI: bump `node` requirement to 20.19.0 ([#54](https://github.com/Eccleria/Sil-Afian/pull/54))
- Feat: add `ghostReport` `context` and `slash` commands, for silent reports to mods. Note that `octagonal` logs are still enforced ([#24](https://github.com/Eccleria/Sil-Afian/pull/24))
- Package: Bump to latest, fixing some dependancies warnings (jest) ([#53](https://github.com/Eccleria/Sil-Afian/pull/53))
- Refacto: move `classes` files into separate folder ([#50](https://github.com/Eccleria/Sil-Afian/issues/50)) ([#51](https://github.com/Eccleria/Sil-Afian/pull/51))
- Update: listeners now use djs `Events` enum ([#49](https://github.com/Eccleria/Sil-Afian/issues/49)) ([#52](https://github.com/Eccleria/Sil-Afian/pull/52))

# 1.1.0
- Feat: add multiple utils used as common API wrappers ([#42](https://github.com/Eccleria/Sil-Afian/pull/42)) ([#46](https://github.com/Eccleria/Sil-Afian/pull/46))
- Fix: missing an `await` when fetching the post from gif logs ([#35](https://github.com/Eccleria/Sil-Afian/issues/35)) ([#37](https://github.com/Eccleria/Sil-Afian/pull/37))
- Remove: unused packages (canvas, gif-encoder-2) ([#48](https://github.com/Eccleria/Sil-Afian/pull/48))
- Upgrade: use `ewilib` for djs wrappers ([#45](https://github.com/Eccleria/Sil-Afian/issues/45)) ([#47](https://github.com/Eccleria/Sil-Afian/pull/47))

# 1.0.0
- Core: copy all basics from ([Ewibot](https://github.com/Eccleria/ewibot)) project
- Feat: add `stickers` handling for `MessageDelete` logs ([#15](https://github.com/Eccleria/Sil-Afian/issues/15)) ([#18](https://github.com/Eccleria/Sil-Afian/pull/18))
- Feat: add `snapshots` handling for `messageDelete` logs ([#15](https://github.com/Eccleria/Sil-Afian/issues/15)) ([#16](https://github.com/Eccleria/Sil-Afian/pull/16))
- Feat: add `MessageReference` handling for `messageDelete` logs ([#20](https://github.com/Eccleria/Sil-Afian/issues/20)) ([#27](https://github.com/Eccleria/Sil-Afian/pull/27))
- Update: change `activities` text so they are bot specific ([#23](https://github.com/Eccleria/Sil-Afian/pull/23))
- Update: add more IDs on adminLogs ([#2](https://github.com/Eccleria/Sil-Afian/issues/2)) ([#17](https://github.com/Eccleria/Sil-Afian/pull/17))
- Update: logs deleted aren't ignored anymore ([#31](https://github.com/Eccleria/Sil-Afian/issues/31)) ([#34](https://github.com/Eccleria/Sil-Afian/pull/34))
- Fix: add a loop to handle logs count > 100 because of `bulkDelete` limitations ([#7](https://github.com/Eccleria/Sil-Afian/issues/7)) ([#25](https://github.com/Eccleria/Sil-Afian/pull/25))
- Fix: `octagonalLog` now fire only once when users react to the same message ([#28](https://github.com/Eccleria/Sil-Afian/issues/28)) ([#30](https://github.com/Eccleria/Sil-Afian/pull/30))
