import { useState, useEffect, useRef, useCallback } from 'react'
import { languages } from './i18n.js'
import { useVoiceAssistant } from './useVoiceAssistant.js'
import { loadData, updateMedicineTaken, markMessageRead, loadReplies, sendReply, relationMap } from './data.js'

function pad(n) { return n < 10 ? '0' + n : '' + n }

function getGreetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}

function getDateString(lang) {
  const d = new Date()
  const days = {
    en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    hi: ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'],
    mr: ['रविवार','सोमवार','मंगळवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'],
    ta: ['ஞாயிறு','திங்கள்','செவ்வாய்','புதன்','வியாழன்','வெள்ளி','சனி'],
    es: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
  }
  const months = {
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    hi: ['जन','फर','मार्च','अप्र','मई','जून','जुल','अग','सित','अक्ट','नव','दिस'],
    mr: ['जान','फेब','मार्च','एप्र','मे','जून','जुल','ऑग','सप्ट','ऑक्ट','नोव्ह','डिस'],
    ta: ['ஜன','பிப்','மார்','ஏப்','மே','ஜூன்','ஜூலை','ஆக','செப்','அக்','நவ','டிச'],
    es: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
  }
  const dl = days[lang] || days.en
  const ml = months[lang] || months.en
  return `${dl[d.getDay()]}, ${d.getDate()} ${ml[d.getMonth()]}`
}

export default function App() {
  const [lang, setLang] = useState('en')
  const t = languages[lang]
  const [screen, setScreen] = useState('home')
  const [splashGone, setSplashGone] = useState(false)
  const [batteryLevel] = useState(78)
  const [isOnline] = useState(true)
  const [familyContacts, setFamilyContacts] = useState([])
  const [messages, setMessages] = useState([])
  const [medicines, setMedicines] = useState([])
  const [notifications, setNotifications] = useState([])
  const [dashboardMembers, setDashboardMembers] = useState([])
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [callContact, setCallContact] = useState(null)
  const [callType, setCallType] = useState('voice')
  const [callSeconds, setCallSeconds] = useState(0)
  const [callConnected, setCallConnected] = useState(false)
  const [videoPermission, setVideoPermission] = useState(null)
  const [okSent, setOkSent] = useState(false)
  const [sosActive, setSosActive] = useState(false)
  const [sosStep, setSosStep] = useState(0)
  const [locSharing, setLocSharing] = useState(false)
  const [selectedMood, setSelectedMood] = useState(null)
  const [moodSent, setMoodSent] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [openMessage, setOpenMessage] = useState(null)
  const [messageReplies, setMessageReplies] = useState([])
  const [replyInput, setReplyInput] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [toggles, setToggles] = useState({ sound: true, vibration: true, largetext: true, location: true, sos: true })

  const callTimerRef = useRef(null)
  const sosHoldRef = useRef(null)
  const sosTimersRef = useRef([])
  const toastTimerRef = useRef(null)
  const videoRef = useRef(null)
  const pipRef = useRef(null)
  const cameraStreamRef = useRef(null)

  // Clock
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  // Splash
  useEffect(() => {
    const t1 = setTimeout(() => setSplashGone(true), 3000)
    return () => clearTimeout(t1)
  }, [])

  // Load data from Supabase
  useEffect(() => {
    (async () => {
      const data = await loadData()
      setFamilyContacts(data.familyContacts)
      setMessages(data.initialMessages)
      setMedicines(data.initialMedicines)
      setNotifications(data.initialNotifications)
      setDashboardMembers(data.dashboardMembers)
    })()
  }, [])

  // Toast
  const showToast = useCallback((text, icon = 'bi-bell') => {
    setToast({ text, icon })
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  // Voice command handler
  const handleVoiceCommand = useCallback((text) => {
    const cmd = text.toLowerCase()
    const navKeywords = {
      family: ['family', 'परिवार', 'कुटुंब', 'குடும்ப', 'familia'],
      ok: ['ok', "i'm ok", 'ठीक', 'मी ठीक', 'சரி', 'bien'],
      sos: ['sos', 'emergency', 'आपातकाल', 'அவசர', 'emergencia'],
      messages: ['message', 'संदेश', 'संदेश', 'செய்தி', 'mensaje'],
      location: ['location', 'स्थान', 'स्थान', 'இடம்', 'ubicación'],
      medicine: ['medicine', 'दवाई', 'औषध', 'மருந்து', 'medicina'],
      mood: ['mood', 'मूड', 'मूड', 'மனநிலை', 'ánimo'],
      activity: ['steps', 'activity', 'कदम', 'पावले', 'அடி', 'pasos'],
      notifications: ['notification', 'alert', 'अलर्ट', 'அறிவிப்பு', 'alerta'],
      settings: ['setting', 'सेटिंग', 'सेटिंग्ज', 'அமைப்பு', 'ajuste'],
      dashboard: ['dashboard', 'डैशबोर्ड', 'डॅशबोर्ड', 'டாஷ்போர்டு', 'panel'],
    }
    for (const [dest, keywords] of Object.entries(navKeywords)) {
      if (keywords.some(kw => cmd.includes(kw))) {
        setScreen(dest)
        showToast(t.voice.title + ' → ' + dest, 'bi-mic')
        return
      }
    }
    showToast(t.voice.title + ': ' + text, 'bi-mic')
  }, [t])

  const { listening, supported: voiceSupported, start: startVoice, stop: stopVoice } = useVoiceAssistant(t.voice, handleVoiceCommand)

  // Call timer
  useEffect(() => {
    if (callContact && !callConnected) {
      const t = setTimeout(() => {
        setCallConnected(true)
        callTimerRef.current = setInterval(() => {
          setCallSeconds(s => s + 1)
        }, 1000)
      }, 2500)
      return () => clearTimeout(t)
    }
  }, [callContact, callConnected])

  useEffect(() => {
    return () => {
      clearInterval(callTimerRef.current)
    }
  }, [])

  // SOS step animation
  useEffect(() => {
    if (sosActive) {
      sosTimersRef.current = [0,1,2,3].map(i =>
        setTimeout(() => setSosStep(i + 1), (i + 1) * 1500)
      )
      return () => sosTimersRef.current.forEach(clearTimeout)
    }
  }, [sosActive])

  // Medicine reminder after 4s
  useEffect(() => {
    if (splashGone) {
      const t = setTimeout(() => {
        setModal({
          iconClass: 'medicine',
          icon: 'bi-capsule',
          title: t.medicine.reminder,
          text: t.medicine.reminderText,
          actions: [
            { label: t.medicine.taken, class: 'success', action: 'taken' },
            { label: t.medicine.snooze, class: 'secondary', action: 'snooze' },
          ],
        })
      }, 4000)
      return () => clearTimeout(t)
    }
  }, [splashGone, t])

  const handleModalAction = (action) => {
    setModal(null)
    if (action === 'taken') {
      setMedicines(prev => prev.map(m => m.id === 2 ? { ...m, taken: true } : m))
      updateMedicineTaken(2, true)
      showToast(t.medicine.marked, 'bi-check-circle')
    }
  }

  const openMessageThread = async (msg) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, unread: false } : m))
    markMessageRead(msg.id)
    setOpenMessage(msg)
    setMessageReplies([])
    const replies = await loadReplies(msg.id)
    setMessageReplies(replies)
  }

  const closeMessageThread = () => {
    setOpenMessage(null)
    setMessageReplies([])
    setReplyInput('')
  }

  const handleSendReply = async () => {
    if (!replyInput.trim() || !openMessage || sendingReply) return
    const text = replyInput.trim()
    setSendingReply(true)
    setReplyInput('')
    const saved = await sendReply(openMessage.id, text)
    setMessageReplies(prev => [...prev, saved || { id: Date.now(), sender: 'Arjun', text }])
    setSendingReply(false)
  }

  const requestVideoCall = (contact) => {
    setVideoPermission(contact)
  }

  const startCall = (contact, type) => {
    setCallContact(contact)
    setCallType(type)
    setCallSeconds(0)
    setCallConnected(false)
    setCameraOn(false)
    setCameraError(false)
    setScreen('call')
    if (type === 'video') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          cameraStreamRef.current = stream
          setCameraOn(true)
        })
        .catch(() => {
          setCameraError(true)
          showToast(t.call.cameraDenied, 'bi-camera-video-off')
        })
    }
  }

    const allowVideoCall = () => {
      const contact = videoPermission
      setVideoPermission(null)
      if (contact) startCall(contact, 'video')
    }

  // Attach camera stream to video elements once they render
  useEffect(() => {
    if (cameraOn && cameraStreamRef.current) {
      const stream = cameraStreamRef.current
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
      if (pipRef.current) {
        pipRef.current.srcObject = stream
        pipRef.current.play().catch(() => {})
      }
    }
  }, [cameraOn, callContact, callType])

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (pipRef.current) {
      pipRef.current.srcObject = null
    }
    setCameraOn(false)
  }

  const endCall = () => {
    clearInterval(callTimerRef.current)
    callTimerRef.current = null
    stopCamera()
    setCallContact(null)
    setCallConnected(false)
    setCallSeconds(0)
    setScreen('family')
    showToast(t.call.ended, 'bi-telephone-x')
  }

  const sendOK = () => {
    setOkSent(true)
    showToast(t.ok.notified, 'bi-heart-fill')
    setTimeout(() => {
      setOkSent(false)
      setScreen('home')
    }, 2500)
  }

  const triggerSOS = () => {
    setSosActive(true)
    setSosStep(0)
    showToast(t.sos.alert, 'bi-exclamation-triangle-fill')
  }

  const cancelSOS = () => {
    setSosActive(false)
    setSosStep(0)
    setScreen('home')
    showToast(t.sos.cancelled, 'bi-x-circle')
  }

  const sosHoldStart = () => {
    sosHoldRef.current = setTimeout(triggerSOS, 3000)
  }
  const sosHoldEnd = () => {
    clearTimeout(sosHoldRef.current)
  }

  const toggleSetting = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }))
    showToast(`${key} ${toggles[key] ? t.settings.disabled : t.settings.enabled}`, 'bi-gear')
  }

  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  const dateStr = getDateString(lang)
  const greeting = t.greeting[getGreetingKey()]

  return (
    <>
      <div className="watch-frame">
        <div className="watch-screen">
          {!splashGone && (
            <div className="splash-screen">
              <img className="splash-logo" src="/withyou-logo.svg" alt="WithYou" />
              <div className="splash-name">{t.appName}</div>
              <div className="splash-tagline">{t.tagline} <strong>&#10084;</strong></div>
              <div className="splash-loader"><div className="splash-loader-bar" /></div>
              <div className="splash-hint">{t.loading}</div>
            </div>
          )}

          <div className="watch-logo">
            <img src="/withyou-logo.svg" alt="WithYou" />
            <span className="logo-text">{t.appName}</span>
          </div>

          <div className="status-bar">
            <div className="status-left">
              <span className={`signal-dot ${isOnline ? '' : 'offline'}`}></span>
              <span>{isOnline ? 'Connected' : 'Offline'}</span>
            </div>
            <div className="status-right">
              <i className="bi bi-bluetooth" style={{ fontSize: '0.7rem', color: 'var(--primary)' }}></i>
              <div className="battery-icon">
                <div className="battery-bar">
                  <div className={`battery-fill ${batteryLevel < 20 ? 'low' : ''}`} style={{ width: `${batteryLevel}%` }}></div>
                </div>
                <span>{batteryLevel}%</span>
              </div>
            </div>
          </div>

          {/* HOME */}
          {screen === 'home' && (
            <div className="screen active" id="screen-home">
              <div className="home-time">{timeStr}</div>
              <div className="home-date">{dateStr}</div>
              <div className="home-greeting">{greeting}, Arjun &#128151;</div>
              <div className="home-main-buttons">
                <button className="home-btn family" onClick={() => setScreen('family')}>
                  <div className="btn-icon"><i className="bi bi-people-fill"></i></div>
                  <div className="btn-text">
                    <div className="btn-label">{t.nav.family}</div>
                    <div className="btn-sub">{t.home.callLoved}</div>
                  </div>
                </button>
                <button className="home-btn ok" onClick={() => setScreen('ok')}>
                  <div className="btn-icon"><i className="bi bi-heart-fill"></i></div>
                  <div className="btn-text">
                    <div className="btn-label">{t.nav.ok}</div>
                    <div className="btn-sub">{t.home.sendCheckin}</div>
                  </div>
                </button>
                <button className="home-btn sos" onClick={() => setScreen('sos')}>
                  <div className="btn-icon"><i className="bi bi-exclamation-triangle-fill"></i></div>
                  <div className="btn-text">
                    <div className="btn-label">{t.nav.sos}</div>
                    <div className="btn-sub">{t.home.emergency}</div>
                  </div>
                </button>
              </div>
              <div className="home-quick-row">
                <button className="home-quick-btn" onClick={() => setScreen('messages')}><i className="bi bi-chat-dots"></i><span>{t.nav.messages}</span></button>
                <button className="home-quick-btn" onClick={() => setScreen('location')}><i className="bi bi-geo-alt"></i><span>{t.nav.location}</span></button>
                <button className="home-quick-btn" onClick={() => setScreen('medicine')}><i className="bi bi-capsule"></i><span>{t.nav.medicine}</span></button>
                <button className="home-quick-btn" onClick={() => setScreen('mood')}><i className="bi bi-emoji-smile"></i><span>{t.nav.mood}</span></button>
                <button className="home-quick-btn" onClick={() => setScreen('activity')}><i className="bi bi-person-walking"></i><span>{t.nav.activity}</span></button>
                <button className="home-quick-btn" onClick={() => setScreen('notifications')}><i className="bi bi-bell"></i><span>{t.nav.notifications}</span></button>
                <button className="home-quick-btn" onClick={() => setScreen('settings')}><i className="bi bi-gear"></i><span>{t.nav.settings}</span></button>
                <button className="home-quick-btn" onClick={() => setScreen('dashboard')}><i className="bi bi-house-heart"></i><span>{t.nav.dashboard}</span></button>
              </div>
            </div>
          )}

          {/* FAMILY */}
          {screen === 'family' && (
            <div className="screen active" id="screen-family">
              <div className="screen-header">
                <button className="back-btn" onClick={() => setScreen('home')}><i className="bi bi-chevron-left"></i></button>
                <h2 className="screen-title">{t.family.title}</h2>
              </div>
              <div className="family-list">
                {familyContacts.map(f => (
                  <div className="family-card" key={f.id}>
                    <div className="family-avatar" style={{ background: f.color }}>{f.initials}</div>
                    <div className="family-info">
                      <div className="family-name">{f.name}</div>
                      <div className="family-relation">{relationMap[f.relationKey][lang]} &middot; {f.phone}</div>
                      <div className={`family-status ${f.online ? '' : 'offline'}`}>
                        <span className="dot"></span> {f.online ? t.family.available : t.family.offline}
                      </div>
                    </div>
                    <div className="family-call-btns">
                      <button className="call-icon-btn voice" title={t.family.voiceCall} onClick={() => startCall(f, 'voice')}><i className="bi bi-telephone-fill"></i></button>
                      <button className="call-icon-btn video" title={t.family.videoCall} onClick={() => requestVideoCall(f)}><i className="bi bi-camera-video-fill"></i></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CALL */}
          {screen === 'call' && callContact && (
            <div className="screen active" id="screen-call">
              <div className="call-screen">
                {callType === 'video' && (
                  <div className="call-video-container">
                    {cameraOn ? (
                      <video className="call-video-feed" ref={videoRef} autoPlay muted playsInline />
                    ) : (
                      <div className="call-video-placeholder">
                        <div className="call-avatar" style={{ background: callContact.color }}>{callContact.initials}</div>
                        {cameraError && <div className="call-camera-error"><i className="bi bi-camera-video-off"></i> {t.call.cameraDenied}</div>}
                      </div>
                    )}
                    <div className="call-video-pip">
                      {cameraOn ? (
                        <video className="call-video-pip-feed" ref={pipRef} autoPlay muted playsInline />
                      ) : (
                        <div className="call-video-pip-placeholder"><i className="bi bi-camera-video-off"></i></div>
                      )}
                    </div>
                  </div>
                )}
                {callType !== 'video' && (
                  <div className="call-avatar" style={{ background: callContact.color }}>{callContact.initials}</div>
                )}
                <div className="call-name">{callContact.name}</div>
                <div className="call-status-text">{callConnected ? (callType === 'video' ? t.call.videoConnected : t.call.connected) : (callType === 'video' ? t.call.videoCalling : t.call.calling)}</div>
                <div className="call-timer">{callConnected ? `${pad(Math.floor(callSeconds / 60))}:${pad(callSeconds % 60)}` : ''}</div>
                <div className="call-actions">
                  <button className="call-action-btn mute" onClick={(e) => {
                    const btn = e.currentTarget
                    const muted = btn.classList.toggle('muted')
                    btn.innerHTML = muted ? '<i class="bi bi-mic-mute-fill"></i>' : '<i class="bi bi-mic-fill"></i>'
                    btn.style.background = muted ? 'var(--sos)' : ''
                    btn.style.color = muted ? 'white' : ''
                  }}><i className="bi bi-mic-fill"></i></button>
                  {callType === 'video' && (
                    <button className="call-action-btn camera" onClick={() => {
                      if (cameraOn) {
                        stopCamera()
                        showToast(t.call.cameraOff, 'bi-camera-video-off')
                      } else {
                        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                          .then((stream) => {
                            cameraStreamRef.current = stream
                            setCameraOn(true)
                            setCameraError(false)
                          })
                          .catch(() => {
                            setCameraError(true)
                            showToast(t.call.cameraDenied, 'bi-camera-video-off')
                          })
                      }
                    }}><i className={`bi ${cameraOn ? 'bi-camera-video-fill' : 'bi-camera-video-off-fill'}`}></i></button>
                  )}
                  <button className="call-action-btn speaker" onClick={(e) => {
                    const btn = e.currentTarget
                    const on = btn.classList.toggle('on')
                    btn.style.background = on ? 'var(--accent-green)' : ''
                    btn.style.color = on ? 'white' : ''
                  }}><i className="bi bi-volume-up-fill"></i></button>
                  <button className="call-action-btn end" onClick={endCall}><i className="bi bi-telephone-x-fill"></i></button>
                </div>
              </div>
            </div>
          )}

          {/* MESSAGES LIST */}
          {screen === 'messages' && !openMessage && (
            <div className="screen active" id="screen-messages">
              <div className="screen-header">
                <button className="back-btn" onClick={() => setScreen('home')}><i className="bi bi-chevron-left"></i></button>
                <h2 className="screen-title">{t.messages.title}</h2>
              </div>
              <div className="message-list">
                {messages.map(m => (
                  <div className={`message-card ${m.unread ? 'unread' : ''}`} key={m.id} onClick={() => openMessageThread(m)}>
                    <div className="message-avatar" style={{ background: m.color }}>{m.initials}</div>
                    <div className="message-body">
                      <div className="message-sender">{m.sender}</div>
                      <div className="message-text">{m.text}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span className="message-time">{m.time}</span>
                      {m.unread && <div className="unread-badge"></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MESSAGE THREAD */}
          {screen === 'messages' && openMessage && (
            <div className="screen active" id="screen-message-thread">
              <div className="screen-header">
                <button className="back-btn" onClick={closeMessageThread}><i className="bi bi-chevron-left"></i></button>
                <div className="message-thread-header">
                  <div className="message-thread-avatar" style={{ background: openMessage.color }}>{openMessage.initials}</div>
                  <div>
                    <h2 className="screen-title" style={{ fontSize: '1rem' }}>{openMessage.sender}</h2>
                    <span className="message-thread-time">{openMessage.time}</span>
                  </div>
                </div>
              </div>
              <div className="message-thread">
                <div className="message-thread-bubble received">
                  <div className="bubble-text">{openMessage.text}</div>
                </div>
                {messageReplies.map(r => (
                  <div key={r.id} className={`message-thread-bubble ${r.sender === 'Arjun' ? 'sent' : 'received'}`}>
                    <div className="bubble-text">{r.text}</div>
                  </div>
                ))}
              </div>
              <div className="message-reply-bar">
                <input
                  type="text"
                  className="reply-input"
                  placeholder={t.messages.reply || 'Reply...'}
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply() }}
                  disabled={sendingReply}
                />
                <button className="reply-send-btn" onClick={handleSendReply} disabled={sendingReply || !replyInput.trim()}>
                  <i className="bi bi-send-fill"></i>
                </button>
              </div>
            </div>
          )}

          {/* OK CHECK-IN */}
          {screen === 'ok' && (
            <div className="screen active" id="screen-ok">
              <div className="screen-header">
                <button className="back-btn" onClick={() => setScreen('home')}><i className="bi bi-chevron-left"></i></button>
                <h2 className="screen-title">{t.ok.title}</h2>
              </div>
              <div className="ok-screen">
                {okSent ? (
                  <div className="ok-success">
                    <div className="check-icon"><i className="bi bi-check-lg"></i></div>
                    <div className="ok-success-text">{t.ok.sent}</div>
                    <div className="ok-success-sub">{t.ok.sentSub}</div>
                  </div>
                ) : (
                  <>
                    <div className="ok-circle"><i className="bi bi-heart"></i></div>
                    <div className="ok-text">{t.ok.subtitle}</div>
                    <div className="ok-sub">{t.ok.desc}</div>
                    <button className="ok-send-btn" onClick={sendOK}>{t.ok.send}</button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* SOS */}
          {screen === 'sos' && (
            <div className="screen active" id="screen-sos">
              <div className="screen-header">
                <button className="back-btn" onClick={() => setScreen('home')}><i className="bi bi-chevron-left"></i></button>
                <h2 className="screen-title">{t.sos.title}</h2>
              </div>
              <div className="sos-screen">
                {sosActive ? (
                  <div className="sos-active">
                    <div className="sos-active-icon"><i className="bi bi-exclamation-triangle-fill"></i></div>
                    <div className="sos-active-text">{t.sos.activated}</div>
                    <div className="sos-active-sub">{t.sos.notifying}</div>
                    <div className="sos-notifying">
                      <div className="sos-notify-row"><span className="dot" style={{ background: sosStep >= 1 ? 'var(--accent-green)' : '' }}></span> {t.sos.callRahul}{sosStep >= 1 ? ' \u2713' : '...'}</div>
                      <div className="sos-notify-row"><span className="dot" style={{ background: sosStep >= 2 ? 'var(--accent-green)' : '' }}></span> {t.sos.callPriya}{sosStep >= 2 ? ' \u2713' : '...'}</div>
                      <div className="sos-notify-row"><span className="dot" style={{ background: sosStep >= 3 ? 'var(--accent-green)' : '' }}></span> {t.sos.sharingLoc}{sosStep >= 3 ? ' \u2713' : '...'}</div>
                      <div className="sos-notify-row"><span className="dot" style={{ background: sosStep >= 4 ? 'var(--accent-green)' : '' }}></span> {t.sos.alerting}{sosStep >= 4 ? ' \u2713' : '...'}</div>
                    </div>
                    <button className="sos-cancel-btn" onClick={cancelSOS}>{t.sos.cancelSOS}</button>
                  </div>
                ) : (
                  <>
                    <button className="sos-hold-btn" onPointerDown={sosHoldStart} onPointerUp={sosHoldEnd} onPointerLeave={sosHoldEnd}>
                      <div className="sos-ring"></div>
                      <i className="bi bi-exclamation-triangle-fill"></i>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t.sos.hold}</span>
                    </button>
                    <div className="sos-instruction">{t.sos.instruction}</div>
                    <button className="sos-cancel-btn" onClick={() => setScreen('home')}>{t.sos.cancel}</button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* LOCATION */}
          {screen === 'location' && (
            <div className="screen active" id="screen-location">
              <div className="screen-header">
                <button className="back-btn" onClick={() => setScreen('home')}><i className="bi bi-chevron-left"></i></button>
                <h2 className="screen-title">{t.location.title}</h2>
              </div>
              <div className="location-map">
                <div className="location-pin"><i className="bi bi-geo-alt-fill"></i></div>
              </div>
              <div className="location-info">
                <div className="location-address">{t.location.address}</div>
                <div className="location-coords">{t.location.coords}</div>
              </div>
              <button className="location-share-btn" onClick={() => {
                if (!locSharing) {
                  setLocSharing(true)
                  showToast(t.location.shared, 'bi-geo-alt')
                }
              }}>
                {locSharing ? <><i className="bi bi-broadcast" style={{ marginRight: '6px' }}></i> {t.location.active}</> : t.location.share}
              </button>
            </div>
          )}

          {/* MEDICINE */}
          {screen === 'medicine' && (
            <div className="screen active" id="screen-medicine">
              <div className="screen-header">
                <button className="back-btn" onClick={() => setScreen('home')}><i className="bi bi-chevron-left"></i></button>
                <h2 className="screen-title">{t.medicine.title}</h2>
              </div>
              <div className="medicine-list">
                {medicines.map(m => (
                  <div className="medicine-card" key={m.id}>
                    <div className={`medicine-icon ${m.period}`}>
                      <i className={`bi ${m.period === 'morning' ? 'bi-sun' : m.period === 'afternoon' ? 'bi-cloud-sun' : 'bi-moon'}`}></i>
                    </div>
                    <div className="medicine-info">
                      <div className="medicine-name">{m.name}</div>
                      <div className="medicine-dose">{m.dose}</div>
                      <div className="medicine-time">{m.time}</div>
                    </div>
                    <button className={`medicine-check ${m.taken ? 'taken' : ''}`} onClick={() => {
                      setMedicines(prev => prev.map(med => med.id === m.id ? { ...med, taken: !med.taken } : med))
                      updateMedicineTaken(m.id, !m.taken)
                      if (!m.taken) showToast(`${m.name} ${t.medicine.marked}`, 'bi-check-circle')
                    }}>
                      <i className="bi bi-check-lg"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MOOD */}
          {screen === 'mood' && (
            <div className="screen active" id="screen-mood">
              <div className="screen-header">
                <button className="back-btn" onClick={() => setScreen('home')}><i className="bi bi-chevron-left"></i></button>
                <h2 className="screen-title">{t.mood.title}</h2>
              </div>
              <div className="mood-screen">
                {moodSent ? (
                  <div className="mood-thanks">
                    <div className="mood-thanks-icon">{selectedMood ? selectedMood.emoji : '\u{1F60A}'}</div>
                    <div className="mood-thanks-text">{t.mood.thanks}</div>
                    <div className="ok-success-sub">{t.mood.thanksSub}</div>
                  </div>
                ) : (
                  <>
                    <div className="mood-question">{t.mood.question}</div>
                    <div className="mood-emoji-row">
                      {[
                        { key: 'happy', emoji: '\u{1F60A}' },
                        { key: 'calm', emoji: '\u{1F642}' },
                        { key: 'neutral', emoji: '\u{1F610}' },
                        { key: 'sad', emoji: '\u{1F615}' },
                      ].map(m => (
                        <button key={m.key} className={`mood-emoji ${selectedMood?.key === m.key ? 'selected' : ''}`}
                          onClick={() => setSelectedMood({ key: m.key, emoji: m.emoji })}>
                          {m.emoji}
                        </button>
                      ))}
                    </div>
                    <div className="mood-label">{selectedMood ? t.mood[selectedMood.key] : ''}</div>
                    <button className={`mood-submit ${selectedMood ? 'active' : ''}`} onClick={() => {
                      if (!selectedMood) return
                      setMoodSent(true)
                      showToast(t.mood.sent, 'bi-emoji-smile')
                      setTimeout(() => { setMoodSent(false); setSelectedMood(null); setScreen('home') }, 2500)
                    }}>{t.mood.submit}</button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ACTIVITY */}
          {screen === 'activity' && (
            <div className="screen active" id="screen-activity">
              <div className="screen-header">
                <button className="back-btn" onClick={() => setScreen('home')}><i className="bi bi-chevron-left"></i></button>
                <h2 className="screen-title">{t.activity.title}</h2>
              </div>
              <ActivityRings t={t} />
              <div className="activity-stats">
                <ActivityStat icon="bi-person-walking" bg="rgba(123,196,164,0.15)" color="var(--accent-green)" value={`4280 / 6000 ${t.activity.steps}`} label={`71% ${t.activity.stepGoal}`} />
                <ActivityStat icon="bi-fire" bg="rgba(232,184,143,0.2)" color="#c89a6a" value={`185 ${t.activity.kcal}`} label={t.activity.calories} />
                <ActivityStat icon="bi-heart-pulse" bg="rgba(111,168,214,0.15)" color="var(--accent-blue)" value={`72 ${t.activity.bpm}`} label={t.activity.heartRate} />
                <ActivityStat icon="bi-clock-history" bg="rgba(74,144,164,0.12)" color="var(--primary)" value="42 min" label={t.activity.activeTime} />
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {screen === 'notifications' && (
            <div className="screen active" id="screen-notifications">
              <div className="screen-header">
                <button className="back-btn" onClick={() => setScreen('home')}><i className="bi bi-chevron-left"></i></button>
                <h2 className="screen-title">{t.notifications.title}</h2>
              </div>
              <div className="notification-list">
                {notifications.map(n => (
                  <div className="notif-card" key={n.id}>
                    <div className="notif-icon" style={{ background: n.color + '22', color: n.color }}><i className={`bi ${n.icon}`}></i></div>
                    <div className="notif-body">
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-text">{n.text}</div>
                      <div className="notif-time">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {screen === 'settings' && (
            <div className="screen active" id="screen-settings">
              <div className="screen-header">
                <button className="back-btn" onClick={() => setScreen('home')}><i className="bi bi-chevron-left"></i></button>
                <h2 className="screen-title">{t.settings.title}</h2>
              </div>
              <div className="settings-list">
                <SettingRow icon="bi-volume-up" bg="rgba(74,144,164,0.12)" color="var(--primary)" label={t.settings.sound} toggle={toggles.sound} onToggle={() => toggleSetting('sound')} />
                <SettingRow icon="bi-vibrate" bg="rgba(123,196,164,0.15)" color="var(--accent-green)" label={t.settings.vibration} toggle={toggles.vibration} onToggle={() => toggleSetting('vibration')} />
                <SettingRow icon="bi-fonts" bg="rgba(232,184,143,0.2)" color="#c89a6a" label={t.settings.largeText} toggle={toggles.largetext} onToggle={() => toggleSetting('largetext')} />
                <SettingRow icon="bi-geo-alt" bg="rgba(111,168,214,0.15)" color="var(--accent-blue)" label={t.settings.locationSharing} toggle={toggles.location} onToggle={() => toggleSetting('location')} />
                <SettingRow icon="bi-shield-check" bg="rgba(212,114,106,0.12)" color="var(--sos)" label={t.settings.sosAutoCall} toggle={toggles.sos} onToggle={() => toggleSetting('sos')} />
                <div className="setting-row">
                  <div className="setting-icon" style={{ background: 'rgba(74,144,164,0.12)', color: 'var(--primary)' }}><i className="bi bi-brightness-high"></i></div>
                  <div className="setting-label">{t.settings.brightness}</div>
                  <span className="setting-value">80%</span>
                </div>
                <div className="setting-row">
                  <div className="setting-icon" style={{ background: 'rgba(123,196,164,0.15)', color: 'var(--accent-green)' }}><i className="bi bi-battery-half"></i></div>
                  <div className="setting-label">{t.settings.battery}</div>
                  <span className="setting-value">{batteryLevel}% - 2 {t.settings.daysLeft}</span>
                </div>
                {/* Language selector */}
                <div className="setting-row">
                  <div className="setting-icon" style={{ background: 'rgba(74,144,164,0.12)', color: 'var(--primary)' }}><i className="bi bi-translate"></i></div>
                  <div className="setting-label">Language</div>
                  <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ border: '1px solid var(--card-border)', borderRadius: '8px', padding: '4px 8px', fontSize: '0.78rem', color: 'var(--text-main)', background: 'transparent', fontFamily: 'inherit' }}>
                    {Object.entries(languages).map(([key, val]) => (
                      <option key={key} value={key}>{val.flag} {val.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* DASHBOARD */}
          {screen === 'dashboard' && (
            <div className="screen active" id="screen-dashboard">
              <div className="screen-header">
                <button className="back-btn" onClick={() => setScreen('home')}><i className="bi bi-chevron-left"></i></button>
                <h2 className="screen-title">{t.dashboard.title}</h2>
              </div>
              <div className="dashboard-summary">
                <div className="dashboard-card">
                  <div className="icon" style={{ color: 'var(--accent-green)' }}><i className="bi bi-heart-fill"></i></div>
                  <div className="value">OK</div>
                  <div className="label">{t.dashboard.lastCheckin}</div>
                </div>
                <div className="dashboard-card">
                  <div className="icon" style={{ color: 'var(--accent-blue)' }}><i className="bi bi-people-fill"></i></div>
                  <div className="value">3 Active</div>
                  <div className="label">{t.dashboard.familyOnline}</div>
                </div>
                <div className="dashboard-card">
                  <div className="icon" style={{ color: '#c89a6a' }}><i className="bi bi-capsule"></i></div>
                  <div className="value">1/3</div>
                  <div className="label">{t.dashboard.medicinesTaken}</div>
                </div>
                <div className="dashboard-card">
                  <div className="icon" style={{ color: 'var(--primary)' }}><i className="bi bi-person-walking"></i></div>
                  <div className="value">4,280</div>
                  <div className="label">{t.dashboard.stepsToday}</div>
                </div>
              </div>
              <div className="dashboard-section-title">{t.dashboard.members}</div>
              {dashboardMembers.map((m, i) => (
                <div className="dashboard-member" key={i}>
                  <div className="avatar" style={{ background: m.color }}>{m.initials}</div>
                  <div className="info">
                    <div className="name">{m.name}</div>
                    <div className="detail">{m.detail}</div>
                  </div>
                  <div className={`status-tag ${m.status}`}>{m.status === 'ok' ? 'OK' : 'Check'}</div>
                </div>
              ))}
            </div>
          )}

          {/* Toast */}
          {toast && (
            <div className="toast-notif show">
              <i className={`bi ${toast.icon}`}></i> {toast.text}
            </div>
          )}

          {/* Modal */}
          {modal && (
            <div className="modal-overlay show">
              <div className="modal-card">
                <div className={`modal-icon ${modal.iconClass}`}><i className={`bi ${modal.icon}`}></i></div>
                <div className="modal-title">{modal.title}</div>
                <div className="modal-text">{modal.text}</div>
                <div className="modal-actions">
                  {modal.actions.map((a, i) => (
                    <button key={i} className={`modal-btn ${a.class}`} onClick={() => handleModalAction(a.action)}>{a.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {videoPermission && (
            <div className="modal-overlay show">
              <div className="modal-card video-permission-card">
                <div className="modal-icon camera"><i className="bi bi-camera-video-fill"></i></div>
                <div className="modal-title">{t.call.permissionTitle}</div>
                <div className="modal-text">{t.call.permissionText}</div>
                <div className="video-permission-person">
                  <div className="family-avatar" style={{ background: videoPermission.color }}>{videoPermission.initials}</div>
                  <span>{videoPermission.name}</span>
                </div>
                <div className="modal-actions">
                  <button className="modal-btn secondary" onClick={() => setVideoPermission(null)}>{t.call.permissionCancel}</button>
                  <button className="modal-btn primary" onClick={allowVideoCall}>{t.call.permissionAllow}</button>
                </div>
              </div>
            </div>
          )}

          {/* Voice Assistant Button */}
          <button className="voice-fab" onClick={() => {
            if (!voiceSupported) {
              showToast(t.voice.notSupported, 'bi-mic')
              return
            }
            if (listening) stopVoice()
            else startVoice()
          }} title={t.voice.title}>
            <i className={`bi ${listening ? 'bi-stop-circle-fill' : 'bi-mic-fill'}`}></i>
            {listening && <span className="voice-pulse"></span>}
          </button>

          {/* Voice overlay */}
          {listening && (
            <div className="voice-overlay" onClick={stopVoice}>
              <div className="voice-overlay-icon">
                <i className="bi bi-mic-fill"></i>
                <span className="voice-pulse-ring"></span>
              </div>
              <div className="voice-overlay-text">{t.voice.listening}</div>
              <div className="voice-overlay-hint">{t.voice.hint}</div>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel */}
      <div className="side-panel">
        <div className="panel-card">
          <div className="panel-logo">
            <img src="/withyou-logo.svg" alt="WithYou" />
            <div className="logo-name">{t.appName}</div>
          </div>
          <div className="panel-title">{t.appName} Status</div>
          <div className="panel-stat"><i className="bi bi-heart-pulse"></i><div><div className="val">Healthy</div><div className="lbl">Overall status</div></div></div>
          <div className="panel-stat"><i className="bi bi-people"></i><div><div className="val">3 Online</div><div className="lbl">Family connected</div></div></div>
          <div className="panel-stat"><i className="bi bi-capsule"></i><div><div className="val">1 of 3</div><div className="lbl">Medicines taken</div></div></div>
          <div className="panel-stat"><i className="bi bi-battery-half"></i><div><div className="val">{batteryLevel}%</div><div className="lbl">Battery remaining</div></div></div>
        </div>
        <div className="panel-card">
          <div className="panel-title">{t.appName}</div>
          <div className="tagline">{t.appName} &ndash; {t.tagline} <strong>&#10084;</strong></div>
        </div>
      </div>
    </>
  )
}

function ActivityRings({ t }) {
  const R = 30
  const C = 2 * Math.PI * R
  const steps = 4280, stepGoal = 6000, stepPct = Math.min(steps / stepGoal, 1)
  const calories = 185, calGoal = 300, calPct = calories / calGoal
  const heartRate = 72, heartGoal = 120, heartPct = heartRate / heartGoal

  return (
    <div className="activity-rings">
      <div className="activity-ring">
        <svg width="72" height="72">
          <circle className="ring-bg" cx="36" cy="36" r={R}></circle>
          <circle className="ring-fill" cx="36" cy="36" r={R} stroke="#7bc4a4" strokeDasharray={C} strokeDashoffset={C * (1 - stepPct)}></circle>
        </svg>
        <div className="ring-label">{steps}<small>{t.activity.steps}</small></div>
      </div>
      <div className="activity-ring">
        <svg width="72" height="72">
          <circle className="ring-bg" cx="36" cy="36" r={R}></circle>
          <circle className="ring-fill" cx="36" cy="36" r={R} stroke="#e8b88f" strokeDasharray={C} strokeDashoffset={C * (1 - calPct)}></circle>
        </svg>
        <div className="ring-label">{calories}<small>{t.activity.kcal}</small></div>
      </div>
      <div className="activity-ring">
        <svg width="72" height="72">
          <circle className="ring-bg" cx="36" cy="36" r={R}></circle>
          <circle className="ring-fill" cx="36" cy="36" r={R} stroke="#6fa8d6" strokeDasharray={C} strokeDashoffset={C * (1 - heartPct)}></circle>
        </svg>
        <div className="ring-label">{heartRate}<small>{t.activity.bpm}</small></div>
      </div>
    </div>
  )
}

function ActivityStat({ icon, bg, color, value, label }) {
  return (
    <div className="activity-stat-card">
      <div className="activity-stat-icon" style={{ background: bg, color }}><i className={`bi ${icon}`}></i></div>
      <div>
        <div className="activity-stat-value">{value}</div>
        <div className="activity-stat-label">{label}</div>
      </div>
    </div>
  )
}

function SettingRow({ icon, bg, color, label, toggle, onToggle }) {
  return (
    <div className="setting-row">
      <div className="setting-icon" style={{ background: bg, color }}><i className={`bi ${icon}`}></i></div>
      <div className="setting-label">{label}</div>
      <button className={`toggle-switch ${toggle ? 'on' : ''}`} onClick={onToggle}></button>
    </div>
  )
}
