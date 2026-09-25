import { useState, useRef, useCallback } from 'react'

const speechLanguages = [
  { pattern: /[\u0C00-\u0C7F]/, lang: 'te-IN' },
  { pattern: /[\u0900-\u097F]/, lang: 'hi-IN' },
  { pattern: /[\u0B80-\u0BFF]/, lang: 'ta-IN' },
  { pattern: /[\u0C80-\u0CFF]/, lang: 'kn-IN' },
  { pattern: /[\u0D00-\u0D7F]/, lang: 'ml-IN' },
  { pattern: /[\u0A80-\u0AFF]/, lang: 'gu-IN' },
  { pattern: /[\u0A00-\u0A7F]/, lang: 'pa-IN' },
  { pattern: /[\u0980-\u09FF]/, lang: 'bn-IN' },
  { pattern: /[\u0600-\u06FF]/, lang: 'ar-SA' },
]

function detectSpeechLanguage(text, fallback) {
  return speechLanguages.find(({ pattern }) => pattern.test(text))?.lang || fallback
}

export function useVoiceAssistant(lang, onCommand) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [supported] = useState(() => {
    return typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  })
  const recognitionRef = useRef(null)

  const speak = useCallback((text, preferredLang = lang) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text?.trim()) return

    const utterance = new SpeechSynthesisUtterance(text.trim())
    utterance.lang = detectSpeechLanguage(text, preferredLang)
    utterance.volume = 1
    utterance.rate = 0.9
    utterance.pitch = 1

    const voices = window.speechSynthesis.getVoices()
    const languagePrefix = utterance.lang.toLowerCase().split('-')[0]
    utterance.voice = voices.find(voice => voice.lang.toLowerCase() === utterance.lang.toLowerCase())
      || voices.find(voice => voice.lang.toLowerCase().startsWith(languagePrefix))

    window.speechSynthesis.speak(utterance)
  }, [lang])

  const start = useCallback(() => {
    if (!supported) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setListening(true)
      setTranscript('')
    }

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript.toLowerCase().trim()
      setTranscript(text)
      onCommand(text)
    }

    recognition.onerror = () => {
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [lang, onCommand, supported])

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setListening(false)
  }, [])

  return { listening, transcript, supported, start, stop, speak }
}
