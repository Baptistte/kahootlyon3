import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const nav = useNavigate()

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">KahootJade 💜</Link>
      <div className="nav-links">
        {user ? (
          <>
            <Link to="/groups" className="nav-link">👥 Groupes</Link>
            <Link to="/upload" className="nav-link">+ Upload</Link>
            <span className="nav-user">👤 {user.username}</span>
            <button className="nav-logout" onClick={() => { logout(); nav('/') }}>Déconnexion</button>
          </>
        ) : (
          <Link to="/auth" className="btn-nav-login">Connexion</Link>
        )}
      </div>
    </nav>
  )
}
