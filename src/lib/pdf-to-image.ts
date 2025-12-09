/**
 * PDF to Image 変換ユーティリティ
 * PDF.jsを使用してPDFページを画像に変換
 */

export interface PDFConversionResult {
  imageDataUrl: string
  pageNumber: number
  totalPages: number
}

// pdfjs-dist v3.11.174 用のCDN workerパス
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

/**
 * PDFファイルの最初のページを画像に変換
 */
export async function convertPDFToImage(
  file: File,
  scale: number = 2.0 // 高解像度のためスケールを上げる
): Promise<PDFConversionResult> {
  // 動的インポートでpdfjs-distを読み込む
  const pdfjsLib = await import('pdfjs-dist')

  // CDNからworkerを読み込む
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL

  const arrayBuffer = await file.arrayBuffer()

  // PDFドキュメントを読み込み
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  })

  const pdf = await loadingTask.promise
  const page = await pdf.getPage(1) // 最初のページを取得

  const viewport = page.getViewport({ scale })

  // Canvasを作成
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas context not available')
  }

  canvas.width = viewport.width
  canvas.height = viewport.height

  // PDFページをCanvasにレンダリング
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  }

  await page.render(renderContext).promise

  // Canvasを画像データURLに変換
  const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95)

  return {
    imageDataUrl,
    pageNumber: 1,
    totalPages: pdf.numPages,
  }
}

/**
 * PDFファイルの全ページを画像に変換
 */
export async function convertAllPDFPagesToImages(
  file: File,
  scale: number = 2.0
): Promise<PDFConversionResult[]> {
  const pdfjsLib = await import('pdfjs-dist')

  // CDNからworkerを読み込む
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL

  const arrayBuffer = await file.arrayBuffer()

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  })

  const pdf = await loadingTask.promise
  const results: PDFConversionResult[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas context not available')
    }

    canvas.width = viewport.width
    canvas.height = viewport.height

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    }

    await page.render(renderContext).promise

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95)

    results.push({
      imageDataUrl,
      pageNumber: pageNum,
      totalPages: pdf.numPages,
    })
  }

  return results
}

/**
 * ファイルがPDFかどうかを判定
 */
export function isPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
