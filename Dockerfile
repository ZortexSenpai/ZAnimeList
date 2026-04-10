# Stage 1: Build frontend
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS backend
WORKDIR /app
COPY backend/ ./
RUN dotnet publish ZAnimeList.API/ZAnimeList.API.csproj -c Release -o /publish

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS final
WORKDIR /app
COPY --from=backend /publish ./
COPY --from=frontend /app/dist ./wwwroot
EXPOSE 8080
ENTRYPOINT ["dotnet", "ZAnimeList.API.dll"]
