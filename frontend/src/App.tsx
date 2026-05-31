import { Route, Routes } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import DocumentEditorPage from './pages/DocumentEditorPage';
import DocumentsPage from './pages/DocumentsPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function App() {
  return (
    <>
      <AppHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:id" element={<DocumentEditorPage />} />
          <Route path="/shared/:shareId" element={<DocumentEditorPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
