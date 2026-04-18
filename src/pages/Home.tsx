import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { QuizMeta } from '../types'
import './home.css'

export default function Home() {
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const { user } = useAuth()
  const nav = useNavigate()

  useEffect(() => {
    api.getQuizzes()
      .then(setQuizzes)
      .catch(() => setError('Impossible de charger les quiz'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce quiz ?')) return
    await api.deleteQuiz(id)
    setQuizzes(q => q.filter(x => x.id !== id))
  }

  const filtered = quizzes.filter(q =>
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    (q.ownerName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="home-page">
      {/* Hero */}
      <div className="home-hero">
        <div className="hero-text">
          <h1>Révise en t'amusant 💜</h1>
          <p>Importe ton cours, génère des questions, bats tes amis.</p>
        </div>
        {!user && (
          <div className="hero-cta">
            <Link to="/auth" className="btn-hero-primary">Créer un compte</Link>
            <span className="hero-or">ou</span>
            <span className="hero-hint">parcours les quiz publics ci-dessous</span>
          </div>
        )}
        {user && (
          <div className="hero-cta">
            <Link to="/upload" className="btn-hero-primary">+ Nouveau quiz</Link>
            <Link to="/groups" className="btn-hero-secondary">👥 Mes groupes</Link>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="home-content">
        {/* Search */}
        <div className="home-toolbar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un quiz…"
            />
            {search && <button className="search-clear" onClick={() => setSearch('')}>×</button>}
          </div>
          <span className="quiz-count">{filtered.length} quiz{filtered.length > 1 ? '' : ''}</span>
        </div>

        {loading && (
          <div className="quiz-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="quiz-card skeleton" />)}
          </div>
        )}

        {error && <div className="home-error">⚠️ {error}</div>}

        {!loading && filtered.length === 0 && !error && (
          <div className="home-empty">
            {search
              ? <><p>Aucun résultat pour « {search} »</p><button className="link-upload" onClick={() => setSearch('')}>Effacer la recherche</button></>
              : <><p>Aucun quiz pour l'instant.</p>
                  {user
                    ? <Link to="/upload" className="link-upload">Crée le premier quiz →</Link>
                    : <Link to="/auth" className="link-upload">Connecte-toi pour uploader →</Link>}</>
            }
          </div>
        )}

        <div className="quiz-grid">
          {filtered.map(q => (
            <div key={q.id} className="quiz-card" onClick={() => nav(`/play/${q.id}`)}>
              <div className="quiz-card-body">
                <div className="quiz-card-badges">
                  {q.groupName && <span className="badge-group">👥 {q.groupName}</span>}
                  {!q.isPublic && <span className="badge-private">🔒</span>}
                  {q.isOwner && <span className="badge-mine">À moi</span>}
                </div>
                <h3 className="quiz-card-title">{q.title}</h3>
                {q.description && <p className="quiz-card-desc">{q.description}</p>}
                <div className="quiz-card-meta">
                  <span className="meta-questions">📝 {q.questionCount} questions</span>
                  {q.ownerName && <span className="meta-owner">par {q.ownerName}</span>}
                </div>
              </div>
              <div className="quiz-card-actions" onClick={e => e.stopPropagation()}>
                <button className="btn-play" onClick={() => nav(`/play/${q.id}`)}>▶ Jouer</button>
                <button className="btn-lb" onClick={() => nav(`/leaderboard/${q.id}`)} title="Classement">🏆</button>
                {q.isOwner && (
                  <button className="btn-del" onClick={() => handleDelete(q.id)} title="Supprimer">🗑</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
