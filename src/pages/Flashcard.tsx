import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Question } from '../types'
import './flashcard.css'

export default function Flashcard() {
  const { id } = useParams()
  const nav = useNavigate()
  const [questions, setQuestions] = useState<Question[]>([])
  const [title, setTitle] = useState('')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getQuiz(Number(id))
      .then(data => { setQuestions(data.questions); setTitle(data.title) })
      .finally(() => setLoading(false))
  }, [id])

  const prev = useCallback(() => {
    setFlipped(false)
    setTimeout(() => setIndex(i => Math.max(0, i - 1)), 150)
  }, [])

  const next = useCallback(() => {
    setFlipped(false)
    setTimeout(() => setIndex(i => Math.min(questions.length - 1, i + 1)), 150)
  }, [questions.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f) }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  if (loading) return <div className="fc-loading">Chargement…</div>
  if (!questions.length) return <div className="fc-loading">Quiz introuvable.</div>

  const q = questions[index]
  const pct = Math.round(((index + 1) / questions.length) * 100)

  return (
    <div className="fc-page">
      {/* Header */}
      <div className="fc-header">
        <button className="fc-back" onClick={() => nav(-1)}>← Retour</button>
        <div className="fc-title">{title}</div>
        <div className="fc-counter">{index + 1} / {questions.length}</div>
      </div>

      {/* Progress */}
      <div className="fc-progress">
        <div className="fc-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Card */}
      <div className="fc-arena">
        <div
          className={`fc-card ${flipped ? 'fc-card--flipped' : ''}`}
          onClick={() => setFlipped(f => !f)}
        >
          {/* Front */}
          <div className="fc-face fc-front">
            <div className="fc-face-label">Question</div>
            <p className="fc-question-text">{q.question}</p>
            <div className="fc-hint">Appuie pour révéler la réponse</div>
          </div>

          {/* Back */}
          <div className="fc-face fc-back">
            <div className="fc-face-label">Réponse</div>
            <p className="fc-answer-correct">{q.answers[q.correct]}</p>
            <div className="fc-other-answers">
              {q.answers.map((a, i) => i !== q.correct && (
                <span key={i} className="fc-wrong-answer">{a}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="fc-nav">
          <button className="fc-nav-btn" onClick={prev} disabled={index === 0}>←</button>
          <div className="fc-dots">
            {questions.map((_, i) => (
              <button
                key={i}
                className={`fc-dot ${i === index ? 'fc-dot--active' : ''}`}
                onClick={() => { setFlipped(false); setTimeout(() => setIndex(i), 150) }}
              />
            ))}
          </div>
          <button className="fc-nav-btn" onClick={next} disabled={index === questions.length - 1}>→</button>
        </div>

        <div className="fc-key-hint">
          <kbd>Espace</kbd> retourner · <kbd>←</kbd><kbd>→</kbd> naviguer
        </div>

        {index === questions.length - 1 && flipped && (
          <div className="fc-end-banner">
            🎉 Tu as parcouru toutes les cartes !
            <button onClick={() => { setIndex(0); setFlipped(false) }}>Recommencer</button>
          </div>
        )}
      </div>
    </div>
  )
}
