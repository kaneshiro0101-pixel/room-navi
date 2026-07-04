# 楽天ROOMアフィリ支援「ROOMナビ」設計・実装計画

作成: 2026-07-04

## 目的

楽天ROOMのアフィリエイト収益化を、AIとAPIで可能な限り自動化する。
楽天ROOMには公開投稿APIが無く、自動投稿ボットは利用規約違反のため、
「投稿ボタンを押す直前まで」を全部自動化する半自動システムとする。

## 稼ぐまでの流れ（このアプリが自動化する範囲）

1. **リサーチ（自動）**: 楽天市場API（Item Search / Ranking）で商品を取得し、
   「報酬期待値 × 売れ筋度」の独自スコアで並べ替え → 何を載せるか迷わない
2. **投稿文生成（自動）**: テンプレート4種（悩み解決/愛用レビュー風/比較/季節）＋
   ハッシュタグを自動組み立て。より自然な文が欲しい時はAI用プロンプトをワンタップコピー
3. **ストック管理（半自動）**: 下書き→投稿済みのステータス管理。JSON冪等エクスポート/インポート
4. **投稿（手動・コピペ）**: ROOMアプリで商品を「コレ!」→コメント欄に生成文をペースト
5. **実績記録（手動入力→自動集計）**: クリック/成果/報酬を日次入力→月次集計とグラフ

## アーキテクチャ

- 単一HTML: `C:\Users\user\rakuten-room-navi\index.html`（1ファイル・ビルド無し・オフライン動作※）
  ※楽天API検索のみネット必要。生成/ストック/実績はオフラインで動く
- 保存: localStorage キー `roomNavi_v1`（テキストのみ・少量のため）
- 純ロジックは `/*CORE_START*/ ... /*CORE_END*/` マーカー内の `RoomCore` に隔離
  - Nodeテスト（node:test）が index.html からコードを抽出して vm 実行 → ビルド無しでテスト可能
- 楽天APIはブラウザから直接 fetch（CORS対応）。file:// で失敗した場合は JSONP フォールバック

## RoomCore 公開関数（テスト対象）

| 関数 | 役割 |
|---|---|
| buildSearchUrl / buildRankingUrl | 楽天API URLの構築（キー未設定は throw） |
| parseItems | formatVersion 1/2・ランキング両対応の正規化 |
| expectedCommission | 価格×料率から1件あたり報酬(円) |
| calcScore | 報酬×log10(レビュー数+1)×評価×価格帯ボーナスのスコア |
| generateCaption | テンプレ差し込み＋1000字判定 |
| buildHashtags / shortenName / formatPrice | 整形部品 |
| buildAiPrompt | Claude貼り付け用の投稿文生成プロンプト |
| mergeStock | id基準の冪等マージ（updatedAt新しい方優先） |
| validateSettings | applicationId必須・affiliateId形式警告 |
| summarizePerformance | 実績の合計＋月別集計 |
| makeStockEntry | 商品＋投稿文→ストック項目 |

## タブ構成

①リサーチ ②投稿文 ③ストック ④実績 ⑤設定（APIキー/テンプレ/ハッシュタグ/バックアップ）

## 完成の定義

- `npm test`（node --test）全パス
- プレビューで: 起動エラー無し / 設定保存→リロードで残る / モバイル幅で崩れない
- README に使い方（APIキー取得手順含む）
