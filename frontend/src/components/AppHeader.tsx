import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function AppHeader() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="app-header">
      <NavLink className="brand-link" to="/">
        Collab Editor
      </NavLink>

      <nav className="header-nav" aria-label="Account navigation">
        {isAuthenticated ? (
          <>
            <NavLink to="/documents">Documents</NavLink>
            <span className="user-label">
              Logged in as {user?.userName ?? 'User'}
            </span>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}

export default AppHeader;
