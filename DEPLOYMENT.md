# ETHOS — Production Deployment & Runbook Guide

This runbook details the production deployment architecture, environment variable mapping, service configuration, and security operations for the **ETHOS — Ethical Governance System**.

---

## 🏗️ Production Architecture

```text
                    ┌─────────────────────┐
                    │       USERS         │
                    └──────────┬──────────┘
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │  RENDER FRONTEND    │
                    │   React + Vite      │
                    │ (ethos-frontend)    │
                    └──────────┬──────────┘
                               │ HTTPS / REST API
                               ▼
                    ┌─────────────────────┐
                    │   RENDER BACKEND    │
                    │ Spring Boot / Java  │
                    │  (ethos-backend)    │
                    └───────┬─────┬───────┘
                            │     │
                 ┌──────────┘     └──────────┐
                 ▼                           ▼
        ┌─────────────────┐        ┌─────────────────┐
        │ NEON POSTGRESQL │        │   CLOUDINARY    │
        │ Production DB   │        │ Evidence Images │
        └─────────────────┘        └─────────────────┘
```

---

## 📋 Service Specifications

### 1. Backend Web Service (`ethos-backend`)
- **Host**: Render Web Service
- **Runtime**: Docker (Java 21 Temurin via `backend/Dockerfile`)
- **Docker Context**: `./backend`
- **DockerfilePath**: `./backend/Dockerfile`
- **Port**: Dynamically bound via `${PORT:8080}`
- **Health Check Path**: `/api/health`

#### Required Environment Variables (Render Dashboard → ethos-backend → Environment):
| Variable Name | Description | Example / Format |
|---|---|---|
| `SPRING_DATASOURCE_URL` | Neon PostgreSQL JDBC connection URL | `jdbc:postgresql://<neon-host>/campus_transparency?sslmode=require` |
| `SPRING_DATASOURCE_USERNAME` | Neon database username | `neondb_owner` / `postgres` |
| `SPRING_DATASOURCE_PASSWORD` | Neon database user password | *(Secret value)* |
| `JWT_SECRET` | 256-bit+ HMAC-SHA signing key for JWTs | *(Secret string, 32+ characters)* |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name | *(Cloudinary cloud name)* |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | *(Cloudinary API key)* |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | *(Secret value — never expose to frontend)* |
| `ALLOWED_ORIGINS` | Permitted CORS frontend origins | `https://ethos-frontend.onrender.com` |

---

### 2. Frontend Service (`ethos-frontend`)
- **Host**: Render Web Service (Static Site)
- **Blueprint Spec**: `type: web`, `runtime: static`
- **Root Directory**: `frontendv2`
- **Build Command**: `cd frontendv2 && npm install && npm run build`
- **Publish Directory**: `frontendv2/dist`
- **Routing**: Single-Page Application (SPA) rewrite rule enabled:
  - Source: `/*`
  - Destination: `/index.html`
  - Status: `200`
  *(Pre-configured in `frontendv2/public/_redirects` and `render.yaml`)*

#### Required Environment Variables (Render Dashboard → ethos-frontend → Environment):
| Variable Name | Description | Example / Format |
|---|---|---|
| `VITE_API_BASE_URL` | Deployed backend service HTTPS URL | `https://ethos-backend.onrender.com` |

---

## 🚀 Deployment Instructions

### Method A: Render Blueprint (Recommended)
1. Push repository changes to `origin/main`.
2. In the Render Dashboard, click **New** → **Blueprint**.
3. Select the `campus-transparency` repository.
4. Render will detect `render.yaml` and prompt for the environment variables defined above.
5. Enter the secure values for the backend variables (`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`, Cloudinary keys).
6. Click **Apply**. Both services will build and deploy in parallel.

### Method B: Manual Service Creation
1. **Create Backend Web Service**:
   - New Web Service → Connect GitHub repo.
   - Root directory: `backend`.
   - Environment: Docker.
   - Add backend environment variables listed above.
   - Deploy service and record its assigned URL (e.g. `https://ethos-backend.onrender.com`).
2. **Create Frontend Static Site**:
   - New Static Site → Connect GitHub repo.
   - Root directory: `frontendv2`.
   - Build command: `npm install && npm run build`.
   - Publish directory: `dist`.
   - Set environment variable `VITE_API_BASE_URL` to `https://ethos-backend.onrender.com`.
   - Deploy site and record its assigned URL (e.g. `https://ethos-frontend.onrender.com`).
3. **Configure Backend CORS**:
   - In backend service environment settings, update `ALLOWED_ORIGINS` to `https://ethos-frontend.onrender.com`.
   - Save and redeploy backend.

---

## 🔒 Neon Database Password Rotation Protocol

Once production deployment and smoke tests succeed:
1. Navigate to the **Neon Console** (`https://console.neon.tech`).
2. Select your project → **Dashboard** → **Connection Details** / **Roles & Databases**.
3. Click **Reset Password** on the active role.
4. Update the `SPRING_DATASOURCE_PASSWORD` variable in the Render Backend settings.
5. If the full connection string is stored in `SPRING_DATASOURCE_URL`, update the password component as well.
6. Trigger a backend service redeploy on Render.
7. Verify that database connectivity, Flyway migrations, and authenticated endpoints remain fully operational.
