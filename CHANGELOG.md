# Changelog

All notable changes to 譚仔揼波拿 are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- This changelog.

## [1.0.0] - 2026-10-21

The first release: a host's console for a Cantonese party bingo night.

### Added
- **Callers.** Six Cantonese voices (龍哥, 曉佳, 曉曼, 豪仔, 婆婆, 細妹) on
  Microsoft's zh-HK voices through edge-tts, with a host and a helper calling in
  turn or at random. Clips are cached in `data/tts/`. With no network, the
  browser's own Cantonese voice takes over.
- **Stage.** A pixel dragon, rabbit, duck, frog, granny and pig walk round the
  ball and react to each draw. The rabbit works a bingo cage. On a real Bingo
  each caller does their own dance, all on one beat.
- **Jokes.** Number homophones, helper lines and between-call banter. 搞笑程度
  controls how often they're used.
- **Players.** Names with pixel icons run along the bottom of the stage and
  scroll like a ticker when they don't fit.
- **Money.** A stake per game (每人每局注金) goes into a pot that floats on
  stage. A pot can be split evenly between several winners and carries over
  when nobody wins.
- **Profit.** Each player's profit after stakes shows on their chip, and the
  leader wears a crown. 輸贏清零 starts the books again.
- **完場排行榜.** The night's leaderboard, revealed from the bottom up, with a
  drumroll, a fanfare and confetti for the top spot.
- **Checking a claim.** Type a card number and the card is rebuilt, marked and
  judged under the chosen 贏法 (一條線 / 兩條線 / 四角 / 全卡). Cards without a
  number can be checked by typing their numbers in.
- **印卡.** Printable numbered 1–75 cards, 1, 2 or 4 to an A4 page.
- **Sound,** all made in the browser:
  - drumrolls and risers that build as the game goes on;
  - a heartbeat between draws;
  - an alarm and air horn when someone claims Bingo;
  - a fanfare, applause and fireworks for a real one, and a sad trombone for a
    false one.
- **Auto-draw (自動抽)** with a countdown ring for the next ball.
- **Desk buttons.** 撤回上一個 (undo), 新一局 (new game) and 全部重設 (start the
  night over).
- **Keys.** Space/Enter (draw), A (auto-draw), R (repeat the number), B (Bingo
  claim), L (leaderboard).
- **Saved progress.** The game is kept in the browser, so a reload carries on
  where it left off.
- **README extras.** Screenshots, a GIF of the win dance, an MIT licence and a
  social preview image.

### Fixed
- The game number on stage (第 7 局) was in the pixel font, whose 7 read as a 1.
  It's now in the plain UI font.

[Unreleased]: https://github.com/kinz-dev/tc_bingo/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/kinz-dev/tc_bingo/releases/tag/v1.0.0
