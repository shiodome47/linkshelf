# linkshelf

[![npm](https://img.shields.io/npm/v/linkshelf)](https://www.npmjs.com/package/linkshelf)
[![CI](https://github.com/shiodome47/linkshelf/actions/workflows/ci.yml/badge.svg)](https://github.com/shiodome47/linkshelf/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/linkshelf)](https://github.com/shiodome47/linkshelf/blob/main/LICENSE)

リンク・1 行メモ・長めのテキストを、カードに分けて棚に並べる React の部品です。
A React component that organizes links, one-line notes and longer texts into cards on a shelf.

**デモ / Demo：https://linkshelf-chi.vercel.app**

![linkshelf のライト表示](https://raw.githubusercontent.com/shiodome47/linkshelf/main/docs/images/screenshot-light.png)

```bash
npm install linkshelf
```

```tsx
import { LinkShelf } from 'linkshelf'
import 'linkshelf/style.css'

export function App() {
  return <LinkShelf />
}
```

`react` と `react-dom`（18 か 19）が必要です。/ Requires `react` and `react-dom` 18 or 19.

[日本語](#日本語) ・ [English](#english)

---

## 日本語

### できること

- カードを作る・名前と色を変える・ドラッグで好きな列・位置へ並べ替える（スマホでは 1 列）
- URL を入れて Enter でリンク、それ以外の 1 行は 1 行メモ（ダブルクリックで書き換え）
- 長めのテキスト（書く・.txt を置く）、検索、サイトのアイコン、お気に入り（星）
- チェック項目（やること・毎日の習慣）
- 画像（置き場所は組み込む側が用意）：追加・貼り付け・縮めて置く・メモを添えて見る
- スマホ向けのカテゴリの帯、カードをたたむ
- 書き出し・読み込み（JSON のファイル）
- ライト / ダーク表示、日本語 / 英語

**使い方は 3 段階**あります。必要になったところまで進めば十分です。

| 段階 | こんなとき | 使うもの |
|---|---|---|
| [1. そのまま使う](#1-そのまま使う) | リンク集・メモ帳としてそのまま置きたい | `<LinkShelf>` と設定（props） |
| [2. 少し変える](#2-少し変える) | 言葉・色・項目を自分のアプリに合わせたい（作り直さずに） | `messages`・CSS の変数・`meta`・差し込み口 |
| [3. 組み立てる](#3-組み立てる) | 自分のアプリ用に画面を一から作りたい（中身の仕組みは使い回したい） | ストア・見た目の部品・`<CardBoard>`（カードを並べるボード）・段組みとドラッグの道具 |

### こんな使い方も

- **ブックマーク集**：よく使うサイトを、仕事・趣味などのカードに分けて並べる
- **備忘録・覚書**：思いついたことを 1 行メモで書きとめる。長いものはテキストに
- **かんたんなカンバン**：「やること」「作業中」「終わった」のカードを作り、項目をドラッグで移していく
- **調べものの整理**：テーマごとのカードに、参考にしたページとメモをまとめる
- **目標の管理**：目標ごとのカードに、やることと、役に立つリンクを並べる
- **リンク集ではないボード**：`<CardBoard>` を使えば、カードの中身を自分で書いて、同じ並べ方・ドラッグのボードを作れる（例：自治会の役員の年間のやること）

データは、既定ではブラウザの中（IndexedDB）に保存されます。見た目は `.linkshelf` の中だけに効くので、Tailwind が無いアプリでも、あるアプリでも、ほかの部分を崩しません。

---

### 1. そのまま使う

#### 設定（props）

**基本**

| 名前 | 意味 | 既定 |
|---|---|---|
| `storage` | 保存先（[保存先を変える](#保存先を変える)） | `indexedDbStorage()` |
| `fetchTitle` | ページの名前を取る関数 `(url) => Promise<string \| null>`（[ページの名前を取る](#ページの名前を取る)） | なし（名前は URL から作る） |
| `title` | 見出し | `'リンク集'`（英語では `'Links'`） |
| `locale` | 画面の言葉。`'ja'` / `'en'` | `'ja'` |
| `theme` | `'light'` / `'dark'` / `'system'`（端末の設定に合わせる） | `'system'` |
| `readOnly` | 閲覧専用（[閲覧専用にする](#閲覧専用にする)） | `false` |
| `checklist` | チェック項目を足せるようにする（`false` でも、すでにあるものは表示する） | `false` |
| `backup` | 「書き出す」「読み込む」のボタンを出す（[書き出し・読み込み](#書き出し読み込み)） | `false` |
| `actions` | 見出しの右に足すもの（テーマの切り替えボタンなど） | なし |
| `className` | いちばん外側に足す class | なし |

**スマホ・見せ方**

| 名前 | 意味 | 既定 |
|---|---|---|
| `jumpBar` | カテゴリの帯。`'auto'`（1 列の画面だけ）/ `'always'` / `'never'` | `'auto'` |
| `collapsible` | カードをたためるようにする | `false` |
| `collapseKey` | たたんだカードを覚える名前（1 つのサイトに 2 つ置くときは別の名前に） | `'linkshelf'` |

**画像**

| 名前 | 意味 | 既定 |
|---|---|---|
| `uploadImage` | 画像を受け取って置き、URL を返す関数（[画像](#画像)） | なし（ボタンを出さない） |
| `imageMaxSide` | 置く前に、画像の長い辺をこのピクセル数まで縮める | なし（縮めない） |
| `pasteImagesAnywhere` | ページのどこで貼り付けても受け取り、置くカードを選んでもらう | `false` |
| `viewImages` | 画像のリンクを部品の中で開き、メモを添えて見せる（その場で書ける） | `false` |
| `loadImage` | 画像を読む方法（合言葉の要る保存先など） | なし（URL をそのまま使う） |

**リンク**

| 名前 | 意味 | 既定 |
|---|---|---|
| `linkIcon` | リンクのアイコンを差し替える `(link) => ReactNode \| null` | なし |
| `openLink` | リンクを開く方法を差し替える `(url, link) => void` | なし（新しいタブ） |
| `sameOriginInSameTab` | 同じサイトの URL は同じタブで開く | `false` |

**変える**（[2. 少し変える](#2-少し変える)）

| 名前 | 意味 | 既定 |
|---|---|---|
| `messages` | 画面の言葉を一部だけ差し替える | なし |
| `renderLinkExtra` | リンク行の右に、アプリの表示を差し込む `(link) => ReactNode` | なし |
| `renderCardExtra` | カードの見出しの右に、アプリの表示を差し込む `(category, links) => ReactNode` | なし |

`storage` と `fetchTitle` は、最初に渡したものを使い続けます。

#### 保存先を変える

```tsx
import { LinkShelf, indexedDbStorage, memoryStorage } from 'linkshelf'

// ブラウザの中に保存（名前を変えれば、1 つのサイトに 2 つ置ける）
<LinkShelf storage={indexedDbStorage({ name: 'my-links' })} />

// メモリだけ（ページを閉じると消える。テストや見本に）
<LinkShelf storage={memoryStorage()} />
```

自分の保存先（サーバー・同期の仕組みなど）を使うときは、`LinkShelfStorage` の形の物を渡します。

```ts
import type { LinkShelfStorage } from 'linkshelf'

const myStorage: LinkShelfStorage = {
  loadAll: async () => ({ categories: [], links: [] }),
  putCategory: async (category) => {},
  deleteCategory: async (id) => {}, // 中のリンクは deleteLinks で別に消す
  putLink: async (link) => {},
  deleteLinks: async (ids) => {},
  // bulkPut は無くてもよい（無ければ 1 件ずつ put する）
  // 中身が外から変わったら（同期など）知らせる。知らせを受けると読み直す。無くてもよい
  subscribe: (onChange) => mySync.onRemoteChange(onChange),
}
```

#### 閲覧専用にする

`readOnly` を付けると、開く・検索・お気に入りだけ表示はできて、追加・編集・削除・並べ替え・星を付けることはできなくなります。

```tsx
<LinkShelf storage={siteStorage} readOnly={!isEditor} />
```

**注意**：`readOnly` は画面のボタンを隠すだけです。書き換えを本当に防ぐには、保存先（サーバー）の側でも書き込みを断ってください。

#### スマホで見やすくする

- **カテゴリの帯**（`jumpBar`）：カテゴリ名を横に並べた帯。押すとそのカードへ飛び、下へスクロールしても上に残ります。
- **カードをたたむ**（`collapsible`）：見出しの右のボタンで中身をたためます。見る人のブラウザに覚えておきます。検索中は、見つかったものが隠れないようにすべてひらきます。

アプリの上に固定のヘッダーがあるときは、帯を止める位置を CSS の変数で指定します。

```css
.linkshelf {
  --ls-sticky-top: 56px; /* 固定のヘッダーの高さ */
}
```

#### 画像

`uploadImage` を渡すと、各カードに「画像を追加」が出ます。カードへのドラッグ＆ドロップや貼り付け（Ctrl+V / ⌘V）でも受け付けます。置き場所（サーバー）は組み込む側が用意し、linkshelf は返ってきた URL をリンクとして置くだけです（自分のサーバー・Cloudflare R2・S3 など、関数を差し替えるだけで変えられます）。

```tsx
<LinkShelf
  uploadImage={async (file, { categoryId }) => {
    if (file.size > 5 * 1024 * 1024) throw new Error('5MB までです') // 上限の確認はここで
    const body = new FormData()
    body.append('file', file)
    const res = await fetch('/api/images', { method: 'POST', body })
    if (!res.ok) throw new Error('アップロードできませんでした')
    return { url: (await res.json()).url } // 相対の URL（/images/a.jpg）でもよい
  }}
  imageMaxSide={2000}   // 大きな写真・スクショを縮めてから置く
  pasteImagesAnywhere   // カードの外で貼り付けても、置くカードを選んで置ける
  viewImages            // 画像を部品の中で開き、メモ（description）を添えて見る・書く
/>
```

- 受け付けるのは JPEG・PNG・WebP。失敗したら（エラーを投げたら）、短いエラー文を出し、リンクは足しません。
- 合言葉の要る画像は `loadImage` で読み方を渡します。`Blob` を返すと、部品が表示用の URL を作り、閉じたときに片づけます。

```tsx
<LinkShelf viewImages loadImage={async (url) => (await fetch(url, { headers: { Authorization: `Bearer ${token}` } })).blob()} />
```

URL のパスが `.jpg` `.jpeg` `.png` `.webp` `.gif` で終わるリンクは、画像の印を出します（`linkIcon` で差し替えられます）。

#### リンクの開き方

既定では新しいタブで開きます。`sameOriginInSameTab` で同じサイトのものだけ同じタブに、`openLink` で開き方を自分で決められます。どちらでも、`javascript:` などの危ない URL は開きません。

```tsx
<LinkShelf openLink={(url, link) => window.location.assign(url)} />
```

#### ページの名前を取る

ブラウザからは、ほかのサイトのページを直接読めません（CORS）。名前を自動で付けたいときは、サーバー側で名前を取る処理を用意して `fetchTitle` で渡します。

```tsx
<LinkShelf
  fetchTitle={async (url) => {
    const res = await fetch(`/api/title?url=${encodeURIComponent(url)}`)
    return res.ok ? ((await res.json()).title ?? null) : null
  }}
/>
```

サーバー側の例は [`examples/web/api/title.ts`](https://github.com/shiodome47/linkshelf/blob/main/examples/web/api/title.ts)（Vercel の関数）。内部ネットワークを覗かれないための対策が入っているので、使うときは削らないでください。

#### 書き出し・読み込み

`backup` を付けると、見出しに「書き出す」「読み込む」が出ます。書き出すと中身を JSON のファイルに保存し、読み込むときは「置き換える」か「今の中身に足す」かを選べます（閲覧専用では書き出すだけ）。端末の引っ越しや、念のための控えに使えます。

```tsx
<LinkShelf backup />
```

---

### 2. 少し変える

作り直さずに、自分のアプリに合わせるための口です。

#### 言葉を変える

`messages` で、画面の言葉を一部だけ差し替えられます（渡さなかった言葉は `locale` のまま）。言葉の一覧は `MESSAGES.ja` / `MESSAGES.en` です。

```tsx
<LinkShelf messages={{ shelfTitle: 'ノート', addCategory: 'ノートを追加', search: 'ノートを検索' }} />
```

#### 色を合わせる

色は CSS の変数で決まっています。`.linkshelf` で上書きします（ライト表示だけなら `.linkshelf[data-theme='light']`）。

```css
.linkshelf {
  --ls-accent: #2563eb;
}
```

| 変数 | 意味 |
|---|---|
| `--ls-bg` | 画面の背景 |
| `--ls-card` | カードの背景 |
| `--ls-border` | 枠線 |
| `--ls-text` | 文字 |
| `--ls-muted` | うすい文字 |
| `--ls-accent` | 決定のボタン・ドラッグの線 |
| `--ls-danger` | 削除 |

#### 自分の項目を足す（meta と差し込み口）

カテゴリとリンクには、アプリが自由に使える欄 **`meta`** があります（期日・担当・自分のアプリの id など）。linkshelf はこの中を見ず、変えず、移動や並べ替えでも消さずに残し、保存先にもそのまま入ります。

**差し込み口**（`renderLinkExtra` / `renderCardExtra`）と組み合わせると、linkshelf を作り直さずに、自分の項目を画面に出せます。

```tsx
const { addLink } = useLinkShelf() // <LinkShelf> の中（actions など）で
await addLink({ categoryId, title: '防災訓練', url: '', meta: { due: '2026-11-29' } })

<LinkShelf
  // リンク行の右（星の左）に、期日を出す。何も出さないときは null
  renderLinkExtra={(link) => (link.meta?.due ? <span>{String(link.meta.due)}</span> : null)}
  // カードの見出しの右に、期日のある数を出す（links は今見えているもの）
  renderCardExtra={(category, links) => <span>{links.filter((l) => l.meta?.due).length}</span>}
/>
```

`meta` を変えるときは `updateLink(id, { meta })` / `updateCategory(id, { meta })`（渡すと丸ごと置き換え）。アイコンと開き方は `linkIcon`・`openLink` で差し替えられます。

---

### 3. 組み立てる

画面を自分のアプリ用に一から作るときに、linkshelf の中身を使い回すための部品と道具です。

#### データ（ストア）

`<LinkShelfProvider>` の中では、`useLinkShelf()` でデータと操作が使えます（`<LinkShelf>` の中、たとえば `actions` に置いた部品からも使えます）。

```tsx
import { LinkShelfProvider, useLinkShelf, indexedDbStorage } from 'linkshelf'

function MyList() {
  const { categories, links, loaded, loadAll, addLink } = useLinkShelf()
  useEffect(() => void loadAll(), [loadAll]) // 自分で画面を作るときは、最初に読む
  // …
}

<LinkShelfProvider storage={indexedDbStorage()}>
  <MyList />
</LinkShelfProvider>
```

| 操作 | すること |
|---|---|
| `loadAll()` / `watch()` | 保存先から読む／外からの変更（`subscribe`）を見張る |
| `addCategory` `updateCategory` `deleteCategory` | カテゴリを足す・変える・消す（消すと中のリンクも消える） |
| `addLink` `addLinkFromUrl` `updateLink` `deleteLink` `deleteLinks` | リンクを足す（URL から名前も取る）・変える・消す |
| `moveLink` `moveLinks` `reorderLinks` `sortLinks` | リンクを動かす・並べ替える |
| `reorderCategories` `arrangeCategories` | カードの順番・列を変える |
| `toggleCheck` `clearDoneChecks` | チェック項目を付け外す・済んだものを消す |
| `exportData()` / `importData(data, 'replace' \| 'merge')` | 書き出す・読み込む |

検索・お気に入りの絞り込みは、棚と同じ決まりの **`filterShelf(categories, links, { query, favoritesOnly })`** で（カードごとに `{ category, links }` を返します）。書き出したファイルを読むときは **`parseShelfData(JSON.parse(text))`** で形を確かめます（違えば Error。足りない欄は補う）。

#### 見た目の部品

**`<LinkShelfScope>`** の中に置くと、公開している部品が棚と同じ見た目・言葉になります（見た目はこの中だけに効きます）。

```tsx
import { LinkShelfScope, Button, Dialog, ConfirmDialog, Input, Textarea, SegmentedControl, LinkIcon } from 'linkshelf'

<LinkShelfScope theme="system" locale="ja">
  <Button variant="primary" size="sm">足す</Button>
  <LinkIcon link={link} /> {/* サイトのアイコン（画像・テキストなどの印も） */}
  <Dialog isOpen={open} onClose={close} title="メモ" size="md">…</Dialog>
</LinkShelfScope>
```

| 部品 | 中身 |
|---|---|
| `Button` | `variant`：`primary` / `secondary` / `ghost` / `danger`、`size`：`sm` / `md` / `lg` |
| `Dialog` | 小窓（Esc・外側で閉じる。`size`：`sm`〜`xl`） |
| `ConfirmDialog` | 消す前の確認（`onConfirm` は Promise） |
| `Input` / `Textarea` | 入力欄 |
| `SegmentedControl` | 切り替え（タブ・選択） |
| `LinkIcon` / `SiteIcon` | リンクのアイコン／サイトのアイコン |

#### カードを並べるボード（`<CardBoard>`）

棚と同じ「カードを段組みに並べ、ドラッグで好きな列・位置へ動かす」画面を、**カードの中身を書くだけ**で作れる部品です。カードの中身はリンクでなくても構いません（役員のやること、プロジェクト、メモなど）。

```tsx
import { CardBoard } from 'linkshelf'

// カードは { id, order, column?, size } ＋ 自由な項目（size は高さの目安。中の行の数など）
const [duties, setDuties] = useState(loadDuties())

<CardBoard
  cards={duties}
  renderCard={(duty, { dragHandle, isDragging }) => (
    <section style={{ opacity: isDragging ? 0.5 : 1 }}>
      <button type="button" aria-label={`「${duty.title}」を動かす`} {...dragHandle}>⋮⋮</button>
      <h3>{duty.title}</h3>
    </section>
  )}
  onMove={(places) => saveDuties(places)} // 全カードの { id, column, order }。変わったものだけ保存すればよい
  addon={<button onClick={addDuty}>役目を足す</button>} // いちばん短い列の下に出る
/>
```

- 置いた列と順番を覚えていれば、そのとおりに並べます。画面が狭くて列が足りないとき（スマホ）は、左上から読む順に 1 列で並べ、そこで動かしても PC で置いた列は崩れません
- 落とす先は指（マウス）の位置で決まります（カードの上半分なら上、下半分なら下。列の下の空きなら、その列のいちばん下）。背の高いカードでも、短いカードの上に置けます
- 見た目は style で付けているので、`.linkshelf` の外（自分のアプリの CSS の中）でもそのまま使えます

| 設定 | 中身 |
|---|---|
| `cards` / `renderCard` / `onMove` | カード・1 枚の描き方・動かしたとき（必須） |
| `minColumnWidth` / `gap` / `maxColumns` | 列の幅の下限（既定 300）・カードのあいだ（既定 16）・列の数の上限 |
| `columnCount` | 列の数を外で決めるとき（渡すと幅からは数えない） |
| `disabled` | 並べ替えを止める（読むだけ・絞り込み中など） |
| `renderOverlay` | ドラッグ中に指について動かすもの。渡さなければ、カードそのものが動く |
| `addon` | いちばん短い列の下に置くもの |
| `dropLineColor` / `columnEndHeight` | 落とす先の線の色・列の下の空きの高さ |
| `sensors` | ドラッグの始め方を変える（キーボードを足すなど） |
| `dnd` | カードの中の行など、カード以外のドラッグを同じ DndContext で扱うとき（棚はリンクのドラッグをここで扱っています） |

`renderCard` の 2 つ目には、`dragHandle`（つかむところに `{...dragHandle}` と付ける）・`isDragging`・`dropEdge`（このカードの上・下に落とすところなら `'before'` / `'after'`）・`column`（何列目か）が届きます。

#### 段組みとドラッグの道具

`<CardBoard>` の中で使っている道具です。もっと細かく自分で組みたいときに（ドラッグは [@dnd-kit](https://dndkit.com/)）。

| 道具 | すること |
|---|---|
| `layoutCards(cards, 列の数)` | カードを列に並べる。動かしたカードは置いた列・順番のとおり、まだ動かしていないカードはいちばん短い列へ |
| `moveCard(cards, 列の数, 動かすid, 落とす先)` | 動かしたあとの、全カードの `column` と `order`（これを保存する）。落とす先は「あるカードの上・下」か「列のいちばん下」 |
| `flattenCards(cards)` | 1 列で見せるときの順（左上から右へ、段ごとに読む順） |
| `useColumnCount({ minWidth, gap })` | 要素の幅から列の数（`[ref, 数]`。ref を外側の要素に付ける） |
| `useDragSensors()` | ドラッグの始め方（マウスは 5px 動かすと、スマホは長押し 0.25 秒で） |
| `dropPosition(event, overRect)` | 相手の上・下どちらに落とすか。**指（マウス）の位置**で決める（背の高いカードでも、短いカードの上に置ける） |

#### 判定の道具

`isSafeUrl` `safeExternalUrl` `openExternal`（危ない URL を開かない）、`normalizeLinkInput`（入力を URL か 1 行メモかに分ける）、`titleFromUrl` `faviconUrl` `isImageUrl` `isChecked` `parseCheckInput`、`readTextFile`（.txt を読む。上限 `TEXT_LIMIT_BYTES`）、`shrinkImage`（画像を縮める）。

---

### 安全のために

- `javascript:` などの危ない URL は、リンクにしません。保存先から読んだ URL も、開く前にもう一度確かめます。
- テキストは文字として表示するだけです（HTML として読み込みません）。
- サイトのアイコンは、そのサイト自身の `/favicon.ico` を読むだけです。外部のアイコンサービスは使いません。
- 読み込むファイルは、形を確かめてから使います（違えば手元のデータは変えません）。

### 見本のページ

[`examples/web`](https://github.com/shiodome47/linkshelf/tree/main/examples/web) に、この部品を使った単独のアプリがあります（[デモ](https://linkshelf-chi.vercel.app)）。データも画像も、開いたブラウザの中だけに保存されます（[`localImages.ts`](https://github.com/shiodome47/linkshelf/blob/main/examples/web/src/localImages.ts) は `uploadImage` と `loadImage` の書き方の見本）。チェック項目・カードをたたむ・画像・書き出しと読み込みも試せます。画面の言葉は、ブラウザの言葉に合わせて日本語か英語になります。

---

## English

![linkshelf in dark mode](https://raw.githubusercontent.com/shiodome47/linkshelf/main/docs/images/screenshot-dark.png)

### Features

- Create cards, rename and recolor them, drag them to any column and position (one column on phones)
- Type a URL and press Enter to add a link; any other single line becomes a note
- Longer texts (write one or drop a .txt), search, site icons, favorites
- Checklist items (to-dos and daily habits)
- Images (you provide the storage): add, paste anywhere, shrink, view with an editable note
- A category bar and collapsible cards for phones
- Export / import as a JSON file
- Light / dark theme, Japanese / English labels

**Three levels of use** — go only as far as you need:

| Level | When | What you use |
|---|---|---|
| [1. Use it as is](#1-use-it-as-is) | Drop in a link shelf or notebook | `<LinkShelf>` and its props |
| [2. Adjust it](#2-adjust-it) | Match wording, colors and fields to your app without rebuilding | `messages`, CSS variables, `meta`, render slots |
| [3. Build your own](#3-build-your-own) | Build a custom screen but reuse the internals | the store, UI parts, `<CardBoard>` (a board of your own cards), layout and drag tools |

Data is saved in the browser (IndexedDB) by default. Styles only apply inside `.linkshelf`, so it works with or without Tailwind in your app.

### 1. Use it as is

| Prop | Description | Default |
|---|---|---|
| `storage` | Where to save data (see below) | `indexedDbStorage()` |
| `fetchTitle` | `(url) => Promise<string \| null>` returning a page title | none (titles come from the URL) |
| `title` | Heading | `'リンク集'` (`'Links'` in English) |
| `locale` | `'ja'` / `'en'` | `'ja'` |
| `theme` | `'light'` / `'dark'` / `'system'` | `'system'` |
| `readOnly` | View-only mode | `false` |
| `checklist` | Let users add checklist items (existing ones are always shown) | `false` |
| `backup` | Show Export / Import buttons | `false` |
| `jumpBar` | Category bar: `'auto'` (one-column screens) / `'always'` / `'never'` | `'auto'` |
| `collapsible` / `collapseKey` | Collapsible cards / name used to remember them | `false` / `'linkshelf'` |
| `uploadImage` | `(file, { categoryId }) => Promise<{ url, title? }>` that stores an image | none (no button) |
| `imageMaxSide` | Shrink images so the longer side is at most this many pixels | none |
| `pasteImagesAnywhere` | Accept images pasted anywhere and ask which card to use | `false` |
| `viewImages` / `loadImage` | Open image links in place with an editable note / how to load private images (`Blob` or URL) | `false` / none |
| `linkIcon` / `openLink` / `sameOriginInSameTab` | Override icons / how links open / open same-origin links in the same tab | none / new tab / `false` |
| `messages` / `renderLinkExtra` / `renderCardExtra` | See [2. Adjust it](#2-adjust-it) | none |
| `actions` / `className` | Extra header elements / class on the root | none |

`storage` and `fetchTitle` are read once, on first render.

**Storage.** `indexedDbStorage({ name })` (default) or `memoryStorage()`. For your own backend, pass an object implementing `LinkShelfStorage`: `loadAll`, `putCategory`, `deleteCategory`, `putLink`, `deleteLinks`, optionally `bulkPut`, and optionally `subscribe(onChange)` (returns an unsubscribe function) so the shelf reloads when data changes from outside (e.g. sync).

**View-only.** `readOnly` hides editing UI only; your server must also reject writes.

**Phones.** The category bar sticks below `--ls-sticky-top` (set it to your fixed header's height).

**Images.** Your `uploadImage` stores the file and returns its URL; the shelf adds it as a link. JPEG, PNG and WebP are accepted; throw to show a short error. `imageMaxSide={2000}` shrinks large photos first, `pasteImagesAnywhere` handles pastes outside cards, and `viewImages` opens images in a dialog with the link's `description` as an editable note (Ctrl/⌘-click still opens a new tab). For private images return a `Blob` from `loadImage`; the object URL is created and revoked for you.

**Links** open in a new tab by default; `javascript:` and other unsafe URLs are never opened.

**Page titles** need a server (CORS). [`examples/web/api/title.ts`](https://github.com/shiodome47/linkshelf/blob/main/examples/web/api/title.ts) is an example Vercel function with SSRF protections; keep them if you reuse it.

**Backup.** With `backup`, Export saves a JSON file and Import asks whether to replace the shelf or add to it (view-only: export only).

### 2. Adjust it

**Wording.** `messages` overrides any labels; the rest follow `locale`. See `MESSAGES.ja` / `MESSAGES.en` for the keys.

```tsx
<LinkShelf messages={{ shelfTitle: 'Notes', addCategory: 'New notebook' }} />
```

**Colors.** Override `--ls-bg`, `--ls-card`, `--ls-border`, `--ls-text`, `--ls-muted`, `--ls-accent`, `--ls-danger` on `.linkshelf` (or `.linkshelf[data-theme='light']`).

**Your own fields.** Categories and links have a free **`meta`** object for your app (due dates, owners, ids…). linkshelf never reads or changes it and keeps it through moves and reorders. Show it with the render slots:

```tsx
<LinkShelf
  renderLinkExtra={(link) => (link.meta?.due ? <span>{String(link.meta.due)}</span> : null)}
  renderCardExtra={(category, links) => <span>{links.filter((l) => l.meta?.due).length}</span>}
/>
```

Set it with `addLink({ …, meta })` or `updateLink(id, { meta })` (replaces the whole object).

### 3. Build your own

**Data.** Inside `<LinkShelfProvider storage={…}>` (or inside `<LinkShelf>`, e.g. in `actions`), `useLinkShelf()` gives the data and actions: `loadAll`, `watch`, `addCategory`, `updateCategory`, `deleteCategory`, `addLink`, `addLinkFromUrl`, `updateLink`, `deleteLink`, `deleteLinks`, `moveLink`, `moveLinks`, `reorderLinks`, `sortLinks`, `reorderCategories`, `arrangeCategories`, `toggleCheck`, `clearDoneChecks`, `exportData`, `importData(data, 'replace' | 'merge')`. Call `loadAll()` once when you build your own screen. `filterShelf(categories, links, { query, favoritesOnly })` applies the shelf's search rules; `parseShelfData(JSON.parse(text))` validates an exported file.

**UI parts.** Inside **`<LinkShelfScope theme locale messages>`**, the exported `Button`, `Dialog`, `ConfirmDialog`, `Input`, `Textarea`, `SegmentedControl`, `LinkIcon` and `SiteIcon` look and read like the shelf (styles stay inside the scope).

**Card board.** **`<CardBoard cards renderCard onMove>`** gives you the shelf's masonry layout and drag-and-drop for any kind of card — you only write the card. Cards are `{ id, order, column?, size }` plus your own fields. `renderCard(card, { dragHandle, isDragging, dropEdge, column })`: spread `dragHandle` on the grip. `onMove(places)` receives every card's `{ id, column, order }`. Other props: `minColumnWidth` (300), `gap` (16), `maxColumns`, `columnCount`, `disabled`, `renderOverlay`, `addon` (shown under the shortest column), `dropLineColor`, `columnEndHeight`, `sensors`, and `dnd` (handle other drags, such as rows inside cards, in the same DndContext). It is styled inline, so it works outside `.linkshelf` too.

**Layout and drag tools** used by `<CardBoard>` (with [@dnd-kit](https://dndkit.com/)):

- `layoutCards(cards, columnCount)` places cards into columns: moved cards keep their saved column and order, others fill the shortest column.
- `moveCard(cards, columnCount, dragId, drop)` returns every card's new `column` and `order` (save them). `drop` is `{ kind: 'card', id, position: 'before' | 'after' }` or `{ kind: 'end', column }`.
- `flattenCards(cards)` gives the single-column reading order.
- `useColumnCount({ minWidth, gap })` returns `[ref, count]` from the element width.
- `useDragSensors()` gives the shelf's sensors (mouse: 5px, touch: 250 ms long press).
- `dropPosition(event, overRect)` decides before/after from the **pointer position**, so tall cards can be dropped above short ones.

Cards are `{ id, order, column?, size }` (`size` is a height estimate, such as a row count).

**Helpers.** `isSafeUrl`, `safeExternalUrl`, `openExternal`, `normalizeLinkInput`, `titleFromUrl`, `faviconUrl`, `isImageUrl`, `isChecked`, `parseCheckInput`, `readTextFile`, `shrinkImage`.

### Security

- Unsafe URLs such as `javascript:` are never turned into links, and URLs are checked again before opening.
- Texts are rendered as plain text, never as HTML.
- Site icons are loaded from each site's own `/favicon.ico`; no third-party icon service is used.
- Imported files are validated before use; on failure your data is left unchanged.

### Example app

[`examples/web`](https://github.com/shiodome47/linkshelf/tree/main/examples/web) is a standalone app built with this component ([demo](https://linkshelf-chi.vercel.app)). Everything, images included, is stored only in your browser ([`localImages.ts`](https://github.com/shiodome47/linkshelf/blob/main/examples/web/src/localImages.ts) shows how to write `uploadImage` and `loadImage`). You can try checklists, collapsible cards, images and export / import. Labels follow your browser language.

## License

[MIT](https://github.com/shiodome47/linkshelf/blob/main/LICENSE)
