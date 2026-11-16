/** カテゴリの色（カード見出しの点に使う）。明暗どちらのテーマでも見える濃さ */
export const CATEGORY_COLORS = [
  { value: 'teal', label: 'ティール', bgClass: 'bg-teal-500' },
  { value: 'blue', label: 'ブルー', bgClass: 'bg-blue-500' },
  { value: 'purple', label: 'パープル', bgClass: 'bg-purple-500' },
  { value: 'pink', label: 'ピンク', bgClass: 'bg-pink-500' },
  { value: 'orange', label: 'オレンジ', bgClass: 'bg-orange-500' },
  { value: 'red', label: 'レッド', bgClass: 'bg-red-500' },
  { value: 'yellow', label: 'イエロー', bgClass: 'bg-yellow-500' },
  { value: 'green', label: 'グリーン', bgClass: 'bg-green-500' },
]

export function categoryColorClass(color: string | undefined): string {
  return CATEGORY_COLORS.find((c) => c.value === color)?.bgClass ?? 'bg-neutral-500'
}
