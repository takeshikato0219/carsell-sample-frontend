/**
 * 画像前処理ユーティリティ
 * OCR精度向上のための画像処理機能
 */

export interface ImageQuality {
  score: number
  message: string
  suggestions: string[]
}

export interface ProcessedImage {
  processedDataUrl: string
  originalDataUrl: string
  width: number
  height: number
  quality: ImageQuality
}

/**
 * 画像を前処理してOCR精度を向上させる
 */
export async function preprocessImage(file: File): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const originalDataUrl = e.target?.result as string
      const img = new Image()

      img.onload = () => {
        // Canvasで画像処理
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        // 最適なサイズにリサイズ（大きすぎる画像は縮小、小さすぎる画像は拡大）
        const maxWidth = 2000
        const maxHeight = 2000
        let width = img.width
        let height = img.height

        // アスペクト比を保持してリサイズ
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        canvas.width = width
        canvas.height = height

        // 画像を描画
        ctx.drawImage(img, 0, 0, width, height)

        // コントラストと明るさを調整
        const imageData = ctx.getImageData(0, 0, width, height)
        enhanceContrast(imageData, 1.2) // コントラスト調整
        ctx.putImageData(imageData, 0, 0)

        // 高品質でエンコード
        const processedDataUrl = canvas.toDataURL('image/jpeg', 0.95)

        // 画像品質を評価
        const quality = assessImageQuality(width, height)

        resolve({
          processedDataUrl,
          originalDataUrl,
          width,
          height,
          quality,
        })
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = originalDataUrl
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * コントラストを強化
 */
function enhanceContrast(imageData: ImageData, factor: number) {
  const data = imageData.data
  const contrast = (factor - 1) * 255
  const intercept = 128 * (1 - factor)

  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i] * factor + intercept     // R
    data[i + 1] = data[i + 1] * factor + intercept // G
    data[i + 2] = data[i + 2] * factor + intercept // B
  }
}

/**
 * 画像の品質を評価
 */
export function assessImageQuality(width: number, height: number): {
  score: number
  message: string
  suggestions: string[]
} {
  const pixels = width * height
  const suggestions: string[] = []
  let score = 100

  // 解像度チェック
  if (pixels < 300000) {
    score -= 30
    suggestions.push('画像が小さすぎます。もっと近づいて撮影してください')
  } else if (pixels < 500000) {
    score -= 15
    suggestions.push('画像がやや小さいです。可能であればより高解像度で撮影してください')
  }

  // アスペクト比チェック（A4用紙は約1.4）
  const aspectRatio = width / height
  if (aspectRatio < 0.6 || aspectRatio > 1.8) {
    score -= 20
    suggestions.push('用紙全体が写るように撮影してください')
  }

  let message = ''
  if (score >= 80) {
    message = '良好'
  } else if (score >= 60) {
    message = 'やや不十分'
  } else {
    message = '要改善'
  }

  return { score, message, suggestions }
}
