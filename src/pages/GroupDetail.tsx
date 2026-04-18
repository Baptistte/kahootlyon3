import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { GroupDetail as GroupDetailType, QuizMeta } from '../types'
import './group-detail.css'

export default function GroupDetail() {
  const { code } = useParams<{ code: string }>()
  const [group, setGroup] = useState<GroupDetailType | null>(null)
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [kicking, setKicking] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const { user } = useAuth()
  const nav = useNavigate()

  useEffect(() => {
    if (!code || !user) return
    Promise.all([api.getGroup(code), api.getQuizzes(code)])
      .then(([g, q]) => { setGroup(g); setQuizzes(q) })
      .catch(() => nav('/groups'))
      .finally(() => setLoading(false))
  }, [code, user, nav])

  const copyCode = () => {
    navigator.clipboard.writeText(code ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const leave = async () => {
    if (!code || !confirm('Quitter ce groupe ?')) return
    try {
      await api.leaveGroup(code)
      nav('/groups')
    } catch (e) { setActionError((e as Error).message) }
  }

  const deleteGroup = async () => {
    if (!code) return
    try {
      await api.deleteGroup(code)
      nav('/groups')
    } catch (e) { setActionError((e as Error).message) }
  }

  const kickMember = async (username: string) => {
    if (!code) return
    setKicking(username)
    try {
      await api.removeMember(code, username)
      setGroup(g => g ? { ...g, members: g.members.filter(m => m.username !== username) } : g)
    } catch (e) { setActionError((e as Error).message) }
    finally { setKicking(null) }
  }

  if (loading) return <div className="gd-loading">Chargement…</div>
  if (!group) return null

  return (
    <div className="gd-page">
      <div className="gd-header">
        <button className="gd-back" onClick={() => nav('/groups')}>← Mes groupes</button>
        <div className="gd-title-row">
          <h1>{group.name}</h1>
          <div className="gd-code-box" onClick={copyCode} title="Copier le code">
            <span className="gd-code">{group.code}</span>
            <span className="gd-copy">{copied ? '✓ Copié !' : '📋 Partager'}</span>
          </div>
        </div>
        <p className="gd-members-count">👥 {group.members.length} membre{group.members.length > 1 ? 's' : ''}</p>
      </div>

      {actionError && (
        <div className="gd-error" onClick={() => setActionError('')}>⚠️ {actionError} ×</div>
      )}

      <div className="gd-layout">
        {/* Quiz list */}
        <div className="gd-main">
          <div className="gd-section-header">
            <h2>Quiz du groupe</h2>
            <button className="btn-upload-group" onClick={() => nav(`/upload?group=${group.code}`)}>
              + Ajouter
            </button>
          </div>

          {quizzes.length === 0 && (
            <p className="gd-empty">Aucun quiz dans ce groupe pour l'instant.</p>
          )}

          <div className="gd-quiz-list">
            {quizzes.map(q => (
              <div key={q.id} className="gd-quiz-row">
                <div className="gd-quiz-info">
                  <span className="gd-quiz-title">{q.title}</span>
                  <span className="gd-quiz-meta">{q.questionCount} questions · par {q.ownerName}</span>
                </div>
                <div className="gd-quiz-actions">
                  <button className="btn-play-sm" onClick={() => nav(`/play/${q.id}`)}>▶ Jouer</button>
                  <button className="btn-lb-sm" onClick={() => nav(`/leaderboard/${q.id}?group=${group.code}`)} title="Classement">🏆</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="gd-sidebar">
          <h3>Membres</h3>
          <div className="gd-member-list">
            {group.members.map(m => (
              <div key={m.username} className="gd-member-row">
                <span className="gd-avatar">👤</span>
                <span className="gd-member-name">{m.username}</span>
                {m.username === group.ownerName && <span className="badge-owner-sm" title="Créateur">✦</span>}
                {group.isOwner && m.username !== user?.username && (
                  <button
                    className="btn-kick"
                    onClick={() => kickMember(m.username)}
                    disabled={kicking === m.username}
                    title="Retirer du groupe"
                  >
                    {kicking === m.username ? '…' : '×'}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="gd-sidebar-actions">
            {!group.isOwner && (
              <button className="btn-leave" onClick={leave}>Quitter le groupe</button>
            )}

            {group.isOwner && !confirmDelete && (
              <button className="btn-delete-group" onClick={() => setConfirmDelete(true)}>
                🗑 Supprimer le groupe
              </button>
            )}

            {group.isOwner && confirmDelete && (
              <div className="confirm-delete">
                <p>Supprimer <strong>{group.name}</strong> ? Cette action est irréversible.</p>
                <div className="confirm-btns">
                  <button className="btn-confirm-yes" onClick={deleteGroup}>Oui, supprimer</button>
                  <button className="btn-confirm-no" onClick={() => setConfirmDelete(false)}>Annuler</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
