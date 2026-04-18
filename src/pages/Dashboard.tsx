import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { QuizMeta, Group } from '../types'
import './dashboard.css'

interface Stats {
  games_played: number
  best_score: number
  total_score: number
  avg_pct: number
}

interface ScoreRow {
  score: number
  correct: number
  total: number
  played_at: number
  quiz_title: string
  quiz_id: number
}

export default function Dashboard() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { nav('/auth'); return }
    Promise.all([
      api.getMyStats(),
      api.getMyScores(),
      api.getQuizzes(),
      api.getGroups(),
    ]).then(([s, sc, qz, gr]) => {
      setStats(s)
      setScores(sc)
      setQuizzes(qz.filter(q => q.isOwner))
      setGroups(gr)
    }).finally(() => setLoading(false))
  }, [user, nav])

  if (!user) return null

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="dash-page">
      <div className="dash-wrapper">

        {/* Header */}
        <div className="dash-header">
          <div>
            <h1>Bonjour, {user.username} 👋</h1>
            <p>Voici un aperçu de tes activités</p>
          </div>
          <Link to="/upload" className="btn-dash-new">+ Nouveau quiz</Link>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          {[
            { label: 'Parties jouées', value: stats?.games_played ?? '—', icon: '🎮' },
            { label: 'Meilleur score', value: stats?.best_score ?? '—', icon: '🏆' },
            { label: 'Score total', value: stats?.total_score ?? '—', icon: '⭐' },
            { label: 'Moyenne', value: stats ? `${stats.avg_pct}%` : '—', icon: '📊' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <span className="stat-icon">{s.icon}</span>
              <span className="stat-value">{loading ? '…' : s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="dash-grid">

          {/* Recent scores */}
          <div className="dash-section">
            <div className="section-header">
              <h2>Parties récentes</h2>
              <span className="section-count">{scores.length}</span>
            </div>
            {loading ? (
              <div className="dash-list-skeleton">{[...Array(4)].map((_, i) => <div key={i} className="skeleton-row" />)}</div>
            ) : scores.length === 0 ? (
              <p className="dash-empty">Aucune partie jouée pour l'instant.</p>
            ) : (
              <div className="score-list">
                {scores.slice(0, 8).map((s, i) => (
                  <div key={i} className="score-row" onClick={() => nav(`/play/${s.quiz_id}`)}>
                    <div className="score-row-left">
                      <span className="score-title">{s.quiz_title}</span>
                      <span className="score-date">{formatDate(s.played_at)}</span>
                    </div>
                    <div className="score-row-right">
                      <span className="score-pts">{s.score} pts</span>
                      <span className="score-ratio">{s.correct}/{s.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="dash-right">

            {/* My quizzes */}
            <div className="dash-section">
              <div className="section-header">
                <h2>Mes quiz</h2>
                <span className="section-count">{quizzes.length}</span>
              </div>
              {loading ? (
                <div className="dash-list-skeleton">{[...Array(3)].map((_, i) => <div key={i} className="skeleton-row" />)}</div>
              ) : quizzes.length === 0 ? (
                <div className="dash-empty-cta">
                  <p>Tu n'as pas encore créé de quiz.</p>
                  <Link to="/upload" className="btn-dash-cta">Créer mon premier quiz →</Link>
                </div>
              ) : (
                <div className="quiz-mini-list">
                  {quizzes.slice(0, 5).map(q => (
                    <div key={q.id} className="quiz-mini-row" onClick={() => nav(`/play/${q.id}`)}>
                      <div className="quiz-mini-info">
                        <span className="quiz-mini-title">{q.title}</span>
                        <span className="quiz-mini-meta">{q.questionCount} questions{q.groupName ? ` · ${q.groupName}` : ''}</span>
                      </div>
                      <div className="quiz-mini-btns" onClick={e => e.stopPropagation()}>
                        <button className="btn-mini-play" onClick={() => nav(`/play/${q.id}`)}>▶</button>
                        <button className="btn-mini-fc" onClick={() => nav(`/flashcard/${q.id}`)}>🃏</button>
                      </div>
                    </div>
                  ))}
                  {quizzes.length > 5 && (
                    <Link to="/" className="dash-see-more">Voir tous les quiz →</Link>
                  )}
                </div>
              )}
            </div>

            {/* My groups */}
            <div className="dash-section">
              <div className="section-header">
                <h2>Mes groupes</h2>
                <span className="section-count">{groups.length}</span>
              </div>
              {loading ? (
                <div className="dash-list-skeleton">{[...Array(2)].map((_, i) => <div key={i} className="skeleton-row" />)}</div>
              ) : groups.length === 0 ? (
                <div className="dash-empty-cta">
                  <p>Tu n'appartiens à aucun groupe.</p>
                  <Link to="/groups" className="btn-dash-cta">Rejoindre un groupe →</Link>
                </div>
              ) : (
                <div className="group-mini-list">
                  {groups.map(g => (
                    <div key={g.code} className="group-mini-row" onClick={() => nav(`/groups/${g.code}`)}>
                      <div className="group-mini-icon">👥</div>
                      <div className="group-mini-info">
                        <span className="group-mini-name">{g.name}</span>
                        <span className="group-mini-code">#{g.code}</span>
                      </div>
                    </div>
                  ))}
                  <Link to="/groups" className="dash-see-more">Gérer les groupes →</Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
