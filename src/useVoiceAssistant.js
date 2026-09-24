import { useState, useRef, useCallback } from 'react'

export function useVoiceAssistant(lang, onCommand) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [supported] = useState(() => {
    return typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  })
  const recognitionRef = useRef(null)

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

  return { listening, transcript, supported, start, stop }
}
