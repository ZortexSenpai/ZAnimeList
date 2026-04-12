# ZAnimeList

A self-hosted anime list manager. Import from MyAnimeList or AniList, or build your list manually.

## Running with Docker

**Prerequisites:** Docker and Docker Compose.

```bash
docker compose up -d
```

The image is pulled automatically from `ghcr.io/ZortexSenpai/ZAnimeList:latest`.

Then open [http://localhost:8080](http://localhost:8080).

The default admin credentials are `admin` / `admin` — change them via the environment variables below or through the profile settings after first login.

The database is stored in a Docker volume (`zanime_data`) and persists across restarts.

### Changing the port

Edit `docker-compose.yml` and change `"8080:8080"` to `"<your-port>:8080"`.

### Using PostgreSQL instead of SQLite

Update `docker-compose.yml`:

```yaml
services:
  zanime:
    image: ghcr.io/ZortexSenpai/ZAnimeList:latest
    ports:
      - "8080:8080"
    environment:
      - DatabaseProvider=postgresql
      - ConnectionStrings__PostgreSQL=Host=db;Database=zanime;Username=zanime;Password=changeme
    depends_on:
      - db

  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: zanime
      POSTGRES_USER: zanime
      POSTGRES_PASSWORD: changeme
    volumes:
      - pg_data:/var/lib/postgresql/data

volumes:
  pg_data:
```

### Updating to the latest version

```bash
docker compose pull
docker compose up -d
```

### Viewing logs

```bash
docker compose logs -f
```

### Stopping

```bash
docker compose down
```

To also delete the database volume:

```bash
docker compose down -v
```

## SSO / OIDC login (Authentik)

ZAnimeList supports login via any OpenID Connect provider. The flow uses PKCE so no client secret is required for public clients, but confidential clients with a secret are also supported.

### 1 — Create an application in Authentik

1. Go to **Applications → Providers → Create** and choose **OAuth2/OpenID Connect Provider**.
2. Set **Client type** to **Confidential** (recommended) or **Public**.
3. Add a **Redirect URI** matching your app's callback URL, e.g. `https://anime.example.com/oidc-callback`.
4. Under **Advanced protocol settings**, ensure the scopes `openid`, `profile`, and `email` are selected.
5. Create an **Application** that uses this provider and note the **Client ID**, **Client Secret**, and the **OpenID Configuration Issuer** URL (shown on the provider's overview page — looks like `https://authentik.example.com/application/o/<slug>`).

### 2 — Configure ZAnimeList

Set the following environment variables (Docker) or update `appsettings.json` directly.

**Docker (`docker-compose.yml`):**

```yaml
services:
  zanime:
    image: ghcr.io/ZortexSenpai/ZAnimeList:latest
    ports:
      - "8080:8080"
    volumes:
      - zanime_data:/data
    environment:
      - ConnectionStrings__Sqlite=Data Source=/data/zanime.db
      - Oidc__Enabled=true
      - Oidc__Authority=https://authentik.example.com/application/o/zanime
      - Oidc__ClientId=your-client-id
      - Oidc__ClientSecret=your-client-secret
      - Oidc__RedirectUri=https://anime.example.com/oidc-callback
      - Oidc__DisplayName=Authentik

volumes:
  zanime_data:
```

**`appsettings.json` (development or custom deployments):**

```json
"Oidc": {
  "Enabled": true,
  "Authority": "https://authentik.example.com/application/o/zanime",
  "ClientId": "your-client-id",
  "ClientSecret": "your-client-secret",
  "RedirectUri": "https://anime.example.com/oidc-callback",
  "DisplayName": "Authentik"
}
```

| Key | Description |
|-----|-------------|
| `Enabled` | Set to `true` to show the SSO button on the login page. |
| `Authority` | The **OpenID Configuration Issuer** URL from Authentik's provider overview. |
| `ClientId` | The **Client ID** shown in Authentik. |
| `ClientSecret` | The **Client Secret** from Authentik. Leave empty for public clients. |
| `RedirectUri` | Must exactly match the redirect URI registered in Authentik. Use your public URL in production. |
| `DisplayName` | Label shown on the "Sign in with …" button. |

Once configured, a **Sign in with Authentik** button appears on the login page. On first login the account is provisioned automatically using the `preferred_username` from the OIDC token. Local password accounts continue to work alongside SSO.

## Development setup

**Prerequisites:** .NET 9 SDK, Node.js 22.

```bash
# Terminal 1 — backend
cd backend/ZAnimeList.API
dotnet run

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Frontend dev server: [http://localhost:5173](http://localhost:5173)  
Backend API: [http://localhost:5184](http://localhost:5184)

For OIDC during development, set `Oidc__RedirectUri` to `http://localhost:5173/oidc-callback` and register that URI in your Authentik provider.
