# Vivaldi Icon Maker

Vivaldi の SVG アイコンを着色・非活性化するためのツールキットです。TypeScript 製のコアライブラリを中心に、CLI と（今後追加予定の）React UI から同じ処理を呼び出せる構成になっています。

## プロジェクト構成

- `src/lib/` – 再利用可能なコアライブラリ（API ドキュメントは [`src/lib/README.md`](src/lib/README.md)）
- `src/index.ts` – CLI エントリーポイント
- `vivaldi-*.svg` – 同梱プリセットアイコン
- `dist/` – `npm run build` 後に生成される JavaScript バンドル
- `output/` – CLI 実行時の出力先（生成物は Git 管理対象外）

## UI プレビュー

GitHub Pages 上で React UI を利用できます:

- https://tkhashi.github.io/vivaldi-icon-maker/

## セットアップ

```bash
npm install
npm run build
```

ビルド後、`dist/index.js` と `dist/lib/*` が生成されます。CLI は `node dist/index.js` または `npx vivaldi-icon-maker`（グローバルインストール時）で利用できます。

## CLI の使い方

プリセットアイコンを赤で再着色し、アクティブ／非活性アイコンを生成する例:

```bash
node dist/index.js --icon black --fill '#ff0000'
```

`output/` に以下のファイルが出力されます。

- `*-active.svg` – 指定色で再着色されたアクティブ版
- `*-inactive.svg` – パステル調に調整し角丸グレー背景を付与した非活性版

### 主なオプション

| オプション | 説明 |
| --- | --- |
| `--icon <black|line>` | 同梱プリセットを入力に使用 |
| `--input <path>` | 任意の SVG ファイルを入力に使用 |
| `--fill <color>` | 塗りつぶしの色（CSS 16 進 or `none`） |
| `--stroke <color>` | 線の色（CSS 16 進 or `none`） |
| `--inactive-mix <0-1>` | 非活性時の彩度ダウン／明度アップ強度（既定値 `0.5`） |
| `--no-inactive` | 非活性版の生成をスキップ |
| `--overwrite` | 既存ファイルを上書き |
| `--output <path>` | 出力ファイル名（アクティブ／非活性のサフィックスが自動付与） |

```
node dist/index.js \
  --input ./icons/vivaldi-outline.svg \
  --stroke '#00aaff' \
  --inactive-mix 0.3 \
  --output ./output/custom.svg
```

## コアライブラリ

ライブラリ API と詳細なオプションは [`src/lib/README.md`](src/lib/README.md) を参照してください。UI 実装や他ツールへ組み込みたい場合は同ライブラリを直接利用できます。

## 開発コマンド

```bash
npm run lint   # TypeScript 型チェック
npm run build  # dist/ を生成
npm run clean  # dist/ を削除
```

## ライセンス

MIT
