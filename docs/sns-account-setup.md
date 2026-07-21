# ROOMアフィリ用 SNSアカウント作成＆連携ガイド

X / Pinterest / Instagram(Threadsの器) を「楽天ROOMアフィリ専用」で作る手順。
不動産アカウントとは必ず分ける（読者も内容も別物のため）。

## 1. アカウントを作る（あなたの作業）

いずれも無料。メールは分けたい場合は Gmail の別名 `kaneshiro0101+room@gmail.com` でも届きます。

| SNS | 作成先 | メモ |
|---|---|---|
| X | https://x.com/i/flow/signup | ユーザー名は物販っぽく（例: room_kurashi）。プロフィールに「#楽天ROOM」「PR含む」を明記 |
| Pinterest | https://www.pinterest.jp/ →「登録」 | **ビジネスアカウント**推奨（無料・分析が見える）。ボードを1つ作る（例「暮らしの楽天お買い物」） |
| Instagram | https://www.instagram.com/accounts/emailsignup/ | Threadsを使うための器。IG本体には投稿しなくてOK |
| Threads | IG作成後 https://www.threads.net/ でIGログイン→有効化 | プロフィールに「PR含む」を明記 |

**共通のコツ**：プロフィール文に「楽天ROOMで見つけた良い物を紹介／PR含みます」と書くと、
アカウント単位の広告明示になり安全（投稿ごとの#PRと二重で安心）。

## 2. このPCと連携（一度だけ・ログインセッション保存）

`C:\Users\user\sns-auto-poster` のダブルクリック用bat：

1. **⑥ROOM用Xにログイン.bat** → ブラウザが開く → 作ったX（room_kurashi等）でログイン → ブラウザを閉じる
2. **⑦Threadsにログイン.bat** → 同様にThreads(IG)でログイン → 閉じる
3. **⑧Pinterestにログイン.bat** → 同様にPinterestでログイン → 閉じる

※セッションが切れたら同じbatでやり直すだけ。ログイン情報はこのPC内のみ（git管理外）。

## 3. 毎日の投稿（ROOMナビ → 自動投稿）

1. ROOMナビで商品を選び「📣SNS展開」→「3つまとめてSNSストックへ」
2. ストックタブ →「⬇️ SNS書き出し(sns-room.json)」でダウンロード
3. ダウンロードした `sns-room.json` を `C:\Users\user\sns-auto-poster\data\room.json` に置く（上書き）
4. **⑨ROOMのSNS投稿を確認だけ.bat** で何が投稿されるか下見（dry-run）
5. 問題なければ **⑩ROOMをSNSに投稿.bat** で本番投稿

投稿直前に #PR・NGワード・字数・画像を自動チェックし、危ないものは投稿せず理由を表示します。

## 4. 最初だけ：投稿ボタンの位置合わせ

Threads / Pinterest は各サイトのボタン配置が変わることがあります。
初回に⑩を実行して「投稿欄を開けませんでした」等が出たら、そのときに画面を見ながら
`src/post-threads.js` / `src/post-pinterest.js` のセレクタを調整します（担当AIに「Threadsの投稿が失敗する」と言えば直します）。

## 注意
- UI経由の自動投稿は各SNSの規約上グレー。自アカ・低頻度・自己責任で（1件ごと8秒間隔にしてあります）。
- Pinterestは画像必須。ROOMナビが商品画像URLを自動で付けます。
- Instagram本体への自動投稿はしません（本文にリンクを貼れず集客に弱いため。Threadsの器として作るだけ）。
