/**
 * カードに置くテキスト（txt ファイルの覚書など）。
 * 画像・PDF などはクラウドに置いてリンクで登録し、テキストだけは部品の中に保存してすぐ読めるようにする。
 * 保存先が重くならないように、大きさに上限を設ける。
 */

/** 1 つのテキストの上限（UTF-8 で 100KB。原稿用紙なら 100 枚以上） */
export const TEXT_LIMIT_BYTES = 100 * 1024

export const textBytes = (text: string) => new TextEncoder().encode(text).length

export function formatBytes(n: number): string {
  return n < 1024 ? `${n} B` : `${Math.round((n / 1024) * 10) / 10} KB`
}

/** 上限を超えていればエラーの文を返す */
export function textLimitError(text: string): string | null {
  const n = textBytes(text)
  return n > TEXT_LIMIT_BYTES
    ? `テキストが大きすぎます（${formatBytes(n)}）。${formatBytes(TEXT_LIMIT_BYTES)} までにしてください。大きなファイルはクラウドなどに置いて、リンクで登録してください。`
    : null
}

/**
 * テキストファイルを読む。UTF-8 で読めなければ Shift_JIS（Windows のメモ帳の古い形式）として読む。
 * 上限を超えるときはエラーを投げる。
 */
export async function readTextFile(file: File): Promise<{ title: string; text: string }> {
  if (file.size > TEXT_LIMIT_BYTES) {
    throw new Error(
      `ファイルが大きすぎます（${formatBytes(file.size)}）。${formatBytes(TEXT_LIMIT_BYTES)} までのテキストファイルを置けます。大きなファイルはクラウドなどに置いて、リンクで登録してください。`,
    )
  }
  const buf = await file.arrayBuffer()
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    text = new TextDecoder('shift_jis').decode(buf)
  }
  text = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const title = file.name.replace(/\.(txt|text|md)$/i, '') || 'テキスト'
  return { title, text }
}

/** テキストファイルとして選べるもの */
export const TEXT_ACCEPT = '.txt,.text,.md,text/plain,text/markdown'
