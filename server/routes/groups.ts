import { Router, Response } from 'express'
import { sql } from '../db.js'
import { requireAuth, AuthRequest } from '../middleware/auth.js'

const router = Router()

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await sql`
    SELECT g.id, g.name, g.code, g.owner_id, g.created_at,
           u.username as owner_name,
           COUNT(gm2.user_id) as member_count
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ${req.userId}
    LEFT JOIN users u ON u.id = g.owner_id
    LEFT JOIN group_members gm2 ON gm2.group_id = g.id
    GROUP BY g.id, g.name, g.code, g.owner_id, g.created_at, u.username
    ORDER BY g.created_at DESC
  `
  res.json(rows.map(r => ({
    ...r,
    isOwner: r.owner_id === req.userId,
    memberCount: Number(r.member_count),
  })))
})

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name } = req.body as { name: string }
  if (!name?.trim()) { res.status(400).json({ error: 'Nom requis' }); return }

  let code = genCode()
  // Retry if code collision
  for (let i = 0; i < 5; i++) {
    const existing = await sql`SELECT id FROM groups WHERE code = ${code}`
    if (!existing.length) break
    code = genCode()
  }

  const rows = await sql`
    INSERT INTO groups (name, code, owner_id) VALUES (${name.trim()}, ${code}, ${req.userId})
    RETURNING id
  `
  const groupId = (rows[0] as { id: number }).id
  await sql`INSERT INTO group_members (group_id, user_id) VALUES (${groupId}, ${req.userId})`
  res.json({ id: groupId, code })
})

router.get('/:code', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await sql`
    SELECT g.*, u.username as owner_name FROM groups g
    LEFT JOIN users u ON u.id = g.owner_id
    WHERE g.code = ${req.params.code.toUpperCase()}
  `
  const group = rows[0] as { id: number; name: string; code: string; owner_id: number; owner_name: string } | undefined
  if (!group) { res.status(404).json({ error: 'Groupe introuvable' }); return }

  const isMember = await sql`
    SELECT 1 FROM group_members WHERE group_id = ${group.id} AND user_id = ${req.userId}
  `

  const members = await sql`
    SELECT u.username, gm.joined_at FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ${group.id}
    ORDER BY gm.joined_at
  `

  res.json({
    ...group,
    isOwner: group.owner_id === req.userId,
    isMember: !!isMember.length,
    members,
  })
})

router.post('/:code/join', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await sql`SELECT id FROM groups WHERE code = ${req.params.code.toUpperCase()}`
  const group = rows[0] as { id: number } | undefined
  if (!group) { res.status(404).json({ error: 'Groupe introuvable' }); return }

  try {
    await sql`INSERT INTO group_members (group_id, user_id) VALUES (${group.id}, ${req.userId})`
    res.json({ ok: true })
  } catch {
    res.json({ ok: true }) // already member
  }
})

router.delete('/:code/leave', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await sql`SELECT id, owner_id FROM groups WHERE code = ${req.params.code.toUpperCase()}`
  const group = rows[0] as { id: number; owner_id: number } | undefined
  if (!group) { res.status(404).json({ error: 'Groupe introuvable' }); return }
  if (group.owner_id === req.userId) { res.status(400).json({ error: "Le créateur ne peut pas quitter — supprime le groupe à la place" }); return }
  await sql`DELETE FROM group_members WHERE group_id = ${group.id} AND user_id = ${req.userId}`
  res.json({ ok: true })
})

// Supprimer un groupe (créateur seulement)
router.delete('/:code', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await sql`SELECT id, owner_id FROM groups WHERE code = ${req.params.code.toUpperCase()}`
  const group = rows[0] as { id: number; owner_id: number } | undefined
  if (!group) { res.status(404).json({ error: 'Groupe introuvable' }); return }
  if (group.owner_id !== req.userId) { res.status(403).json({ error: 'Seul le créateur peut supprimer le groupe' }); return }
  await sql`DELETE FROM groups WHERE id = ${group.id}`
  res.json({ ok: true })
})

// Retirer un membre (créateur seulement)
router.delete('/:code/members/:username', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await sql`SELECT id, owner_id FROM groups WHERE code = ${req.params.code.toUpperCase()}`
  const group = rows[0] as { id: number; owner_id: number } | undefined
  if (!group) { res.status(404).json({ error: 'Groupe introuvable' }); return }
  if (group.owner_id !== req.userId) { res.status(403).json({ error: 'Accès refusé' }); return }

  const userRows = await sql`SELECT id FROM users WHERE username = ${req.params.username}`
  const target = userRows[0] as { id: number } | undefined
  if (!target) { res.status(404).json({ error: 'Utilisateur introuvable' }); return }
  if (target.id === req.userId) { res.status(400).json({ error: 'Tu ne peux pas te retirer toi-même' }); return }

  await sql`DELETE FROM group_members WHERE group_id = ${group.id} AND user_id = ${target.id}`
  res.json({ ok: true })
})

export default router
