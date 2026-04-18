import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSound } from '../hooks/useSound'
import type { QuizData, GamePhase } from '../types'
import './play.css'

const SHAPE_ICONS = ['▲', '◆', '●', '■']
const ANSWER_COLORS = ['#e21b3c', '#1368ce', '#ffa602', '#26890c']
const KEYS = ['1', '2', '3', '4', 'a', 'b', 'c', 'd']

interface SavedState {
  qIndex: number
  score: number
  streak: number
  history: boolean[]
  phase: 'question' | 'answer'
  selected: number | null
}

function saveKey(id: string) { return `kahoot_state_${id}` }
function saveState(id: string, s: SavedState) {
  localStorage.setItem(saveKey(id), JSON.stringify(s))
}
function loadState(id: string): SavedState | null {
  try { return JSON.parse(localStorage.getItem(saveKey(id)) ?? 'null') as SavedState | null }
  catch { return null }
}
function clearState(id: string) { localStorage.removeItem(saveKey(id)) }

export default function Play() {
  const { id } = useParams<{ id: string }>()
  const [quiz, setQuiz] = useState<QuizData & { id: number } | null>(null)
  const [phase, setPhase] = useState<GamePhase>('lobby')
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(20)
  const [history, setHistory] = useState<boolean[]>([])
  const [paused, setPaused] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [savedState, setSavedState] = useState<SavedState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const pausedTimeRef = useRef(0)
  const pauseStartRef = useRef(0)

  const { user } = useAuth()
  const nav = useNavigate()
  const sound = useSound(soundOn)

  useEffect(() => {
    if (!id) return
    api.getQuiz(Number(id))
      .then(data => {
        setQuiz(data)
        const s = loadState(id)
        setSavedState(s)
        setLoading(false)
      })
      .catch(() => { setError('Quiz introuvable'); setLoading(false) })
  }, [id])

  const currentQ = quiz?.questions[qIndex]
  const timeLimit = currentQ?.timeLimit ?? 20

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const startTimer = useCallback((limit: number) => {
    stopTimer()
    setTimeLeft(limit)
    startTimeRef.current = Date.now()
    pausedTimeRef.current = 0
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { stopTimer(); setPhase('answer'); return 0 }
        if (prev <= 5) sound.playCountdownBeep()
        else if (prev > 1) sound.playTick()
        return prev - 1
      })
    }, 1000)
  }, [stopTimer, sound])

  useEffect(() => {
    if (phase === 'question' && currentQ) {
      sound.playStart()
      startTimer(currentQ.timeLimit ?? 20)
    }
    return stopTimer
  }, [phase, qIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pause/resume
  useEffect(() => {
    if (phase !== 'question') return
    if (paused) {
      stopTimer()
      pauseStartRef.current = Date.now()
    } else {
      const remaining = timeLeft
      pausedTimeRef.current += Date.now() - pauseStartRef.current
      stopTimer()
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { stopTimer(); setPhase('answer'); return 0 }
          if (prev <= 5) sound.playCountdownBeep()
          return prev - 1
        })
      }, 1000)
      startTimeRef.current = Date.now() - (timeLimit - remaining) * 1000
    }
  }, [paused]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save on every meaningful state change
  useEffect(() => {
    if (!id || phase === 'lobby' || phase === 'end') return
    saveState(id, { qIndex, score, streak, history, phase: phase as 'question' | 'answer', selected })
  }, [qIndex, score, streak, history, phase, selected, id])

  const handleAnswer = useCallback((index: number) => {
    if (selected !== null || phase !== 'question' || paused) return
    stopTimer()
    setSelected(index)
    const isCorrect = index === currentQ!.correct
    const elapsed = (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000
    const speedBonus = isCorrect ? Math.round(Math.max(0, 1 - elapsed / timeLimit) * 500) : 0
    const gained = isCorrect ? 500 + speedBonus + streak * 50 : 0
    setScore(s => s + gained)
    setStreak(s => isCorrect ? s + 1 : 0)
    setHistory(h => [...h, isCorrect])
    if (isCorrect) sound.playCorrect(); else sound.playWrong()
    setPhase('answer')
  }, [selected, phase, paused, currentQ, timeLimit, streak, stopTimer, sound])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showQuitConfirm) {
        if (e.key === 'Escape') setShowQuitConfirm(false)
        return
      }
      if (e.key === 'p' || e.key === 'P') {
        if (phase === 'question') setPaused(v => !v)
        return
      }
      if (e.key === 'Escape') {
        if (phase === 'question' || phase === 'answer') {
          setPaused(true)
          setShowQuitConfirm(true)
        }
        return
      }
      if (phase === 'answer' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault(); handleNext(); return
      }
      if (phase === 'question' && !paused) {
        const idx = KEYS.indexOf(e.key.toLowerCase())
        if (idx >= 0 && idx < 4) handleAnswer(idx)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, paused, handleAnswer, showQuitConfirm]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    if (!quiz) return
    if (qIndex + 1 >= quiz.questions.length) {
      sound.playEnd()
      clearState(String(quiz.id))
      setPhase('end')
      if (user) api.submitScore(quiz.id, score, history.filter(Boolean).length + (selected === currentQ?.correct ? 1 : 0), quiz.questions.length).catch(() => {})
    } else {
      setSelected(null)
      setQIndex(i => i + 1)
      setPhase('question')
    }
  }

  const restart = (fromSaved = false) => {
    stopTimer()
    if (fromSaved && savedState) {
      setQIndex(savedState.qIndex)
      setScore(savedState.score)
      setStreak(savedState.streak)
      setHistory(savedState.history)
      setSelected(savedState.selected)
      setPhase(savedState.phase)
    } else {
      if (id) clearState(id)
      setSavedState(null)
      setPhase('question')
      setQIndex(0)
      setSelected(null)
      setScore(0)
      setStreak(0)
      setHistory([])
    }
    setPaused(false)
    setShowQuitConfirm(false)
  }

  const quitToMenu = () => {
    stopTimer()
    // State is already auto-saved
    nav('/')
  }

  if (loading) return <div className="play-loading">Chargement…</div>
  if (error || !quiz) return <div className="play-loading">{error || 'Erreur'}</div>

  // ── Lobby ─────────────────────────────────────────
  if (phase === 'lobby') return (
    <div className="play-screen lobby">
      <div className="lobby-card">
        <button className="lobby-back" onClick={() => nav('/')}>← Menu</button>
        <div className="logo">KahootJade 💜</div>
        <h1>{quiz.title}</h1>
        <p className="q-count">{quiz.questions.length} questions</p>

        {savedState && (
          <div className="resume-banner">
            <div className="resume-info">
              <span className="resume-icon">💾</span>
              <div>
                <strong>Partie en cours</strong>
                <span>Question {savedState.qIndex + 1}/{quiz.questions.length} · {savedState.score} pts</span>
              </div>
            </div>
            <div className="resume-btns">
              <button className="btn-resume" onClick={() => restart(true)}>▶ Reprendre</button>
              <button className="btn-new-game" onClick={() => restart(false)}>Nouvelle partie</button>
            </div>
          </div>
        )}

        {!savedState && (
          <>
            <label className="sound-toggle">
              <input type="checkbox" checked={soundOn} onChange={e => setSoundOn(e.target.checked)} />
              🔊 Sons activés
            </label>
            <button className="btn-start" onClick={() => restart(false)}>C'est parti !</button>
            <p className="key-hint"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> répondre · <kbd>P</kbd> pause · <kbd>Échap</kbd> quitter</p>
          </>
        )}
      </div>
    </div>
  )

  // ── End ───────────────────────────────────────────
  if (phase === 'end') {
    const correct = history.filter(Boolean).length
    const pct = Math.round(correct / quiz.questions.length * 100)
    return (
      <div className="play-screen end">
        <div className="end-card">
          <div className="trophy">{pct >= 80 ? '🏆' : pct >= 50 ? '🎉' : '💪'}</div>
          <h2>Quiz terminé !</h2>
          <div className="final-score">{score} pts</div>
          <div className="final-stats">{correct}/{quiz.questions.length} bonnes réponses · {pct}%</div>
          <div className="result-bar">
            {history.map((ok, i) => <span key={i} className={`result-dot ${ok ? 'ok' : 'ko'}`} />)}
          </div>
          <div className="end-btns">
            <button className="btn-start" onClick={() => { setSavedState(null); setPhase('lobby') }}>Rejouer</button>
            <button className="btn-outline" onClick={() => nav(`/leaderboard/${quiz.id}`)}>🏆 Classement</button>
            <button className="btn-outline" onClick={() => nav('/')}>← Menu</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Game ──────────────────────────────────────────
  return (
    <div className="play-screen game">
      {/* Header */}
      <div className="game-header">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(qIndex / quiz.questions.length) * 100}%` }} />
        </div>
        <div className="header-row">
          <button className="btn-quit-sm" onClick={() => { setPaused(true); setShowQuitConfirm(true) }} title="Quitter (Échap)">
            ✕
          </button>
          <span className="q-counter">{qIndex + 1} / {quiz.questions.length}</span>

          <div className={`timer ${timeLeft <= 5 ? 'timer-danger' : ''}`}>
            <svg viewBox="0 0 36 36" className="timer-ring">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none"
                stroke={timeLeft <= 5 ? '#e21b3c' : 'white'}
                strokeWidth="3"
                strokeDasharray={`${(timeLeft / timeLimit) * 94.2} 94.2`}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
                style={{ transition: 'stroke-dasharray 1s linear' }}
              />
            </svg>
            <span className="timer-text">{paused ? '⏸' : timeLeft}</span>
          </div>

          <div className="header-right">
            <span className="score-display">{score} pts</span>
            {streak >= 2 && <span className="streak">🔥×{streak}</span>}
            <button className="btn-pause" onClick={() => setPaused(v => !v)}
              title="Pause (P)" disabled={phase !== 'question'}>
              {paused ? '▶' : '⏸'}
            </button>
          </div>
        </div>
      </div>

      {/* Pause / Quit overlay */}
      {(paused || showQuitConfirm) && (
        <div className="pause-overlay">
          <div className="pause-box">
            {!showQuitConfirm ? (
              <>
                <div className="pause-icon">⏸</div>
                <p>Pause</p>
                <button className="btn-start" onClick={() => setPaused(false)}>▶ Reprendre</button>
                <button className="btn-pause-quit" onClick={() => setShowQuitConfirm(true)}>Quitter et sauvegarder</button>
                <p className="key-hint-sm"><kbd>P</kbd> reprendre · <kbd>Échap</kbd> quitter</p>
              </>
            ) : (
              <>
                <div className="pause-icon">💾</div>
                <p>Ta progression est sauvegardée.</p>
                <p className="quit-sub">Tu pourras reprendre la prochaine fois.</p>
                <div className="quit-btns">
                  <button className="btn-start" onClick={quitToMenu}>← Retour au menu</button>
                  <button className="btn-pause-quit" onClick={() => { setShowQuitConfirm(false); setPaused(false) }}>
                    Continuer le quiz
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Question */}
      <div className="question-box">
        <p className="question-text">{currentQ?.question}</p>
      </div>

      {/* Answers */}
      <div className="answers-grid">
        {currentQ?.answers.map((ans, i) => {
          let state = ''
          if (phase === 'answer') {
            if (i === currentQ.correct) state = 'correct'
            else if (i === selected) state = 'wrong'
            else state = 'faded'
          }
          return (
            <button key={i} className={`answer-btn ${state}`}
              style={state === '' ? { background: ANSWER_COLORS[i] } : undefined}
              onClick={() => handleAnswer(i)}
              disabled={phase !== 'question' || paused}>
              <span className="shape-icon">{SHAPE_ICONS[i]}</span>
              <span className="answer-text">{ans}</span>
              <kbd className="key-badge">{i + 1}</kbd>
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {phase === 'answer' && (
        <div className={`feedback ${selected === currentQ?.correct ? 'feedback-correct' : 'feedback-wrong'}`}>
          <span className="feedback-icon">{selected === currentQ?.correct ? '✓' : '✗'}</span>
          <span className="feedback-text">
            {selected === null ? 'Temps écoulé !'
              : selected === currentQ?.correct
              ? streak > 1 ? `🔥 Série de ${streak} !` : 'Bonne réponse !'
              : `Bonne réponse : ${currentQ?.answers[currentQ.correct]}`}
          </span>
          <button className="btn-next" onClick={handleNext}>
            {qIndex + 1 >= quiz.questions.length ? 'Résultats →' : 'Suivant →'}
          </button>
          <span className="key-hint-sm"><kbd>Entrée</kbd></span>
        </div>
      )}
    </div>
  )
}
