# Levantar Proyecto

## 1) Preparar entorno

Desde la raíz del repo:

```powershell
cd C:\Users\JefroMM\tareasIA2026\voz-ia-proyecto
Copy-Item .env.example .env
```

Editar `.env` con tus credenciales reales (OpenAI, AssemblyAI, Cartesia).

## 2) Levantar servicios

```powershell
docker compose up --build -d
```

Verificar estado:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## 3) Accesos

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- OpenAPI: `http://localhost:8000/docs`

Prueba rápida backend:

```powershell
curl http://localhost:8000/health
```

## 4) Flujo recomendado de prueba (plantilla)

1. Crear template en dashboard.
2. Agregar requisitos y preguntas.
3. Crear entrevista desde template.
4. Subir CV.
5. Ejecutar análisis de CV.
6. Enviar invitación al candidato.
7. Abrir link/token de candidato.
8. Responder preguntas (voz).
9. Finalizar y revisar reporte.

## 5) Flujo alterno (agentic + RAG)

1. Crear entrevista.
2. Subir CV y Job Description por `/upload`.
3. Reindexar `/rag/reindex/{interview_id}`.
4. Iniciar `/interview/start/{interview_id}`.
5. Continuar turnos `/interview/message/{interview_id}`.
6. Finalizar `/interview/finalize/{interview_id}`.

## 6) Problemas frecuentes

### Contenedor postgres con nombre en conflicto

```powershell
docker rm -f interviewer-postgres
docker compose up -d
```

### Reinicio limpio (borra datos)

```powershell
docker compose down -v
docker compose up --build -d
```

### No transcribe audio

- Revisar `ASSEMBLYAI_API_KEY`
- Verificar permisos de micrófono

### No genera voz

- Revisar `CARTESIA_API_KEY` y `CARTESIA_VOICE_ID`

### Errores IA

- Revisar `OPENAI_API_KEY`
- Verificar cuota/API limits
