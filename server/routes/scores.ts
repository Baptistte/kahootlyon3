import { Router, Response } from 'express'
import { sql } from '../db.js'
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth.js'

const router = Router()

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { quizId, score, correct, total } = req.body as Record<string, number>
  if (!quizId || score === undefined || correct === undefined || !total) {
    res.status(400).json({ error: 'Données manquantes' }); return
  }
  await sql`
    INSERT INTO scores (quiz_id, user_id, score, correct, total)
    VALUES (${quizId}, ${req.userId}, ${score}, ${correct}, ${total})
  `
  res.json({ ok: true })
})

router.get('/quiz/:quizId', optionalAuth, async (req: AuthRequest, res: Response) => {
  const rows = await sql`
    SELECT s.score, s.correct, s.total, s.played_at, u.username,
           ROW_NUMBER() OVER (ORDER BY s.score DESC) as rank
    FROM scores s
    JOIN users u ON u.id = s.user_id
    WHERE s.quiz_id = ${Number(req.params.quizId)}
    ORDER BY s.score DESC
    LIMIT 50
  `
  res.json(rows)
})

router.get('/group/:groupCode/quiz/:quizId', optionalAuth, async (req: AuthRequest, res: Response) => {
  const rows = await sql`
    SELECT s.score, s.correct, s.total, s.played_at, u.username,
           ROW_NUMBER() OVER (ORDER BY s.score DESC) as rank
    FROM scores s
    JOIN users u ON u.id = s.user_id
    JOIN group_members gm ON gm.user_id = s.user_id
    JOIN groups g ON g.id = gm.group_id
    WHERE s.quiz_id = ${Number(req.params.quizId)}
      AND g.code = ${req.params.groupCode}
    ORDER BY s.score DESC
  `
  res.json(rows)
})

router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await sql`
    SELECT s.score, s.correct, s.total, s.played_at, q.title as quiz_title, q.id as quiz_id
    FROM scores s
    JOIN quizzes q ON q.id = s.quiz_id
    WHERE s.user_id = ${req.userId}
    ORDER BY s.played_at DESC
    LIMIT 20
  `
  res.json(rows)
})

export default router
