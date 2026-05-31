# Collab Editor

Collab Editor is a coursework project for a real-time collaborative document editing system. It has an ASP.NET Core backend and a React frontend prepared for document collaboration features.


YOU CAN OPEN IT HERE https://collab-editor-ej2ifpji0-vitalii-s-projects10.vercel.app/


## Technologies

- ASP.NET Core
- Entity Framework Core
- PostgreSQL
- JWT
- SignalR
- React
- TypeScript
- Vite
- TipTap

## Main Features

- Registration and login
- Documents CRUD
- Shared links
- Join shared document
- Shared documents list
- Real-time editing
- Autosave
- Change history
- Rich text formatting
- Remote cursors

## Backend Setup

The backend project is located in:

```powershell
backend\CollabEditor.API
```

Restore and build:

```powershell
cd backend\CollabEditor.API
dotnet restore
dotnet build
```

Run the backend:

```powershell
dotnet run
```

By default, the backend development URLs are configured in `Properties\launchSettings.json`.

## Frontend Setup

The frontend project is located in:

```powershell
frontend
```

Install dependencies and build:

```powershell
cd frontend
npm install
npm run build
```

Run the frontend:

```powershell
npm run dev
```

Create a local `.env` file in the `frontend` folder if your backend URL is different:

```env
VITE_API_BASE_URL=http://localhost:5238
```

## Database Setup

Create a PostgreSQL database named:

```text
collab_editor
```

Use `appsettings.example.json` as a safe example for local configuration values. Do not commit real database passwords or production JWT secrets.

Apply Entity Framework Core migrations from the backend project folder:

```powershell
cd backend\CollabEditor.API
dotnet ef database update
```

## How To Run Locally

Start the backend:

```powershell
cd backend\CollabEditor.API
dotnet run
```

Start the frontend in another terminal:

```powershell
cd frontend
npm run dev
```

Open the frontend URL shown by Vite, usually:

```text
http://localhost:5173
```

## Demo Scenario With Two Users

1. Register user A.
2. Register user B in another browser or private window.
3. User A creates a document.
4. User A creates or shares a link to the document.
5. User B joins the shared document.
6. Both users edit the document at the same time.
7. Verify autosave, change history, rich text formatting, and remote cursors during collaboration.
