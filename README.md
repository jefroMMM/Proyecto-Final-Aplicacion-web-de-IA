# AI Technical Interviewer Voice System

Plataforma full stack para entrevistas tecnicas por voz impulsadas por IA. Esta base deja separadas las capas de frontend, backend, base de datos, RAG, agentes, LangGraph, audio y contenedores para que el proyecto pueda crecer sin mezclar responsabilidades.

## Stack Tecnologico

- Frontend: Next.js 15, TypeScript, TailwindCSS, shadcn/ui-ready, Framer Motion y Zustand.
- Backend: FastAPI, Python 3.12, SQLAlchemy async, Pydantic Settings y Uvicorn.
- IA: OpenAI para razonamiento, generacion de preguntas y embeddings.
- STT: AssemblyAI.
- TTS: Cartesia.
- RAG: LangChain, PostgreSQL, pgvector y `langchain-postgres`.
- Agentes: LangGraph con una base de grafo extensible.
- Infraestructura: Docker, Docker Compose y PostgreSQL con extension vector.

## Arquitectura

```text
frontend/
  app/                 Next.js App Router
  components/ui/       Componentes compatibles con shadcn/ui
  lib/                 Clientes y utilidades frontend
  store/               Estado global Zustand

backend/
  app/api/             Routers FastAPI
  app/core/            Configuracion centralizada
  app/db/              Sesiones SQLAlchemy e inicializacion pgvector
  app/models/          Modelos ORM
  app/schemas/         Schemas Pydantic
  app/services/        Clientes de proveedores IA
  app/rag/             Vector store y recuperacion
  app/agents/          Agentes de entrevista
  app/langgraph/       Orquestacion de estados
  app/audio/           STT AssemblyAI y TTS Cartesia
  app/prompts/         Prompts versionables
  app/tools/           Herramientas para agentes
  app/utils/           Errores y utilidades compartidas
```

## Flujo General

1. El frontend consume la API del backend usando `NEXT_PUBLIC_API_URL`.
2. El backend lee configuracion desde `.env` con Pydantic Settings.
3. La voz del candidato se transcribe con AssemblyAI desde la capa `app/audio`.
4. El agente tecnico usa OpenAI y puede consultar conocimiento via RAG con PostgreSQL + pgvector.
5. LangGraph orquesta el estado conversacional de la entrevista.
6. La respuesta del entrevistador se puede sintetizar con Cartesia desde la capa TTS.
7. PostgreSQL almacena entrevistas, documentos y embeddings.

## Variables de Entorno

Copia `.env.example` a `.env` y completa las claves reales:

```bash
OPENAI_API_KEY=
ASSEMBLYAI_API_KEY=
CARTESIA_API_KEY=
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/interviewer
NEXT_PUBLIC_API_URL=http://localhost:8000
BACKEND_CORS_ORIGINS=http://localhost:3000,http://frontend:3000
ASSEMBLYAI_SPEECH_MODEL=best
ASSEMBLYAI_LANGUAGE_CODE=es
ASSEMBLYAI_LANGUAGE_DETECTION=false
ASSEMBLYAI_SAMPLE_RATE=16000
```

No se deben guardar claves reales en el repositorio.

## Comandos

Levantar todo el proyecto:

```bash
docker compose up --build
```

Probar el backend:

```bash
curl http://localhost:8000/health
```

Crear una entrevista con usuario nuevo o existente por email:

```bash
curl -X POST http://localhost:8000/interviews \
  -H "Content-Type: application/json" \
  -d '{"user":{"name":"Admin","email":"admin@example.com"},"candidate_name":"Ada Lovelace","job_title":"Backend Engineer"}'
```

Listar entrevistas:

```bash
curl http://localhost:8000/interviews
```

Subir un CV en PDF:

```bash
curl -X POST http://localhost:8000/upload/cv/{interview_id} \
  -F "file=@candidate-cv.pdf"
```

Subir un job description en PDF o TXT:

```bash
curl -X POST http://localhost:8000/upload/job/{interview_id} \
  -F "file=@job-description.txt"
```

Al subir documentos, el backend extrae texto, lo divide en chunks, genera embeddings con OpenAI y guarda vectores en `embeddings_metadata` usando pgvector.

Buscar contexto semantico por entrevista:

```bash
curl -X POST http://localhost:8000/rag/search/{interview_id} \
  -H "Content-Type: application/json" \
  -d '{"query":"experiencia con FastAPI y PostgreSQL","source_type":"cv","top_k":5}'
```

Reindexar todos los documentos de una entrevista:

```bash
curl -X POST http://localhost:8000/rag/reindex/{interview_id}
```

Consultar detalle, transcripciones y reporte:

```bash
curl http://localhost:8000/interviews/{interview_id}
curl http://localhost:8000/transcripts/{interview_id}
curl http://localhost:8000/reports/{interview_id}
```

Iniciar workflow de entrevista con IA:

```bash
curl -X POST http://localhost:8000/interview/start/{interview_id}
```

Enviar respuesta del candidato:

```bash
curl -X POST http://localhost:8000/interview/message/{interview_id} \
  -H "Content-Type: application/json" \
  -d '{"answer":"Diseñaria el endpoint con FastAPI, validaria payloads con Pydantic y usaria SQLAlchemy async para persistir los datos en PostgreSQL."}'
```

Finalizar y generar reporte estructurado:

```bash
curl -X POST http://localhost:8000/interview/finalize/{interview_id}
```

Consultar estado persistido del workflow:

```bash
curl http://localhost:8000/interview/state/{interview_id}
```

Iniciar entrevista por voz y recibir audio de la primera pregunta:

```bash
curl -X POST http://localhost:8000/interview/audio/start/{interview_id}
```

Enviar respuesta de voz del candidato:

```bash
curl -X POST http://localhost:8000/interview/audio/{interview_id} \
  -F "file=@answer.webm"
```

Si quieres seleccionar una voz Cartesia por request:

```bash
curl -X POST http://localhost:8000/interview/audio/{interview_id} \
  -F "file=@answer.webm" \
  -F "voice_id={cartesia_voice_id}" \
  -F "speed=normal"
```

Abrir el frontend:

```bash
http://localhost:3000
```

Detener contenedores:

```bash
docker compose down
```

Eliminar tambien el volumen de base de datos:

```bash
docker compose down -v
```

## Estado Actual

La base ya incluye health check, configuracion centralizada, conexion SQLAlchemy async, modelos iniciales, vector store pgvector, esqueleto LangGraph, agente de entrevista, STT con AssemblyAI, TTS con Cartesia y una pantalla inicial integrada con el backend. Las funcionalidades de entrevista, carga de documentos, streaming de audio y evaluacion se pueden implementar sobre estas interfaces sin reestructurar el proyecto.
