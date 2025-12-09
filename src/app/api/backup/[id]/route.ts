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

// GET: 特定のバックアップを取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: mysql.Connection | null = null

  try {
    const { id } = await params
    const url = new URL(request.url)
    const format = url.searchParams.get('format') // 'json' or 'download'

    connection = await getDbConnection()

    const [rows] = await connection.execute(
      'SELECT * FROM backups WHERE id = ?',
      [id]
    ) as [mysql.RowDataPacket[], mysql.FieldPacket[]]

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Backup not found'
      }, { status: 404 })
    }

    const backup = rows[0]
    const parsedData = JSON.parse(backup.data)

    // ダウンロード形式の場合はファイルとして返す
    if (format === 'download') {
      const date = new Date(backup.created_at)
      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`
      const filename = `katomo_cloud_backup_${dateStr}.json`

      return new NextResponse(JSON.stringify(parsedData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      backup: {
        id: backup.id,
        createdAt: backup.created_at,
        data: parsedData,
        sizeBytes: backup.size_bytes,
        dataHash: backup.data_hash,
        metadata: backup.metadata ? JSON.parse(backup.metadata) : null
      }
    })
  } catch (error) {
    console.error('Backup get error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    if (connection) await connection.end()
  }
}

// DELETE: 特定のバックアップを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: mysql.Connection | null = null

  try {
    const { id } = await params
    connection = await getDbConnection()

    await connection.execute(
      'DELETE FROM backups WHERE id = ?',
      [id]
    )

    return NextResponse.json({
      success: true,
      message: 'バックアップを削除しました'
    })
  } catch (error) {
    console.error('Backup delete error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    if (connection) await connection.end()
  }
}
