'use strict';
// ROOMナビ RoomCore のテスト。
// index.html 内の /*CORE_START*/ ... /*CORE_END*/ を抽出して Node の vm で実行する。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCore() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const m = html.match(/\/\*CORE_START\*\/([\s\S]*?)\/\*CORE_END\*\//);
  if (!m) throw new Error('CORE_START/CORE_END マーカーが index.html に見つからない');
  // ブラウザにはURLが常在するため、vmサンドボックスにも渡す
  return vm.runInNewContext(m[1] + '\n;RoomCore', { URL, URLSearchParams });
}

const Core = loadCore();

// ---- サンプルデータ ----
const settings = { applicationId: '1000000000000000000', accessKey: 'ak_test1234567890', affiliateId: '1a2b3c4d.5e6f7a8b' };

const fv2Item = {
  itemCode: 'shopA:10001',
  itemName: '【送料無料】炭酸水 ラベルレス 500ml×48本',
  itemPrice: 2980,
  affiliateRate: 4,
  itemUrl: 'https://item.rakuten.co.jp/shopA/10001/',
  affiliateUrl: 'https://hb.afl.rakuten.co.jp/hgc/xxx/?pc=https%3A%2F%2Fitem',
  mediumImageUrls: ['https://thumbnail.image.rakuten.co.jp/@0_mall/shopA/img/1.jpg?_ex=128x128'],
  shopName: 'ショップA',
  reviewCount: 999,
  reviewAverage: 4.5,
  genreId: '100316'
};

const fv2Response = { Items: [fv2Item], count: 1, page: 1 };

const fv1Response = {
  Items: [{ Item: {
    itemCode: 'shopB:20002',
    itemName: 'ふわふわ バスタオル 4枚セット',
    itemPrice: 1980,
    affiliateRate: 8,
    itemUrl: 'https://item.rakuten.co.jp/shopB/20002/',
    mediumImageUrls: [{ imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/shopB/img/2.jpg?_ex=128x128' }],
    shopName: 'ショップB',
    reviewCount: 120,
    reviewAverage: 4.2
  } }]
};

const rankingResponse = {
  Items: [{ Item: {
    rank: 1,
    itemCode: 'shopC:30003',
    itemName: 'ランキング1位のチョコ',
    itemPrice: 1000,
    affiliateRate: 2,
    itemUrl: 'https://item.rakuten.co.jp/shopC/30003/',
    mediumImageUrls: [{ imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/shopC/img/3.jpg?_ex=128x128' }],
    shopName: 'ショップC',
    reviewCount: 10,
    reviewAverage: 5
  } }]
};

// ---- buildSearchUrl ----
test('buildSearchUrl: 新API(openapi)の基本パラメータが入る', () => {
  const u = new URL(Core.buildSearchUrl(settings, { keyword: '炭酸水' }));
  assert.equal(u.origin + u.pathname, 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701');
  const p = u.searchParams;
  assert.equal(p.get('applicationId'), settings.applicationId);
  assert.equal(p.get('accessKey'), settings.accessKey);
  assert.equal(p.get('affiliateId'), settings.affiliateId);
  assert.equal(p.get('keyword'), '炭酸水');
  assert.equal(p.get('format'), 'json');
  assert.equal(p.get('formatVersion'), '2');
  assert.equal(p.get('hits'), '30');
});

test('buildSearchUrl: sort/genreId/page を指定できる', () => {
  const p = new URL(Core.buildSearchUrl(settings, { genreId: '100227', sort: '-affiliateRate', page: 2 })).searchParams;
  assert.equal(p.get('genreId'), '100227');
  assert.equal(p.get('sort'), '-affiliateRate');
  assert.equal(p.get('page'), '2');
});

test('buildSearchUrl: affiliateIdが無ければパラメータ自体を付けない', () => {
  const p = new URL(Core.buildSearchUrl({ applicationId: 'x', accessKey: 'k' }, { keyword: 'a' })).searchParams;
  assert.equal(p.has('affiliateId'), false);
});

test('buildSearchUrl: applicationId未設定はthrow', () => {
  assert.throws(() => Core.buildSearchUrl({ accessKey: 'k' }, { keyword: 'a' }), /applicationId/);
});

test('buildSearchUrl: accessKey未設定はthrow（2026新API必須）', () => {
  assert.throws(() => Core.buildSearchUrl({ applicationId: 'x' }, { keyword: 'a' }), /accessKey|アクセスキー/);
});

test('buildSearchUrl: keywordもgenreIdも無しはthrow', () => {
  assert.throws(() => Core.buildSearchUrl(settings, {}), /keyword|genreId/);
});

// ---- buildRankingUrl ----
test('buildRankingUrl: 新API(openapi)のランキングURLになる', () => {
  const u = new URL(Core.buildRankingUrl(settings, { genreId: '100227' }));
  assert.equal(u.origin + u.pathname, 'https://openapi.rakuten.co.jp/ichibaranking/api/IchibaItem/Ranking/20220601');
  assert.equal(u.searchParams.get('genreId'), '100227');
  assert.equal(u.searchParams.get('applicationId'), settings.applicationId);
  assert.equal(u.searchParams.get('accessKey'), settings.accessKey);
});

test('buildRankingUrl: genreId無し=総合ランキング(パラメータ無し)', () => {
  const p = new URL(Core.buildRankingUrl(settings, {})).searchParams;
  assert.equal(p.has('genreId'), false);
});

// ---- parseItems ----
test('parseItems: formatVersion2 を正規化する', () => {
  const items = Core.parseItems(fv2Response);
  assert.equal(items.length, 1);
  const it = items[0];
  assert.equal(it.id, 'shopA:10001');
  assert.equal(it.name, fv2Item.itemName);
  assert.equal(it.price, 2980);
  assert.equal(it.rate, 4);
  assert.equal(it.url, fv2Item.itemUrl);
  assert.equal(it.affiliateUrl, fv2Item.affiliateUrl);
  assert.equal(it.shop, 'ショップA');
  assert.equal(it.reviewCount, 999);
  assert.equal(it.reviewAverage, 4.5);
});

test('parseItems: 画像URLは300x300に拡大される', () => {
  const it = Core.parseItems(fv2Response)[0];
  assert.match(it.image, /_ex=300x300/);
});

test('parseItems: formatVersion1 (Items[].Item) も読める', () => {
  const it = Core.parseItems(fv1Response)[0];
  assert.equal(it.id, 'shopB:20002');
  assert.equal(it.price, 1980);
  assert.match(it.image, /_ex=300x300/);
  assert.equal(it.affiliateUrl, '');
});

test('parseItems: ランキングレスポンスは rank を持つ', () => {
  const it = Core.parseItems(rankingResponse)[0];
  assert.equal(it.rank, 1);
  assert.equal(it.id, 'shopC:30003');
});

test('parseItems: 新APIの小文字キー(items)も読める', () => {
  const lower2 = { items: [{ itemCode: 'shopD:40004', itemName: '小文字fv2', itemPrice: 500, affiliateRate: 2, itemUrl: 'u', mediumImageUrls: ['https://x/img.jpg?_ex=128x128'], shopName: 's', reviewCount: 1, reviewAverage: 4 }] };
  const it2 = Core.parseItems(lower2)[0];
  assert.equal(it2.id, 'shopD:40004');
  assert.equal(it2.name, '小文字fv2');
  const lower1 = { items: [{ item: { itemCode: 'shopE:50005', itemName: '小文字fv1', itemPrice: 700, rank: 3 } }] };
  const it1 = Core.parseItems(lower1)[0];
  assert.equal(it1.id, 'shopE:50005');
  assert.equal(it1.rank, 3);
});

test('parseItems: 空・不正レスポンスは空配列', () => {
  // vm実行(別realm)の配列はdeepStrictEqualでprototype不一致になるため長さで検証
  assert.equal(Core.parseItems({}).length, 0);
  assert.equal(Core.parseItems(null).length, 0);
  assert.equal(Core.parseItems({ Items: [] }).length, 0);
});

// ---- 報酬・スコア ----
test('expectedCommission: 価格×料率(円未満切り捨て)', () => {
  assert.equal(Core.expectedCommission({ price: 10000, rate: 4 }), 400);
  assert.equal(Core.expectedCommission({ price: 2980, rate: 3 }), 89); // 89.4 -> 89
});

test('calcScore: 報酬100円×log10(1000)×評価0.9×価格帯1.2 = 324', () => {
  const s = Core.calcScore({ price: 5000, rate: 2, reviewCount: 999, reviewAverage: 4.5 });
  assert.equal(s, 324);
});

test('calcScore: レビュー0件はスコア0', () => {
  assert.equal(Core.calcScore({ price: 5000, rate: 10, reviewCount: 0, reviewAverage: 0 }), 0);
});

test('calcScore: 1000〜9999円帯の外はボーナス無し', () => {
  // 150円×log10(10)=1×評価1.0×ボーナス1.0 = 150
  const s = Core.calcScore({ price: 15000, rate: 1, reviewCount: 9, reviewAverage: 5 });
  assert.equal(s, 150);
});

// ---- 整形部品 ----
test('shortenName: 長い商品名は…付きで切る', () => {
  const name = 'あ'.repeat(60);
  const out = Core.shortenName(name, 40);
  assert.equal(out.length, 40);
  assert.ok(out.endsWith('…'));
});

test('shortenName: 短ければそのまま', () => {
  assert.equal(Core.shortenName('短い名前', 40), '短い名前');
});

test('formatPrice: カンマ区切り', () => {
  assert.equal(Core.formatPrice(1298000), '1,298,000');
});

test('buildHashtags: #付与・重複排除・最大8個', () => {
  const tags = Core.buildHashtags(['楽天ROOM', '#楽天ROOM', 'お買い物マラソン', 'a', 'b', 'c', 'd', 'e', 'f', 'g']);
  assert.ok(tags.length <= 8);
  assert.ok(tags.every(t => t.startsWith('#')));
  assert.equal(tags.filter(t => t === '#楽天ROOM').length, 1);
});

// ---- 投稿文生成 ----
test('generateCaption: プレースホルダが差し込まれる', () => {
  const item = Core.parseItems(fv2Response)[0];
  const r = Core.generateCaption(item, '＼{point}／\n{name}\n{price}円({rate}%)\n{shop}\n{tags}', {
    point: '箱買いが正解',
    tags: ['#楽天ROOM', '#炭酸水']
  });
  assert.ok(r.text.includes('箱買いが正解'));
  assert.ok(r.text.includes('2,980円(4%)'));
  assert.ok(r.text.includes('ショップA'));
  assert.ok(r.text.includes('#楽天ROOM #炭酸水'));
  assert.equal(r.ok, true);
  assert.equal(r.length, r.text.length);
});

test('generateCaption: 商品名は40字に短縮して差し込む', () => {
  const item = { name: 'あ'.repeat(60), price: 100, rate: 1, shop: 's' };
  const r = Core.generateCaption(item, '{name}', {});
  assert.equal(r.text.length, 40);
});

test('generateCaption: 1000字超は ok=false', () => {
  const r = Core.generateCaption({ name: 'x', price: 1, rate: 1, shop: 's' }, 'あ'.repeat(1100), {});
  assert.equal(r.ok, false);
});

test('generateCaption: 未指定のpointは空文字になる', () => {
  const r = Core.generateCaption({ name: 'x', price: 1, rate: 1, shop: 's' }, 'A{point}B', {});
  assert.equal(r.text, 'AB');
});

test('DEFAULT_TEMPLATES: 4種あり、サンプル商品で1000字以内', () => {
  assert.ok(Core.DEFAULT_TEMPLATES.length >= 4);
  const item = Core.parseItems(fv2Response)[0];
  for (const t of Core.DEFAULT_TEMPLATES) {
    const r = Core.generateCaption(item, t.body, { point: t.name, tags: Core.DEFAULT_HASHTAGS });
    assert.equal(r.ok, true, t.name);
  }
});

// ---- AIプロンプト ----
test('buildAiPrompt: 商品情報と切り口が入る', () => {
  const item = Core.parseItems(fv2Response)[0];
  const p = Core.buildAiPrompt(item, '悩み解決');
  assert.ok(p.includes('炭酸水'));
  assert.ok(p.includes('悩み解決'));
  assert.ok(p.includes('2,980'));
  assert.ok(/楽天ROOM/.test(p));
});

// ---- ストックの冪等マージ ----
test('mergeStock: 新規追加される', () => {
  const a = [{ id: '1', updatedAt: '2026-07-01T00:00:00Z', caption: 'a' }];
  const b = [{ id: '2', updatedAt: '2026-07-02T00:00:00Z', caption: 'b' }];
  const m = Core.mergeStock(a, b);
  assert.equal(m.length, 2);
});

test('mergeStock: 同じidは新しいupdatedAtが勝つ', () => {
  const a = [{ id: '1', updatedAt: '2026-07-01T00:00:00Z', caption: '古い' }];
  const b = [{ id: '1', updatedAt: '2026-07-03T00:00:00Z', caption: '新しい' }];
  assert.equal(Core.mergeStock(a, b)[0].caption, '新しい');
  assert.equal(Core.mergeStock(b, a)[0].caption, '新しい');
});

test('mergeStock: 冪等（2回マージしても同じ）', () => {
  const a = [{ id: '1', updatedAt: '2026-07-01T00:00:00Z', caption: 'a' }];
  const b = [{ id: '1', updatedAt: '2026-07-03T00:00:00Z', caption: 'b' }, { id: '2', updatedAt: '2026-07-02T00:00:00Z', caption: 'c' }];
  const once = Core.mergeStock(a, b);
  const twice = Core.mergeStock(once, b);
  assert.deepEqual(twice, once);
});

test('mergeStock: 空同士でも壊れない', () => {
  assert.equal(Core.mergeStock([], []).length, 0);
  assert.equal(Core.mergeStock(null, [{ id: '1', updatedAt: 'x' }]).length, 1);
});

// ---- 設定バリデーション ----
test('validateSettings: applicationId必須', () => {
  const r = Core.validateSettings({ applicationId: '', accessKey: 'k', affiliateId: '' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.length >= 1);
});

test('validateSettings: accessKey必須（2026新API）', () => {
  const r = Core.validateSettings({ applicationId: '123', accessKey: '', affiliateId: 'a.b' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => /アクセスキー|accessKey/.test(e)));
});

test('validateSettings: affiliateId無しは警告のみ(okはtrue)', () => {
  const r = Core.validateSettings({ applicationId: '123', accessKey: 'k', affiliateId: '' });
  assert.equal(r.ok, true);
  assert.ok(r.warnings.length >= 1);
});

test('validateSettings: 正常ならエラーも警告も無し', () => {
  const r = Core.validateSettings(settings);
  assert.equal(r.ok, true);
  assert.equal(r.errors.length, 0);
  assert.equal(r.warnings.length, 0);
});

// ---- 実績集計 ----
test('summarizePerformance: 合計と月別集計', () => {
  const s = Core.summarizePerformance([
    { date: '2026-06-30', clicks: 10, orders: 1, reward: 100 },
    { date: '2026-07-01', clicks: 20, orders: 0, reward: 0 },
    { date: '2026-07-02', clicks: 5, orders: 2, reward: 350 }
  ]);
  assert.equal(s.totalClicks, 35);
  assert.equal(s.totalOrders, 3);
  assert.equal(s.totalReward, 450);
  assert.equal(s.byMonth['2026-07'].clicks, 25);
  assert.equal(s.byMonth['2026-07'].reward, 350);
  assert.equal(s.byMonth['2026-06'].orders, 1);
});

test('summarizePerformance: 空・欠損値は0扱い', () => {
  const s = Core.summarizePerformance([{ date: '2026-07-01' }]);
  assert.equal(s.totalClicks, 0);
  assert.equal(s.totalReward, 0);
  assert.equal(Object.keys(Core.summarizePerformance([]).byMonth).length, 0);
});

// ---- ストック項目の生成 ----
test('makeStockEntry: 商品+投稿文からdraftを作る', () => {
  const item = Core.parseItems(fv2Response)[0];
  const now = '2026-07-04T10:00:00.000Z';
  const e = Core.makeStockEntry(item, 'キャプション', now);
  assert.equal(e.id, item.id);
  assert.equal(e.status, 'draft');
  assert.equal(e.caption, 'キャプション');
  assert.equal(e.createdAt, now);
  assert.equal(e.updatedAt, now);
  assert.equal(e.url, item.affiliateUrl); // アフィリURL優先
  assert.equal(e.itemUrl, item.url); // ROOM投稿用に素の商品ページURLも保持
  assert.equal(e.name, item.name);
});

test('makeStockEntry: affiliateUrlが無ければitemUrl', () => {
  const e = Core.makeStockEntry({ id: 'x', name: 'n', price: 1, rate: 1, url: 'https://item', affiliateUrl: '' }, 'c', '2026-07-04T10:00:00.000Z');
  assert.equal(e.url, 'https://item');
});
