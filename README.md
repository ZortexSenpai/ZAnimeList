# ZAnimeList

A self-hosted anime list manager. Import from MyAnimeList or AniList, or build your list manually.

## Running with Docker

**Prerequisites:** Docker and Docker Compose.

```bash
docker compose up -d
```

Then open [http://localhost:8080](http://localhost:8080).

The database is stored in a Docker volume (`zanime_data`) and persists across restarts.

### Changing the port

```bash
# Run on port 3000 instead
docker compose run -p 3000:8080 zanime
```

Or edit `docker-compose.yml` and change `"8080:8080"` to `"<your-port>:8080"`.

### Using PostgreSQL instead of SQLite

Update `docker-compose.yml`:

```yaml
services:
  zanime:
    build: .
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

### Rebuilding after updates

```bash
docker compose up -d --build
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
