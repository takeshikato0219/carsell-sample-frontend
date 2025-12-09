// CSVエクスポート/インポートユーティリティ

import { Customer, CustomerStatus } from '@/types'
import Encoding from 'encoding-japanese'

// 都道府県から地区を判定
export function getRegionFromAddress(address: string | undefined): string {
  if (!address) return ''

  // 都道府県と地区のマッピング
  const regionMap: Record<string, string> = {
    // 北海道
    '北海道': '北海道',
    // 東北
    '青森': '東北', '岩手': '東北', '宮城': '東北', '秋田': '東北', '山形': '東北', '福島': '東北',
    // 関東
    '茨城': '関東', '栃木': '関東', '群馬': '関東', '埼玉': '関東', '千葉': '関東', '東京': '関東', '神奈川': '関東',
    // 中部（甲信越）
    '新潟': '甲信越', '長野': '甲信越', '山梨': '甲信越',
    // 中部（北陸）
    '富山': '北陸', '石川': '北陸', '福井': '北陸',
    // 中部（東海）
    '岐阜': '東海', '静岡': '東海', '愛知': '東海', '三重': '東海',
    // 近畿
    '滋賀': '近畿', '京都': '近畿', '大阪': '近畿', '兵庫': '近畿', '奈良': '近畿', '和歌山': '近畿',
    // 中国
    '鳥取': '中国', '島根': '中国', '岡山': '中国', '広島': '中国', '山口': '中国',
    // 四国
    '徳島': '四国', '香川': '四国', '愛媛': '四国', '高知': '四国',
    // 九州
    '福岡': '九州', '佐賀': '九州', '長崎': '九州', '熊本': '九州', '大分': '九州', '宮崎': '九州', '鹿児島': '九州',
    // 沖縄
    '沖縄': '沖縄',
  }

  for (const [prefecture, region] of Object.entries(regionMap)) {
    if (address.includes(prefecture)) {
      return region
    }
  }

  return ''
}

// CSVヘッダー（A列からU列まで）
// ユーザー指定のフォーマット:
// A: ステータス, B: 空欄, C: 空欄, D: 担当名, E: お客様名, F: フリガナ,
// G: 郵便番号, H: 住所, I: 住所２, J: 地区名（県から自動割当）, K: 電話番号１, L: 電話番号２,
// M: ファーストコンタクト, N: ファーストコンタクト２, O: いつの展示会か,
// P: 空欄, Q: 空欄, R: 空欄, S: 空欄, T: 空欄, U: いつ契約したか
const CSV_HEADERS = [
  'ステータス',           // A: ステータス
  '',                     // B: 空欄
  '',                     // C: 空欄
  '担当名',               // D
  'お客様名',             // E
  'フリガナ',             // F
  '郵便番号',             // G
  '住所',                 // H
  '住所２',               // I
  '地区名',               // J
  '電話番号１',           // K
  '電話番号２',           // L
  'ファーストコンタクト', // M
  'ファーストコンタクト２', // N
  '展示会',               // O
  '',                     // P: 空欄
  '',                     // Q: 空欄
  '',                     // R: 空欄
  '',                     // S: 空欄
  '',                     // T: 空欄
  '契約日',               // U
]

// 列インデックス定数（0ベース）
// A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12, N=13, O=14, P=15, Q=16, R=17, S=18, T=19, U=20
const COL = {
  A_STATUS: 0,              // ステータス
  B: 1, C: 2,
  D_SALES_REP: 3,           // 担当名
  E_NAME: 4,                // お客様名
  F_KANA: 5,                // フリガナ
  G_POSTAL: 6,              // 郵便番号
  H_ADDRESS: 7,             // 住所
  I_ADDRESS2: 8,            // 住所２
  J_REGION: 9,              // 地区名
  K_PHONE1: 10,             // 電話番号１
  L_PHONE2: 11,             // 電話番号２
  M_FIRST_CONTACT: 12,      // ファーストコンタクト
  N_FIRST_CONTACT2: 13,     // ファーストコンタクト２
  O_EXHIBITION: 14,         // いつの展示会か
  P: 15, Q: 16, R: 17, S: 18, T: 19,
  U_CONTRACT_DATE: 20,      // いつ契約したか
}

// A列のステータス文字列をCustomerStatusに変換
// オーナー→オーナー、それ以外→ランクC
function parseStatusFromCSV(statusStr: string): CustomerStatus {
  const status = statusStr?.trim() || ''
  const statusUpper = status.toUpperCase()

  // デバッグ: 文字コードを確認
  const charCodes = Array.from(status).map(c => c.charCodeAt(0).toString(16)).join(' ')
  console.log(`parseStatusFromCSV: "${status}" (charCodes: ${charCodes})`)

  // オーナー（様々な表記に対応）
  if (
    status.includes('オーナー') ||      // 全角カタカナ
    status.includes('ｵｰﾅｰ') ||          // 半角カタカナ
    status.includes('おーなー') ||       // ひらがな
    status.includes('オ') && status.includes('ナ') ||  // 部分一致
    statusUpper === 'OWNER' ||
    statusUpper.includes('OWNER')
  ) {
    console.log(`parseStatusFromCSV: → OWNER`)
    return CustomerStatus.OWNER
  }

  // それ以外は全てランクC（HOT含む）
  console.log(`parseStatusFromCSV: → RANK_C`)
  return CustomerStatus.RANK_C
}

// CustomerStatusを日本語ステータス文字列に変換
function statusToCSVString(status: CustomerStatus | undefined): string {
  switch (status) {
    case CustomerStatus.OWNER:
      return 'オーナー'
    case CustomerStatus.CONTRACT:
      return '契約'
    case CustomerStatus.AWAITING_DELIVERY:
      return '納車待ち'
    case CustomerStatus.RANK_A:
      return 'ランクA'
    case CustomerStatus.RANK_B:
      return 'ランクB'
    case CustomerStatus.RANK_C:
      return 'ランクC'
    case CustomerStatus.RANK_N:
      return 'ランクN'
    case CustomerStatus.NEW:
      return '新規'
    default:
      return ''
  }
}

// 顧客データをCSV行に変換（新フォーマット）
function customerToCSVRow(customer: Customer): string[] {
  const region = customer.region || getRegionFromAddress(customer.address)
  const firstContactDate = customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('ja-JP') : ''

  // 21列分の配列を作成
  const row: string[] = new Array(21).fill('')

  row[COL.A_STATUS] = statusToCSVString(customer.status)            // A: ステータス
  row[COL.D_SALES_REP] = customer.assignedSalesRepName || ''        // D: 担当名
  row[COL.E_NAME] = customer.name || ''                             // E: お客様名
  row[COL.F_KANA] = customer.nameKana || ''                         // F: フリガナ
  row[COL.G_POSTAL] = customer.postalCode || ''                     // G: 郵便番号
  row[COL.H_ADDRESS] = customer.address || ''                       // H: 住所
  row[COL.I_ADDRESS2] = customer.address2 || ''                     // I: 住所２
  row[COL.J_REGION] = region                                        // J: 地区名（県から自動割当）
  row[COL.K_PHONE1] = customer.phone || ''                          // K: 電話番号１
  row[COL.L_PHONE2] = customer.mobile || ''                         // L: 電話番号２
  row[COL.M_FIRST_CONTACT] = firstContactDate                       // M: ファーストコンタクト
  row[COL.N_FIRST_CONTACT2] = ''                                    // N: ファーストコンタクト２
  row[COL.O_EXHIBITION] = customer.source || ''                     // O: いつの展示会か
  row[COL.U_CONTRACT_DATE] = customer.contractDate || ''            // U: いつ契約したか

  return row
}

// CSVエスケープ処理
function escapeCSVField(field: string): string {
  // nullやundefinedは空文字列に変換
  if (field == null) return ''

  const str = String(field)
  // カンマ、ダブルクォート、改行を含む場合はダブルクォートで囲む
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// 顧客データをCSVにエクスポート
export function exportCustomersToCSV(customers: Customer[]): string {
  // ヘッダー行
  const headerRow = CSV_HEADERS.map(escapeCSVField).join(',')

  // データ行（オーナー以外をフィルタ）
  const nonOwnerCustomers = customers.filter(c => c.status !== CustomerStatus.OWNER)
  const dataRows = nonOwnerCustomers.map((customer) =>
    customerToCSVRow(customer).map(escapeCSVField).join(',')
  )

  return [headerRow, ...dataRows].join('\r\n')
}

// オーナーデータをCSVにエクスポート
export function exportOwnersToCSV(customers: Customer[]): string {
  const headerRow = CSV_HEADERS.map(escapeCSVField).join(',')

  const owners = customers.filter(c => c.status === CustomerStatus.OWNER)
  const dataRows = owners.map((customer) =>
    customerToCSVRow(customer).map(escapeCSVField).join(',')
  )

  return [headerRow, ...dataRows].join('\r\n')
}

// 全顧客データをCSVにエクスポート
export function exportAllCustomersToCSV(customers: Customer[]): string {
  const headerRow = CSV_HEADERS.map(escapeCSVField).join(',')

  const dataRows = customers.map((customer) =>
    customerToCSVRow(customer).map(escapeCSVField).join(',')
  )

  return [headerRow, ...dataRows].join('\r\n')
}

// CSVファイルをダウンロード（Shift-JIS形式）
export function downloadCSV(csv: string, filename: string): void {
  try {
    // Shift-JISに変換してExcelで文字化けしないように
    const unicodeArray = Encoding.stringToCode(csv)
    const sjisArray = Encoding.convert(unicodeArray, {
      to: 'SJIS',
      from: 'UNICODE',
    })
    const uint8Array = new Uint8Array(sjisArray)

    const blob = new Blob([uint8Array], { type: 'text/csv;charset=shift_jis' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log('CSV Export - Downloaded:', filename)
  } catch (error) {
    console.error('CSV Export - Error:', error)
    throw error
  }
}

// CSVをパース（カンマ区切り、タブ区切り両対応）
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = []

  // 行に分割（改行コードを統一）
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  // デリミタを自動判定（最初の行を確認）
  let delimiter = ','
  if (lines.length > 0) {
    const firstLine = lines[0]
    const tabCount = (firstLine.match(/\t/g) || []).length
    const commaCount = (firstLine.match(/,/g) || []).length

    // タブの方が多ければタブ区切りと判定
    if (tabCount > commaCount) {
      delimiter = '\t'
    }
    console.log('CSV Parse - Delimiter detected:', delimiter === '\t' ? 'TAB' : 'COMMA', `(tabs: ${tabCount}, commas: ${commaCount})`)
  }

  for (const line of lines) {
    if (!line.trim()) continue // 空行をスキップ

    const row: string[] = []
    let currentField = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          // エスケープされたダブルクォート
          currentField += '"'
          i++
        } else if (char === '"') {
          // クォート終了
          inQuotes = false
        } else {
          currentField += char
        }
      } else {
        if (char === '"') {
          // クォート開始
          inQuotes = true
        } else if (char === delimiter) {
          // フィールド区切り
          row.push(currentField.trim())
          currentField = ''
        } else {
          currentField += char
        }
      }
    }

    // 最後のフィールドを追加
    row.push(currentField.trim())
    rows.push(row)
  }

  return rows
}

// BOM（Byte Order Mark）を除去
function removeBOM(text: string): string {
  // UTF-8 BOM: \uFEFF
  if (text.charCodeAt(0) === 0xFEFF) {
    return text.slice(1)
  }
  return text
}

// ユーザー情報の型（user-permissions-storeと同じ）
export interface UserInfo {
  id: string
  name: string
}

// 住所から都道府県を抽出
function extractPrefecture(address: string): string {
  if (!address) return ''
  const match = address.match(/^(.+?[都道府県])/)
  return match ? match[1] : ''
}

// 重複警告の型
export interface DuplicateWarning {
  csvRow: number
  name: string
  prefecture: string
  existingCustomerId: string
  existingCustomerName: string
}

// CSVファイルをインポート
// フォーマット: A-C空欄, D担当名, Eお客様名, Fフリガナ, G郵便番号, H住所, I住所２,
// J地区名, K電話番号１, L電話番号２, Mファーストコンタクト, Nファーストコンタクト２,
// O展示会, P-T空欄, U契約日
// usersリストを渡すと、担当名からユーザーIDを自動紐づけ
// existingCustomersを渡すと、名前と県の一致で重複警告を生成
export function importCustomersFromCSV(
  csvText: string,
  users?: UserInfo[],
  existingCustomers?: { id: string; name: string; address?: string }[]
): { customers: Partial<Customer>[]; errors: string[]; duplicateWarnings: DuplicateWarning[] } {
  const errors: string[] = []
  const customers: Partial<Customer>[] = []
  const duplicateWarnings: DuplicateWarning[] = []

  try {
    // BOMを除去
    const cleanedText = removeBOM(csvText)
    console.log('CSV Import - Text length:', cleanedText.length)
    console.log('CSV Import - First 300 chars:', cleanedText.substring(0, 300))

    const rows = parseCSV(cleanedText)

    if (rows.length === 0) {
      errors.push('CSVファイルが空です')
      return { customers, errors, duplicateWarnings }
    }

    console.log('CSV Import - Total rows parsed:', rows.length)
    console.log('CSV Import - First row columns:', rows[0]?.length)

    // 最初の5行をデバッグ出力
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      console.log(`CSV Import - Row ${i}:`, JSON.stringify(rows[i]))
    }

    // 全行を処理
    let importedCount = 0
    let skippedCount = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // 空行をスキップ
      if (row.length === 0 || (row.length === 1 && !row[0])) {
        console.log(`CSV Import - Row ${i + 1}: Empty row, skipping`)
        skippedCount++
        continue
      }

      // 列数が足りない場合は配列を拡張
      while (row.length < 21) {
        row.push('')
      }

      // E列（インデックス4）: お客様名を取得
      const customerName = row[COL.E_NAME]?.trim() || ''

      // デバッグ出力
      console.log(`CSV Import - Row ${i + 1}: E列(name)="${customerName}", D列(rep)="${row[COL.D_SALES_REP]?.trim()}", F列(kana)="${row[COL.F_KANA]?.trim()}"`)

      // お客様名が空の場合はスキップ
      if (!customerName) {
        console.log(`CSV Import - Row ${i + 1}: No customer name in E column, skipping`)
        skippedCount++
        continue
      }

      // ヘッダー行の判定（「お客様」「名前」「氏名」などが含まれていたらスキップ）
      const headerKeywords = ['お客様名', 'お客様', '名前', '氏名', 'name', 'NAME', '顧客名']
      if (headerKeywords.some(keyword => customerName === keyword || customerName.includes('お客様名'))) {
        console.log(`CSV Import - Row ${i + 1}: Header row detected ("${customerName}"), skipping`)
        skippedCount++
        continue
      }

      try {
        // 住所から地区を自動判定
        const address = row[COL.H_ADDRESS]?.trim() || ''
        const region = row[COL.J_REGION]?.trim() || getRegionFromAddress(address)

        // ファーストコンタクト日をパース
        let createdAt = new Date().toISOString()
        const firstContactStr = row[COL.M_FIRST_CONTACT]?.trim()
        if (firstContactStr) {
          try {
            // YYYY/MM/DD または YYYY-MM-DD または YYYY年MM月DD日 形式に対応
            const dateStr = firstContactStr
              .replace(/年/g, '-')
              .replace(/月/g, '-')
              .replace(/日/g, '')
              .replace(/\//g, '-')
            const parsed = new Date(dateStr)
            if (!isNaN(parsed.getTime())) {
              createdAt = parsed.toISOString()
            }
          } catch {
            // パース失敗時は現在日時
          }
        }

        const uniqueId = `csv-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`

        // 担当名からユーザーIDを自動紐づけ
        const salesRepName = row[COL.D_SALES_REP]?.trim() || ''
        let assignedSalesRepId: string | undefined = undefined

        if (salesRepName && users && users.length > 0) {
          // 完全一致で検索
          const matchedUser = users.find(user => user.name === salesRepName)
          if (matchedUser) {
            assignedSalesRepId = matchedUser.id
            console.log(`CSV Import - Row ${i + 1}: 担当名「${salesRepName}」をユーザーID「${matchedUser.id}」に紐づけました`)
          } else {
            // 部分一致で検索（姓のみ or 名のみの場合）
            const partialMatch = users.find(user =>
              user.name.includes(salesRepName) || salesRepName.includes(user.name)
            )
            if (partialMatch) {
              assignedSalesRepId = partialMatch.id
              console.log(`CSV Import - Row ${i + 1}: 担当名「${salesRepName}」を部分一致でユーザー「${partialMatch.name}」(ID: ${partialMatch.id})に紐づけました`)
            } else {
              console.log(`CSV Import - Row ${i + 1}: 担当名「${salesRepName}」に一致するユーザーが見つかりませんでした`)
            }
          }
        }

        // A列からステータスを読み取る
        const statusStr = row[COL.A_STATUS]?.trim() || ''
        const status = parseStatusFromCSV(statusStr)
        console.log(`CSV Import - Row ${i + 1}: A列(status)="${statusStr}" → ${status}`)

        const customer: Partial<Customer> = {
          id: uniqueId,
          customerNumber: `C${Date.now()}-${i}`,
          assignedSalesRepId: assignedSalesRepId,                      // 自動紐づけされたユーザーID
          assignedSalesRepName: salesRepName,                          // D列: 担当名
          name: customerName,                                          // E列: お客様名
          nameKana: row[COL.F_KANA]?.trim() || '',                    // F列: フリガナ
          postalCode: row[COL.G_POSTAL]?.trim() || '',                // G列: 郵便番号
          address: address,                                            // H列: 住所
          address2: row[COL.I_ADDRESS2]?.trim() || '',                // I列: 住所２
          region: region,                                              // J列: 地区名
          phone: row[COL.K_PHONE1]?.trim() || row[COL.L_PHONE2]?.trim() || '',  // K列優先、なければL列
          mobile: row[COL.K_PHONE1]?.trim() ? (row[COL.L_PHONE2]?.trim() || '') : '',  // K列があればL列をmobileに
          source: row[COL.O_EXHIBITION]?.trim() || '',                // O列: 展示会
          contractDate: row[COL.U_CONTRACT_DATE]?.trim() || '',       // U列: 契約日
          status: status,                                              // A列: ステータス
          createdAt: createdAt,
          updatedAt: new Date().toISOString(),
        }

        // 重複チェック（名前と県が一致する既存顧客を検索）
        if (existingCustomers && existingCustomers.length > 0) {
          const csvPrefecture = extractPrefecture(address)
          const duplicate = existingCustomers.find(existing => {
            // 名前が一致するかチェック
            if (existing.name !== customerName) return false
            // 県が一致するかチェック（両方空の場合も一致とみなす）
            const existingPrefecture = extractPrefecture(existing.address || '')
            return csvPrefecture === existingPrefecture
          })

          if (duplicate) {
            duplicateWarnings.push({
              csvRow: i + 1,
              name: customerName,
              prefecture: csvPrefecture || '(県なし)',
              existingCustomerId: duplicate.id,
              existingCustomerName: duplicate.name
            })
            console.log(`CSV Import - Row ${i + 1}: 重複の可能性: "${customerName}" (${csvPrefecture || '県なし'})`)
          }
        }

        customers.push(customer)
        importedCount++
        console.log(`CSV Import - Row ${i + 1}: Successfully parsed customer: "${customer.name}"`)
      } catch (error) {
        console.error(`CSV Import - Row ${i + 1} conversion error:`, error)
        errors.push(`行 ${i + 1}: データの変換に失敗しました`)
      }
    }

    console.log(`CSV Import - Summary: ${importedCount} imported, ${skippedCount} skipped, ${duplicateWarnings.length} duplicates, ${errors.length} errors`)

    // デバッグ情報
    if (customers.length === 0 && errors.length === 0) {
      errors.push(`データが見つかりませんでした。`)
      errors.push(`総行数: ${rows.length}`)
      if (rows.length > 0) {
        errors.push(`1行目の列数: ${rows[0].length}`)
        errors.push(`E列(5番目)の内容: "${rows[0][COL.E_NAME] || '(空)'}"`)

        // 最初の数行の内容を出力
        for (let i = 0; i < Math.min(3, rows.length); i++) {
          const preview = rows[i].slice(0, 10).map((v, idx) => `${String.fromCharCode(65 + idx)}:"${v}"`).join(', ')
          errors.push(`${i + 1}行目: ${preview}`)
        }
      }
    }
  } catch (error) {
    console.error('CSV Import - Parse error:', error)
    errors.push('CSVファイルの解析に失敗しました: ' + String(error))
  }

  return { customers, errors, duplicateWarnings }
}

// CSVファイルを読み込む（encoding-japaneseライブラリを使用）
export function readCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const uint8Array = new Uint8Array(arrayBuffer)

        // encoding-japaneseで文字コードを自動判定
        const detectedEncoding = Encoding.detect(uint8Array)
        console.log('CSV読み込み - 検出されたエンコーディング:', detectedEncoding)
        console.log('CSV読み込み - ファイルサイズ:', uint8Array.length, 'bytes')

        // Unicodeに変換
        const unicodeArray = Encoding.convert(uint8Array, {
          to: 'UNICODE',
          from: detectedEncoding || 'AUTO',
        })

        // 文字列に変換
        const content = Encoding.codeToString(unicodeArray)

        console.log('CSV読み込み - 変換後の文字列長:', content.length)
        console.log('CSV読み込み - 最初の200文字:', content.substring(0, 200))
        resolve(content)
      } catch (error) {
        console.error('CSV読み込み - エラー:', error)
        reject(new Error('ファイルの読み込みに失敗しました'))
      }
    }
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))
    reader.readAsArrayBuffer(file)
  })
}

// ===== 営業目標CSVインポート機能 =====

// 営業目標CSVの契約データ型
export interface SalesTargetCSVContract {
  salesRepName: string      // 担当者名
  contractDate: string      // 契約日（YYYY-MM-DD形式）
  customerName: string      // 顧客名（オプション）
  vehicleModel: string      // 車種（オプション）
  saleAmount: number        // 売上金額
  profit: number            // 利益
  isMQ: boolean             // MQ（見込み契約）かどうか
  vehicleType?: 'new' | 'used' | 'modification'  // 車両種別（新車/中古/改造）
}

// 営業目標CSVインポート結果
export interface SalesTargetCSVResult {
  contracts: SalesTargetCSVContract[]
  errors: string[]
  warnings: string[]
  newSalesReps: string[]  // CSVに含まれているが登録されていない担当者名
}

// 営業目標CSVの列インデックス（デフォルト）
// フォーマット例: 担当名,契約日,顧客名,車種,売上金額,利益,MQ
// または: 担当,日時,名前,車,金額,利益,MQ
const SALES_TARGET_COL = {
  SALES_REP: 0,       // 担当名
  CONTRACT_DATE: 1,   // 契約日（日時）
  CUSTOMER_NAME: 2,   // 顧客名
  VEHICLE_MODEL: 3,   // 車種
  SALE_AMOUNT: 4,     // 売上金額（値段）
  PROFIT: 5,          // 利益
  IS_MQ: 6,           // MQ
}

// 新フォーマット: A=担当, B=契約日, C=顧客名, D=車種, E=空欄,
// F=新車フラグ(1), G=中古車フラグ(1), H=改造フラグ(1),
// I=新車売上, J=新車利益, K=利益率(スルー),
// L=中古売上, M=中古利益, N=空欄, O=改造売上, P=改造利益
const SALES_TARGET_COL_V2 = {
  A_SALES_REP: 0,           // A: 担当名
  B_CONTRACT_DATE: 1,       // B: 契約日
  C_CUSTOMER_NAME: 2,       // C: お客様名
  D_VEHICLE_MODEL: 3,       // D: 車種
  E_EMPTY: 4,               // E: 空欄
  F_NEW_FLAG: 5,            // F: 新車フラグ（1=新車1台）
  G_USED_FLAG: 6,           // G: 中古車フラグ（1=中古車1台）
  H_MOD_FLAG: 7,            // H: 改造フラグ（1=改造1台）
  I_NEW_SALE: 8,            // I: 新車売上
  J_NEW_PROFIT: 9,          // J: 新車利益
  K_PROFIT_RATE: 10,        // K: 利益率（スルー）
  L_USED_SALE: 11,          // L: 中古売上
  M_USED_PROFIT: 12,        // M: 中古利益
  N_EMPTY: 13,              // N: 空欄
  O_MOD_SALE: 14,           // O: 改造売上
  P_MOD_PROFIT: 15,         // P: 改造利益
}

// 日付文字列をYYYY-MM-DD形式に変換
function parseDateToISO(dateStr: string): string {
  if (!dateStr) return ''

  const trimmed = dateStr.trim()

  // すでにYYYY-MM-DD形式
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // YYYY/MM/DD形式
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // MM/DD/YYYY形式
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [month, day, year] = trimmed.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // 日本語形式 YYYY年MM月DD日
  const jpMatch = trimmed.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (jpMatch) {
    return `${jpMatch[1]}-${jpMatch[2].padStart(2, '0')}-${jpMatch[3].padStart(2, '0')}`
  }

  // Excel シリアル値の場合（数値のみ）
  if (/^\d+$/.test(trimmed)) {
    const serial = parseInt(trimmed)
    if (serial > 30000 && serial < 60000) { // 1982年〜2064年の範囲
      const excelEpoch = new Date(1899, 11, 30)
      const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000)
      return date.toISOString().split('T')[0]
    }
  }

  // その他の形式はDate.parseを試す
  const parsed = Date.parse(trimmed)
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0]
  }

  return ''
}

// 金額文字列を数値に変換
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0

  const trimmed = amountStr.trim()

  // 空文字
  if (!trimmed) return 0

  // 「万」を含む場合
  if (trimmed.includes('万')) {
    const num = parseFloat(trimmed.replace(/[万円,\s]/g, ''))
    return isNaN(num) ? 0 : num * 10000
  }

  // 通常の数値（カンマ、円、スペースを除去）
  const num = parseFloat(trimmed.replace(/[円,\s¥￥]/g, ''))
  return isNaN(num) ? 0 : num
}

// MQフラグをパース
function parseIsMQ(value: string): boolean {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === '○' || v === 'mq' || v === '◯'
}

// 数値フラグをパース（1, 1.0, 1.0 などすべて true として扱う）
function parseNumericFlag(value: string): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  // 数値として解析して1以上ならtrue
  const num = parseFloat(trimmed)
  return !isNaN(num) && num >= 1
}

// 担当者名のマッチング（部分一致対応）
// 入力名に対して、既存の担当者リストから最もマッチする名前を返す
export function matchSalesRepName(inputName: string, existingNames: string[]): string | null {
  if (!inputName) return null
  const trimmed = inputName.trim()

  // 完全一致を先にチェック
  if (existingNames.includes(trimmed)) {
    return trimmed
  }

  // 部分一致を試す（漢字が一致していればOK）
  for (const existingName of existingNames) {
    // 入力名が既存名に含まれる or 既存名が入力名に含まれる
    if (existingName.includes(trimmed) || trimmed.includes(existingName)) {
      return existingName
    }

    // 漢字部分のみを比較（1文字以上の漢字が一致していれば）
    const inputKanji = trimmed.match(/[\u4e00-\u9faf]+/g)?.join('') || ''
    const existingKanji = existingName.match(/[\u4e00-\u9faf]+/g)?.join('') || ''

    if (inputKanji && existingKanji) {
      // どちらかがもう一方に含まれていればマッチ
      if (inputKanji.includes(existingKanji) || existingKanji.includes(inputKanji)) {
        return existingName
      }
    }
  }

  return null
}

// CSVフォーマットを自動判定（V1: 7列, V2: 16列以上）
function detectCSVFormat(rows: string[][]): 'v1' | 'v2' {
  if (rows.length === 0) return 'v1'

  // データ行を探す（ヘッダーをスキップ）
  for (const row of rows) {
    // F,G,H列（インデックス5,6,7）に1や1.0が入っているか確認
    const fVal = parseNumericFlag(row[5] || '')
    const gVal = parseNumericFlag(row[6] || '')
    const hVal = parseNumericFlag(row[7] || '')

    // F,G,Hのいずれかに1がある、または列数が10以上ならV2
    if (fVal || gVal || hVal) {
      return 'v2'
    }

    // I列以降に数値がある場合もV2
    if (row.length >= 9) {
      const iVal = parseAmount(row[8] || '')
      const lVal = parseAmount(row[11] || '')
      const oVal = parseAmount(row[14] || '')
      if (iVal > 0 || lVal > 0 || oVal > 0) {
        return 'v2'
      }
    }
  }

  return 'v1'
}

// 営業目標CSVをインポート
// V1 CSVフォーマット: 担当名,契約日,顧客名,車種,売上金額,利益,MQ
// V2 CSVフォーマット: A担当,B契約日,C顧客名,D車種,E空欄,F新車(1),G中古(1),H改造(1),I新車売上,J新車利益,K利益率,L中古売上,M中古利益,N空欄,O改造売上,P改造利益
// ヘッダー行は自動検出してスキップ
export function importSalesTargetFromCSV(
  csvText: string,
  validSalesReps?: string[]  // 有効な担当者名リスト（指定時は検証とマッチング）
): SalesTargetCSVResult {
  const contracts: SalesTargetCSVContract[] = []
  const errors: string[] = []
  const warnings: string[] = []
  const newSalesRepsSet = new Set<string>()  // 新規担当者（マッチしなかった名前）

  try {
    const cleanedText = removeBOM(csvText)
    const rows = parseCSV(cleanedText)

    if (rows.length === 0) {
      errors.push('CSVファイルが空です')
      return { contracts, errors, warnings, newSalesReps: [] }
    }

    console.log('Sales Target CSV Import - Total rows:', rows.length)
    console.log('Sales Target CSV Import - First row:', rows[0])

    // フォーマット自動判定
    const format = detectCSVFormat(rows)
    console.log('Sales Target CSV Import - Detected format:', format)

    // ヘッダー行の検出（最初の行が文字列のみならヘッダーとみなす）
    let startRow = 0
    const firstRow = rows[0]
    const isHeaderRow = firstRow.some(cell => {
      const v = cell.toLowerCase()
      return v.includes('担当') || v.includes('日') || v.includes('金額') ||
             v.includes('売上') || v.includes('利益') || v.includes('mq') ||
             v === 'date' || v === 'rep' || v === 'amount' || v === 'profit' ||
             v.includes('新車') || v.includes('中古') || v.includes('改造')
    })

    if (isHeaderRow) {
      startRow = 1
      console.log('Sales Target CSV Import - Header detected, starting from row 2')
    }

    let importedCount = 0
    let skippedCount = 0

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i]

      // 空行スキップ
      if (row.length === 0 || row.every(cell => !cell.trim())) {
        skippedCount++
        continue
      }

      try {
        if (format === 'v2') {
          // V2フォーマット: A担当,B契約日,C顧客名,D車種,E空欄,F新車,G中古,H改造,I新車売上,J新車利益,K利益率,L中古売上,M中古利益,N空欄,O改造売上,P改造利益
          const rawSalesRepName = row[SALES_TARGET_COL_V2.A_SALES_REP]?.trim() || ''
          const contractDateStr = row[SALES_TARGET_COL_V2.B_CONTRACT_DATE]?.trim() || ''
          const customerName = row[SALES_TARGET_COL_V2.C_CUSTOMER_NAME]?.trim() || ''
          const vehicleModel = row[SALES_TARGET_COL_V2.D_VEHICLE_MODEL]?.trim() || ''

          // フラグ（1, 1.0, 1.0 などすべて対応）
          const isNew = parseNumericFlag(row[SALES_TARGET_COL_V2.F_NEW_FLAG] || '')
          const isUsed = parseNumericFlag(row[SALES_TARGET_COL_V2.G_USED_FLAG] || '')
          const isMod = parseNumericFlag(row[SALES_TARGET_COL_V2.H_MOD_FLAG] || '')

          // 担当者名が必須
          if (!rawSalesRepName) {
            warnings.push(`行 ${i + 1}: 担当者名がありません。スキップしました。`)
            skippedCount++
            continue
          }

          // 担当者名のマッチング（部分一致対応）
          let salesRepName = rawSalesRepName
          if (validSalesReps && validSalesReps.length > 0) {
            const matchedName = matchSalesRepName(rawSalesRepName, validSalesReps)
            if (matchedName) {
              salesRepName = matchedName
              if (matchedName !== rawSalesRepName) {
                console.log(`Sales Target CSV Import - Row ${i + 1}: 担当者名「${rawSalesRepName}」を「${matchedName}」にマッチ`)
              }
            } else {
              // マッチしない場合は新規担当者として記録
              newSalesRepsSet.add(rawSalesRepName)
              console.log(`Sales Target CSV Import - Row ${i + 1}: 新規担当者「${rawSalesRepName}」`)
            }
          }

          // 日付のパース
          const contractDate = parseDateToISO(contractDateStr)
          if (!contractDate) {
            warnings.push(`行 ${i + 1}: 契約日「${contractDateStr}」を解析できませんでした。今日の日付を使用します。`)
          }

          // 新車、中古、改造のいずれかがあれば契約として追加
          if (isNew) {
            const saleAmount = parseAmount(row[SALES_TARGET_COL_V2.I_NEW_SALE] || '')
            const profit = parseAmount(row[SALES_TARGET_COL_V2.J_NEW_PROFIT] || '')

            contracts.push({
              salesRepName,
              contractDate: contractDate || new Date().toISOString().split('T')[0],
              customerName: customerName || `CSV取込 ${i + 1}`,
              vehicleModel,
              saleAmount,
              profit,
              isMQ: false,
              vehicleType: 'new',
            })
            importedCount++
            console.log(`Sales Target CSV Import - Row ${i + 1}: [新車] ${salesRepName}, ${contractDate}, ${saleAmount}円`)
          }

          if (isUsed) {
            const saleAmount = parseAmount(row[SALES_TARGET_COL_V2.L_USED_SALE] || '')
            const profit = parseAmount(row[SALES_TARGET_COL_V2.M_USED_PROFIT] || '')

            contracts.push({
              salesRepName,
              contractDate: contractDate || new Date().toISOString().split('T')[0],
              customerName: customerName || `CSV取込 ${i + 1}`,
              vehicleModel: vehicleModel ? `${vehicleModel}（中古）` : '中古車',
              saleAmount,
              profit,
              isMQ: false,
              vehicleType: 'used',
            })
            importedCount++
            console.log(`Sales Target CSV Import - Row ${i + 1}: [中古] ${salesRepName}, ${contractDate}, ${saleAmount}円`)
          }

          if (isMod) {
            const saleAmount = parseAmount(row[SALES_TARGET_COL_V2.O_MOD_SALE] || '')
            const profit = parseAmount(row[SALES_TARGET_COL_V2.P_MOD_PROFIT] || '')

            contracts.push({
              salesRepName,
              contractDate: contractDate || new Date().toISOString().split('T')[0],
              customerName: customerName || `CSV取込 ${i + 1}`,
              vehicleModel: vehicleModel ? `${vehicleModel}（改造）` : '改造',
              saleAmount,
              profit,
              isMQ: false,
              vehicleType: 'modification',
            })
            importedCount++
            console.log(`Sales Target CSV Import - Row ${i + 1}: [改造] ${salesRepName}, ${contractDate}, ${saleAmount}円`)
          }

          // どれにも該当しない場合はスキップ
          if (!isNew && !isUsed && !isMod) {
            skippedCount++
            console.log(`Sales Target CSV Import - Row ${i + 1}: No vehicle type flag, skipping`)
          }

        } else {
          // V1フォーマット: 担当名,契約日,顧客名,車種,売上金額,利益,MQ
          const rawSalesRepName = row[SALES_TARGET_COL.SALES_REP]?.trim() || ''
          const contractDateStr = row[SALES_TARGET_COL.CONTRACT_DATE]?.trim() || ''
          const customerName = row[SALES_TARGET_COL.CUSTOMER_NAME]?.trim() || ''
          const vehicleModel = row[SALES_TARGET_COL.VEHICLE_MODEL]?.trim() || ''
          const saleAmountStr = row[SALES_TARGET_COL.SALE_AMOUNT]?.trim() || ''
          const profitStr = row[SALES_TARGET_COL.PROFIT]?.trim() || ''
          const isMQStr = row[SALES_TARGET_COL.IS_MQ]?.trim() || ''

          // 担当者名が必須
          if (!rawSalesRepName) {
            warnings.push(`行 ${i + 1}: 担当者名がありません。スキップしました。`)
            skippedCount++
            continue
          }

          // 担当者名のマッチング（部分一致対応）
          let salesRepName = rawSalesRepName
          if (validSalesReps && validSalesReps.length > 0) {
            const matchedName = matchSalesRepName(rawSalesRepName, validSalesReps)
            if (matchedName) {
              salesRepName = matchedName
              if (matchedName !== rawSalesRepName) {
                console.log(`Sales Target CSV Import - Row ${i + 1}: 担当者名「${rawSalesRepName}」を「${matchedName}」にマッチ`)
              }
            } else {
              // マッチしない場合は新規担当者として記録
              newSalesRepsSet.add(rawSalesRepName)
              console.log(`Sales Target CSV Import - Row ${i + 1}: 新規担当者「${rawSalesRepName}」`)
            }
          }

          // 日付のパース
          const contractDate = parseDateToISO(contractDateStr)
          if (!contractDate) {
            warnings.push(`行 ${i + 1}: 契約日「${contractDateStr}」を解析できませんでした。今日の日付を使用します。`)
          }

          // 金額のパース
          const saleAmount = parseAmount(saleAmountStr)
          const profit = parseAmount(profitStr)

          // MQフラグのパース
          const isMQ = parseIsMQ(isMQStr)

          const contract: SalesTargetCSVContract = {
            salesRepName,
            contractDate: contractDate || new Date().toISOString().split('T')[0],
            customerName: customerName || `CSV取込 ${i + 1}`,
            vehicleModel,
            saleAmount,
            profit,
            isMQ,
          }

          contracts.push(contract)
          importedCount++
          console.log(`Sales Target CSV Import - Row ${i + 1}: ${salesRepName}, ${contractDate}, ${saleAmount}円`)
        }

      } catch (error) {
        console.error(`Sales Target CSV Import - Row ${i + 1} error:`, error)
        errors.push(`行 ${i + 1}: データの変換に失敗しました`)
      }
    }

    console.log(`Sales Target CSV Import - Summary: ${importedCount} imported, ${skippedCount} skipped, ${newSalesRepsSet.size} new reps`)

  } catch (error) {
    console.error('Sales Target CSV Import - Parse error:', error)
    errors.push('CSVファイルの解析に失敗しました: ' + String(error))
  }

  return { contracts, errors, warnings, newSalesReps: Array.from(newSalesRepsSet) }
}

// 営業目標データをCSVに変換（エクスポート用）
export function exportSalesTargetToCSV(contracts: SalesTargetCSVContract[]): string {
  const headers = ['担当名', '契約日', '顧客名', '車種', '売上金額', '利益', 'MQ']

  const rows = contracts.map(c => [
    c.salesRepName,
    c.contractDate,
    c.customerName,
    c.vehicleModel,
    c.saleAmount.toString(),
    c.profit.toString(),
    c.isMQ ? '○' : '',
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => {
      // カンマや改行を含む場合はダブルクォートで囲む
      if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
        return `"${cell.replace(/"/g, '""')}"`
      }
      return cell
    }).join(','))
    .join('\n')

  return csvContent
}

// サンプルCSVテンプレートを生成
export function generateSalesTargetCSVTemplate(): string {
  const headers = ['担当名', '契約日', '顧客名', '車種', '売上金額', '利益', 'MQ']
  const sampleRows = [
    ['目黒', '2024-06-15', '山田太郎', 'アミティ', '6500000', '850000', ''],
    ['野島', '2024-07-20', '鈴木花子', 'ジル520', '8500000', '1100000', ''],
    ['目黒', '2024-08-05', '佐藤次郎', 'ホビクル', '5800000', '720000', '○'],
  ]

  return [headers, ...sampleRows].map(row => row.join(',')).join('\n')
}
