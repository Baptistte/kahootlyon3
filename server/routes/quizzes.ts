import { Router, Response } from 'express'
import { sql } from '../db.js'
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId ?? -1
  const groupCode = req.query.group as string | undefined

  let rows
  if (groupCode) {
    rows = await sql`
      SELECT q.id, q.title, q.description, q.is_public, q.created_at, q.owner_id,
             u.username as owner_name,
             jsonb_array_length(q.data->'questions') as question_count,
             g.code as group_code, g.name as group_name
      FROM quizzes q
      LEFT JOIN users u ON u.id = q.owner_id
      LEFT JOIN groups g ON g.id = q.group_id
      JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ${userId}
      WHERE g.code = ${groupCode}
      ORDER BY q.created_at DESC
    `
  } else {
    rows = await sql`
      SELECT q.id, q.title, q.description, q.is_public, q.created_at, q.owner_id,
             u.username as owner_name,
             jsonb_array_length(q.data->'questions') as question_count,
             g.code as group_code, g.name as group_name
      FROM quizzes q
      LEFT JOIN users u ON u.id = q.owner_id
      LEFT JOIN groups g ON g.id = q.group_id
      WHERE q.is_public = true OR q.owner_id = ${userId}
         OR q.group_id IN (
           SELECT group_id FROM group_members WHERE user_id = ${userId}
         )
      ORDER BY q.created_at DESC
    `
  }

  res.json(rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    isPublic: r.is_public,
    ownerName: r.owner_name,
    isOwner: r.owner_id === req.userId,
    questionCount: r.question_count ?? 0,
    createdAt: r.created_at,
    groupCode: r.group_code ?? null,
    groupName: r.group_name ?? null,
  })))
})

router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId ?? -1
  const rows = await sql`
    SELECT q.*, u.username as owner_name FROM quizzes q
    LEFT JOIN users u ON u.id = q.owner_id
    WHERE q.id = ${Number(req.params.id)}
      AND (
        q.is_public = true OR q.owner_id = ${userId}
        OR q.group_id IN (SELECT group_id FROM group_members WHERE user_id = ${userId})
      )
  `
  const row = rows[0] as { id: number; title: string; data: Record<string, unknown>; owner_name: string } | undefined
  if (!row) { res.status(404).json({ error: 'Quiz introuvable' }); return }

  const data = typeof row.data === 'string' ? JSON.parse(row.data as string) : row.data
  res.json({ ...data, id: row.id, ownerName: row.owner_name })
})

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { title, description, questions, isPublic, groupCode } = req.body as {
    title: string; description?: string; questions: unknown[]; isPublic?: boolean; groupCode?: string
  }
  if (!title?.trim() || !Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ error: 'Données invalides' }); return
  }

  let groupId: number | null = null
  if (groupCode) {
    const gRows = await sql`
      SELECT g.id FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE g.code = ${groupCode} AND gm.user_id = ${req.userId}
    `
    groupId = (gRows[0] as { id: number } | undefined)?.id ?? null
  }

  const data = JSON.stringify({ title, questions })
  const rows = await sql`
    INSERT INTO quizzes (title, description, owner_id, data, is_public, group_id)
    VALUES (${title.trim()}, ${description?.trim() ?? ''}, ${req.userId}, ${data}::jsonb, ${isPublic !== false}, ${groupId})
    RETURNING id
  `
  res.json({ id: (rows[0] as { id: number }).id })
})

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await sql`SELECT owner_id FROM quizzes WHERE id = ${Number(req.params.id)}`
  const row = rows[0] as { owner_id: number } | undefined
  if (!row) { res.status(404).json({ error: 'Quiz introuvable' }); return }
  if (row.owner_id !== req.userId) { res.status(403).json({ error: 'Accès refusé' }); return }
  await sql`DELETE FROM quizzes WHERE id = ${Number(req.params.id)}`
  res.json({ ok: true })
})

export default router
