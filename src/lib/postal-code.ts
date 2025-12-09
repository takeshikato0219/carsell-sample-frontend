/**
 * 郵便番号から住所を取得するユーティリティ
 */

export interface PostalCodeResult {
  postalCode: string
  prefecture: string
  city: string
  town: string
  fullAddress: string
}

/**
 * 郵便番号から住所を取得
 * 実際の実装では郵便番号APIを使用（例: zipcloud.ibsnet.co.jp）
 */
export async function getAddressFromPostalCode(postalCode: string): Promise<PostalCodeResult | null> {
  // ハイフンを除去して7桁の数字のみにする
  const cleanedCode = postalCode.replace(/[^0-9]/g, '')

  if (cleanedCode.length !== 7) {
    return null
  }

  try {
    // 郵便番号検索API（zipcloud）を使用
    const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanedCode}`)
    const data = await response.json()

    if (data.status === 200 && data.results && data.results.length > 0) {
      const result = data.results[0]
      return {
        postalCode: `${cleanedCode.slice(0, 3)}-${cleanedCode.slice(3)}`,
        prefecture: result.address1,
        city: result.address2,
        town: result.address3,
        fullAddress: `${result.address1}${result.address2}${result.address3}`
      }
    }

    return null
  } catch (error) {
    console.error('Failed to fetch address from postal code:', error)
    return null
  }
}

/**
 * 画像から郵便番号を抽出
 */
export function extractPostalCodeFromText(text: string): string | null {
  // 郵便番号のパターンを検出（例: 123-4567, 1234567）
  const patterns = [
    /(\d{3})-?(\d{4})/,  // 123-4567 または 1234567
    /〒\s*(\d{3})-?(\d{4})/, // 〒123-4567
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      if (match.length === 3) {
        return `${match[1]}-${match[2]}`
      } else if (match.length === 2) {
        const code = match[1].replace(/[^0-9]/g, '')
        if (code.length === 7) {
          return `${code.slice(0, 3)}-${code.slice(3)}`
        }
      }
    }
  }

  return null
}

/**
 * 住所文字列から郵便番号を推測
 */
export async function guessPostalCodeFromAddress(address: string): Promise<string | null> {
  // 簡易的な実装：主要都市の郵便番号データベース
  const knownAddresses: Record<string, string> = {
    '栃木県那須郡那須町': '325-0',
    '栃木県宇都宮市': '320-0',
    '東京都渋谷区': '150-0',
    '東京都新宿区': '160-0',
    '東京都港区': '105-0',
    // 実際の実装ではより包括的なデータベースを使用
  }

  for (const [addr, code] of Object.entries(knownAddresses)) {
    if (address.includes(addr)) {
      return code
    }
  }

  return null
}
