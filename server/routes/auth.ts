import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sql } from '../db.js'
import { JWT_SECRET } from '../middleware/auth.js'

const router = Router()

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body as Record<string, string>
  if (!username?.trim() || !email?.trim() || !password?.trim()) {
    res.status(400).json({ error: 'Tous les champs sont requis' }); return
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' }); return
  }
  const hash = await bcrypt.hash(password, 10)
  try {
    const rows = await sql`
      INSERT INTO users (username, email, password_hash)
      VALUES (${username.trim()}, ${email.trim().toLowerCase()}, ${hash})
      RETURNING id
    `
    const id = (rows[0] as { id: number }).id
    const token = jwt.sign({ id, username: username.trim() }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, username: username.trim(), id })
  } catch (e: unknown) {
    const msg = (e as Error).message ?? ''
    if (msg.includes('unique') || msg.includes('duplicate')) {
      res.status(409).json({ error: "Nom d'utilisateur ou email déjà utilisé" })
    } else {
      res.status(500).json({ error: 'Erreur serveur' })
    }
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body as Record<string, string>
  if (!email?.trim() || !password?.trim()) {
    res.status(400).json({ error: 'Champs requis' }); return
  }
  const rows = await sql`SELECT * FROM users WHERE email = ${email.trim().toLowerCase()}`
  const user = rows[0] as { id: number; username: string; password_hash: string } | undefined
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Email ou mot de passe incorrect' }); return
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, username: user.username, id: user.id })
})

export default router
