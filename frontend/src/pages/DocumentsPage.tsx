import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createDocument,
  deleteDocument,
  getSharedDocument,
  getDocuments,
} from '../api/documentsApi';
import type { DocumentCreateRequest, DocumentResponse } from '../types/document';

function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [formData, setFormData] = useState<DocumentCreateRequest>({
    title: '',
    content: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const ownedDocuments = documents.filter((document) => document.isOwner);
  const sharedDocuments = documents.filter((document) => !document.isOwner);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setError('');
    setIsLoading(true);

    try {
      const userDocuments = await getDocuments();
      setDocuments(userDocuments);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load documents.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsCreating(true);

    try {
      const newDocument = await createDocument(formData);
      setDocuments((currentDocuments) => [newDocument, ...currentDocuments]);
      setFormData({ title: '', content: '' });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not create document.',
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinSharedDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setJoinMessage('');

    const shareId = extractShareId(joinInput);

    if (!shareId) {
      setError('Paste a shared document link or share id.');
      return;
    }

    setIsJoining(true);

    try {
      const joinedDocument = await getSharedDocument(shareId);
      await loadDocuments();
      setJoinInput('');
      setJoinMessage(
        joinedDocument.isOwner
          ? 'This is your document.'
          : 'Shared document joined.',
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not join shared document.',
      );
    } finally {
      setIsJoining(false);
    }
  }

  async function handleDelete(id: number) {
    setError('');
    setDeletingId(id);

    try {
      await deleteDocument(id);
      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== id),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not delete document.',
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="app-shell">
      <section className="panel">
        <Link className="text-button" to="/">
          Back to Home
        </Link>
        <h1>Documents</h1>
        <p className="subtitle">Create and manage your saved documents.</p>

        <form className="form document-form" onSubmit={handleCreate}>
          <label>
            Title
            <input
              type="text"
              value={formData.title}
              onChange={(event) =>
                setFormData({ ...formData, title: event.target.value })
              }
              required
            />
          </label>

          <label>
            Content
            <textarea
              value={formData.content}
              onChange={(event) =>
                setFormData({ ...formData, content: event.target.value })
              }
              rows={5}
            />
          </label>

          <button className="primary-button" type="submit" disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Document'}
          </button>
        </form>

        {error && <p className="error-message">{error}</p>}
        {joinMessage && <p className="success-message">{joinMessage}</p>}

        <section className="document-section" aria-labelledby="join-shared-heading">
          <h2 id="join-shared-heading">Join shared document</h2>
          <form className="join-form" onSubmit={handleJoinSharedDocument}>
            <input
              type="text"
              value={joinInput}
              onChange={(event) => setJoinInput(event.target.value)}
              placeholder="Paste /shared link or share id"
            />
            <button className="primary-button" type="submit" disabled={isJoining}>
              {isJoining ? 'Joining...' : 'Join'}
            </button>
          </form>
        </section>

        <section className="document-section" aria-labelledby="my-documents-heading">
          <h2 id="my-documents-heading">My documents</h2>

          {isLoading && <p className="empty-message">Loading documents...</p>}

          {!isLoading && ownedDocuments.length === 0 && (
            <p className="empty-message">No documents yet.</p>
          )}

          <div className="document-list">
            {!isLoading &&
              ownedDocuments.map((document) => (
                <article className="document-item" key={document.id}>
                  <div>
                    <h3>{document.title}</h3>
                    <p>{document.content || 'No content yet.'}</p>
                  </div>

                  <div className="document-actions">
                    <Link className="secondary-button" to={`/documents/${document.id}`}>
                      Open
                    </Link>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => handleDelete(document.id)}
                      disabled={deletingId === document.id}
                    >
                      {deletingId === document.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </section>

        <section className="document-section" aria-labelledby="shared-documents-heading">
          <h2 id="shared-documents-heading">Shared with me</h2>

          {isLoading && <p className="empty-message">Loading shared documents...</p>}

          {!isLoading && sharedDocuments.length === 0 && (
            <p className="empty-message">No shared documents yet.</p>
          )}

          <div className="document-list">
            {!isLoading &&
              sharedDocuments.map((document) => (
                <article className="document-item" key={document.id}>
                  <div>
                    <h3>{document.title}</h3>
                    <p className="document-meta">Owner: {document.ownerUserName}</p>
                    <p className="document-meta">Role: {document.accessRole}</p>
                    <p>{document.content || 'No content yet.'}</p>
                  </div>

                  <div className="document-actions">
                    <Link className="secondary-button" to={`/documents/${document.id}`}>
                      Open
                    </Link>
                  </div>
                </article>
              ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function extractShareId(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  try {
    const url = new URL(trimmedValue);
    const sharedSegment = '/shared/';
    const sharedIndex = url.pathname.indexOf(sharedSegment);

    if (sharedIndex >= 0) {
      return decodeURIComponent(
        url.pathname.slice(sharedIndex + sharedSegment.length).split('/')[0],
      );
    }
  } catch {
    // Not a full URL; treat it as a path or raw id below.
  }

  const pathMatch = trimmedValue.match(/(?:^|\/)shared\/([^/?#]+)/);
  if (pathMatch?.[1]) {
    return decodeURIComponent(pathMatch[1]);
  }

  return trimmedValue;
}

export default DocumentsPage;
