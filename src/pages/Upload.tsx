import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { QuizData, Group } from '../types'
import './upload.css'

const EXAMPLE = {
  title: "Mon cours de biologie",
  questions: [
    {
      question: "Quel organite produit l'énergie dans la cellule ?",
      answers: ["Mitochondrie", "Noyau", "Ribosome", "Vacuole"],
      correct: 0,
      timeLimit: 20
    }
  ]
}

export default function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<QuizData | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    if (user) {
      api.getGroups().then(setGroups).catch(() => {})
      const groupFromUrl = params.get('group')
      if (groupFromUrl) setSelectedGroup(groupFromUrl)
    }
  }, [user, params])

  if (!user) return (
    <div className="upload-page">
      <div className="upload-card">
        <p>Tu dois être <a href="/auth">connecté</a> pour uploader un quiz.</p>
      </div>
    </div>
  )

  const loadFile = (f: File) => {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target?.result as string) as QuizData
        if (!data.questions?.length) throw new Error('Aucune question trouvée')
        setParsed(data)
        setTitle(data.title ?? '')
        setError('')
      } catch {
        setError('JSON invalide — vérifie le format ci-dessous')
        setParsed(null)
      }
    }
    reader.readAsText(f)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parsed) return
    setLoading(true)
    try {
      const res = await api.uploadQuiz({
        title: title || parsed.title,
        description,
        questions: parsed.questions,
        isPublic: selectedGroup ? false : isPublic,
        groupCode: selectedGroup || undefined,
      })
      nav(selectedGroup ? `/groups/${selectedGroup}` : `/play/${res.id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-page">
      <div className="upload-layout">
        <div className="upload-card">
          <h2>Uploader un quiz</h2>

          <div
            className={`drop-zone ${parsed ? 'drop-ok' : ''}`}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadFile(f) }}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
          >
            <span className="drop-icon">{parsed ? '✅' : '📂'}</span>
            <span className="drop-text">
              {parsed ? `${file?.name} — ${parsed.questions.length} questions` : 'Glisse ton fichier JSON ici ou clique'}
            </span>
            <input ref={inputRef} type="file" accept=".json" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f) }} />
          </div>

          {error && <p className="upload-error">{error}</p>}

          {parsed && (
            <form onSubmit={submit} className="upload-form">
              <div className="field">
                <label>Titre</label>
                <input value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="field">
                <label>Description (optionnel)</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Chapitre 3…" />
              </div>

              <div className="field">
                <label>Partager dans un groupe (optionnel)</label>
                <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
                  <option value="">— Public / privé personnel —</option>
                  {groups.map(g => (
                    <option key={g.code} value={g.code}>{g.name} ({g.code})</option>
                  ))}
                </select>
              </div>

              {!selectedGroup && (
                <label className="toggle-label">
                  <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                  Visible par tous
                </label>
              )}

              <button type="submit" className="btn-upload" disabled={loading}>
                {loading ? 'Upload…' : `Publier (${parsed.questions.length} questions)`}
              </button>
            </form>
          )}
        </div>

        <div className="upload-tuto">
          <h3>📋 Format JSON attendu</h3>
          <pre>{JSON.stringify(EXAMPLE, null, 2)}</pre>
          <div className="tuto-rules">
            <h4>Règles</h4>
            <ul>
              <li><code>title</code> — nom du quiz</li>
              <li><code>question</code> — texte de la question</li>
              <li><code>answers</code> — tableau de 4 réponses</li>
              <li><code>correct</code> — index 0-3 de la bonne réponse</li>
              <li><code>timeLimit</code> — secondes (optionnel, défaut 20)</li>
            </ul>
            <div className="tuto-tip">
              💡 <strong>Conseil IA :</strong> quand tu génères tes questions, précise : <em>"Les 4 réponses doivent avoir une longueur similaire et la bonne réponse ne doit pas être systématiquement la plus longue."</em>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
