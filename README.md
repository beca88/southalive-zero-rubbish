# SouthAlive Zero Rubbish

A volunteer management system with a live map for **SouthAlive's Zero Rubbish** street-adoption programme. Community volunteers sign up to adopt a street or zone and keep it litter-free. Administrators review the sign-ups, approve them, and track adoptions over time.

> Capstone project, Southern Institute of Technology.

## Live deployment

| Part | Where it runs | URL |
|------|---------------|-----|
| Frontend (public pages + admin dashboard) | Vercel | https://southalive-zero-rubbish.vercel.app |
| Admin login | Vercel | https://southalive-zero-rubbish.vercel.app/admin/login |
| Backend API | Render (Docker) | https://southalive-zero-rubbish.onrender.com |
| API health check | Render | https://southalive-zero-rubbish.onrender.com/health |


## Features

### Public (embedded on the SouthAlive website)
- **Live adoption map** (`/map`) shows every adopted street and zone. Volunteers can choose whether their name appears on the map.
- **Adopt-a-street form** (`/adopt`): volunteers register, search for an address (with autocomplete), or draw the street or zone they want on the map.

### Admin dashboard (`/admin`)
- JWT-based login with `Admin` and `SuperAdmin` roles, and self-service password change.
- Review **pending volunteers**, then approve them (assigning or drawing their area) or reject them.
- Edit or delete volunteers, and export the volunteer list to an **Excel spreadsheet**.
- Manage adopted **streets and zones**: view active and ended adoptions, record yearly updates and notes, and end an adoption.
- Additional admin accounts can be created through the API (`POST /api/auth/register`, e.g. via Swagger UI). There is no dashboard page for this yet.

### Email notifications (via [Resend](https://resend.com))
- Admins receive an alert when someone registers. Multiple comma-separated recipients are supported.
- Volunteers receive a "registration received" email, then a confirmation once they are approved.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, React Router, Tailwind CSS, Leaflet + Leaflet.draw (react-leaflet), Axios |
| Backend | ASP.NET Core Web API (.NET 10), Entity Framework Core |
| Database | PostgreSQL + PostGIS (geometry via NetTopologySuite) |
| Auth | JWT bearer tokens, BCrypt password hashing |
| Other | ClosedXML (Excel export), Resend (email), Swagger UI |
| Hosting | Frontend on Vercel, API on Render (Docker) |

## Repository structure

```
southalive-project/
├── SouthAlive/AdminApi/        # ASP.NET Core Web API
│   ├── Controllers/            # Auth, Public, VolunteerAdmin, AreaAdmin, Admin
│   ├── Data/                   # EF Core DbContext
│   ├── DTOs/
│   ├── Migrations/             # EF Core migrations (PostGIS schema)
│   ├── Models/                 # Admin, Volunteer, Area, Adoption, AdoptionUpdate
│   ├── Services/               # JWT token + Resend email services
│   └── Dockerfile
└── zero-rubbish-frontend/      # React + Vite single-page app
    ├── src/pages/              # Home, EmbedMap, EmbedAdopt, admin views
    ├── src/components/         # Layout, modals, Leaflet draw tools, ProtectedRoute
    ├── src/context/            # AuthContext
    ├── src/services/           # API client + config
    └── vercel.json             # SPA rewrites + iframe (frame-ancestors) policy
```

## Getting started

### Prerequisites

Install these before you start:

| Tool | Why it's needed |
|------|-----------------|
| [.NET 10 SDK](https://dotnet.microsoft.com/download) | Runs the backend API |
| [Node.js](https://nodejs.org/) 20+ and npm | Runs the React frontend |
| [PostgreSQL](https://www.postgresql.org/download/) **with the PostGIS extension** | The database. Plain PostgreSQL isn't enough, because the migrations enable PostGIS to store the street and zone shapes |
| EF Core CLI: `dotnet tool install --global dotnet-ef` | Creates the database tables from the migrations |

**Installing PostGIS:**
- **Windows:** after installing PostgreSQL, open **Stack Builder** (it comes with the installer). Under *Spatial Extensions*, pick **PostGIS**.
- **Docker (alternative):** run PostgreSQL with PostGIS already included, with nothing else to install:
  ```bash
  docker run --name southalive-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgis/postgis
  ```

You don't need a Resend account to run the project locally. Without an email API key, emails are skipped and a warning is logged, and everything else works.

### 1. Configure the API

`appsettings.json` ships with empty secrets. For local development, set them with [user secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) so they stay out of the repo:

```bash
cd SouthAlive/AdminApi

dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Database=southalive;Username=postgres;Password=yourpassword"
dotnet user-secrets set "Jwt:Key" "a-long-random-secret-at-least-32-characters"

# Optional: email notifications
dotnet user-secrets set "Email:ResendApiKey" "re_xxxxxxxx"
dotnet user-secrets set "Email:AdminAlertAddress" "admin1@example.com,admin2@example.com"
dotnet user-secrets set "Email:AdminDashboardUrl" "http://localhost:5173/admin/login"
dotnet user-secrets set "Resend:ReplyTo" "info@example.com"
```

| Setting | Purpose |
|---------|---------|
| `ConnectionStrings:DefaultConnection` | PostgreSQL connection string (required) |
| `Jwt:Key` | Signing key for JWTs (required) |
| `Jwt:Issuer` / `Jwt:Audience` / `Jwt:ExpiryMinutes` | Token settings (defaults in `appsettings.json`) |
| `AllowedOrigins` | Comma-separated CORS origins. Defaults to the local Vite dev server |
| `Email:ResendApiKey` | Resend API key |
| `Email:AdminAlertAddress` | Comma-separated admin alert recipients |
| `Email:AdminDashboardUrl` | Login link included in admin alert emails |
| `Resend:FromAddress` / `Resend:ReplyTo` | Sender and reply-to addresses |

### 2. Create the database and run the API

```bash
cd SouthAlive/AdminApi
dotnet ef database update   # applies migrations and enables PostGIS
dotnet run
```

The API runs at `http://localhost:5166`. In Development, Swagger UI is available at `http://localhost:5166/swagger`. Use **Authorize** to paste a token from `POST /api/auth/login`.

### 3. Create the first admin account

A new database has no admin accounts, and the register endpoint requires an admin login. So the first account has to be added directly to the database:

1. **Generate a BCrypt hash of your password.** Use any BCrypt generator, or Python:
   ```bash
   pip install bcrypt
   python -c "import bcrypt; print(bcrypt.hashpw(b'YourPassword123', bcrypt.gensalt()).decode())"
   ```
2. **Insert the admin**, using pgAdmin or `psql`:
   ```sql
   INSERT INTO "Admins" ("Username", "Email", "PasswordHash", "Role")
   VALUES ('admin', 'admin@example.com', '<paste the hash here>', 'SuperAdmin');
   ```
3. Log in at `http://localhost:5173/admin/login` once the frontend is running (next step).

After that, create other admin accounts with `POST /api/auth/register` in Swagger UI.

### 4. Run the frontend

```bash
cd zero-rubbish-frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`. The API URL comes from `VITE_API_BASE_URL` in `.env.development` (default `http://localhost:5166`). Give the origin only, without `/api` or a trailing slash.

| Route | Page |
|-------|------|
| `/` | Home |
| `/map` | Embeddable live adoption map |
| `/adopt` | Embeddable volunteer registration form |
| `/admin/login` | Admin login |
| `/admin/dashboard`, `/admin/volunteers`, `/admin/streets`, `/admin/change-password` | Admin pages (login required) |

## API overview

| Method | Endpoint | Auth |
|--------|----------|------|
| `POST` | `/api/auth/login` | Public |
| `POST` | `/api/auth/register` | Admin / SuperAdmin |
| `PUT` | `/api/auth/change-password` | Logged in |
| `GET` | `/api/public/areas` | Public |
| `POST` | `/api/public/volunteers/register` | Public |
| `GET` | `/api/admin/volunteeradmin` | Logged in |
| `GET` | `/api/admin/volunteeradmin/export` | Logged in |
| `PATCH` | `/api/admin/volunteeradmin/{id}/approve` · `/reject` | Logged in |
| `PATCH` / `DELETE` | `/api/admin/volunteeradmin/{id}` (`/force` to delete with adoptions) | Logged in |
| `GET` | `/api/admin/areas` · `/api/admin/areas/ended` | Logged in |
| `GET` / `POST` | `/api/admin/areas/{areaId}/updates` | Logged in |
| `PATCH` | `/api/admin/areas/{id}/end-adoption` | Logged in |
| `GET` | `/health` · `/health/db` | Public |

## Deployment

See [Live deployment](#live-deployment) for the current URLs. To deploy your own copy:

- **Database:** any hosted PostgreSQL that supports the PostGIS extension. Run `dotnet ef database update` against it, then create the first admin as described in step 3.
- **API on Render:** built from `SouthAlive/AdminApi/Dockerfile` and listening on port `10000`. Set the settings above as environment variables, using `__` in place of `:` (for example `ConnectionStrings__DefaultConnection`, `Jwt__Key`), and set `AllowedOrigins` to the frontend URL. Forwarded headers are trusted so HTTPS works behind Render's proxy.
- **Frontend on Vercel:** set `VITE_API_BASE_URL` to the API's public origin. `vercel.json` handles SPA routing and allows only the SouthAlive sites to iframe the public pages. Admin pages cannot be framed.
