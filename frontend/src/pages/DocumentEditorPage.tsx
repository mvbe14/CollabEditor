import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Link, useParams } from 'react-router-dom';
import {
  getDocumentById,
  getDocumentHistory,
  getSharedDocument,
  updateDocument,
  updateSharedDocument,
} from '../api/documentsApi';
import {
  connectToDocument,
  disconnectFromDocument,
  sendCursorPosition,
  sendDocumentUpdate,
} from '../services/documentHubService';
import { useAuth } from '../contexts/AuthContext';
import type { AuthUser } from '../types/auth';
import type { DocumentHistoryItem, DocumentUpdateRequest } from '../types/document';

type ConnectionStatus = 'Connecting' | 'Connected' | 'Disconnected';
type SaveStatus = 'Saved' | 'Unsaved changes' | 'Saving...' | 'Save failed';

type RemoteCursor = {
  userName: string;
  position: number;
  color: string;
};

type RemoteCursors = Record<string, RemoteCursor>;

type LoadedDocument = {
  id: number;
  shareId: string;
  ownerName: string;
  accessRole: string;
  title: string;
  content: string;
};

type LoadedDocumentEditorProps = {
  initialDocument: LoadedDocument;
  routeShareId?: string;
  user: AuthUser | null;
};

const remoteCursorPluginKey = new PluginKey<RemoteCursor[]>('remoteCursors');

const RemoteCursorExtension = Extension.create({
  name: 'remoteCursors',

  addProseMirrorPlugins() {
    return [
      new Plugin<RemoteCursor[]>({
        key: remoteCursorPluginKey,
        state: {
          init: () => [],
          apply(transaction, currentCursors) {
            return transaction.getMeta(remoteCursorPluginKey) ?? currentCursors;
          },
        },
        props: {
          decorations(state) {
            const cursors = remoteCursorPluginKey.getState(state) ?? [];
            const decorations = cursors.map((cursor) => {
              const position = Math.max(
                1,
                Math.min(cursor.position, state.doc.content.size),
              );

              return Decoration.widget(
                position,
                () => {
                  const wrapper = document.createElement('span');
                  wrapper.className = 'remote-cursor';
                  wrapper.style.borderColor = cursor.color;

                  const label = document.createElement('span');
                  label.className = 'remote-cursor-label';
                  label.style.backgroundColor = cursor.color;
                  label.textContent = cursor.userName;

                  wrapper.appendChild(label);
                  return wrapper;
                },
                {
                  key: `remote-cursor-${cursor.userName}`,
                  side: -1,
                },
              );
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isHtmlContent(content: string) {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function toEditorContent(content: string) {
  if (!content.trim()) {
    return '<p></p>';
  }

  if (isHtmlContent(content)) {
    return content;
  }

  return content
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function createCursorColor(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  }

  return `hsl(${hash}, 72%, 44%)`;
}

function DocumentEditorPage() {
  const { id, shareId: routeShareId } = useParams();
  const { user } = useAuth();
  const routeDocumentId = Number(id);
  const [loadedDocument, setLoadedDocument] = useState<LoadedDocument | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadDocument() {
      setError('');
      setLoadedDocument(null);
      setIsLoading(true);

      if (!id && !routeShareId) {
        setError('Invalid document id.');
        setIsLoading(false);
        return;
      }

      if (id && (!Number.isInteger(routeDocumentId) || routeDocumentId <= 0)) {
        setError('Invalid document id.');
        setIsLoading(false);
        return;
      }

      try {
        const document = routeShareId
          ? await getSharedDocument(routeShareId)
          : await getDocumentById(routeDocumentId);

        if (!isActive) {
          return;
        }

        setLoadedDocument({
          id: document.id,
          shareId: document.shareId,
          ownerName: document.ownerUserName,
          accessRole: document.accessRole,
          title: document.title,
          content: toEditorContent(document.content),
        });
      } catch (requestError) {
        if (!isActive) {
          return;
        }

        setError(
          requestError instanceof Error
            ? routeShareId
              ? `Could not open shared document: ${requestError.message}`
              : requestError.message
            : 'Could not load document.',
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      isActive = false;
    };
  }, [id, routeDocumentId, routeShareId]);

  if (isLoading) {
    return (
      <main className="editor-shell">
        <section className="editor-panel">
          <p className="empty-message">Loading document...</p>
        </section>
      </main>
    );
  }

  if (error || !loadedDocument) {
    return (
      <main className="editor-shell">
        <section className="editor-panel">
          <Link className="secondary-button" to="/documents">
            Back to Documents
          </Link>
          <p className="error-message">{error || 'Could not load document.'}</p>
        </section>
      </main>
    );
  }

  const editorKey = routeShareId
    ? `shared-${routeShareId}-${loadedDocument.id}`
    : `document-${loadedDocument.id}`;

  return (
    <LoadedDocumentEditor
      key={editorKey}
      initialDocument={loadedDocument}
      routeShareId={routeShareId}
      user={user}
    />
  );
}

function LoadedDocumentEditor({
  initialDocument,
  routeShareId,
  user,
}: LoadedDocumentEditorProps) {
  const isApplyingRemoteUpdate = useRef(false);
  const isApplyingProgrammaticUpdate = useRef(false);
  const latestFormData = useRef<DocumentUpdateRequest>({
    title: initialDocument.title,
    content: initialDocument.content,
  });
  const documentIdRef = useRef<number | null>(initialDocument.id);
  const userNameRef = useRef('');
  const cursorColorRef = useRef('#2563eb');
  const cursorTimeoutRef = useRef<number | null>(null);
  const [formData, setFormData] = useState<DocumentUpdateRequest>({
    title: initialDocument.title,
    content: initialDocument.content,
  });
  const [shareId, setShareId] = useState(initialDocument.shareId);
  const [ownerName, setOwnerName] = useState(initialDocument.ownerName);
  const [accessRole, setAccessRole] = useState(initialDocument.accessRole);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('Saved');
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const [history, setHistory] = useState<DocumentHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('Disconnected');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursors>({});

  const editor = useEditor({
    extensions: [StarterKit, RemoteCursorExtension],
    content: initialDocument.content,
    editorProps: {
      attributes: {
        class: 'rich-editor-content',
      },
    },
    onUpdate({ editor: currentEditor }) {
      handleContentChange(currentEditor.getHTML());
    },
    onSelectionUpdate({ editor: currentEditor }) {
      scheduleCursorUpdate(currentEditor.state.selection.from);
    },
  });

  const cursorList = useMemo(
    () => Object.values(remoteCursors),
    [remoteCursors],
  );

  useEffect(() => {
    latestFormData.current = formData;
  }, [formData]);

  useEffect(() => {
    documentIdRef.current = initialDocument.id;
  }, [initialDocument.id]);

  useEffect(() => {
    userNameRef.current = user?.userName ?? '';
    cursorColorRef.current = createCursorColor(
      String(user?.userId ?? user?.userName ?? 'current-user'),
    );
  }, [user]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextEditorContent = initialDocument.content;

    if (editor.getHTML() !== nextEditorContent) {
      isApplyingProgrammaticUpdate.current = true;
      editor.commands.setContent(nextEditorContent, { emitUpdate: false });
      isApplyingProgrammaticUpdate.current = false;
    }
  }, [editor, initialDocument.content]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.view.dispatch(
      editor.state.tr.setMeta(remoteCursorPluginKey, cursorList),
    );
  }, [cursorList, editor]);

  useEffect(() => {
    loadHistory(initialDocument.id);
  }, [initialDocument.id]);

  useEffect(() => {
    if (dirtyVersion === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveCurrentDocument(false);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [dirtyVersion, routeShareId]);

  useEffect(() => {
    if (!editor || !initialDocument.id) {
      return;
    }

    let isActive = true;
    const documentIdText = initialDocument.id.toString();
    setConnectionStatus('Connecting');

    connectToDocument(
      documentIdText,
      (content) => {
        if (!isActive) {
          return;
        }

        const nextContent = toEditorContent(content);
        isApplyingRemoteUpdate.current = true;
        isApplyingProgrammaticUpdate.current = true;
        editor.commands.setContent(nextContent, { emitUpdate: false });
        isApplyingProgrammaticUpdate.current = false;
        setFormData((currentFormData) => ({
          ...currentFormData,
          content: nextContent,
        }));
        latestFormData.current = {
          ...latestFormData.current,
          content: nextContent,
        };
        isApplyingRemoteUpdate.current = false;
      },
      (userNames) => {
        setOnlineUsers(userNames);
        setRemoteCursors((currentCursors) =>
          Object.fromEntries(
            Object.entries(currentCursors).filter(([userName]) =>
              userNames.includes(userName),
            ),
          ),
        );
      },
      (userName, position, color) => {
        setRemoteCursors((currentCursors) => ({
          ...currentCursors,
          [userName]: {
            userName,
            position,
            color,
          },
        }));
      },
    )
      .then(() => {
        if (isActive) {
          setConnectionStatus('Connected');
        }
      })
      .catch(() => {
        if (isActive) {
          setConnectionStatus('Disconnected');
        }
      });

    return () => {
      isActive = false;
      setConnectionStatus('Disconnected');
      setOnlineUsers([]);
      setRemoteCursors({});
      disconnectFromDocument(documentIdText).catch(() => {
        setConnectionStatus('Disconnected');
      });
    };
  }, [editor, initialDocument.id]);

  useEffect(() => {
    return () => {
      if (cursorTimeoutRef.current) {
        window.clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, []);

  async function loadHistory(targetDocumentId = documentIdRef.current) {
    if (!targetDocumentId) {
      return;
    }

    setHistoryError('');
    setIsHistoryLoading(true);

    try {
      const historyItems = await getDocumentHistory(targetDocumentId);
      setHistory(historyItems);
    } catch {
      setHistoryError('Could not load change history.');
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function saveCurrentDocument(showSuccessMessage: boolean) {
    const submittedData = latestFormData.current;
    setError('');
    if (showSuccessMessage) {
      setMessage('');
    }
    setIsSaving(true);
    setSaveStatus('Saving...');

    try {
      if (!documentIdRef.current) {
        throw new Error('Document is not loaded yet.');
      }

      const updatedDocument = routeShareId
        ? await updateSharedDocument(routeShareId, submittedData)
        : await updateDocument(documentIdRef.current, submittedData);
      const serverContent = toEditorContent(updatedDocument.content);
      const hasNewLocalChanges =
        latestFormData.current.title !== submittedData.title ||
        latestFormData.current.content !== submittedData.content;

      if (!hasNewLocalChanges) {
        setFormData({
          title: updatedDocument.title,
          content: serverContent,
        });
        latestFormData.current = {
          title: updatedDocument.title,
          content: serverContent,
        };

        if (editor && editor.getHTML() !== serverContent) {
          isApplyingProgrammaticUpdate.current = true;
          editor.commands.setContent(serverContent, { emitUpdate: false });
          isApplyingProgrammaticUpdate.current = false;
        }

        setSaveStatus('Saved');
      } else {
        setSaveStatus('Unsaved changes');
      }

      setShareId(updatedDocument.shareId);
      setOwnerName(updatedDocument.ownerUserName);
      setAccessRole(updatedDocument.accessRole);
      if (showSuccessMessage && !hasNewLocalChanges) {
        setMessage('Document saved.');
      }
      loadHistory(updatedDocument.id);
    } catch (requestError) {
      setSaveStatus('Save failed');
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not save document.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveCurrentDocument(true);
  }

  async function handleCopyShareLink() {
    setError('');
    setMessage('');

    try {
      if (!shareId) {
        throw new Error('Share link is not available yet.');
      }

      const shareUrl = `${window.location.origin}/shared/${shareId}`;
      await navigator.clipboard.writeText(shareUrl);
      setMessage('Share link copied.');
    } catch (copyError) {
      setError(
        copyError instanceof Error ? copyError.message : 'Could not copy share link.',
      );
    }
  }

  function handleContentChange(content: string) {
    setFormData((currentFormData) => ({
      ...currentFormData,
      content,
    }));

    if (isApplyingProgrammaticUpdate.current || isApplyingRemoteUpdate.current) {
      return;
    }

    if (!documentIdRef.current) {
      return;
    }

    markUnsaved();
    sendDocumentUpdate(documentIdRef.current.toString(), content).catch(() => {
      setConnectionStatus('Disconnected');
    });
  }

  function handleTitleChange(title: string) {
    setFormData((currentFormData) => ({
      ...currentFormData,
      title,
    }));
    markUnsaved();
  }

  function scheduleCursorUpdate(position: number) {
    if (!documentIdRef.current || !userNameRef.current) {
      return;
    }

    const documentIdText = documentIdRef.current.toString();
    const currentUserName = userNameRef.current;
    const cursorColor = cursorColorRef.current;

    if (cursorTimeoutRef.current) {
      window.clearTimeout(cursorTimeoutRef.current);
    }

    cursorTimeoutRef.current = window.setTimeout(() => {
      sendCursorPosition(
        documentIdText,
        position,
        currentUserName,
        cursorColor,
      ).catch(() => {
        setConnectionStatus('Disconnected');
      });
    }, 150);
  }

  function markUnsaved() {
    setMessage('');
    setSaveStatus('Unsaved changes');
    setDirtyVersion((currentVersion) => currentVersion + 1);
  }

  function getFormatButtonClass(isActive: boolean) {
    return isActive ? 'format-button is-active' : 'format-button';
  }

  return (
    <main className="editor-shell">
      <form className="editor-panel" onSubmit={handleSave}>
        <div className="editor-toolbar">
          <Link className="secondary-button" to="/documents">
            Back to Documents
          </Link>
          <span className="toolbar-status">SignalR: {connectionStatus}</span>
          <span className="toolbar-status">Save: {saveStatus}</span>
          <span className="toolbar-status">Role: {accessRole || '...'}</span>
          {ownerName && <span className="toolbar-status">Owner: {ownerName}</span>}
          <div className="formatting-toolbar" aria-label="Formatting tools">
            <button
              className={getFormatButtonClass(Boolean(editor?.isActive('bold')))}
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              disabled={!editor}
            >
              Bold
            </button>
            <button
              className={getFormatButtonClass(Boolean(editor?.isActive('italic')))}
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              disabled={!editor}
            >
              Italic
            </button>
            <button
              className={getFormatButtonClass(
                Boolean(editor?.isActive('heading', { level: 1 })),
              )}
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              disabled={!editor}
            >
              Heading 1
            </button>
            <button
              className={getFormatButtonClass(
                Boolean(editor?.isActive('heading', { level: 2 })),
              )}
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              disabled={!editor}
            >
              Heading 2
            </button>
            <button
              className={getFormatButtonClass(Boolean(editor?.isActive('bulletList')))}
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              disabled={!editor}
            >
              Bullet list
            </button>
            <button
              className={getFormatButtonClass(Boolean(editor?.isActive('orderedList')))}
              type="button"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              disabled={!editor}
            >
              Ordered list
            </button>
            <button
              className={getFormatButtonClass(Boolean(editor?.isActive('blockquote')))}
              type="button"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              disabled={!editor}
            >
              Quote
            </button>
            <button
              className={getFormatButtonClass(Boolean(editor?.isActive('codeBlock')))}
              type="button"
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              disabled={!editor}
            >
              Code block
            </button>
          </div>
          <div className="toolbar-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={handleCopyShareLink}
              disabled={!shareId}
            >
              Copy Share Link
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={isSaving || !documentIdRef.current}
            >
              Save
            </button>
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}

        <div className="editor-layout">
          <section className="document-page" aria-label="Document editor">
            <input
              className="editor-title"
              type="text"
              value={formData.title}
              onChange={(event) => handleTitleChange(event.target.value)}
              required
            />
            <EditorContent editor={editor} />
          </section>

          <aside className="editor-sidebar">
            <section className="online-users" aria-label="Online users">
              <h2>Online users</h2>
              {onlineUsers.length === 0 ? (
                <p>No users connected.</p>
              ) : (
                <ul>
                  {onlineUsers.map((userName) => (
                    <li key={userName}>{userName}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="change-history" aria-label="Change history">
              <div className="history-heading">
                <h2>Change History</h2>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => loadHistory()}
                  disabled={isHistoryLoading}
                >
                  {isHistoryLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              {historyError && <p className="history-error">{historyError}</p>}
              {history.length === 0 && !historyError ? (
                <p>No history yet.</p>
              ) : (
                <ul>
                  {history.map((item) => (
                    <li key={item.id}>
                      <strong>{item.description}</strong>
                      <span>{item.userName}</span>
                      <time dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </form>
    </main>
  );
}

export default DocumentEditorPage;
