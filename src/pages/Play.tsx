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
  const [soundOn, setSoundOn] = useState(true)
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
      .then(data => { setQuiz(data); setLoading(false) })
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
        else if (prev === limit) { /* first tick */ } else sound.playTick()
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

  // Pause / resume
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
      // adjust startTime so speed bonus is accurate
      startTimeRef.current = Date.now() - (timeLimit - remaining) * 1000
    }
  }, [paused]) // eslint-disable-line react-hooks/exhaustive-deps

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
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (phase === 'question') setPaused(v => !v)
        return
      }
      if (phase === 'answer' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        handleNext()
        return
      }
      if (phase === 'question' && !paused) {
        const idx = KEYS.indexOf(e.key.toLowerCase())
        if (idx >= 0 && idx < 4) handleAnswer(idx)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, paused, handleAnswer]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    if (!quiz) return
    if (qIndex + 1 >= quiz.questions.length) {
      sound.playEnd()
      setPhase('end')
      if (user) api.submitScore(quiz.id, score, history.filter(Boolean).length + (selected === currentQ?.correct ? 1 : 0), quiz.questions.length).catch(() => {})
    } else {
      setSelected(null)
      setQIndex(i => i + 1)
      setPhase('question')
    }
  }

  const restart = () => {
    stopTimer()
    setPhase('lobby')
    setQIndex(0)
    setSelected(null)
    setScore(0)
    setStreak(0)
    setHistory([])
    setPaused(false)
  }

  if (loading) return <div className="play-loading">Chargement…</div>
  if (error || !quiz) return <div className="play-loading">{error || 'Erreur'}</div>

  if (phase === 'lobby') return (
    <div className="play-screen lobby">
      <div className="lobby-card">
        <div className="logo">KahootJade 💜</div>
        <h1>{quiz.title}</h1>
        <p className="q-count">{quiz.questions.length} questions</p>
        <label className="sound-toggle">
          <input type="checkbox" checked={soundOn} onChange={e => setSoundOn(e.target.checked)} />
          🔊 Sons activés
        </label>
        <button className="btn-start" onClick={() => setPhase('question')}>C'est parti !</button>
        <p className="key-hint">Raccourcis : <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> pour répondre · <kbd>P</kbd> pause · <kbd>Entrée</kbd> suivant</p>
      </div>
    </div>
  )

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
            <button className="btn-start" onClick={restart}>Rejouer</button>
            <button className="btn-outline" onClick={() => nav(`/leaderboard/${quiz.id}`)}>🏆 Classement</button>
            <button className="btn-outline" onClick={() => nav('/')}>← Menu</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="play-screen game">
      {/* Header */}
      <div className="game-header">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(qIndex / quiz.questions.length) * 100}%` }} />
        </div>
        <div className="header-row">
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
            <button
              className="btn-pause"
              onClick={() => setPaused(v => !v)}
              title="Pause (P)"
              disabled={phase !== 'question'}
            >
              {paused ? '▶' : '⏸'}
            </button>
          </div>
        </div>
      </div>

      {/* Pause overlay */}
      {paused && (
        <div className="pause-overlay">
          <div className="pause-box">
            <div className="pause-icon">⏸</div>
            <p>Pause</p>
            <button className="btn-start" onClick={() => setPaused(false)}>Reprendre</button>
            <p className="key-hint-sm">ou appuie sur <kbd>P</kbd></p>
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
            <button
              key={i}
              className={`answer-btn ${state}`}
              style={state === '' ? { background: ANSWER_COLORS[i] } : undefined}
              onClick={() => handleAnswer(i)}
              disabled={phase !== 'question' || paused}
            >
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
            {selected === null
              ? 'Temps écoulé !'
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
