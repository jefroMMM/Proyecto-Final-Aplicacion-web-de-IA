# Operations and Troubleshooting

## Requisitos mínimos

- Docker Desktop activo
- Puertos disponibles: `3000`, `8000`, `5432`
- Credenciales válidas para:
  - OpenAI
  - AssemblyAI
  - Cartesia

## Arranque recomendado

```powershell
docker compose up --build -d
```

Validar contenedores:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## Salud rápida

- Backend: `GET http://localhost:8000/health`
- OpenAPI: `http://localhost:8000/docs`
- Frontend: `http://localhost:3000`

## Gestión de logs

Backend:

```powershell
docker logs interviewer-backend --tail 200
```

Frontend:

```powershell
docker logs interviewer-frontend --tail 200
```

Postgres:

```powershell
docker logs interviewer-postgres --tail 200
```

## Conflictos de contenedores

Síntoma:

- `Conflict. The container name "/interviewer-postgres" is already in use...`

Solución:

```powershell
docker rm -f interviewer-postgres
docker compose up -d
```

## Reseteo total de base de datos (entorno demo)

```powershell
docker compose down -v
docker compose up --build -d
```

Esto elimina volumen `postgres_data` y datos persistidos.

## Problemas de audio

### No transcribe

Revisar:

- `ASSEMBLYAI_API_KEY`
- Permisos de micrófono en navegador
- Formato de archivo enviado

### No genera TTS

Revisar:

- `CARTESIA_API_KEY`
- `CARTESIA_VOICE_ID`

## Problemas de IA (OpenAI)

Síntomas:

- respuestas vacías
- errores 502 en endpoints de evaluación/reporte

Revisar:

- `OPENAI_API_KEY`
- cuota/límites de cuenta
- conectividad saliente desde Docker

## LangSmith tracing

Variables recomendadas:

```env
LANGSMITH_API_KEY=...
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=IA
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

Verificación rápida dentro de contenedor backend:

```powershell
docker exec interviewer-backend python -c "import os;print(os.getenv('LANGSMITH_TRACING'), os.getenv('LANGSMITH_PROJECT'))"
```

Si no aparecen trazas:

1. Confirmar que estás revisando el proyecto correcto en LangSmith (`IA`).
2. Confirmar tráfico real a endpoints que ejecutan IA.
3. Revisar logs backend por errores de proveedor antes de asumir fallo de tracing.

## Configuración de CORS

Si frontend no puede llamar backend, ajustar:

- `BACKEND_CORS_ORIGINS`

Ejemplo:

```env
BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://frontend:3000
```

## Seguridad

- No versionar `.env` con claves reales.
- Rotar claves expuestas inmediatamente.
- Usar cuentas y tokens de menor privilegio posible.
