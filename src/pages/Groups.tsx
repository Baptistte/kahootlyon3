import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Group } from '../types'
import './groups.css'

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const { user } = useAuth()
  const nav = useNavigate()

  useEffect(() => {
    if (!user) return
    api.getGroups().then(setGroups).finally(() => setLoading(false))
  }, [user])

  if (!user) return (
    <div className="groups-page">
      <div className="groups-card">
        <p>Tu dois être <a href="/auth">connecté</a> pour accéder aux groupes.</p>
      </div>
    </div>
  )

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setError('')
    try {
      const { code } = await api.createGroup(newName)
      nav(`/groups/${code}`)
    } catch (e) { setError((e as Error).message) }
  }

  const joinGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setError('')
    try {
      await api.joinGroup(joinCode.toUpperCase())
      nav(`/groups/${joinCode.toUpperCase()}`)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="groups-page">
      <div className="groups-layout">
        {/* Actions */}
        <div className="groups-actions">
          <div className="action-card">
            <h3>Créer un groupe</h3>
            <form onSubmit={createGroup}>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex : TD Biologie S2"
                maxLength={40}
              />
              <button type="submit">Créer</button>
            </form>
          </div>

          <div className="action-card">
            <h3>Rejoindre un groupe</h3>
            <form onSubmit={joinGroup}>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Code du groupe (ex: ABC123)"
                maxLength={6}
                className="code-input"
              />
              <button type="submit">Rejoindre</button>
            </form>
          </div>

          {error && <p className="groups-error">{error}</p>}
        </div>

        {/* List */}
        <div className="groups-list-section">
          <h2>Mes groupes</h2>
          {loading && <p className="groups-hint">Chargement…</p>}
          {!loading && groups.length === 0 && (
            <p className="groups-hint">Tu n'as pas encore de groupe.</p>
          )}
          <div className="groups-grid">
            {groups.map(g => (
              <div key={g.id} className="group-card" onClick={() => nav(`/groups/${g.code}`)}>
                <div className="group-card-top">
                  <h3>{g.name}</h3>
                  {g.isOwner && <span className="badge-owner">Créateur</span>}
                </div>
                <div className="group-card-meta">
                  <span>👥 {g.memberCount} membre{g.memberCount > 1 ? 's' : ''}</span>
                  <span className="group-code">{g.code}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
