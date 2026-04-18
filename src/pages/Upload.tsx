import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { QuizData, Group } from '../types'
import './upload.css'

const buildPrompt = (questionCount: number) => `Tu es un expert pédagogique. Génère un quiz de révision au format JSON strict.

━━━ FORMAT JSON EXACT ━━━
Réponds avec UNIQUEMENT ce JSON, rien d'autre. Pas de \`\`\`json, pas de texte avant ou après.

{
  "title": "Titre descriptif du quiz",
  "questions": [
    {
      "question": "Texte de la question ?",
      "answers": ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
      "correct": 0,
      "timeLimit": 20
    },
    {
      "question": "Autre question ?",
      "answers": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct": 2,
      "timeLimit": 20
    }
  ]
}

Chaque objet question contient EXACTEMENT ces 4 champs :
- "question" → string : le texte de la question
- "answers" → tableau de 4 strings : exactement 4 réponses, ni plus ni moins
- "correct" → nombre entier : l'index (0, 1, 2 ou 3) de la bonne réponse dans "answers"
- "timeLimit" → nombre entier : 20 (ou 30 pour une question complexe)

━━━ NOMBRE DE QUESTIONS ━━━
Génère exactement ${questionCount} questions.

━━━ RÈGLES OBLIGATOIRES ━━━
1. "correct" doit être un entier entre 0 et 3, pas un texte, pas un tableau
2. "answers" doit contenir EXACTEMENT 4 éléments
3. Les 4 réponses doivent avoir une longueur similaire
4. La bonne réponse ne doit PAS être systématiquement la plus longue ni la plus courte
5. Répartis la position de la bonne réponse équitablement entre 0, 1, 2 et 3
6. Les mauvaises réponses doivent être plausibles et du même registre que la bonne
7. Varie les types de questions : définitions, applications, comparaisons, cas pratiques, chiffres clés
8. INTERDIT : n'invente rien. Chaque question doit être fondée exclusivement sur le contenu du cours fourni — aucune information extérieure, aucune connaissance générale

━━━ CONTENU DU COURS ━━━
[COLLE ICI LE CONTENU DE TON COURS]`

export default function Upload() {
  const [tab, setTab] = useState<'file' | 'paste' | 'ai'>('ai')
  const [file, setFile] = useState<File | null>(null)
  const [pasteValue, setPasteValue] = useState('')
  const [parsed, setParsed] = useState<QuizData | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [questionCount, setQuestionCount] = useState(20)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    if (user) {
      api.getGroups().then(setGroups).catch(() => {})
      const g = params.get('group')
      if (g) setSelectedGroup(g)
    }
  }, [user, params])

  if (!user) return (
    <div className="upload-page">
      <div className="upload-auth-wall">
        <div className="auth-wall-icon">🔒</div>
        <h2>Connexion requise</h2>
        <p>Crée un compte pour uploader et partager tes quiz.</p>
        <a href="/auth" className="btn-wall-login">Se connecter</a>
      </div>
    </div>
  )

  const tryParse = (raw: string) => {
    try {
      const data = JSON.parse(raw.trim()) as QuizData
      if (!Array.isArray(data.questions) || data.questions.length === 0)
        throw new Error('Aucune question trouvée')
      setParsed(data)
      setTitle(data.title ?? '')
      setError('')
      return true
    } catch {
      setError('JSON invalide — vérifie le format ou recolle depuis l\'IA')
      setParsed(null)
      return false
    }
  }

  const loadFile = (f: File) => {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => tryParse(e.target?.result as string)
    reader.readAsText(f)
  }

  const handlePaste = () => {
    if (pasteValue.trim()) tryParse(pasteValue)
  }

  const copyPrompt = () => {
    navigator.clipboard.writeText(buildPrompt(questionCount))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
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
      <div className="upload-wrapper">
        <div className="upload-header">
          <h1>Créer un quiz</h1>
          <p>Importe ton cours et transforme-le en quiz interactif</p>
        </div>

        <div className="upload-main">
          {/* Left: input method */}
          <div className="upload-input-section">
            {/* Tabs */}
            <div className="upload-tabs">
              <button className={tab === 'ai' ? 'active' : ''} onClick={() => setTab('ai')}>
                🤖 Générer avec l'IA
              </button>
              <button className={tab === 'paste' ? 'active' : ''} onClick={() => setTab('paste')}>
                📋 Coller du JSON
              </button>
              <button className={tab === 'file' ? 'active' : ''} onClick={() => setTab('file')}>
                📁 Fichier JSON
              </button>
            </div>

            {/* ── Tab IA ── */}
            {tab === 'ai' && (
              <div className="tab-content">
                <div className="ai-steps">
                  <div className="ai-step">
                    <div className="step-num">1</div>
                    <div className="step-body">
                      <strong>Choisis le nombre de questions</strong>
                      <div className="question-count-row">
                        <input
                          type="range"
                          min={5}
                          max={60}
                          step={5}
                          value={questionCount}
                          onChange={e => setQuestionCount(Number(e.target.value))}
                          className="count-slider"
                        />
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={questionCount}
                          onChange={e => setQuestionCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                          className="count-input"
                        />
                        <span className="count-unit">questions</span>
                      </div>
                      <button className="btn-copy-prompt" onClick={copyPrompt}>
                        {copied ? '✅ Copié !' : '📋 Copier le prompt'}
                      </button>
                    </div>
                  </div>

                  <div className="ai-step">
                    <div className="step-num">2</div>
                    <div className="step-body">
                      <strong>Ouvre l'IA de ton choix</strong>
                      <p>Colle le prompt, remplace <em>[COLLE ICI LE CONTENU DE TON COURS]</em> par ton cours, et envoie.</p>
                      <div className="ai-links">
                        <a href="https://aistudio.google.com/prompts/new_chat" target="_blank" rel="noreferrer" className="ai-link recommended">
                          <span>✦</span> Google AI Studio
                          <span className="ai-badge">Recommandé · Gratuit</span>
                        </a>
                        <a href="https://chat.openai.com" target="_blank" rel="noreferrer" className="ai-link">
                          ChatGPT
                        </a>
                        <a href="https://claude.ai" target="_blank" rel="noreferrer" className="ai-link">
                          Claude
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="ai-step">
                    <div className="step-num">3</div>
                    <div className="step-body">
                      <strong>Reviens ici et colle le JSON</strong>
                      <p>L'IA génère un JSON — copie-le et colle-le dans l'onglet <em>Coller du JSON</em>.</p>
                      <button className="btn-goto-paste" onClick={() => setTab('paste')}>
                        Aller à l'onglet Coller →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Prompt preview */}
                <div className="prompt-preview">
                  <div className="prompt-preview-header">
                    <span>Aperçu du prompt · <strong>{questionCount} questions</strong></span>
                    <button onClick={copyPrompt}>{copied ? '✅' : '📋'}</button>
                  </div>
                  <pre>{buildPrompt(questionCount)}</pre>
                </div>
              </div>
            )}

            {/* ── Tab Paste ── */}
            {tab === 'paste' && (
              <div className="tab-content">
                <label className="paste-label">Colle le JSON généré par l'IA ici :</label>
                <textarea
                  className="paste-area"
                  value={pasteValue}
                  onChange={e => { setPasteValue(e.target.value); setParsed(null); setError('') }}
                  placeholder={'{\n  "title": "Mon quiz",\n  "questions": [...]\n}'}
                  spellCheck={false}
                />
                {error && <p className="upload-error">⚠️ {error}</p>}
                <button
                  className="btn-validate"
                  onClick={handlePaste}
                  disabled={!pasteValue.trim()}
                >
                  Valider le JSON →
                </button>
              </div>
            )}

            {/* ── Tab File ── */}
            {tab === 'file' && (
              <div className="tab-content">
                <div
                  className={`drop-zone ${file && parsed ? 'drop-ok' : ''}`}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadFile(f) }}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => inputRef.current?.click()}
                >
                  <span className="drop-icon">{file && parsed ? '✅' : '📂'}</span>
                  <span className="drop-text">
                    {file && parsed
                      ? <><strong>{file.name}</strong><br />{parsed.questions.length} questions détectées</>
                      : <><strong>Glisse ton fichier JSON</strong><br />ou clique pour sélectionner</>
                    }
                  </span>
                  <input ref={inputRef} type="file" accept=".json" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f) }} />
                </div>
                {error && <p className="upload-error">⚠️ {error}</p>}
              </div>
            )}
          </div>

          {/* Right: publish form */}
          <div className={`upload-publish ${parsed ? 'ready' : ''}`}>
            {!parsed ? (
              <div className="publish-empty">
                <div className="publish-empty-icon">⬅️</div>
                <p>Importe ou colle ton JSON<br />pour configurer la publication</p>
              </div>
            ) : (
              <>
                <div className="publish-success-banner">
                  ✅ {parsed.questions.length} questions prêtes
                </div>
                <form onSubmit={submit} className="publish-form">
                  <div className="field">
                    <label>Titre du quiz</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} required maxLength={80} />
                  </div>
                  <div className="field">
                    <label>Description <span className="optional">optionnel</span></label>
                    <input value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="Chapitre 3 — Partie II…" maxLength={120} />
                  </div>
                  <div className="field">
                    <label>Partager dans un groupe <span className="optional">optionnel</span></label>
                    <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
                      <option value="">— Aucun groupe —</option>
                      {groups.map(g => (
                        <option key={g.code} value={g.code}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  {!selectedGroup && (
                    <label className="toggle-label">
                      <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                      <span>Visible par tous</span>
                    </label>
                  )}
                  {error && <p className="upload-error">⚠️ {error}</p>}
                  <button type="submit" className="btn-publish" disabled={loading}>
                    {loading ? 'Publication…' : `🚀 Publier le quiz`}
                  </button>
                  <button type="button" className="btn-reset" onClick={() => { setParsed(null); setFile(null); setPasteValue(''); setError('') }}>
                    Recommencer
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
