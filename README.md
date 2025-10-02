# Vivaldi Icon Maker

TypeScript 製の CLI ツール。vivaldi の SVG アイコンに対して、指定した色のアクティブ版と、色味を残しつつ視覚的に無効化された非活性版を自動生成します。

## 特徴

- 同梱プリセット（`vivaldi-black.svg` / `vivaldi-line.svg`）または任意の SVG を入力に利用
- `--fill` / `--stroke` で 1 色指定するだけで、アクティブと非活性の 2 パターンを一括生成
- 非活性版はベース色の彩度・明度を調整してパステル調にし、角丸グレー背景を自動で追加
- `--inactive-mix` で非活性化の強度をコントロール（0 = 色味をほぼ残す、1 = 淡い色調）
- `--overwrite`、`--no-inactive` など柔軟なオプションをサポート

## 必要環境

- Node.js 18 以上（開発時 Node.js 20.19.0 で検証）
- npm もしくは互換パッケージマネージャ

## セットアップ

```bash
npm install
```

TypeScript のビルド:

```bash
npm run build
```

`dist/index.js` が生成され、npm script や `npx` から実行できます。

## 使い方

プリセットを使い、塗りつぶし色を赤にした例:

```bash
node dist/index.js --icon black --fill '#ff0000'
```

`output/` 以下に以下 2 ファイルが生成されます。

- `*-active.svg`: 指定色を反映したアクティブ状態
- `*-inactive.svg`: ベース色を淡いパステル調に変換し、角丸グレー背景を追加した非活性状態

### 主なオプション

| オプション | 説明 |
| --- | --- |
| `--icon <black|line>` | 同梱プリセットを入力に使用 |
| `--input <path>` | 任意の SVG ファイルを入力に使用 |
| `--fill <color>` | 塗りつぶしの色（CSS16進 or `none`） |
| `--stroke <color>` | 線の色（CSS16進 or `none`） |
| `--inactive-mix <0-1>` | 非活性時の彩度ダウン/明度アップ強度。デフォルト `0.5` |
| `--no-inactive` | 非活性版の生成をスキップ |
| `--overwrite` | 既存ファイルを上書き |
| `--output <path>` | 出力先ファイルパス（拡張子付き）。アクティブ/非活性用のサフィックスが付与されます |

### 例: ストロークのみを変更し、独自 SVG を変換

```bash
node dist/index.js \
  --input ./icons/vivaldi-outline.svg \
  --stroke '#00aaff' \
  --inactive-mix 0.3 \
  --output ./output/custom.svg
```

## 開発

型チェック:

```bash
npm run lint
```

ビルド成果物を削除:

```bash
npm run clean
```

## ライセンス

MIT
