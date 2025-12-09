import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

// MySQL接続設定
function getDbConnection() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set')
  }
  return mysql.createConnection(databaseUrl)
}

// テーブル作成（初回のみ）
async function ensureTable(connection: mysql.Connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS backups (
      id VARCHAR(255) PRIMARY KEY,
      created_at DATETIME NOT NULL,
      data LONGTEXT NOT NULL,
      size_bytes INT NOT NULL,
      data_hash VARCHAR(255) NOT NULL,
      metadata JSON DEFAULT NULL
    )
  `)

  // metadata列がなければ追加
  try {
    await connection.execute(`
      ALTER TABLE backups ADD COLUMN metadata JSON DEFAULT NULL
    `)
  } catch {
    // 列が既に存在する場合は無視
  }
}

// データからメタ情報を抽出
function extractMetadata(data: Record<string, unknown>): Record<string, number> {
  const metadata: Record<string, number> = {}

  try {
    // 各ストアのデータ件数を抽出
    const storeData = data.data as Record<string, unknown> | undefined
    if (storeData) {
      // customer-store
      const customerStore = storeData['customer-store'] as { state?: { customers?: unknown[] } } | undefined
      if (customerStore?.state?.customers) {
        metadata['customers'] = customerStore.state.customers.length
      }

      // sales-target-storage
      const salesStore = storeData['sales-target-storage'] as { state?: { contracts?: unknown[], targets?: unknown[] } } | undefined
      if (salesStore?.state?.contracts) {
        metadata['contracts'] = salesStore.state.contracts.length
      }
      if (salesStore?.state?.targets) {
        metadata['targets'] = salesStore.state.targets.length
      }

      // estimate-storage
      const estimateStore = storeData['estimate-storage'] as { state?: { estimates?: unknown[] } } | undefined
      if (estimateStore?.state?.estimates) {
        metadata['estimates'] = estimateStore.state.estimates.length
      }

      // showroom-storage
      const showroomStore = storeData['showroom-storage'] as { state?: { newVehicles?: unknown[], usedVehicles?: unknown[] } } | undefined
      if (showroomStore?.state?.newVehicles) {
        metadata['newVehicles'] = showroomStore.state.newVehicles.length
      }
      if (showroomStore?.state?.usedVehicles) {
        metadata['usedVehicles'] = showroomStore.state.usedVehicles.length
      }

      // settings-storage
      const settingsStore = storeData['settings-storage'] as { state?: { salesReps?: unknown[], vehicleModels?: unknown[] } } | undefined
      if (settingsStore?.state?.salesReps) {
        metadata['salesReps'] = settingsStore.state.salesReps.length
      }

      // survey-storage
      const surveyStore = storeData['survey-storage'] as { state?: { responses?: unknown[] } } | undefined
      if (surveyStore?.state?.responses) {
        metadata['surveyResponses'] = surveyStore.state.responses.length
      }
    }
  } catch (error) {
    console.error('Metadata extraction error:', error)
  }

  return metadata
}

// GET: バックアップ一覧取得
export async function GET() {
  let connection: mysql.Connection | null = null

  try {
    connection = await getDbConnection()
    await ensureTable(connection)

    const [rows] = await connection.execute(
      'SELECT id, created_at, size_bytes, data_hash, metadata FROM backups ORDER BY created_at DESC LIMIT 10'
    )

    return NextResponse.json({
      success: true,
      backups: rows
    })
  } catch (error) {
    console.error('Backup list error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    if (connection) await connection.end()
  }
}

// ハッシュを生成
function generateHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

// POST: バックアップ保存
export async function POST(request: NextRequest) {
  let connection: mysql.Connection | null = null

  try {
    const body = await request.json()
    const { data, dataHash, skipIfSame } = body

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'No data provided'
      }, { status: 400 })
    }

    connection = await getDbConnection()
    await ensureTable(connection)

    const dataStr = JSON.stringify(data)
    const calculatedHash = dataHash || generateHash(dataStr)

    // skipIfSameが指定されている場合、最新バックアップとハッシュ値が同じならスキップ
    if (skipIfSame) {
      const [lastBackups] = await connection.execute(
        'SELECT data_hash FROM backups ORDER BY created_at DESC LIMIT 1'
      ) as [mysql.RowDataPacket[], mysql.FieldPacket[]]

      if (lastBackups.length > 0 && lastBackups[0].data_hash === calculatedHash) {
        return NextResponse.json({
          success: true,
          skipped: true,
          message: 'データに変更がないためスキップしました'
        })
      }
    }

    const backupId = `cloud-backup-${Date.now()}`
    const sizeBytes = Buffer.byteLength(dataStr, 'utf8')
    const metadata = extractMetadata(data)

    await connection.execute(
      'INSERT INTO backups (id, created_at, data, size_bytes, data_hash, metadata) VALUES (?, NOW(), ?, ?, ?, ?)',
      [backupId, dataStr, sizeBytes, calculatedHash, JSON.stringify(metadata)]
    )

    // 古いバックアップを削除（10件以上は削除）
    await connection.execute(`
      DELETE FROM backups
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id FROM backups ORDER BY created_at DESC LIMIT 10
        ) AS recent
      )
    `)

    return NextResponse.json({
      success: true,
      message: 'バックアップを保存しました',
      backupId,
      sizeBytes,
      dataHash: calculatedHash,
      metadata
    })
  } catch (error) {
    console.error('Backup save error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    if (connection) await connection.end()
  }
}
