'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './page.module.css'

interface Message {
  text: string
  audioUrl?: string
  isUser: boolean
}

// SpeechRecognition型定義
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // sessionIdの初期化
  useEffect(() => {
    const storedSessionId = localStorage.getItem('koutei_session_id')
    if (storedSessionId) {
      setSessionId(storedSessionId)
    } else {
      const newSessionId = crypto.randomUUID()
      localStorage.setItem('koutei_session_id', newSessionId)
      setSessionId(newSessionId)
    }
  }, [])

  // Service Workerの登録（PWA用）
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker登録成功:', registration.scope)
        })
        .catch((error) => {
          console.log('Service Worker登録失敗:', error)
        })
    }
  }, [])

  // 音声認識の初期化
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('音声認識APIがサポートされていません')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'ja-JP'
    // @ts-ignore - maxAlternativesは一部のブラウザでサポートされている
    if ('maxAlternatives' in recognition) {
      recognition.maxAlternatives = 1
    }

    recognition.onspeechstart = () => {
      console.log('音声が検出されました')
    }

    recognition.onspeechend = () => {
      console.log('音声が終了しました')
    }

    recognition.onresult = (event: any) => {
      console.log('音声認識結果イベント:', event)
      console.log('結果の数:', event.results?.length)
      console.log('結果インデックス:', event.resultIndex)
      
      let finalTranscript = ''
      let interimTranscript = ''

      try {
        if (!event.results || event.results.length === 0) {
          console.warn('音声認識結果が空です')
          return
        }

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          console.log(`結果[${i}]:`, result, 'isFinal:', result.isFinal)
          
          if (result && result.length > 0) {
            const transcript = result[0]?.transcript || ''
            console.log(`テキスト[${i}]:`, transcript)
            
            if (result.isFinal) {
              finalTranscript += transcript + ' '
            } else {
              interimTranscript += transcript + ' '
            }
          }
        }

        console.log('最終テキスト:', finalTranscript.trim(), '中間テキスト:', interimTranscript.trim())

        if (finalTranscript.trim()) {
          setInputText((prev) => {
            const baseText = prev.replace(/ \[聞き取り中...\]$/, '')
            const newText = baseText + finalTranscript.trim()
            console.log('入力欄に設定:', newText)
            return newText
          })
        } else if (interimTranscript.trim()) {
          setInputText((prev) => {
            // 前回のinterim結果を削除して新しいものを追加
            const baseText = prev.replace(/ \[聞き取り中...\]$/, '')
            const newText = baseText + interimTranscript.trim() + ' [聞き取り中...]'
            console.log('中間結果を設定:', newText)
            return newText
          })
        }
      } catch (error) {
        console.error('音声認識結果処理エラー:', error)
        console.error('エラー詳細:', error)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('音声認識エラー:', event.error, event.message)
      setIsListening(false)
      
      if (event.error === 'no-speech') {
        // 音声が検出されなかった場合はエラーを表示しない
        console.log('音声が検出されませんでした')
        return
      }
      
      if (event.error === 'not-allowed') {
        alert('マイクへのアクセスが許可されていません。ブラウザの設定でマイクの使用を許可してください。')
        return
      }
      
      alert(`音声認識でエラーが発生しました: ${event.error}`)
    }

    recognition.onend = () => {
      console.log('音声認識が終了しました')
      setIsListening(false)
      // [聞き取り中...]を削除
      setInputText((prev) => {
        const cleaned = prev.replace(/ \[聞き取り中...\]$/, '')
        console.log('終了時の入力欄:', cleaned)
        return cleaned
      })
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (error) {
          console.error('音声認識クリーンアップエラー:', error)
        }
      }
    }
  }, [])

  // 音声再生
  const playAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const audio = new Audio(audioUrl)
    audioRef.current = audio
    audio.play().catch((error) => {
      console.error('音声再生エラー:', error)
    })
  }

  // 音声入力の開始/停止
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('お使いのブラウザでは音声認識がサポートされていません。')
      return
    }

    if (isListening) {
      console.log('音声認識を停止します')
      try {
        recognitionRef.current.stop()
        setIsListening(false)
      } catch (error) {
        console.error('音声認識停止エラー:', error)
        setIsListening(false)
      }
    } else {
      console.log('音声認識を開始します')
      try {
        // マイクへのアクセス許可を確認
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then(() => {
            recognitionRef.current?.start()
            setIsListening(true)
            console.log('音声認識が開始されました')
          })
          .catch((error) => {
            console.error('マイクアクセスエラー:', error)
            alert('マイクへのアクセスが許可されていません。ブラウザの設定でマイクの使用を許可してください。')
            setIsListening(false)
          })
      } catch (error: any) {
        console.error('音声認識開始エラー:', error)
        // getUserMediaがサポートされていない場合でも、直接startを試す
        try {
          recognitionRef.current.start()
          setIsListening(true)
        } catch (startError) {
          console.error('音声認識直接開始エラー:', startError)
          alert('音声認識を開始できませんでした。ブラウザの設定を確認してください。')
          setIsListening(false)
        }
      }
    }
  }

  // 初回音声の再生
  const handleInitialGreeting = async () => {
    if (hasStarted) return

    setIsLoading(true)
    setHasStarted(true)

    try {
      const response = await fetch('/api/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userText: '',
          sessionId: sessionId,
          isInitial: true,
        }),
      })

      if (!response.ok) {
        throw new Error('APIエラー')
      }

      const data = await response.json()
      
      const greetingMessage: Message = {
        text: data.text,
        audioUrl: data.audioUrl,
        isUser: false,
      }

      setMessages([greetingMessage])
      
      if (data.audioUrl) {
        playAudio(data.audioUrl)
      }
    } catch (error) {
      console.error('エラー:', error)
      alert('エラーが発生しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  // ユーザーメッセージの送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputText.trim() || isLoading) return

    const userMessage: Message = {
      text: inputText,
      isUser: true,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userText: inputText,
          sessionId: sessionId,
        }),
      })

      if (!response.ok) {
        throw new Error('APIエラー')
      }

      const data = await response.json()

      const aiMessage: Message = {
        text: data.text,
        audioUrl: data.audioUrl,
        isUser: false,
      }

      setMessages((prev) => [...prev, aiMessage])

      if (data.audioUrl) {
        playAudio(data.audioUrl)
      }
    } catch (error) {
      console.error('エラー:', error)
      alert('エラーが発生しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>
        Stop being judged.<br />
        Start being loved.
      </h1>

      {!hasStarted ? (
        <div className={styles.initialSection}>
          <button
            onClick={handleInitialGreeting}
            disabled={isLoading}
            className={styles.playButton}
          >
            {isLoading ? '準備中...' : '🎵 話しかけてみる'}
          </button>
        </div>
      ) : (
        <div className={styles.chatSection}>
          <div className={styles.messages}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`${styles.message} ${
                  message.isUser ? styles.userMessage : styles.aiMessage
                }`}
              >
                <p>{message.text}</p>
                {message.audioUrl && !message.isUser && (
                  <button
                    onClick={() => playAudio(message.audioUrl!)}
                    className={styles.replayButton}
                    aria-label="音声を再生"
                  >
                    🔊
                  </button>
                )}
              </div>
            ))}
            {isLoading && (
              <div className={`${styles.message} ${styles.aiMessage}`}>
                <p>...</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="何か話してみて..."
                className={styles.input}
                disabled={isLoading || isListening}
              />
              <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={isLoading}
                className={`${styles.voiceButton} ${
                  isListening ? styles.voiceButtonActive : ''
                }`}
                aria-label="音声入力"
                title={isListening ? '音声入力を停止' : '音声入力'}
              >
                {isListening ? '🛑' : '🎤'}
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputText.trim() || isListening}
              className={styles.submitButton}
            >
              話しかける
            </button>
          </form>
        </div>
      )}
    </main>
  )
}

