/**
 * カードに置くテキスト（txt ファイルの覚書など）。
 * 画像・PDF などはクラウドに置いてリンクで登録し、テキストだけは部品の中に保存してすぐ読めるようにする。
 * 保存先が重くならないように、大きさに上限を設ける。
 */

import { MESSAGES, type LinkShelfMessages } from './i18n'

/** 1 つのテキストの上限（UTF-8 で 100KB。原稿用紙なら 100 枚以上） */
export const TEXT_LIMIT_BYTES = 100 * 1024

export const textBytes = (text: string) => new TextEncoder().encode(text).length

export function formatBytes(n: number): string {
  return n < 1024 ? `${n} B` : `${Math.round((n / 1024) * 10) / 10} KB`
}

/** 上限を超えていればエラーの文を返す（m は画面の言葉。省くと日本語） */
export function textLimitError(text: string, m: LinkShelfMessages = MESSAGES.ja): string | null {
  const n = textBytes(text)
  return n > TEXT_LIMIT_BYTES ? m.textTooBig(formatBytes(n), formatBytes(TEXT_LIMIT_BYTES)) : null
}

/**
 * テキストファイルを読む。UTF-8 で読めなければ Shift_JIS（Windows のメモ帳の古い形式）として読む。
 * 上限を超えるときはエラーを投げる。
 */
export async function readTextFile(
  file: File,
  m: LinkShelfMessages = MESSAGES.ja,
): Promise<{ title: string; text: string }> {
  if (file.size > TEXT_LIMIT_BYTES) {
    throw new Error(m.fileTooBig(formatBytes(file.size), formatBytes(TEXT_LIMIT_BYTES)))
  }
  const buf = await file.arrayBuffer()
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    text = new TextDecoder('shift_jis').decode(buf)
  }
  text = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const title = file.name.replace(/\.(txt|text|md)$/i, '') || m.untitledText
  return { title, text }
}

/** テキストファイルとして選べるもの */
export const TEXT_ACCEPT = '.txt,.text,.md,text/plain,text/markdown'
