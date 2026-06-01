# AI Technical Interviewer Voice System

Plataforma full stack para entrevistas técnicas asistidas por IA con dos modos de operación:

- Flujo por plantilla (productivo para evaluación estructurada)
- Flujo agentic con LangGraph + RAG + entrevista por voz

Este repositorio incluye frontend, backend, persistencia, procesamiento de audio y generación de reportes.

## Tabla de Contenido

- [Arquitectura](#arquitectura)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Flujos funcionales](#flujos-funcionales)
- [Variables de entorno](#variables-de-entorno)
- [Ejecución local con Docker](#ejecución-local-con-docker)
- [Documentación técnica](#documentación-técnica)
- [Notas operativas](#notas-operativas)

## Arquitectura

- Frontend: Next.js 15, TypeScript, TailwindCSS, Zustand
- Backend: FastAPI, SQLAlchemy async, Pydantic
- Base de datos: PostgreSQL + pgvector
- IA:
  - OpenAI (generación/evaluación)
  - LangChain/LangGraph (workflow agentic)
- Voz:
  - AssemblyAI (STT)
  - Cartesia (TTS)
- Infra:
  - Docker Compose

Diagrama de alto nivel: ver [HIGH_LEVEL_SYSTEM_DESIGN.md](/C:/Users/JefroMM/tareasIA2026/voz-ia-proyecto/docs/HIGH_LEVEL_SYSTEM_DESIGN.md)

## Estructura del repositorio

```text
frontend/                 # Next.js app
backend/
  app/
    api/routes/           # Endpoints FastAPI
    services/             # Casos de uso / lógica de negocio
    repositories/         # Acceso a datos
    models/               # Modelos SQLAlchemy
    schemas/              # Contratos Pydantic
    rag/                  # Ingesta, embeddings, retrieval
    langgraph/            # Workflow stateful
    audio/                # STT/TTS y rutas de entrevista por voz
    db/                   # init.sql y sesión
    core/                 # Configuración
docs/                     # Documentación técnica
docker-compose.yml
.env.example
```

## Flujos funcionales

### 1) Flujo por plantilla

1. Crear plantilla (`/templates`)
2. Agregar requisitos y preguntas
3. Crear entrevista (`/interviews` con payload v2)
4. Subir CV (`/interviews/{id}/upload-cv`)
5. Analizar CV (`/interviews/{id}/analyze-cv`)
6. Enviar invitación al candidato (`/interviews/{id}/send-candidate-invite`)
7. Responder por texto o audio (`/interviews/{id}/answer` o `/audio-answer`)
8. Finalizar y obtener reporte (`/interviews/{id}/finalize`, `/report`)

### 2) Flujo agentic (LangGraph)

1. Cargar documentos CV/Job Description (`/upload/cv/{id}`, `/upload/job/{id}`)
2. Reindexar contexto RAG (`/rag/reindex/{id}`)
3. Iniciar workflow (`/interview/start/{id}`)
4. Turnos del candidato (`/interview/message/{id}`)
5. Finalizar (`/interview/finalize/{id}`)

### 3) Flujo voice agentic

1. Iniciar voz (`/interview/audio/start/{id}`)
2. Enviar audio del candidato (`/interview/audio/{id}`)
3. Backend transcribe, evalúa, sintetiza siguiente respuesta y guarda trazas de transcript

## Variables de entorno

Usar `.env.example` como base.

Variables críticas:

- `OPENAI_API_KEY`
- `ASSEMBLYAI_API_KEY`
- `CARTESIA_API_KEY`
- `DATABASE_URL`
- `BACKEND_CORS_ORIGINS`
- `NEXT_PUBLIC_API_URL`
- `PUBLIC_BACKEND_URL`
- `PUBLIC_FRONTEND_URL`

Variables de tracing:

- `LANGSMITH_API_KEY`
- `LANGSMITH_TRACING`
- `LANGSMITH_PROJECT`
- `LANGSMITH_ENDPOINT`

## Ejecución local con Docker

1. Copiar entorno

```powershell
Copy-Item .env.example .env
```

2. Levantar servicios

```powershell
docker compose up --build
```

3. URLs

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- OpenAPI: `http://localhost:8000/docs`

Guía rápida adicional: [Levantar-Proyecto.md](/C:/Users/JefroMM/tareasIA2026/voz-ia-proyecto/Levantar-Proyecto.md)

## Documentación técnica

- Diseño de sistema: [HIGH_LEVEL_SYSTEM_DESIGN.md](/C:/Users/JefroMM/tareasIA2026/voz-ia-proyecto/docs/HIGH_LEVEL_SYSTEM_DESIGN.md)
- Referencia de API: [API_REFERENCE.md](/C:/Users/JefroMM/tareasIA2026/voz-ia-proyecto/docs/API_REFERENCE.md)
- Operación y troubleshooting: [OPERATIONS_AND_TROUBLESHOOTING.md](/C:/Users/JefroMM/tareasIA2026/voz-ia-proyecto/docs/OPERATIONS_AND_TROUBLESHOOTING.md)
- Demo: [PRESENTACION_DEMO.md](/C:/Users/JefroMM/tareasIA2026/voz-ia-proyecto/docs/PRESENTACION_DEMO.md)

## Notas operativas

- Este proyecto usa servicios externos con costo por uso (OpenAI, AssemblyAI, Cartesia).
- No incluir claves reales en commits.
- Si una clave fue expuesta, rotarla inmediatamente.
