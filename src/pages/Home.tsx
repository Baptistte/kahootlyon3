import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { QuizMeta } from '../types'
import './home.css'

export default function Home() {
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'mine' | 'group'>('all')
  const { user } = useAuth()
  const nav = useNavigate()

  useEffect(() => {
    api.getQuizzes()
      .then(setQuizzes)
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('Supprimer ce quiz ?')) return
    await api.deleteQuiz(id)
    setQuizzes(q => q.filter(x => x.id !== id))
  }

  const filtered = quizzes.filter(q => {
    const matchSearch = q.title.toLowerCase().includes(search.toLowerCase()) ||
      (q.ownerName ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ? true :
      filter === 'mine' ? q.isOwner :
      filter === 'group' ? !!q.groupCode : true
    return matchSearch && matchFilter
  })

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
              <Link to="/dashboard" className="shortcut-card">
                <span className="sc-icon">📊</span>
                <span className="sc-label">Dashboard</span>
              </Link>
              <Link to="/upload" className="shortcut-card">
                <span className="sc-icon">➕</span>
                <span className="sc-label">Nouveau quiz</span>
              </Link>
              <Link to="/groups" className="shortcut-card">
                <span className="sc-icon">👥</span>
                <span className="sc-label">Mes groupes</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quiz library */}
      <div className="home-library">
        <div className="library-header">
          <h2>Bibliothèque de quiz</h2>
          <span className="library-count">{filtered.length} quiz</span>
        </div>

        {/* Toolbar */}
        <div className="library-toolbar">
          <div className="search-box">
            <span>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
            />
            {search && <button onClick={() => setSearch('')}>×</button>}
          </div>

          {user && (
            <div className="filter-tabs">
              <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tous</button>
              <button className={filter === 'mine' ? 'active' : ''} onClick={() => setFilter('mine')}>Les miens</button>
              <button className={filter === 'group' ? 'active' : ''} onClick={() => setFilter('group')}>Groupes</button>
            </div>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="quiz-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="quiz-card-skeleton" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="library-empty">
            <p>{search ? `Aucun résultat pour « ${search} »` : 'Aucun quiz disponible.'}</p>
            {!search && user && <Link to="/upload" className="btn-empty-upload">+ Créer le premier quiz</Link>}
          </div>
        ) : (
          <div className="quiz-grid">
            {filtered.map(q => (
              <div key={q.id} className="quiz-card" onClick={() => nav(`/play/${q.id}`)}>
                <div className="quiz-card-inner">
                  <div className="quiz-card-top">
                    <div className="quiz-card-badges">
                      {q.groupName && <span className="badge badge-group">👥 {q.groupName}</span>}
                      {q.isOwner && <span className="badge badge-mine">À moi</span>}
                      {!q.isPublic && !q.groupName && <span className="badge badge-private">🔒</span>}
                    </div>
                    {q.isOwner && (
                      <button className="btn-card-del" onClick={e => handleDelete(e, q.id)} title="Supprimer">🗑</button>
                    )}
                  </div>

                  <h3 className="quiz-card-title">{q.title}</h3>
                  {q.description && <p className="quiz-card-desc">{q.description}</p>}

                  <div className="quiz-card-footer">
                    <span className="quiz-card-meta">📝 {q.questionCount} questions</span>
                    {q.ownerName && <span className="quiz-card-author">par {q.ownerName}</span>}
                  </div>
                </div>

                <div className="quiz-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-play" onClick={() => nav(`/play/${q.id}`)}>▶ Quiz</button>
                  <button className="btn-fc" onClick={() => nav(`/flashcard/${q.id}`)} title="Flashcards">🃏</button>
                  <button className="btn-lb" onClick={() => nav(`/leaderboard/${q.id}`)} title="Classement">🏆</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
