import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { ElevenLabsClient } from 'elevenlabs'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY || '',
})

const SYSTEM_PROMPT = `あなたは日本語教師ではありません。
ユーザーを評価・訂正・指導してはいけません。

日本語を使ったやりとりを通して、
「話してもいい」「間違えてもいい」
という安心感を与える存在です。

必ず守ること：
・否定しない
・正誤に触れない
・指導しない
・感情を肯定する
・返答は1〜2文
・優しく、温かみのある言葉を使う
・「うん」「そうだね」「いいね」など、受け止める言葉を使う`

export async function POST(request: NextRequest) {
  try {
    const { userText, sessionId, isInitial } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      )
    }

    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) {
      return NextResponse.json(
        { error: 'ElevenLabs API key or Voice ID is not configured' },
        { status: 500 }
      )
    }

    // 初回の挨拶
    let aiResponse: string
    if (isInitial) {
      aiResponse = 'こんにちは。声を聴かせてくれてありがとう。日本語を私と勉強しよう。'
    } else {
      // LLMで全肯定レスポンスを生成
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userText },
        ],
        temperature: 0.8,
        max_tokens: 50,
      })

      aiResponse = completion.choices[0]?.message?.content || 'うん、聞いてるよ。'
    }

    // 11labsで音声生成
    const audio = await elevenlabs.textToSpeech.convert(
      process.env.ELEVENLABS_VOICE_ID || '',
      {
        text: aiResponse,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.8,
          style: 0.5,
          use_speaker_boost: true,
        },
      }
    )

    // 音声データをバッファに変換
    const chunks: Uint8Array[] = []
    for await (const chunk of audio) {
      chunks.push(chunk)
    }
    const audioBuffer = Buffer.concat(chunks)

    // Base64エンコードして返す（またはファイルとして保存）
    // ここでは簡易的にBase64で返す
    const audioBase64 = audioBuffer.toString('base64')
    const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`

    return NextResponse.json({
      text: aiResponse,
      audioUrl: audioDataUrl,
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

