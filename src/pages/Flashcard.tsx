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
    setTimeout(() => setIndex(i => Math.max(0, i - 1)), 200)
  }, [])

  const next = useCallback(() => {
    setFlipped(false)
    setTimeout(() => setIndex(i => Math.min(questions.length - 1, i + 1)), 200)
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
  const isLast = index === questions.length - 1

  return (
    <div className="fc-page">
      {/* Header */}
      <div className="fc-header">
        <button className="fc-back" onClick={() => nav(-1)}>← Retour</button>
        <div className="fc-title-wrap">
          <div className="fc-title">{title}</div>
          <div className="fc-subtitle">Flashcards · {questions.length} cartes</div>
        </div>
        <div className="fc-counter">{index + 1} / {questions.length}</div>
      </div>

      {/* Progress */}
      <div className="fc-progress-bar">
        <div className="fc-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Arena */}
      <div className="fc-arena">

        {/* Card */}
        <div
          className={`fc-card ${flipped ? 'fc-card--flipped' : ''}`}
          onClick={() => setFlipped(f => !f)}
          role="button"
          aria-label={flipped ? 'Voir la question' : 'Voir la réponse'}
        >
          <div className="fc-card-inner">
            {/* Front */}
            <div className="fc-face fc-front">
              <span className="fc-face-tag">Question</span>
              <p className="fc-text">{q.question}</p>
              <span className="fc-tap-hint">Appuie pour voir la réponse →</span>
            </div>

            {/* Back */}
            <div className="fc-face fc-back">
              <span className="fc-face-tag">Réponse</span>
              <p className="fc-text">{q.answers[q.correct]}</p>
              <span className="fc-tap-hint">← Appuie pour revoir la question</span>
            </div>
          </div>
        </div>

        {/* Nav buttons */}
        <div className="fc-nav">
          <button className="fc-nav-btn" onClick={e => { e.stopPropagation(); prev() }} disabled={index === 0}>
            ← Précédente
          </button>
          <button
            className={`fc-nav-btn fc-nav-btn--next ${isLast ? 'fc-nav-btn--last' : ''}`}
            onClick={e => { e.stopPropagation(); isLast ? (setIndex(0), setFlipped(false)) : next() }}
          >
            {isLast ? '🔁 Recommencer' : 'Suivante →'}
          </button>
        </div>

        {/* Dots */}
        <div className="fc-dots-wrap">
          <div className="fc-dots">
            {questions.map((_, i) => (
              <button
                key={i}
                className={`fc-dot ${i === index ? 'fc-dot--active' : i < index ? 'fc-dot--done' : ''}`}
                onClick={() => { setFlipped(false); setTimeout(() => setIndex(i), 200) }}
                aria-label={`Carte ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <p className="fc-key-hint">
          <kbd>Espace</kbd> retourner &nbsp;·&nbsp; <kbd>←</kbd> <kbd>→</kbd> naviguer
        </p>

      </div>
    </div>
  )
}
