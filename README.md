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

[日本語](#日本語) ・ [English](#english)

---

## 日本語

### できること

- カードを作る・名前と色を変える・ドラッグで並べ替える（スマホでは 1 列）
- URL を入れて Enter でリンク、それ以外の 1 行は 1 行メモ（ダブルクリックで書き換え）
- 長めのテキスト（書く・.txt を置く）、検索、サイトのアイコン
- お気に入り（星）。検索の横の星のボタンで、お気に入りだけを表示
- チェック項目（やること・毎日の習慣。`checklist` を付けたとき）。入力欄で「チェック項目にする」を選ぶか、「[] 〜」「[毎日] 〜」と打つ。毎日の項目は日付が変わるとチェックが外れ、カードの見出しに「済んだ数/全体」が出る
- スマホでは、カテゴリの帯で各カードへ飛べる。カードをたためるようにもできる
- 画像の追加（置き場所は組み込む側が用意。ボタン・ドラッグ＆ドロップ・ページのどこでも貼り付け、大きな画像は縮めて置く）、画像をメモを添えて見る・その場でメモを書く、リンクの開き方の指定（どれも選んで使う）
- ライト / ダーク表示、日本語 / 英語の表示

### こんな使い方も

リンク・1 行メモ・テキストを、カードに分けて自由に並べられるので、いろいろな用途に使えます。

- **ブックマーク集**：よく使うサイトを、仕事・趣味などのカードに分けて並べる
- **備忘録・覚書**：思いついたことを 1 行メモで書きとめる。長いものはテキストに
- **かんたんなカンバン**：「やること」「作業中」「終わった」のカードを作り、項目をドラッグで移していく（期限や担当者を付ける機能はありません）
- **調べものの整理**：テーマごとのカードに、参考にしたページとメモをまとめる
- **目標の管理**：目標ごとのカードに、やることと、役に立つリンクを並べる

データはブラウザの中（IndexedDB）に保存されます。見た目は `.linkshelf` の中だけに効くので、Tailwind が無いアプリでも、あるアプリでも使えます。`react` と `react-dom`（18 か 19）が必要です。

### 設定（props）

| 名前 | 意味 | 既定 |
|---|---|---|
| `storage` | 保存先（下の「保存先を変える」） | `indexedDbStorage()` |
| `fetchTitle` | ページの名前を取る関数 `(url) => Promise<string \| null>` | なし（名前は URL から作る） |
| `theme` | `'light'` / `'dark'` / `'system'`（端末の設定に合わせる） | `'system'` |
| `locale` | 画面の言葉。`'ja'`（日本語）/ `'en'`（英語） | `'ja'` |
| `title` | 見出し | `'リンク集'`（英語では `'Links'`） |
| `readOnly` | 閲覧専用（下の「閲覧専用にする」） | `false` |
| `jumpBar` | カテゴリの帯（下の「スマホで見やすくする」）。`'auto'` / `'always'` / `'never'` | `'auto'` |
| `collapsible` | カードをたためるようにする | `false` |
| `collapseKey` | たたんだカードを覚えておく名前（1 つのサイトに 2 つ置くときは別の名前に） | `'linkshelf'` |
| `uploadImage` | 画像を受け取って置き、URL を返す関数（下の「画像を追加する」） | なし（ボタンを出さない） |
| `imageMaxSide` | 置く前に、画像の長い辺をこのピクセル数まで縮める | なし（縮めない） |
| `pasteImagesAnywhere` | ページのどこで画像を貼り付けても受け取り、置くカードを選んでもらう | `false` |
| `viewImages` | 画像のリンクを部品の中で開き、メモを添えて見せる（その場でメモを書ける） | `false` |
| `loadImage` | 画像を読む方法を差し替える（合言葉の要る保存先など。`viewImages` のとき） | なし（URL をそのまま使う） |
| `linkIcon` | リンクのアイコンを差し替える `(link) => ReactNode \| null` | なし |
| `openLink` | リンクを開く方法を差し替える `(url, link) => void` | なし（新しいタブで開く） |
| `sameOriginInSameTab` | 同じサイトの URL は同じタブで開く | `false` |
| `checklist` | チェック項目（やること・毎日の習慣）を足せるようにする。`false` でも、すでにあるチェック項目は表示する | `false` |
| `actions` | 見出しの右に足すもの（テーマの切り替えボタンなど） | なし |
| `className` | いちばん外側に足す class | なし |

`storage` と `fetchTitle` は、最初に渡したものを使い続けます。

### 保存先を変える

```tsx
import { LinkShelf, indexedDbStorage, memoryStorage } from 'linkshelf'

// ブラウザの中に保存（名前を変えれば、1 つのサイトに 2 つ置ける）
<LinkShelf storage={indexedDbStorage({ name: 'my-links' })} />

// メモリだけ（ページを閉じると消える。テストや見本に）
<LinkShelf storage={memoryStorage()} />
```

自分の保存先（サーバーなど）を使うときは、`LinkShelfStorage` の形の物を渡します。

```ts
import type { LinkShelfStorage } from 'linkshelf'

const myStorage: LinkShelfStorage = {
  loadAll: async () => ({ categories: [], links: [] }),
  putCategory: async (category) => {},
  deleteCategory: async (id) => {},
  putLink: async (link) => {},
  deleteLinks: async (ids) => {},
  // bulkPut は無くてもよい（無ければ 1 件ずつ put する）
  // subscribe も無くてもよい（下の「ほかの端末の変更を出す」）
}
```

#### ほかの端末の変更を出す（同期するとき）

保存先に `subscribe` を付けると、中身が外から変わったとき（同期でほかの端末の変更が届いたときなど）に、画面を読み直します。

```ts
const syncedStorage: LinkShelfStorage = {
  ...myStorage,
  // 変わったら onChange を呼ぶ。戻り値は、知らせをやめる関数
  subscribe: (onChange) => mySync.onRemoteChange(onChange),
}
```

### 閲覧専用にする

`readOnly` を付けると、リンクを開く・検索・お気に入りだけ表示はできて、追加・編集・削除・並べ替え・星を付けることはできなくなります。サイトを見に来た人には閲覧専用、編集する人には編集できる画面、のように使い分けられます。

```tsx
<LinkShelf storage={siteStorage} readOnly={!isEditor} />
```

**注意**：`readOnly` は画面のボタンを隠すだけです。書き換えを本当に防ぐには、保存先（サーバー）の側でも「編集する人以外の書き込みを断る」ようにしてください。

### スマホで見やすくする

スマホなど狭い画面では、カードが縦に 1 列に並びます。一覧しやすくするために、2 つの機能があります。

- **カテゴリの帯**（`jumpBar`）：カテゴリ名を横に並べた帯を出し、押すとそのカードへ飛びます。下へスクロールしても、帯は上に残ります。既定（`'auto'`）では、1 列で並ぶ狭い画面のときだけ出ます。`'always'` でいつも、`'never'` で出さないようにできます。
- **カードをたたむ**（`collapsible`）：カードの見出しの右にボタンが出て、中身をたためます。たたんだカードは、見る人のブラウザに覚えておきます（ほかの人には影響しません）。検索中・お気に入りだけ表示のときは、見つかったものが隠れないように、すべてひらきます。

```tsx
<LinkShelf collapsible jumpBar="auto" />
```

アプリの上に固定のヘッダーがあって、帯がその下に隠れるときは、帯を止める位置を CSS の変数で指定します。

```css
.linkshelf {
  --ls-sticky-top: 56px; /* 固定のヘッダーの高さ */
}
```

### 画像を追加する

`uploadImage` を渡すと、各カードに「画像を追加」のボタンが出ます（閲覧専用のときは出ません）。カードへのドラッグ＆ドロップや、カードを選んだ状態での貼り付け（Ctrl+V / ⌘V）でも受け付けます。文字や URL の貼り付けは、今までどおりです。

画像を置く場所（サーバー）は、組み込む側が用意します。`uploadImage` は画像を受け取って置き、その URL を返します。返ってきた URL で、カードの末尾にリンクを足します（名前を返さなければ「画像（YYYY/MM/DD）」）。

```tsx
<LinkShelf
  uploadImage={async (file, { categoryId }) => {
    // 大きさの上限などの確認は、ここで行う
    if (file.size > 5 * 1024 * 1024) throw new Error('5MB までです')
    const body = new FormData()
    body.append('file', file)
    const res = await fetch('/api/images', { method: 'POST', body })
    if (!res.ok) throw new Error('アップロードできませんでした')
    const { url } = await res.json()
    return { url } // 相対の URL（/images/a.jpg）でもよい
  }}
/>
```

- 受け付けるのは JPEG・PNG・WebP です。
- 失敗した（エラーを投げた）ときは、カードに短いエラー文を出し、リンクは足しません。エラーの文が短ければ、そのまま添えて出します。
- `imageMaxSide={2000}` のように渡すと、置く前に長い辺を 2000px まで縮めます（スマホの写真やスクショを軽くする。小さい画像はそのまま。WebP にできない環境では JPEG）。
- `pasteImagesAnywhere` を付けると、カードの外（ページのどこか）で貼り付けた画像も受け取り、置くカードを選ぶ画面を出します。前に選んだカードを覚えています。入力欄での貼り付けは、今までどおりです。

保存先は `uploadImage` を差し替えるだけで変えられます（自分のサーバー、Cloudflare R2、S3 など）。linkshelf は、返ってきた URL をリンクとして置くだけです。

### 画像を部品の中で見る（メモつき）

`viewImages` を付けると、画像のリンク（下の「画像リンクのアイコン」と同じ見分け方）を押したとき、新しいタブではなく部品の中で画像を開きます。画像の下には、そのリンクのメモ（`description`）を添えて見せ、「メモを書く」「メモを直す」でその場で書けます（閲覧専用のときは見せるだけ）。Ctrl・⌘ を押しながら押すと、今までどおり新しいタブで開きます。

合言葉（トークン）の要る保存先の画像は、`loadImage` で読み方を渡します。`Blob` を返すと、部品が表示用の URL を作り、閉じたときに片づけます。

```tsx
<LinkShelf
  viewImages
  loadImage={async (url) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error('画像を読めませんでした')
    return res.blob()
  }}
/>
```

### 画像リンクのアイコン

URL のパスが `.jpg` `.jpeg` `.png` `.webp` `.gif` で終わるリンクは、サイトのアイコンの代わりに画像の印を出します。アイコンを自分で決めたいときは `linkIcon` を使います（`null` を返すと既定の表示）。

```tsx
<LinkShelf linkIcon={(link) => (link.url.endsWith('.pdf') ? <span>📄</span> : null)} />
```

### リンクの開き方

既定では、リンクは新しいタブで開きます。

```tsx
// 同じサイト（オリジン）のリンクだけ、同じタブで開く
<LinkShelf sameOriginInSameTab />

// 開き方を自分で決める
<LinkShelf openLink={(url, link) => window.location.assign(url)} />
```

どちらの場合も、`javascript:` などの危ない URL は開きません（`openLink` も呼ばれません）。

### ページの名前を取る

ブラウザからは、ほかのサイトのページを直接読めません（CORS という制限）。名前を自動で付けたいときは、サーバー側で名前を取る処理を用意して、`fetchTitle` で渡します。

```tsx
<LinkShelf
  fetchTitle={async (url) => {
    const res = await fetch(`/api/title?url=${encodeURIComponent(url)}`)
    if (!res.ok) return null
    const data = await res.json()
    return typeof data.title === 'string' ? data.title : null
  }}
/>
```

サーバー側の処理の例は [`examples/web/api/title.ts`](https://github.com/shiodome47/linkshelf/blob/main/examples/web/api/title.ts) にあります（Vercel の関数）。内部ネットワークを覗かれないための対策が入っているので、使うときは削らないでください。

### 自分の画面を作る道具（カードの段組みとドラッグ）

棚と同じ「カードを段組みに並べ、ドラッグで好きな列・位置へ動かす」画面を、自分のアプリで一から作るときに使える道具です。`<LinkShelf>` を使わなくても、これだけ取り出して使えます（ドラッグは [@dnd-kit](https://dndkit.com/)）。

| 道具 | すること |
|---|---|
| `layoutCards(cards, 列の数)` | カードを列に並べる。動かしたカードは置いた列・順番のとおり、まだ動かしていないカードはいちばん短い列へ詰める |
| `moveCard(cards, 列の数, 動かすid, 落とす先)` | 動かしたあとの、全カードの列と順番を返す（それを保存する）。落とす先は「あるカードの上・下」か「列のいちばん下」 |
| `flattenCards(cards)` | 1 列で見せるときの順（左上から右へ、段ごとに読む順） |
| `useColumnCount({ minWidth, gap })` | 要素の幅から列の数を決める（幅が変わると数え直す）。返した ref を外側の要素に付ける |
| `useDragSensors()` | ドラッグの始め方（マウスは 5px 動かすと、スマホは長押し 0.25 秒で） |
| `dropPosition(event, overRect)` | 相手の上・下どちらに落とすか。**指（マウス）の位置**で決める（背の高いカードでも、短いカードの上に置ける） |

カードは `{ id, order, column?, size }` の形で渡します（`size` は高さの目安。行の数など）。`moveCard` が返した `column` と `order` を保存しておけば、次から同じ並びになります。

```tsx
const [ref, columnCount] = useColumnCount({ minWidth: 280, gap: 12 })
const columns = layoutCards(cards, columnCount)
const sensors = useDragSensors()

<DndContext
  sensors={sensors}
  onDragEnd={(e) => {
    if (!e.over) return
    const drop = { kind: 'card' as const, id: String(e.over.id), position: dropPosition(e, e.over.rect) }
    save(moveCard(cards, columnCount, String(e.active.id), drop))
  }}
>
  <div ref={ref} style={{ display: 'flex', gap: 12 }}>
    {columns.map((col, i) => (
      <div key={i} style={{ flex: 1 }}>{col.map((c) => <Card key={c.id} card={c} />)}</div>
    ))}
  </div>
</DndContext>
```

### 色を合わせる

色は CSS の変数で決まっています。上書きすると、アプリの色に合わせられます。

```css
.linkshelf {
  --ls-accent: #2563eb; /* 決定のボタン・ドラッグの線 */
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

ライト表示だけ変えるときは `.linkshelf[data-theme='light'] { … }` に書きます。

### 安全のために

- `javascript:` などの危ない URL は、リンクにしません。保存先から読んだ URL も、開く前にもう一度確かめます。
- テキストは文字として表示するだけです（HTML として読み込みません）。
- サイトのアイコンは、そのサイト自身の `/favicon.ico` を読むだけです。外部のアイコンサービスは使いません。

### 見本のページ

[`examples/web`](https://github.com/shiodome47/linkshelf/tree/main/examples/web) に、この部品を使った単独のアプリがあります（[デモ](https://linkshelf-chi.vercel.app)）。データは、開いたブラウザの中だけに保存されます（ほかの端末やほかの人には見えません）。画像も、このブラウザの中（IndexedDB）に置きます（[`localImages.ts`](https://github.com/shiodome47/linkshelf/blob/main/examples/web/src/localImages.ts)。`uploadImage` と `loadImage` の書き方の見本）。チェック項目・カードをたたむ・画像（貼り付け・メモを添えて見る）も試せます。画面の言葉は、ブラウザの言葉に合わせて日本語か英語になります。

---

## English

![linkshelf in dark mode](https://raw.githubusercontent.com/shiodome47/linkshelf/main/docs/images/screenshot-dark.png)

### Features

- Create cards, rename and recolor them, drag to reorder (one column on phones)
- Type a URL and press Enter to add a link; any other single line becomes a note (double-click to edit)
- Longer texts (write one or drop a .txt), search, site icons
- Favorites (star), with a button next to search to show favorites only
- Checklist items (to-dos and daily habits, with `checklist`). Turn on "Make it a checklist item" in the add box, or type `[] …` / `[daily] …`. Daily items are unchecked again when the date changes, and the card header shows "done/total"
- On phones, a category bar to jump between cards; cards can also be made collapsible
- Optional images (you provide the storage): add by button, drop or paste anywhere, shrink large ones, and view them in place with an editable note; control over how links open
- Light / dark theme, Japanese / English labels

### Ideas

Because you can mix links, one-line notes and texts freely across cards, linkshelf fits many uses:

- **Bookmarks**: group the sites you use often into cards such as Work and Hobbies
- **Notes and reminders**: jot things down as one-line notes; use texts for longer ones
- **A simple kanban board**: make “To do”, “Doing” and “Done” cards and drag items across (no due dates or assignees)
- **Research**: collect pages and notes for each topic in its own card
- **Goals**: list the steps and useful links for each goal

Data is saved in the browser (IndexedDB). Styles only apply inside `.linkshelf`, so it works with or without Tailwind in your app. Requires `react` and `react-dom` (18 or 19).

```tsx
<LinkShelf locale="en" />
```

### Props

| Name | Description | Default |
|---|---|---|
| `storage` | Where to save data (see below) | `indexedDbStorage()` |
| `fetchTitle` | `(url) => Promise<string \| null>` that returns a page title | none (titles come from the URL) |
| `theme` | `'light'` / `'dark'` / `'system'` | `'system'` |
| `locale` | Language of the labels: `'ja'` (Japanese) / `'en'` (English) | `'ja'` |
| `title` | Heading | `'リンク集'` (`'Links'` in English) |
| `readOnly` | View-only mode (see below) | `false` |
| `jumpBar` | Category bar for narrow screens: `'auto'` / `'always'` / `'never'` | `'auto'` |
| `collapsible` | Let viewers collapse cards | `false` |
| `collapseKey` | Name used to remember collapsed cards (use different names for two shelves on one site) | `'linkshelf'` |
| `uploadImage` | `(file, { categoryId }) => Promise<{ url, title? }>` that stores an image (see below) | none (no button) |
| `imageMaxSide` | Shrink images so the longer side is at most this many pixels before upload | none |
| `pasteImagesAnywhere` | Accept images pasted anywhere on the page and ask which card to put them on | `false` |
| `viewImages` | Open image links inside the component, with the link's note shown (and editable) below | `false` |
| `loadImage` | `(url, link) => Promise<Blob \| string>` to load images (e.g. with an auth header) | none |
| `linkIcon` | `(link) => ReactNode \| null` to override link icons | none |
| `openLink` | `(url, link) => void` to control how links open | none (new tab) |
| `sameOriginInSameTab` | Open same-origin URLs in the same tab | `false` |
| `checklist` | Let users add checklist items (to-dos and daily habits). Existing items are still shown when `false` | `false` |
| `actions` | Extra elements on the right side of the header (e.g. a theme toggle) | none |
| `className` | Extra class on the root element | none |

`storage` and `fetchTitle` are read once, on first render.

### Storage

```tsx
import { LinkShelf, indexedDbStorage, memoryStorage } from 'linkshelf'

<LinkShelf storage={indexedDbStorage({ name: 'my-links' })} />
<LinkShelf storage={memoryStorage()} />
```

To use your own backend, pass an object that implements `LinkShelfStorage`
(`loadAll`, `putCategory`, `deleteCategory`, `putLink`, `deleteLinks`, and optionally `bulkPut`).
Add an optional `subscribe(onChange)` that returns an unsubscribe function, and the shelf reloads whenever your storage changes from outside (for example, when another device syncs).

### View-only mode

With `readOnly`, visitors can open links, search and show favorites only, but cannot add, edit, delete, reorder or star anything.

```tsx
<LinkShelf storage={siteStorage} readOnly={!isEditor} />
```

`readOnly` only hides the editing UI. To really prevent changes, your storage (server) must also reject writes from anyone but the editors.

### Narrow screens

On phones, cards stack in one column. Two options help:

- **Category bar** (`jumpBar`): a sticky row of category names; tap one to jump to its card. `'auto'` (default) shows it only when cards are in one column.
- **Collapsible cards** (`collapsible`): a button on each card header folds its contents. The state is remembered in the viewer's browser. Cards open automatically while searching or showing favorites only.

If your app has a fixed header, set `--ls-sticky-top` on `.linkshelf` to its height so the bar stops below it.

### Images

Pass `uploadImage` to show an “Add image” button on each card (hidden in `readOnly`). Images can also be dropped on a card or pasted while the card has focus; text and URL pastes work as before. Your function stores the file and returns its URL (relative URLs are fine), and a link is added at the end of the card, titled “Image (YYYY/MM/DD)” unless you return a `title`. If it throws, a short error is shown on the card and nothing is added. JPEG, PNG and WebP are accepted; check size limits inside your function.

```tsx
<LinkShelf uploadImage={async (file) => ({ url: await myUpload(file) })} />
```

Where images are stored is up to you: swap the `uploadImage` function. `imageMaxSide={2000}` shrinks large photos and screenshots first. With `pasteImagesAnywhere`, an image pasted outside any card opens a small dialog to choose the card (the last choice is remembered); pastes into text fields are left alone.

With `viewImages`, clicking an image link opens the image in a dialog with the link's note (`description`) below it; users can write or edit the note there (view only in `readOnly`). Ctrl/⌘-click still opens a new tab. For private images, pass `loadImage`; return a `Blob` and the component creates and revokes the object URL for you.

Links whose path ends in `.jpg`, `.jpeg`, `.png`, `.webp` or `.gif` get an image icon. Use `linkIcon` to override icons (return `null` for the default).

### Opening links

Links open in a new tab by default. `sameOriginInSameTab` opens same-origin URLs in the current tab, and `openLink(url, link)` lets you decide yourself. Unsafe URLs such as `javascript:` are never opened either way.

### Page titles

Browsers cannot read other sites directly (CORS), so fetching titles needs a server. Pass a `fetchTitle` function that calls your endpoint.
[`examples/web/api/title.ts`](https://github.com/shiodome47/linkshelf/blob/main/examples/web/api/title.ts) is an example Vercel function with SSRF protections (address checks, redirect checks, size and time limits). Keep them if you reuse it.

### Building your own board

The layout and drag logic behind the shelf is exported, so you can build your own card board (cards in columns, drag to any column and position) without `<LinkShelf>` (drag uses [@dnd-kit](https://dndkit.com/)):

- `layoutCards(cards, columnCount)` places cards into columns: moved cards keep their saved column and order, others fill the shortest column.
- `moveCard(cards, columnCount, dragId, drop)` returns every card's new `column` and `order` (save them). `drop` is `{ kind: 'card', id, position: 'before' | 'after' }` or `{ kind: 'end', column }`.
- `flattenCards(cards)` gives the single-column reading order.
- `useColumnCount({ minWidth, gap })` returns `[ref, count]` from the element width.
- `useDragSensors()` gives the shelf's sensors (mouse: 5px, touch: 250 ms long press).
- `dropPosition(event, overRect)` decides before/after from the **pointer position**, so tall cards can be dropped above short ones.

Cards are `{ id, order, column?, size }` (`size` is a height estimate, such as a row count).

### Theming

Override the CSS variables on `.linkshelf`: `--ls-bg`, `--ls-card`, `--ls-border`, `--ls-text`, `--ls-muted`, `--ls-accent`, `--ls-danger`.

### Security

- Unsafe URLs such as `javascript:` are never turned into links, and URLs are checked again before opening.
- Texts are rendered as plain text, never as HTML.
- Site icons are loaded from each site's own `/favicon.ico`; no third-party icon service is used.

### Example app

[`examples/web`](https://github.com/shiodome47/linkshelf/tree/main/examples/web) is a standalone app built with this component ([demo](https://linkshelf-chi.vercel.app)). Everything, images included, is stored only in your browser ([`localImages.ts`](https://github.com/shiodome47/linkshelf/blob/main/examples/web/src/localImages.ts) shows how to write `uploadImage` and `loadImage`). You can try checklists, collapsible cards, and images (paste anywhere, view with a note). Labels follow your browser language (Japanese or English).

## License

[MIT](https://github.com/shiodome47/linkshelf/blob/main/LICENSE)
