# ROOMナビ SNS自動展開 設計書

作成: 2026-07-06 / 承認済み

## 目的
楽天ROOMアフィリの商品を X / Pinterest / Threads にも展開し集客する。
ROOM単体では売上が伸びないため、クリック可能な商品リンクを置ける外部SNSへ広げる。

## 対象SNSと選定理由（軸＝クリック可能な商品リンクを置けるか）
- **X**: リンク可・既存sns-auto-poster流用可。即開始。
- **Pinterest**: 全ピンにリンク可・検索流入で長く効く・買い物層。視覚×リンク最強。
- **Threads**: リンク可・500字・X文を流用可。IGアカとセットで作る。
- 不採用: Instagram(本文リンク不可=集客どまり)、TikTok Shop(楽天リンク不可の別マーケット+動画必須)。

## アーキテクチャ（既存資産の再利用）
```
ROOMナビ(単一HTML)                    sns-auto-poster(Node+Playwright)
 リサーチ→投稿文                        保存セッションで自動投稿・冪等書き戻し
   │ ①SNS展開: 商品→X/Threads/Pinterest文を自動生成       ▲
   │   (#PR必須・文字数最適化・楽天アフィリリンク・画像URL)  │
   └── ② sns-room.json 書き出し ──────────────────┘
```

## フェーズ1（ROOMナビ側・純ロジック・100%テスト可能・今すぐ完成）
`index.html` の `RoomCore` に追加する純関数（全てTDD）:

| 関数 | 役割 |
|---|---|
| xLength(text) | X重み字数（CJK=2/URL=23、既存poster format.jsと同アルゴリズム） |
| buildXPost(item, opts) | X用: フック+商品名+価格+アフィリリンク+#PR+タグ。{text,length,ok(≤280)} |
| buildThreadsPost(item, opts) | Threads用: 500字・#PR・リンク・タグ。{text,length,ok(≤500)} |
| buildPinterestPin(item, opts) | Pinterest用: {title(≤100),description(検索語入り≤500),link,image,ok} |
| hasDisclosure(text) | #PR/#ad/広告 のいずれかを含むか（ステマ規制ガード） |
| makeSnsEntry(item, platform, opts, now) | poster取込用の1件を生成（下記スキーマ） |
| buildSnsExport(entries) | {app:'roomNaviSns',version:1,exportedAt,posts:[...]} を生成 |

**ステマ規制対応（必須・テストで担保）**: 生成される全SNS文に必ず `#PR` を含める。
リンク先は楽天アフィリエイトリンク(item.affiliateUrl優先)。Pinterestは商品画像URL必須。

### sns-room.json スキーマ（poster入力）
```json
{ "app": "roomNaviSns", "version": 1, "exportedAt": "ISO",
  "posts": [ {
    "id": "shopA:10001__x",        // productId__platform で一意
    "acct": "room",                // 不動産の acct:1/2 と分離
    "kind": "x" | "pinterest" | "threads",
    "status": "checked",           // #PR保証済みのためchecked。posterがdry-run安全網
    "title": "...",                // pinterestのみ
    "body": "...",                 // x/threads=本文全体 / pinterest=説明文
    "link": "https://...afl...",   // リンク先(アフィリ)
    "image": "https://...",        // 商品画像(pinterest必須)
    "due": "YYYY-MM-DD",           // 任意(分散投稿用)
    "productId": "shopA:10001"
  } ] }
```

### フェーズ1 UI（compose/stockタブ）
- 投稿文タブに「📣 SNS展開」: X/Threads/Pinterest の生成プレビュー＋字数/#PR判定＋ワンタップコピー
- 「SNS書き出し(sns-room.json)」ボタン＋各SNSを開くリンク
- 既存の投稿文スコア機能とは別枠（ROOM本文とSNS文は別物）

## フェーズ2（sns-auto-poster拡張・アカウント作成後に本番検証）
- `post-pinterest.js` 新規: 画像DL→アップ→タイトル/説明/リンク設定でピン作成
- `post-threads.js` 新規: X投稿ロジックとほぼ同型
- X投稿をROOM専用プロファイル(`profiles/x-room`)対応。不動産(`profiles/x`)と分離
- `acct:"room"` の投稿を `data/room.json` から読み、既存queue.js(selectDue/markPosted)を流用
- **ガード追加**: kind=room系で #PR 無しは投稿ブロック（guard.js拡張）
- 実セッションが要るため、ユーザーのX/Pinterest/IG(Threads)アカウント作成＋一度きりログイン後に本番検証

## 完成の定義
- フェーズ1: 新規純関数のTDD全パス＋既存54件も緑。プレビュー動作・sns-room.json書き出し確認。GitHub Pages反映
- フェーズ2: poster側テスト追加で緑。dry-runで対象表示。ログイン後に各SNS実投稿1本ずつ確認

## アカウント準備（ユーザー作業・別途手順書を渡す）
ROOMアフィリ専用に X / Pinterest / Instagram(Threadsの器) を新規作成。相互に別ジャンル(不動産)と混ぜない。
