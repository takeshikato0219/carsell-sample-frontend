/**
 * Google Cloud Vision API を使用した実際のOCR処理
 */

export interface VisionOCRResult {
  text: string
  confidence: number
  blocks: TextBlock[]
}

export interface TextBlock {
  text: string
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * Google Cloud Vision APIでOCR実行
 * 注意: 本番環境ではAPIキーをバックエンドで管理してください
 */
export async function performGoogleVisionOCR(
  imageBase64: string,
  apiKey: string
): Promise<VisionOCRResult> {
  // Base64のプレフィックスを除去
  const base64Content = imageBase64.replace(/^data:image\/\w+;base64,/, '')

  const requestBody = {
    requests: [
      {
        image: {
          content: base64Content,
        },
        features: [
          {
            type: 'DOCUMENT_TEXT_DETECTION',  // より精度の高い文書OCR
          },
        ],
        imageContext: {
          languageHints: ['ja', 'en'], // 日本語と英語
          textDetectionParams: {
            enableTextDetectionConfidenceScore: true,
          },
        },
      },
    ],
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  )

  if (!response.ok) {
    throw new Error(`Google Vision API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.responses && data.responses[0]) {
    const result = data.responses[0]

    if (result.error) {
      throw new Error(result.error.message)
    }

    const fullText = result.fullTextAnnotation?.text || ''
    const textAnnotations = result.textAnnotations || []

    const blocks: TextBlock[] = textAnnotations.slice(1).map((annotation: any) => ({
      text: annotation.description,
      boundingBox: {
        x: annotation.boundingPoly?.vertices?.[0]?.x || 0,
        y: annotation.boundingPoly?.vertices?.[0]?.y || 0,
        width:
          (annotation.boundingPoly?.vertices?.[1]?.x || 0) -
          (annotation.boundingPoly?.vertices?.[0]?.x || 0),
        height:
          (annotation.boundingPoly?.vertices?.[2]?.y || 0) -
          (annotation.boundingPoly?.vertices?.[0]?.y || 0),
      },
    }))

    return {
      text: fullText,
      confidence: 0.95, // Vision APIは通常高い精度
      blocks,
    }
  }

  return {
    text: '',
    confidence: 0,
    blocks: [],
  }
}

/**
 * OCRテキストを正規化する関数
 */
function normalizeOCRText(text: string): string {
  return text
    // 全角数字を半角に変換
    .replace(/０/g, '0').replace(/１/g, '1').replace(/２/g, '2')
    .replace(/３/g, '3').replace(/４/g, '4').replace(/５/g, '5')
    .replace(/６/g, '6').replace(/７/g, '7').replace(/８/g, '8').replace(/９/g, '9')
    // 全角英字を半角に変換
    .replace(/[Ａ-Ｚ]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/[ａ-ｚ]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    // 全角記号を半角に変換
    .replace(/＠/g, '@').replace(/．/g, '.').replace(/－/g, '-')
    // 手書き特有の誤認識を修正（数字文脈でのみ）
    .replace(/[oO](?=\d)/g, '0')  // 数字の前のO/oは0
    .replace(/(?<=\d)[oO]/g, '0')  // 数字の後のO/oは0
}

/**
 * OCR結果からアンケートデータを抽出
 * 手書きフォームの構造に基づいて解析
 */
export function parseOCRTextToSurveyData(ocrText: string): Record<string, any> {
  const data: Record<string, any> = {}

  // デバッグ用にOCRテキストをログ出力
  console.log('🔍 OCR解析対象テキスト:\n', ocrText)

  // テキストを正規化
  const normalizedText = normalizeOCRText(ocrText)
  console.log('📝 正規化後テキスト:\n', normalizedText)

  // 郵便番号を抽出 (〒XXX-XXXX, T630-8101 など様々なパターン)
  const postalPatterns = [
    /[〒T]\s*(\d{3})\s*[-ー一]\s*(\d{4})/,
    /(\d{3})\s*[-ー一]\s*(\d{4})/,
  ]
  for (const pattern of postalPatterns) {
    const postalCodeMatch = normalizedText.match(pattern)
    if (postalCodeMatch) {
      data.postalCode = `${postalCodeMatch[1]}-${postalCodeMatch[2]}`
      console.log('📮 郵便番号検出:', data.postalCode)
      break
    }
  }

  console.log('📞 電話番号検索中...')

  // 電話番号を抽出（複数パターンに対応）
  // パターン1: 「電話番号」ラベルの後の行を探す（手書きフォーム対応）
  const phoneLinePatterns = [
    // 電話番号ラベルの後、改行を含む次の行の数字
    /電話番号[^0-9]*\n?\s*(0[789]0)\s*[-ー―‐一ｰ\s]*(\d{4})\s*[-ー―‐一ｰ\s]*(\d{4})/,
    /(?:ご自宅|携帯)[^0-9]*\n?\s*(0[789]0)\s*[-ー―‐一ｰ\s]*(\d{4})\s*[-ー―‐一ｰ\s]*(\d{4})/,
    // 「電話」という文字の近くにある番号
    /電話[^\d]{0,20}(0[789]0)\s*[-ー―‐一ｰ\s]*(\d{4})\s*[-ー―‐一ｰ\s]*(\d{4})/,
  ]

  for (const pattern of phoneLinePatterns) {
    const match = normalizedText.match(pattern)
    if (match) {
      data.phone = `${match[1]}-${match[2]}-${match[3]}`
      console.log('📱 携帯電話検出(ラベル後):', data.phone)
      break
    }
  }

  // パターン2: 090/080/070で始まる11桁の携帯番号（区切り文字柔軟対応）
  if (!data.phone) {
    // 様々な区切り文字パターン
    const mobilePatterns = [
      /(0[789]0)\s*[-ー―‐一ｰ\s]+(\d{4})\s*[-ー―‐一ｰ\s]+(\d{4})/,
      /(0[789]0)[-ー―‐一ｰ](\d{4})[-ー―‐一ｰ](\d{4})/,
      /(0[789]0)(\d{4})(\d{4})/,  // 連続
    ]

    for (const pattern of mobilePatterns) {
      const match = normalizedText.match(pattern)
      if (match) {
        data.phone = `${match[1]}-${match[2]}-${match[3]}`
        console.log('📱 携帯電話検出:', data.phone)
        break
      }
    }
  }

  // パターン3: 固定電話（携帯が見つからない場合）
  if (!data.phone) {
    const fixedPatterns = [
      /(0\d{1,4})[-ー―‐一ｰ\s]+(\d{1,4})[-ー―‐一ｰ\s]+(\d{4})/,
    ]
    for (const pattern of fixedPatterns) {
      const match = normalizedText.match(pattern)
      if (match) {
        const totalDigits = match[1].length + match[2].length + match[3].length
        // 郵便番号(7桁)と区別
        if (totalDigits >= 10) {
          data.phone = `${match[1]}-${match[2]}-${match[3]}`
          console.log('☎️ 固定電話検出:', data.phone)
          break
        }
      }
    }
  }

  // パターン4: OCRで数字がバラバラに認識された場合
  if (!data.phone) {
    // 「0 9 0」のようにスペースで区切られた場合
    const spacedMatch = normalizedText.match(/(0)\s*([789])\s*(0)\s*[-ー―‐一ｰ\s]*(\d)\s*(\d)\s*(\d)\s*(\d)\s*[-ー―‐一ｰ\s]*(\d)\s*(\d)\s*(\d)\s*(\d)/)
    if (spacedMatch) {
      const [, d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11] = spacedMatch
      data.phone = `${d1}${d2}${d3}-${d4}${d5}${d6}${d7}-${d8}${d9}${d10}${d11}`
      console.log('📱 携帯電話検出(バラバラ):', data.phone)
    }
  }

  // パターン5: テキスト内の任意の11桁数字列
  if (!data.phone) {
    // 郵便番号の後にある可能性を考慮して、郵便番号以外の場所を探す
    const allDigits = normalizedText.replace(/[^\d]/g, '')
    // 11桁の携帯番号パターンを探す
    const mobileMatch = allDigits.match(/(0[789]0\d{8})/)
    if (mobileMatch) {
      const digits = mobileMatch[1]
      data.phone = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
      console.log('📱 携帯電話検出(数字列):', data.phone)
    }
  }

  // メールアドレスを抽出（スペースが入っている場合も対応）
  // パターン1: 通常のメールアドレス
  let emailMatch = normalizedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  if (emailMatch) {
    data.email = emailMatch[0]
    console.log('📧 メール検出:', data.email)
  }
  // パターン2: スペースが入ったメールアドレス（手書きOCR対応）
  if (!data.email) {
    // 「メールアドレス」ラベルの後の行を取得
    const emailSectionMatch = normalizedText.match(/メール[アア]ドレス[^\n]*\n?\s*([^\n]{5,50})/)
    if (emailSectionMatch) {
      // スペースを除去してメールアドレスを構築
      const emailCandidate = emailSectionMatch[1]
        .replace(/\s+/g, '')
        .replace(/[。．]/g, '.')
        .replace(/＠/g, '@')
      const cleanEmailMatch = emailCandidate.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
      if (cleanEmailMatch) {
        data.email = cleanEmailMatch[0]
        console.log('📧 メール検出(スペース除去):', data.email)
      }
    }
  }
  // パターン3: @ の前後にスペースがある場合
  if (!data.email) {
    const spacedEmailMatch = normalizedText.match(/([a-zA-Z0-9._%+-]+)\s*[@＠]\s*([a-zA-Z0-9.-]+)\s*[.．]\s*([a-zA-Z]{2,})/)
    if (spacedEmailMatch) {
      data.email = `${spacedEmailMatch[1]}@${spacedEmailMatch[2]}.${spacedEmailMatch[3]}`
      console.log('📧 メール検出(スペース区切り):', data.email)
    }
  }

  // 名前とフリガナを抽出（行構造を解析）
  // OCRテキストを行に分割して解析
  const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  console.log('📋 行数:', lines.length)
  console.log('📋 全行内容:', lines)

  // 方法1: フリガナ行を直接探す（カタカナの名前パターン）
  // 無効なカタカナパターン（フォームのラベルなど）
  const invalidKatakanaPattens = /メール|アドレス|フリガナ|ハイエース|キャラバン|キャンピング|ショー|トレーラー|ベース|ライト|エース|イベント|ホームページ|インスタ|ユーチューブ|ツイッター/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // 「アイハラ ツギノリ」のようなカタカナの名前パターンを探す（スペース区切り）
    const kanaNameMatch = line.match(/^([ァ-ヶー]{2,})\s+([ァ-ヶー]{2,})$/)
    if (kanaNameMatch && !data.nameKana) {
      const fullKana = `${kanaNameMatch[1]} ${kanaNameMatch[2]}`
      // 無効なパターンを除外
      if (!fullKana.match(invalidKatakanaPattens)) {
        data.nameKana = fullKana
        console.log('📝 フリガナ検出(行単独スペース区切り):', data.nameKana)

        // フリガナの次の行または前の行に漢字の名前がある可能性
        // 次の行をチェック
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]
          const kanjiNameMatch = nextLine.match(/^([一-龯]{1,4})\s*([一-龯]{1,4})$/)
          if (kanjiNameMatch && !data.name) {
            const fullName = `${kanjiNameMatch[1]} ${kanjiNameMatch[2]}`
            if (!fullName.match(/年齢|職業|休日|曜日|住所|電話|案内|会場|時|頃/)) {
              data.name = fullName
              console.log('👤 名前検出(フリガナ次行):', data.name)
            }
          }
        }
        // 前の行もチェック
        if (!data.name && i > 0) {
          const prevLine = lines[i - 1]
          const kanjiNameMatch = prevLine.match(/^([一-龯]{1,4})\s*([一-龯]{1,4})$/)
          if (kanjiNameMatch) {
            const fullName = `${kanjiNameMatch[1]} ${kanjiNameMatch[2]}`
            if (!fullName.match(/年齢|職業|休日|曜日|住所|電話|案内|会場|時|頃/)) {
              data.name = fullName
              console.log('👤 名前検出(フリガナ前行):', data.name)
            }
          }
        }
        break
      }
    }
  }

  // 方法1.5: スペースなしのカタカナフリガナを探す（「アイハウツギノリ」など）
  if (!data.nameKana) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // 4文字以上のカタカナのみの行
      if (line.match(/^[ァ-ヶー]{4,}$/) && !line.match(invalidKatakanaPattens)) {
        // フリガナとして妥当かチェック（人名っぽいカタカナ）
        console.log('🔍 カタカナ候補:', line)
        // 半分で分割して名前として設定
        const splitPos = Math.ceil(line.length / 2)
        // 3-4文字目あたりで分割するのがより自然
        const betterSplitPos = line.length >= 6 ? Math.floor(line.length * 0.4) : splitPos
        data.nameKana = `${line.slice(0, betterSplitPos)} ${line.slice(betterSplitPos)}`
        console.log('📝 フリガナ検出(カタカナ連続):', data.nameKana)
        break
      }
    }
  }

  // 方法2: 漢字の名前パターンを直接探す（2つの漢字塊がスペースで区切られている）
  if (!data.name) {
    // 無効な名前パターン（フォームのラベルや項目名）
    const invalidNamePatterns = /年齢|職業|休日|曜日|住所|電話|案内|会場|郵便|メール|家族|キャン|ショー|時|頃|就寝|定員|乗車|人数|予算|購入|時期|車種|希望|連絡|可能|構成|備考|担当|展示|下取|日付/

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // 「相原 肩智」のような漢字の名前パターンを探す（苗字は2文字以上）
      const kanjiNameMatch = line.match(/^([一-龯]{2,4})\s+([一-龯]{1,4})$/)
      if (kanjiNameMatch) {
        const fullName = `${kanjiNameMatch[1]} ${kanjiNameMatch[2]}`
        // 無効な名前パターンを除外
        if (!fullName.match(invalidNamePatterns)) {
          data.name = fullName
          console.log('👤 名前検出(漢字行単独):', data.name)
          break
        }
      }
    }
  }

  // 方法2.5: 「ご氏名(フリガナ)」の近くから名前を探す
  if (!data.name) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // 「ご氏名(フリガナ)」や「フリガナ」を含む行を探す
      if (line.includes('氏名') || line.includes('フリガナ')) {
        console.log('🔍 氏名/フリガナラベル検出:', line, '位置:', i)
        // その近く（前後5行）から漢字の名前を探す
        for (let j = Math.max(0, i - 3); j < Math.min(lines.length, i + 5); j++) {
          const nearLine = lines[j]
          // 2-4文字の漢字のみの行（苗字または名前の可能性）
          if (nearLine.match(/^[一-龯]{2,4}$/) && !nearLine.match(/年齢|職業|休日|曜日|住所|電話|案内|会場|郵便|情報|詳細|希望|記入|展示|大阪|担当|下取|備考/)) {
            console.log('🔍 名前候補(氏名近く):', nearLine)
            if (!data.name) {
              data.name = nearLine
              console.log('👤 名前検出(氏名ラベル近く):', data.name)
            }
          }
        }
        break
      }
    }
  }

  // 方法2.6: OCRテキスト全体から日本人の苗字パターンを探す（より積極的な検出）
  if (!data.name) {
    // よくある日本人の苗字リスト（一部）
    const commonSurnamePatterns = [
      '相原', '青山', '赤井', '秋山', '浅野', '阿部', '天野', '新井', '荒井', '荒木',
      '池田', '石井', '石川', '石田', '石原', '泉', '伊藤', '井上', '今井', '岩崎', '岩田',
      '上田', '上野', '内田', '梅田', '遠藤',
      '大石', '大川', '大久保', '大島', '太田', '大谷', '大塚', '大野', '大橋', '大森', '岡', '岡崎', '岡田', '岡本', '小川', '奥田', '小野', '小野寺',
      '加藤', '金井', '金子', '金田', '川口', '川崎', '川田', '川村', '菊池', '菊地', '木下', '木村', '工藤', '久保', '熊谷', '栗原', '黒田', '小泉', '小島', '小林', '近藤',
      '斉藤', '斎藤', '酒井', '坂本', '桜井', '佐々木', '佐藤', '佐野', '沢田', '柴田', '清水', '白井', '杉本', '杉山', '鈴木', '須藤',
      '高木', '高田', '高野', '高橋', '高山', '竹内', '竹田', '田中', '谷口', '田村', '千葉', '塚本', '土屋', '堤', '坪井',
      '手塚', '寺田',
      '中川', '中島', '中田', '中野', '中村', '中山', '永井', '長田', '長谷川', '西田', '西村', '西山', '野口', '野田', '野村',
      '橋本', '長谷', '服部', '浜田', '林', '原', '原田', '平井', '平田', '平野', '広瀬', '福井', '福田', '藤井', '藤田', '藤原', '古川', '本田', '本間',
      '前田', '牧野', '増田', '松井', '松尾', '松岡', '松下', '松田', '松本', '丸山', '三浦', '水野', '三井', '宮崎', '宮田', '宮本', '村上', '村田', '望月', '森', '森田', '森本',
      '矢島', '安田', '柳田', '山内', '山口', '山崎', '山下', '山田', '山中', '山本', '横山', '吉田', '吉村', '吉本',
      '渡辺', '渡部'
    ]

    // テキスト内から苗字を検索
    for (const surname of commonSurnamePatterns) {
      if (ocrText.includes(surname)) {
        // 苗字の位置を確認
        const surnameIndex = ocrText.indexOf(surname)
        const beforeSurname = ocrText.substring(Math.max(0, surnameIndex - 5), surnameIndex)
        const afterSurname = ocrText.substring(surnameIndex + surname.length, surnameIndex + surname.length + 10)

        // 住所の一部として出現している場合はスキップ（「市」「区」「町」「県」の後）
        if (beforeSurname.match(/[市区町県村]$/)) {
          console.log(`⏭️ 苗字候補スキップ(住所の一部): ${surname}`)
          continue
        }

        console.log(`🔍 苗字候補: ${surname}, 前: "${beforeSurname}", 後続: "${afterSurname}"`)

        // 苗字の後に漢字が続く場合、それが名前
        const nameAfterMatch = afterSurname.match(/^\s*([一-龯]{1,3})/)
        if (nameAfterMatch) {
          data.name = `${surname} ${nameAfterMatch[1]}`
          console.log('👤 名前検出(苗字+名前):', data.name)
          break
        } else {
          // 名前が見つからない場合は苗字だけ
          data.name = surname
          console.log('👤 名前検出(苗字のみ):', data.name)
          break
        }
      }
    }
  }

  // 方法3: 「氏名」「フリガナ」ラベル行の近くを探す
  if (!data.name || !data.nameKana) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // 「フリガナ」というラベルを見つけた場合
      if (line === 'フリガナ' || line.match(/^フリガナ$/)) {
        // 近くの行からカタカナ名前を探す
        for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 3); j++) {
          if (j !== i) {
            const nearLine = lines[j]
            const kanaMatch = nearLine.match(/^([ァ-ヶー]{2,})\s*([ァ-ヶー]{2,})$/)
            if (kanaMatch && !data.nameKana) {
              data.nameKana = `${kanaMatch[1]} ${kanaMatch[2]}`
              console.log('📝 フリガナ検出(ラベル近く):', data.nameKana)
            }
          }
        }
      }
      // 「氏名」というラベルを見つけた場合
      if (line === '氏名' || line.match(/^氏名$/) || line.match(/^ご氏名$/)) {
        // 近くの行から漢字名前を探す
        for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 3); j++) {
          if (j !== i) {
            const nearLine = lines[j]
            const kanjiMatch = nearLine.match(/^([一-龯]{1,4})\s*([一-龯]{1,4})$/)
            if (kanjiMatch && !data.name) {
              const fullName = `${kanjiMatch[1]} ${kanjiMatch[2]}`
              if (!fullName.match(/年齢|職業|休日|曜日|住所|電話|案内|会場|郵便/)) {
                data.name = fullName
                console.log('👤 名前検出(ラベル近く):', data.name)
              }
            }
          }
        }
      }
    }
  }

  // 行解析で取れなかった場合のフォールバック - 漢字名前パターンを探す
  if (!data.name) {
    // パターン1: スペース区切りの名前を探す
    const spacedNameMatches = [...ocrText.matchAll(/([一-龯]{1,4})\s+([一-龯]{1,4})/g)]
    for (const nameMatch of spacedNameMatches) {
      const fullName = `${nameMatch[1]} ${nameMatch[2]}`
      // 無効な名前パターンを除外（より厳密に）
      const invalidPatterns = /年齢|職業|休日|曜日|住所|電話|メール|家族|案内|会場|郵便|購入|連絡|可能|予算|時期|車種|構成|定員|納車|詳細|情報|希望|記入|番号|必須|入力/
      if (!fullName.match(invalidPatterns)) {
        data.name = fullName
        console.log('👤 名前検出(パターン):', data.name)
        break
      }
    }

    // パターン2: テキスト全体から人名っぽい漢字パターンを探す
    // 名字(1-4文字) + 名前(1-3文字) の組み合わせで、無効なキーワードを含まないもの
    if (!data.name) {
      // 無効なキーワードリスト（より包括的）
      const invalidKeywords = [
        '年齢', '職業', '休日', '曜日', '住所', '電話', 'メール', '家族', '案内', '会場',
        '郵便', '購入', '連絡', '可能', '予算', '時期', '車種', '構成', '定員', '納車',
        '詳細', '情報', '希望', '記入', '番号', '必須', '入力', '確認', '送信', '完了',
        '県', '市', '区', '町', '村', '都', '道', '府', '奈良', '青山', '東京', '大阪',
        '以内', '以上', '万円', '台', '名', '人', '匹', '回目', '初めて', '将来',
        'キャンピング', 'ショー', 'カー', 'ベース', 'ハイエース', 'キャラバン'
      ]

      const kanjiMatches = [...ocrText.matchAll(/([一-龯]{2,5})/g)]
      console.log('🔍 漢字候補:', kanjiMatches.map(m => m[1]))

      for (const match of kanjiMatches) {
        const candidate = match[1]
        // 無効なキーワードに完全一致または部分一致しないかチェック
        const isInvalid = invalidKeywords.some(kw => candidate.includes(kw) || kw.includes(candidate))

        if (!isInvalid && candidate.length >= 2 && candidate.length <= 5) {
          // 人名らしい漢字パターンかどうかをチェック
          // 一般的な苗字の最初の文字や、名前に使われる漢字かどうか
          data.name = candidate
          console.log('👤 名前検出(漢字塊):', data.name)
          break
        }
      }
    }
  }

  // フリガナのフォールバック
  if (!data.nameKana) {
    // まず、テキスト全体からカタカナのみの長い文字列を探す
    const allKanaMatches = [...ocrText.matchAll(/([ァ-ヶー]{3,})\s*([ァ-ヶー]{2,})?/g)]
    for (const kanaMatch of allKanaMatches) {
      // 無効なパターンを除外（「キャンピングカーショー」など）
      const kana1 = kanaMatch[1]
      const kana2 = kanaMatch[2] || ''
      const fullKana = kana2 ? `${kana1} ${kana2}` : kana1

      if (!fullKana.match(/キャンピング|ショー|カー|ハイエース|キャラバン|トレーラー|ベース|ライト|エース|イベント|ホームページ|インスタ|ユーチューブ|ツイッター/)) {
        if (kana2) {
          data.nameKana = `${kana1} ${kana2}`
        } else if (kana1.length >= 4) {
          // スペースなしの場合、3-4文字目で分割を試みる
          const splitPos = Math.ceil(kana1.length / 2)
          data.nameKana = `${kana1.slice(0, splitPos)} ${kana1.slice(splitPos)}`
        } else {
          data.nameKana = kana1
        }
        console.log('📝 フリガナ検出(パターン):', data.nameKana)
        break
      }
    }
  }

  // 年齢を抽出
  const ageMatch = ocrText.match(/(\d{1,3})\s*[才歳]/)
  if (ageMatch) {
    const age = parseInt(ageMatch[1])
    if (age > 0 && age < 120) {
      data.age = age
      console.log('🎂 年齢検出:', data.age)
    }
  }

  // 職業を抽出
  const occupationPatterns = [
    /(?:ご職業|職業)[:\s：]*([^\n\r]{2,15})/,
  ]
  for (const pattern of occupationPatterns) {
    const occupationMatch = ocrText.match(pattern)
    if (occupationMatch && !data.occupation) {
      data.occupation = occupationMatch[1].trim()
      console.log('💼 職業検出:', data.occupation)
      break
    }
  }

  // 住所を抽出（行解析で番地まで取得）
  // まず「ご住所」セクションを探す
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('住所') && !line.includes('メール')) {
      // 住所ラベルを見つけた
      console.log('🏠 住所ラベル検出:', line)
      // 次の行に住所がある可能性
      if (i + 1 < lines.length) {
        let addressParts: string[] = []
        // 次の行以降から住所情報を収集
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const addrLine = lines[j]
          // 「電話」「メール」などのラベルが出たら終了
          if (addrLine.match(/電話|メール|家族|連絡/)) break
          // 都道府県または番地を含む行を住所として追加
          if (addrLine.match(/[都道府県市区町村]|[\d\-ー]+/) && !addrLine.match(/^\d{3}/)) {
            addressParts.push(addrLine.replace(/[〒T]\s*\d{3}[-ー]\d{4}\s*/g, '').trim())
          }
        }
        if (addressParts.length > 0) {
          data.address = addressParts.join('').replace(/\s+/g, '')
          console.log('🏠 住所検出(行解析):', data.address)
        }
      }
      break
    }
  }

  // 行解析で取れなかった場合のフォールバック
  if (!data.address) {
    // 都道府県から番地までを含むパターン
    const addressPatterns = [
      // 都道府県+市区町村+番地
      /((?:北海道|東京都|(?:大阪|京都)府|[^\s]{2,3}県)[^\n\r]*?[\d\-ー]+[\d\-ー]*)/,
      // 市から始まるパターン
      /([^\s]{2,4}市[^\n\r]*?[\d\-ー]+[\d\-ー]*)/,
    ]
    for (const pattern of addressPatterns) {
      const addressMatch = normalizedText.match(pattern)
      if (addressMatch) {
        data.address = addressMatch[1].trim()
        console.log('🏠 住所検出(パターン):', data.address)
        break
      }
    }
  }

  // 家族構成を抽出（「大人 2人 子供 人 ペット 1匹」形式）
  const familySectionMatch = ocrText.match(/家族構成[^\n]*\n?\s*([^\n]{5,50})/i)
  if (familySectionMatch) {
    const familyInfo = familySectionMatch[1]
    console.log('👨‍👩‍👧‍👦 家族構成セクション:', familyInfo)

    // 大人の人数を抽出
    const adultMatch = familyInfo.match(/大人\s*(\d+)\s*人/)
    if (adultMatch) {
      data.familyMembers = parseInt(adultMatch[1])
      console.log('👨‍👩‍👧‍👦 大人人数検出:', data.familyMembers)
    }

    // 子供の人数を抽出
    const childMatch = familyInfo.match(/子供\s*(\d+)\s*人/)
    if (childMatch) {
      // 子供の人数を追加（familyMembersに含める）
      const children = parseInt(childMatch[1])
      data.familyMembers = (data.familyMembers || 0) + children
      console.log('👶 子供人数検出:', children)
    }

    // ペットの数を抽出
    const petMatch = familyInfo.match(/ペット\s*(\d+)\s*匹/)
    if (petMatch) {
      data.hasPets = parseInt(petMatch[1]) > 0
      console.log('🐕 ペット検出:', petMatch[1], '匹')
    }
  }

  // 家族構成セクションから取れなかった場合、従来のパターンを試す
  if (!data.familyMembers) {
    const familyPatterns = [
      /乗車人数[:\s：]*(\d+)/,
      /(\d+)\s*(?:人|名)\s*(?:乗車|乗り)/,
      /大人\s*(\d+)/,
    ]
    for (const pattern of familyPatterns) {
      const familyMatch = ocrText.match(pattern)
      if (familyMatch) {
        data.familyMembers = parseInt(familyMatch[1])
        console.log('👨‍👩‍👧‍👦 乗車人数検出:', data.familyMembers)
        break
      }
    }
  }

  // 就寝定員を抽出
  const passengersPatterns = [
    /就寝定員[:\s：]*(\d+)/,
    /(\d+)\s*(?:人|名)\s*(?:就寝|寝)/,
  ]
  for (const pattern of passengersPatterns) {
    const passengersMatch = ocrText.match(pattern)
    if (passengersMatch && !data.passengers) {
      data.passengers = parseInt(passengersMatch[1])
      console.log('🛏️ 就寝定員検出:', data.passengers)
      break
    }
  }

  // 丸印検出用のヘルパー関数
  // OCRで「○」「◯」「〇」「O」などが選択肢の近くにあるかをチェック
  const circleMarkers = ['○', '◯', '〇', '●', '◎', '⭕', 'O', '0']

  const hasCircleNear = (option: string, text: string): boolean => {
    // 選択肢の前後に丸印があるかチェック
    for (const marker of circleMarkers) {
      // パターン1: 丸印 + 選択肢 (例: "○ハイエースベース")
      if (text.includes(marker + option) || text.includes(marker + ' ' + option)) {
        return true
      }
      // パターン2: 選択肢 + 丸印 (例: "ハイエースベース○")
      if (text.includes(option + marker) || text.includes(option + ' ' + marker)) {
        return true
      }
    }

    // パターン3: 選択肢の前の行に丸印がある場合
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(option)) {
        // 前の行に丸印があるか
        if (i > 0 && circleMarkers.some(m => lines[i-1].includes(m))) {
          return true
        }
        // 同じ行に丸印があるか
        if (circleMarkers.some(m => lines[i].includes(m))) {
          return true
        }
      }
    }

    return false
  }

  // 予算を検出（丸印検出対応）
  const budgetOptions = [
    '400万円以内', '500万円以内', '600万円以内', '700万円以内',
    '800万円以内', '900万円以内', '1000万円以内', '1000万円以上'
  ]
  // まず丸印がついている予算を探す
  for (const budget of budgetOptions) {
    if (hasCircleNear(budget, ocrText)) {
      data.budget = budget
      console.log('💰 予算検出（丸印あり）:', data.budget)
      break
    }
  }
  // 丸印が見つからない場合は、テキストに含まれるものを使用
  if (!data.budget) {
    for (const budget of budgetOptions) {
      if (ocrText.includes(budget)) {
        data.budget = budget
        console.log('💰 予算検出:', data.budget)
      }
    }
  }

  // 購入時期を検出（丸印検出対応）
  const timingOptions = ['なるべく早く欲しい', '1年以内', '2年以内', '将来', '購入予定はない']
  for (const timing of timingOptions) {
    if (hasCircleNear(timing, ocrText)) {
      data.purchaseTiming = timing
      console.log('📅 購入時期検出（丸印あり）:', data.purchaseTiming)
      break
    }
  }
  if (!data.purchaseTiming) {
    for (const timing of timingOptions) {
      if (ocrText.includes(timing)) {
        data.purchaseTiming = timing
        console.log('📅 購入時期検出:', data.purchaseTiming)
      }
    }
  }

  // 希望車種タイプを検出（丸印検出対応）
  const vehicleTypes = ['軽自動車ベース', 'ライトエースベース', 'ハイエースベース', 'キャラバンベース', 'キャブコン', 'トレーラー']
  const circledVehicleTypes = vehicleTypes.filter(type => hasCircleNear(type, ocrText))
  if (circledVehicleTypes.length > 0) {
    data.desiredVehicleType = circledVehicleTypes
    console.log('🚐 希望車種検出（丸印あり）:', data.desiredVehicleType)
  } else {
    const detectedVehicleTypes = vehicleTypes.filter(type => ocrText.includes(type))
    if (detectedVehicleTypes.length > 0) {
      data.desiredVehicleType = detectedVehicleTypes
      console.log('🚐 希望車種検出:', data.desiredVehicleType)
    }
  }

  // katomotorを知ったきっかけを検出（丸印検出対応）
  const sources = ['展示会', 'イベント', 'ホームページ', 'HP', 'X', 'Twitter', 'Instagram', 'YouTube', '知人の紹介', '紹介']
  const circledSources = sources.filter(source => hasCircleNear(source, ocrText))
  if (circledSources.length > 0) {
    // 重複を整理（HP/ホームページ、X/Twitterなど）
    const normalizedSources = circledSources.map(s => {
      if (s === 'HP') return 'ホームページ'
      if (s === 'Twitter' || s === 'X') return 'X(旧Twitter)'
      if (s === '展示会' || s === 'イベント') return '展示会orイベント'
      if (s === '紹介') return '知人の紹介'
      return s
    })
    data.howDidYouKnow = [...new Set(normalizedSources)]
    console.log('📣 きっかけ検出（丸印あり）:', data.howDidYouKnow)
  } else {
    const detectedSources = sources.filter(source => ocrText.includes(source))
    if (detectedSources.length > 0) {
      data.howDidYouKnow = detectedSources
      console.log('📣 きっかけ検出:', data.howDidYouKnow)
    }
  }

  // キャンピングカーショー来場回数を検出（丸印検出対応）
  const visitOptions = ['初めて', '2回目', '3回目', '4回以上']
  for (const visit of visitOptions) {
    if (hasCircleNear(visit, ocrText)) {
      data.campingCarShowVisit = visit
      console.log('🎪 来場回数検出（丸印あり）:', data.campingCarShowVisit)
      break
    }
  }

  // 連絡可能曜日を検出（手書きフォーム対応）
  // まず「連絡が可能な曜日、時間」セクションから抽出を試みる
  const contactSectionMatch = ocrText.match(/連絡[がの]?可能な?曜日[、,]?\s*時間[^\n]*\n?\s*([^\n]{2,30})/i)
  if (contactSectionMatch) {
    const contactInfo = contactSectionMatch[1]
    console.log('📅 連絡可能セクション検出:', contactInfo)

    // 曜日を抽出
    const dayMatch = contactInfo.match(/(月|火|水|木|金|土|日)\s*曜日?/i)
    if (dayMatch) {
      data.preferredContactDay = dayMatch[1] + '曜日'
      console.log('📞 連絡可能曜日検出:', data.preferredContactDay)
    }

    // 時間を抽出
    const timeMatch = contactInfo.match(/(\d{1,2})\s*時/)
    if (timeMatch) {
      data.preferredContactTime = `${timeMatch[1]}時頃`
      console.log('⏰ 連絡可能時間検出:', data.preferredContactTime)
    }
  }

  // セクションから取れなかった場合、丸印検出を試す
  if (!data.preferredContactDay) {
    const dayOptions = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日', '月', '火', '水', '木', '金', '土', '日']
    for (const day of dayOptions) {
      if (hasCircleNear(day, ocrText)) {
        const fullDay = day.length === 1 ? day + '曜日' : day
        data.preferredContactDay = fullDay
        console.log('📞 連絡可能曜日検出（丸印あり）:', data.preferredContactDay)
        break
      }
    }
  }

  // 時間が取れなかった場合
  if (!data.preferredContactTime) {
    const timeOptions = ['9時', '10時', '11時', '12時', '13時', '14時', '15時', '16時', '17時', '18時', '19時', '20時']
    for (const time of timeOptions) {
      if (hasCircleNear(time, ocrText)) {
        data.preferredContactTime = time + '頃'
        console.log('⏰ 連絡可能時間検出（丸印あり）:', data.preferredContactTime)
        break
      }
    }
  }

  // それでも時間が取れなかった場合、「時頃」パターンを探す
  if (!data.preferredContactTime) {
    const timeMatch = ocrText.match(/(\d{1,2})\s*時\s*頃?/)
    if (timeMatch) {
      data.preferredContactTime = `${timeMatch[1]}時頃`
      console.log('⏰ 連絡可能時間検出:', data.preferredContactTime)
    }
  }

  // ペットの有無を検出（丸印検出対応）
  if (hasCircleNear('いる', ocrText) || hasCircleNear('有', ocrText) || hasCircleNear('あり', ocrText)) {
    data.hasPets = true
    console.log('🐕 ペット検出: いる')
  } else if (hasCircleNear('いない', ocrText) || hasCircleNear('無', ocrText) || hasCircleNear('なし', ocrText)) {
    data.hasPets = false
    console.log('🐕 ペット検出: いない')
  }

  console.log('✅ 最終抽出データ:', data)
  return data
}
