# linkshelf

リンク・1 行メモ・長めのテキストを、カードに分けて棚に並べる React の部品です。
A React component that organizes links, one-line notes and longer texts into cards on a shelf.

- [日本語](#日本語)
- [English](#english)

---

## 日本語

### できること

- カテゴリ（カード）を作る・名前と色を変える・消す
- カードをドラッグで並べ替える（置いた場所に、そのとおり並ぶ。スマホでは 1 列）
- カードの中のリンクをドラッグで並べ替える・別のカードへ移す
- 入力欄に URL を入れて Enter でリンク、URL でない 1 行の文は 1 行テキスト
- 1 行テキストはダブルクリックでその場で書き換え
- 長めのテキスト（「テキストを書く」「.txt を置く」）と、全文の表示
- お気に入り（星）・検索・サイトのアイコン・ライト / ダーク表示

### 入れ方

```bash
npm install linkshelf
```

`react` と `react-dom`（18 か 19）が必要です。

### 使い方

```tsx
import { LinkShelf } from 'linkshelf'
import 'linkshelf/style.css'

export function App() {
  return <LinkShelf />
}
```

これだけで動きます。データはブラウザの中（IndexedDB）に保存されます。
見た目は `.linkshelf` の中だけに効くので、Tailwind が無いアプリでも、あるアプリでも使えます。

### 設定（props）

| 名前 | 意味 | 既定 |
|---|---|---|
| `storage` | 保存先（下の「保存先を変える」） | `indexedDbStorage()` |
| `fetchTitle` | ページの名前を取る関数 `(url) => Promise<string \| null>` | なし（名前は URL から作る） |
| `theme` | `'light'` / `'dark'` / `'system'`（端末の設定に合わせる） | `'system'` |
| `title` | 見出し | `'リンク集'` |
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
}
```

### ページの名前を取る

ブラウザからは、ほかのサイトのページを直接読めません（CORS という制限）。
名前を自動で付けたいときは、サーバー側で名前を取る処理を用意して、`fetchTitle` で渡します。

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

サーバー側の処理の例は [`examples/web/api/title.ts`](./examples/web/api/title.ts) にあります（Vercel の関数）。
内部ネットワークを覗かれないための対策が入っているので、使うときは削らないでください。

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

[`examples/web`](./examples/web) に、この部品を使った単独のアプリがあります（https://linkshelf-chi.vercel.app ）。
データは、開いたブラウザの中だけに保存されます（ほかの端末やほかの人には見えません）。見出しの右のボタンで、自動・ライト・ダークを切り替えられます。

```bash
npm run build:example
```

Vercel に置くときは、プロジェクトの Root Directory を `examples/web` にします（設定は `examples/web/vercel.json`）。

---

## English

### Features

- Create, rename, recolor and delete categories (cards)
- Drag cards to reorder them (they stay where you drop them; one column on phones)
- Drag links to reorder them or move them to another card
- Type a URL and press Enter to add a link; any other single line becomes a one-line note
- Double-click a one-line note to edit it in place
- Longer texts ("Write text", "Drop a .txt") with a full-text viewer
- Favorites (star), search, site icons, light / dark theme

The built-in labels are in Japanese.

### Install

```bash
npm install linkshelf
```

Requires `react` and `react-dom` (18 or 19).

### Usage

```tsx
import { LinkShelf } from 'linkshelf'
import 'linkshelf/style.css'

export function App() {
  return <LinkShelf />
}
```

Data is saved in the browser (IndexedDB). Styles only apply inside `.linkshelf`, so it works with or without Tailwind in your app.

### Props

| Name | Description | Default |
|---|---|---|
| `storage` | Where to save data (see below) | `indexedDbStorage()` |
| `fetchTitle` | `(url) => Promise<string \| null>` that returns a page title | none (titles come from the URL) |
| `theme` | `'light'` / `'dark'` / `'system'` | `'system'` |
| `title` | Heading | `'リンク集'` |
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

### Page titles

Browsers cannot read other sites directly (CORS), so fetching titles needs a server.
Pass a `fetchTitle` function that calls your endpoint.
[`examples/web/api/title.ts`](./examples/web/api/title.ts) is an example Vercel function with SSRF protections (address checks, redirect checks, size and time limits). Keep them if you reuse it.

### Theming

Override the CSS variables on `.linkshelf`: `--ls-bg`, `--ls-card`, `--ls-border`, `--ls-text`, `--ls-muted`, `--ls-accent`, `--ls-danger`.

### Security

- Unsafe URLs such as `javascript:` are never turned into links, and URLs are checked again before opening.
- Texts are rendered as plain text, never as HTML.
- Site icons are loaded from each site's own `/favicon.ico`; no third-party icon service is used.

## License

[MIT](./LICENSE)
