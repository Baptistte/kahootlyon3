import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { ScoreEntry } from '../types'
import './leaderboard.css'

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const { id } = useParams<{ id: string }>()
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  useEffect(() => {
    if (!id) return
    api.getLeaderboard(Number(id))
      .then(setScores)
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="lb-page">
      <div className="lb-card">
        <button className="lb-back" onClick={() => nav(-1)}>← Retour</button>
        <h2>🏆 Classement</h2>

        {loading && <p className="lb-loading">Chargement…</p>}

        {!loading && scores.length === 0 && (
          <p className="lb-empty">Aucun score pour ce quiz.</p>
        )}

        <div className="lb-list">
          {scores.map((s, i) => (
            <div key={i} className={`lb-row ${i < 3 ? 'lb-top' : ''}`}>
              <span className="lb-rank">{MEDALS[i] ?? `#${i + 1}`}</span>
              <span className="lb-name">{s.username}</span>
              <span className="lb-pct">{Math.round(s.correct / s.total * 100)}%</span>
              <span className="lb-score">{s.score} pts</span>
            </div>
          ))}
        </div>

        <button className="btn-play-again" onClick={() => nav(`/play/${id}`)}>
          ▶ Jouer ce quiz
        </button>
      </div>
    </div>
  )
}
