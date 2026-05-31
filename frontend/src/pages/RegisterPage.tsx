import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';
import type { RegisterRequest } from '../types/auth';

function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState<RegisterRequest>({
    userName: '',
    email: '',
    password: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setIsSubmitting(true);

    try {
      const auth = await registerUser(formData);
      login(auth);
      setMessage(`Registration successful. Welcome, ${auth.userName}!`);
      navigate('/documents');
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Registration failed.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="panel">
        <Link className="text-button" to="/">
          Back to Home
        </Link>
        <h1>Register</h1>
        <p className="subtitle">Create your account to start working with documents.</p>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            User name
            <input
              type="text"
              value={formData.userName}
              onChange={(event) =>
                setFormData({ ...formData, userName: event.target.value })
              }
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={formData.email}
              onChange={(event) =>
                setFormData({ ...formData, email: event.target.value })
              }
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={formData.password}
              onChange={(event) =>
                setFormData({ ...formData, password: event.target.value })
              }
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </form>

        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </section>
    </main>
  );
}

export default RegisterPage;
