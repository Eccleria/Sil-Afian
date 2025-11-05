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
