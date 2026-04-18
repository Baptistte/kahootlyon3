import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { QuizMeta } from '../types'
import './home.css'

type MainTab = 'library' | 'mine' | 'history'

interface ScoreRow {
  score: number
  correct: number
  total: number
  played_at: number
  quiz_title: string
  quiz_id: number
}

export default function Home() {
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([])
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [scoresLoading, setScoresLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<'all' | 'group'>('all')
  const [tab, setTab] = useState<MainTab>('library')
  const { user } = useAuth()
  const nav = useNavigate()

  useEffect(() => {
    api.getQuizzes()
      .then(setQuizzes)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'history' && user && scores.length === 0) {
      setScoresLoading(true)
      api.getMyScores().then(setScores).finally(() => setScoresLoading(false))
    }
  }, [tab, user, scores.length])

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('Supprimer ce quiz ?')) return
    await api.deleteQuiz(id)
    setQuizzes(q => q.filter(x => x.id !== id))
  }

  const libraryQuizzes = quizzes.filter(q => {
    const matchSearch = q.title.toLowerCase().includes(search.toLowerCase()) ||
      (q.ownerName ?? '').toLowerCase().includes(search.toLowerCase())
    const matchGroup = groupFilter === 'all' ? true : !!q.groupCode
    return matchSearch && matchGroup
  })

  const myQuizzes = quizzes.filter(q =>
    q.isOwner && (
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      (q.ownerName ?? '').toLowerCase().includes(search.toLowerCase())
    )
  )

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  const pct = (correct: number, total: number) => Math.round((correct / total) * 100)

  return (
    <div className="home-page">

      {/* Hero */}
      <div className="home-hero">
        <div className="hero-content">
          <div className="hero-left">
            <h1>KahootJade <span className="hero-heart">💜</span></h1>
            <p>Révise efficacement avec des quiz interactifs</p>
          </div>
          {!user && (
            <div className="hero-actions">
              <Link to="/auth" className="btn-hero-cta">Créer un compte gratuit →</Link>
            </div>
          )}
          {user && (
            <div className="hero-shortcuts">
              <Link to="/upload" className="shortcut-card">
                <span className="sc-icon">➕</span>
                <span className="sc-label">Nouveau quiz</span>
              </Link>
              <Link to="/groups" className="shortcut-card">
                <span className="sc-icon">👥</span>
                <span className="sc-label">Mes groupes</span>
              </Link>
              <Link to="/dashboard" className="shortcut-card">
                <span className="sc-icon">📊</span>
                <span className="sc-label">Dashboard</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main tabs */}
      <div className="home-library">
        <div className="main-tabs">
          <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}>
            📚 Bibliothèque
          </button>
          {user && (
            <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
              ✏️ Mes quiz
              {myQuizzes.length > 0 && <span className="tab-badge">{myQuizzes.length}</span>}
            </button>
          )}
          {user && (
            <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
              🕒 Historique
            </button>
          )}
        </div>

        {/* ── Bibliothèque ── */}
        {tab === 'library' && (
          <>
            <div className="library-toolbar">
              <div className="search-box">
                <span>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" />
                {search && <button onClick={() => setSearch('')}>×</button>}
              </div>
              {user && (
                <div className="filter-tabs">
                  <button className={groupFilter === 'all' ? 'active' : ''} onClick={() => setGroupFilter('all')}>Tous</button>
                  <button className={groupFilter === 'group' ? 'active' : ''} onClick={() => setGroupFilter('group')}>Groupes</button>
                </div>
              )}
              <span className="library-count">{libraryQuizzes.length} quiz</span>
            </div>

            {loading ? (
              <div className="quiz-grid">
                {[...Array(6)].map((_, i) => <div key={i} className="quiz-card-skeleton" />)}
              </div>
            ) : libraryQuizzes.length === 0 ? (
              <div className="library-empty">
                <p>{search ? `Aucun résultat pour « ${search} »` : 'Aucun quiz disponible.'}</p>
                {!search && user && <Link to="/upload" className="btn-empty-upload">+ Créer le premier quiz</Link>}
              </div>
            ) : (
              <div className="quiz-grid">
                {libraryQuizzes.map(q => <QuizCard key={q.id} q={q} onDelete={handleDelete} nav={nav} />)}
              </div>
            )}
          </>
        )}

        {/* ── Mes quiz ── */}
        {tab === 'mine' && (
          <>
            <div className="library-toolbar">
              <div className="search-box">
                <span>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" />
                {search && <button onClick={() => setSearch('')}>×</button>}
              </div>
              <Link to="/upload" className="btn-new-quiz">+ Nouveau quiz</Link>
            </div>

            {loading ? (
              <div className="quiz-grid">
                {[...Array(3)].map((_, i) => <div key={i} className="quiz-card-skeleton" />)}
              </div>
            ) : myQuizzes.length === 0 ? (
              <div className="library-empty">
                <p>Tu n'as pas encore créé de quiz.</p>
                <Link to="/upload" className="btn-empty-upload">+ Créer mon premier quiz</Link>
              </div>
            ) : (
              <div className="quiz-grid">
                {myQuizzes.map(q => <QuizCard key={q.id} q={q} onDelete={handleDelete} nav={nav} />)}
              </div>
            )}
          </>
        )}

        {/* ── Historique ── */}
        {tab === 'history' && (
          <div className="history-section">
            {scoresLoading ? (
              <div className="history-list">
                {[...Array(5)].map((_, i) => <div key={i} className="history-skeleton" />)}
              </div>
            ) : scores.length === 0 ? (
              <div className="library-empty">
                <p>Aucune partie jouée pour l'instant.</p>
                <button className="btn-empty-upload" onClick={() => setTab('library')}>Parcourir les quiz →</button>
              </div>
            ) : (
              <div className="history-list">
                {scores.map((s, i) => (
                  <div key={i} className="history-row">
                    <div className="history-row-left">
                      <span className="history-title">{s.quiz_title}</span>
                      <span className="history-date">{formatDate(s.played_at)}</span>
                    </div>
                    <div className="history-row-center">
                      <div className="history-pct-bar">
                        <div className="history-pct-fill" style={{ width: `${pct(s.correct, s.total)}%` }} />
                      </div>
                      <span className="history-ratio">{s.correct}/{s.total} correctes</span>
                    </div>
                    <div className="history-row-right">
                      <span className="history-score">{s.score} pts</span>
                      <div className="history-actions">
                        <button onClick={() => nav(`/play/${s.quiz_id}`)} title="Rejouer en quiz">▶ Quiz</button>
                        <button onClick={() => nav(`/flashcard/${s.quiz_id}`)} title="Réviser en flashcards">🃏</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

/* ── Quiz card component ── */
function QuizCard({ q, onDelete, nav }: {
  q: QuizMeta
  onDelete: (e: React.MouseEvent, id: number) => void
  nav: (path: string) => void
}) {
  return (
    <div className="quiz-card">
      <div className="quiz-card-inner">
        <div className="quiz-card-top">
          <div className="quiz-card-badges">
            {q.groupName && <span className="badge badge-group">👥 {q.groupName}</span>}
            {q.isOwner && <span className="badge badge-mine">À moi</span>}
            {!q.isPublic && !q.groupName && <span className="badge badge-private">🔒</span>}
          </div>
          {q.isOwner && (
            <button className="btn-card-del" onClick={e => onDelete(e, q.id)} title="Supprimer">🗑</button>
          )}
        </div>

        <h3 className="quiz-card-title">{q.title}</h3>
        {q.description && <p className="quiz-card-desc">{q.description}</p>}

        <div className="quiz-card-footer">
          <span className="quiz-card-meta">📝 {q.questionCount} questions</span>
          {q.ownerName && <span className="quiz-card-author">par {q.ownerName}</span>}
        </div>
      </div>

      {/* Mode choice */}
      <div className="quiz-card-modes">
        <button className="btn-mode btn-mode-quiz" onClick={() => nav(`/play/${q.id}`)}>
          <span className="mode-icon">🎮</span>
          <span className="mode-label">Quiz</span>
          <span className="mode-sub">Score &amp; classement</span>
        </button>
        <button className="btn-mode btn-mode-fc" onClick={() => nav(`/flashcard/${q.id}`)}>
          <span className="mode-icon">🃏</span>
          <span className="mode-label">Flashcards</span>
          <span className="mode-sub">Révision libre</span>
        </button>
      </div>

      <div className="quiz-card-lb">
        <button onClick={() => nav(`/leaderboard/${q.id}`)}>🏆 Classement</button>
      </div>
    </div>
  )
}
