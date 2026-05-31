import { NavLink } from 'react-router-dom';

function HomePage() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Coursework project</p>
        <h1>Collab Editor</h1>
        <p className="subtitle">Real-time collaborative document editing system</p>

        <nav className="actions" aria-label="Main navigation">
          <NavLink to="/login">
            Login
          </NavLink>
          <NavLink to="/register">
            Register
          </NavLink>
          <NavLink to="/documents">
            Documents
          </NavLink>
        </nav>
      </section>
    </main>
  );
}

export default HomePage;
