import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Play from './pages/Play'
import Upload from './pages/Upload'
import LeaderboardPage from './pages/LeaderboardPage'
import Groups from './pages/Groups'
import GroupDetail from './pages/GroupDetail'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/play/:id" element={<Play />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/leaderboard/:id" element={<LeaderboardPage />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:code" element={<GroupDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
