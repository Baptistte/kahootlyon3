import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { QuizMeta } from '../types'
import './home.css'

export default function Home() {
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [roomCode, setRoomCode] = useState('')
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

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault()
    if (roomCode.trim()) nav(`/room/${roomCode.trim().toUpperCase()}`)
  }

  return (
    <div className="home-page">
      <div className="home-hero">
        <h1>Bienvenue 💜</h1>
        <p>Choisis un quiz pour réviser</p>

        <form className="room-join-form" onSubmit={joinRoom}>
          <input
            className="room-input"
            placeholder="Code de salon (ex: ABC123)"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button type="submit" className="btn-join">Rejoindre</button>
        </form>
      </div>

      <div className="home-content">
        {loading && <div className="home-loading">Chargement…</div>}
        {error && <div className="home-error">{error}</div>}

        {!loading && quizzes.length === 0 && (
          <div className="home-empty">
            <p>Aucun quiz pour l'instant.</p>
            {user
              ? <a href="/upload" className="link-upload">Uploade le premier ! →</a>
              : <a href="/auth" className="link-upload">Connecte-toi pour uploader un quiz →</a>}
          </div>
        )}

        <div className="quiz-grid">
          {quizzes.map(q => (
            <div key={q.id} className="quiz-card">
              <div className="quiz-card-body">
                <h3 className="quiz-card-title">{q.title}</h3>
                {q.description && <p className="quiz-card-desc">{q.description}</p>}
                <div className="quiz-card-meta">
                  <span>{q.questionCount} questions</span>
                  {q.ownerName && <span>par {q.ownerName}</span>}
                  {!q.isPublic && <span className="badge-private">🔒 Privé</span>}
                </div>
              </div>
              <div className="quiz-card-actions">
                <button className="btn-play" onClick={() => nav(`/play/${q.id}`)}>▶ Jouer</button>
                <button className="btn-lb" onClick={() => nav(`/leaderboard/${q.id}`)}>🏆</button>
                {q.isOwner && (
                  <button className="btn-del" onClick={() => handleDelete(q.id)}>🗑</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
