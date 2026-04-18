import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth.js'
import quizzesRouter from './routes/quizzes.js'
import scoresRouter from './routes/scores.js'
import groupsRouter from './routes/groups.js'

const app = express()

const ALLOWED_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173'

app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }))
app.use(express.json({ limit: '5mb' }))

app.use('/api/auth', authRouter)
app.use('/api/quizzes', quizzesRouter)
app.use('/api/scores', scoresRouter)
app.use('/api/groups', groupsRouter)

export default app
