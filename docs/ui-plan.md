# React UI Plan

## UI Requirements
- ベース色を選べるカラーピッカー（初期値は `#ff0000`）。
- `fill` と別に任意の `stroke` 色入力（テキストフィールド + `none` サポート）。
- 非活性強度 (`inactiveMix`) を 0–1 で調整できるスライダー。
- プリセット選択 (`black` / `line`) と任意 SVG ファイルアップロードの両対応。
- 生成されたアクティブ／非活性 SVG を即座にプレビュー表示。
- 各 SVG をダウンロード保存できるボタンを提供。
- 入力検証とエラー表示（不正な色コード、SVG 読み込み失敗など）。
- アクセシビリティ配慮（ラベル、キーボード操作、コントラスト）。
- 状態管理はクライアント内のみで完結（永続化なし）。

## UI 設計方針
- TypeScript ファイルは最小構成（`src/ui/main.tsx` と `src/ui/App.tsx` の 2 ファイル）。
- Vite を利用して React + TypeScript のビルド環境をセットアップし、既存 `src/lib` から直接インポート。
- `App.tsx` でフォーム状態を管理し、`generateIconVariants` を呼び出して結果を state に保持。
- プレビューは `<div>` 内に `dangerouslySetInnerHTML` で描画し、背景などは SVG 側に任せる。
- ダウンロードは `Blob` + `URL.createObjectURL` を用いて都度生成し、クリーンアップする。
- スタイルは簡潔な CSS（`src/ui/App.module.css` など 1 ファイル）かインラインスタイルで対応。
- 既存 CLI とのコード重複を避けるため、ライブラリ API 以外のロジックは UI 側に書かない。

## 実装タスクリスト
1. Vite + React + TypeScript 依存関係導入、`src/ui/main.tsx` / `src/ui/App.tsx` の雛形生成。
2. プリセット選択・ファイルアップロード・カラーピッカー・ストローク入力・スライダー UI を実装。
3. フォーム入力を `generateIconVariants` に渡し、結果 SVG をプレビュー表示。
4. SVG ダウンロード機能とエラー表示ハンドリングを追加。
5. 簡易スタイリングとアクセシビリティ微調整、最終動作確認。
