# AI Technical Interviewer Voice System

Plataforma full stack para entrevistas tecnicas por voz impulsadas por IA. El sistema permite crear entrevistas, subir CV y Job Description, indexar documentos con RAG, ejecutar una entrevista por voz, transcribir respuestas, generar preguntas adaptativas y producir un reporte final estructurado.

## Objetivo Universitario

El objetivo del proyecto es demostrar una arquitectura moderna de IA aplicada a entrevistas tecnicas:

- Automatizar entrevistas tecnicas por voz.
- Usar documentos reales del candidato y del puesto como contexto.
- Evaluar respuestas con criterios estructurados.
- Mostrar un flujo completo de IA generativa, RAG, agentes y audio.
- Integrar frontend, backend, base de datos, vector search y servicios externos.

## Stack Tecnologico

- Frontend: Next.js 15, TypeScript, TailwindCSS, shadcn/ui-style components, Framer Motion, Zustand, Recharts.
- Backend: FastAPI, Python 3.12, SQLAlchemy async, Pydantic, Uvicorn.
- Base de datos: PostgreSQL 16 con pgvector.
- RAG: LangChain, OpenAI Embeddings, RecursiveCharacterTextSplitter, pgvector.
- Agentes: LangGraph, LangChain tools, OpenAI GPT-4.1, structured outputs con Pydantic.
- Voz: AssemblyAI para Speech-to-Text y Cartesia para Text-to-Speech.
- Infraestructura: Docker y Docker Compose.

No se usa ElevenLabs. No se usa Whisper.

## Arquitectura General

```text
frontend/
  app/                    Rutas Next.js: landing, dashboard, entrevista, reporte
  components/             Layout, UI, upload, grabacion, timeline, graficas
  lib/services/           Clientes API tipados por dominio
  store/                  Estado global con Zustand
  types/                  Tipos TypeScript compartidos

backend/
  app/api/routes/         Endpoints REST
  app/audio/              AssemblyAI, Cartesia y almacenamiento de audio
  app/core/               Configuracion centralizada desde .env
  app/db/                 Engine async, sesiones e inicializacion pgvector
  app/langgraph/          Workflow de entrevista
  app/models/             Modelos SQLAlchemy
  app/prompts/            Prompts del agente
  app/rag/                Chunking, embeddings, ingesta y retrieval
  app/repositories/       Acceso a datos
  app/schemas/            Contratos Pydantic
  app/services/           Logica de negocio
  app/tools/              Tools LangChain
```

## Flujo del Sistema

1. El usuario entra al frontend y crea una entrevista.
2. Sube CV en PDF y Job Description en PDF o TXT.
3. El backend extrae texto, limpia contenido y crea chunks.
4. OpenAI genera embeddings para cada chunk.
5. PostgreSQL + pgvector guarda los vectores y metadata.
6. El usuario inicia la entrevista por voz.
7. Cartesia genera audio de la pregunta inicial.
8. El candidato responde por microfono desde el navegador.
9. AssemblyAI transcribe el audio.
10. LangGraph ejecuta el workflow del agente entrevistador.
11. El agente usa retrieval RAG para adaptar preguntas y evaluaciones.
12. Cartesia genera audio de la siguiente respuesta/pregunta.
13. El reporte final se guarda en PostgreSQL y se muestra en el frontend.

## RAG y pgvector

El modulo RAG esta en `backend/app/rag`.

- `chunking.py`: limpia texto y divide documentos con `RecursiveCharacterTextSplitter`.
- `embeddings.py`: genera embeddings con `OpenAIEmbeddings`.
- `pipeline.py`: ingesta documentos despues del upload y evita duplicados.
- `retrieval.py`: permite busqueda semantica por `interview_id`, `source_type` y `top_k`.

Los vectores se guardan en la tabla `embeddings_metadata` usando una columna `vector(1536)`. La extension `vector` se activa automaticamente al iniciar PostgreSQL y tambien desde FastAPI en `init_db()`.

## LangGraph y Agente

El workflow esta en `backend/app/langgraph/interview_graph.py`.

Nodos principales:

- `load_interview_context`: carga entrevista, transcripciones y contexto RAG.
- `analyze_candidate_profile`: detecta skills y seniority inicial.
- `generate_question`: genera preguntas tecnicas adaptadas.
- `interview_conversation`: procesa la respuesta del candidato.
- `evaluate_answer`: evalua respuesta con salida estructurada.
- `decide_next_step`: decide continuar, profundizar o finalizar.
- `report_generation`: genera `InterviewReport` validado por Pydantic.
- `persist_results`: guarda estado, transcripciones y reporte.

Tools LangChain:

- `analyze_cv_skills_tool`
- `calculate_technical_score_tool`
- `detect_seniority_tool`
- `generate_feedback_tool`

## STT y TTS

- STT: `backend/app/audio/assemblyai_service.py`
  - Sube audio a AssemblyAI.
  - Solicita transcripcion.
  - Hace polling hasta completar.
  - Usa `ASSEMBLYAI_API_KEY`, `ASSEMBLYAI_SPEECH_MODEL`, `ASSEMBLYAI_LANGUAGE_CODE`, `ASSEMBLYAI_LANGUAGE_DETECTION`.

- TTS: `backend/app/audio/cartesia_service.py`
  - Envia texto a Cartesia `/tts/bytes`.
  - Devuelve audio WAV.
  - Usa `CARTESIA_API_KEY`, `CARTESIA_VOICE_ID`, `CARTESIA_MODEL_ID`, `CARTESIA_VERSION`.

Los audios generados y subidos se sirven desde:

```text
http://localhost:8000/storage/audio/{filename}
```

## Variables de Entorno

Copia `.env.example` a `.env` y completa las claves reales:

```bash
OPENAI_API_KEY=
ASSEMBLYAI_API_KEY=
CARTESIA_API_KEY=
CARTESIA_VOICE_ID=
CARTESIA_MODEL_ID=sonic-2
CARTESIA_VERSION=2026-03-01

DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/interviewer
NEXT_PUBLIC_API_URL=http://localhost:8000
PUBLIC_BACKEND_URL=http://localhost:8000
BACKEND_CORS_ORIGINS=http://localhost:3000,http://frontend:3000

ASSEMBLYAI_SPEECH_MODEL=best
ASSEMBLYAI_LANGUAGE_CODE=es
ASSEMBLYAI_LANGUAGE_DETECTION=false
ASSEMBLYAI_SAMPLE_RATE=16000
AUDIO_STORAGE_DIR=storage/audio
```

No guardes claves reales en Git.

## Instalacion Local

Backend local opcional:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend local:

```bash
cd frontend
npm install
npm run dev
```

## Ejecucion con Docker

Levantar todo:

```bash
docker compose up --build
```

Levantar solo backend y base de datos:

```bash
docker compose up --build postgres backend
```

Abrir:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:8000
Docs API: http://localhost:8000/docs
```

Detener:

```bash
docker compose down
```

Reiniciar base de datos desde cero:

```bash
docker compose down -v
docker compose up --build
```

## Endpoints Principales

Health:

```bash
GET /health
```

Entrevistas:

```bash
POST /interviews
GET /interviews
GET /interviews/{interview_id}
```

Uploads:

```bash
POST /upload/cv/{interview_id}
POST /upload/job/{interview_id}
```

RAG:

```bash
POST /rag/search/{interview_id}
POST /rag/reindex/{interview_id}
```

Entrevista por texto:

```bash
POST /interview/start/{interview_id}
POST /interview/message/{interview_id}
POST /interview/finalize/{interview_id}
GET  /interview/state/{interview_id}
```

Entrevista por voz:

```bash
POST /interview/audio/start/{interview_id}
POST /interview/audio/{interview_id}
```

Reportes y transcripciones:

```bash
GET /reports/{interview_id}
GET /transcripts/{interview_id}
```

## Pruebas Rapidas con curl

Crear entrevista:

```bash
curl -X POST http://localhost:8000/interviews \
  -H "Content-Type: application/json" \
  -d '{"user":{"name":"Demo User","email":"demo@example.com"},"candidate_name":"Ada Lovelace","job_title":"Backend Engineer"}'
```

Subir CV:

```bash
curl -X POST http://localhost:8000/upload/cv/{interview_id} \
  -F "file=@candidate-cv.pdf"
```

Subir Job Description:

```bash
curl -X POST http://localhost:8000/upload/job/{interview_id} \
  -F "file=@job-description.txt"
```

Buscar contexto RAG:

```bash
curl -X POST http://localhost:8000/rag/search/{interview_id} \
  -H "Content-Type: application/json" \
  -d '{"query":"experiencia con FastAPI, PostgreSQL y APIs","source_type":"cv","top_k":5}'
```

Iniciar voz:

```bash
curl -X POST http://localhost:8000/interview/audio/start/{interview_id}
```

Enviar audio:

```bash
curl -X POST http://localhost:8000/interview/audio/{interview_id} \
  -F "file=@answer.webm"
```

Finalizar:

```bash
curl -X POST http://localhost:8000/interview/finalize/{interview_id}
```

Ver reporte:

```bash
curl http://localhost:8000/reports/{interview_id}
```

## Como Hacer una Demo

Preparacion:

1. Verifica que `.env` tenga claves reales de OpenAI, AssemblyAI y Cartesia.
2. Verifica que `CARTESIA_VOICE_ID` tenga una voz valida.
3. Ten listo un CV PDF y un Job Description PDF o TXT.
4. Ejecuta `docker compose up --build`.
5. Abre `http://localhost:3000`.

Flujo visual:

1. Landing page: presentar el sistema.
2. Dashboard: mostrar historial de entrevistas.
3. Nueva entrevista: ingresar candidato y puesto.
4. Upload: subir CV y Job Description.
5. RAG: explicar que los documentos se dividen en chunks y se indexan con embeddings.
6. Entrevista: iniciar audio de la primera pregunta.
7. Microfono: responder por voz desde el navegador.
8. STT/TTS: mostrar transcripcion y audio generado.
9. Finalizar: generar reporte final.
10. Reporte: mostrar scores, radar chart, skills, fortalezas, debilidades y recomendacion.

## Guion para Demo

1. Presentar problema:
   "Las entrevistas tecnicas requieren tiempo, consistencia y evaluacion objetiva. Este sistema automatiza una entrevista tecnica por voz usando IA y documentos reales del candidato."

2. Explicar arquitectura:
   "El frontend esta hecho en Next.js 15. El backend usa FastAPI. PostgreSQL guarda entrevistas, documentos, transcripciones, reportes y embeddings. pgvector permite busqueda semantica."

3. Subir CV:
   "Aqui subo el CV del candidato. El backend extrae texto, lo limpia, lo divide en chunks y genera embeddings con OpenAI."

4. Subir Job Description:
   "Tambien subo el puesto. Esto permite que el agente pregunte sobre tecnologias y responsabilidades relevantes."

5. Iniciar entrevista:
   "Al iniciar, LangGraph carga contexto RAG, analiza perfil y genera la primera pregunta estructurada."

6. Responder por voz:
   "El navegador graba audio. AssemblyAI transcribe la respuesta. El texto entra al workflow del agente."

7. Mostrar siguiente pregunta:
   "El agente evalua la respuesta, decide si profundiza o avanza, y Cartesia convierte la respuesta a audio."

8. Mostrar reporte:
   "Al finalizar, el sistema genera un reporte validado con Pydantic: scores, seniority, fortalezas, debilidades, preguntas y recomendacion."

9. Explicar tecnologias:
   "El valor tecnico esta en la integracion: RAG con pgvector, LangGraph para estado y decisiones, tools para evaluacion, structured outputs para reportes confiables, y audio real con AssemblyAI y Cartesia."

## Posibles Problemas y Soluciones

- `CARTESIA_VOICE_ID is not configured`: agrega una voz valida en `.env`.
- `AssemblyAI returned an empty transcript`: prueba con audio mas claro o archivo WAV/WEBM.
- `OpenAI embeddings request failed`: revisa `OPENAI_API_KEY` y saldo/conectividad.
- El frontend no conecta al backend: revisa `NEXT_PUBLIC_API_URL=http://localhost:8000`.
- Error CORS: agrega el origen del frontend a `BACKEND_CORS_ORIGINS`.
- Tablas antiguas o columna vector faltante: ejecuta `docker compose down -v` y vuelve a levantar.
- Microfono no funciona: usa Chrome/Edge, permite permisos de microfono y usa `localhost`.
- Docker no actualiza cambios: ejecuta `docker compose up --build`.

## Espacio para Capturas

Agrega capturas en una carpeta `docs/screenshots/` si quieres incluir evidencia visual:

```text
docs/screenshots/landing.png
docs/screenshots/dashboard.png
docs/screenshots/new-interview.png
docs/screenshots/voice-interview.png
docs/screenshots/report.png
```

## Checklist Final

- [ ] Docker levanta con `docker compose up --build`.
- [ ] Frontend abre en `http://localhost:3000`.
- [ ] Backend responde `GET /health`.
- [ ] PostgreSQL conecta y crea tablas.
- [ ] Extension pgvector esta activa.
- [ ] Upload de CV funciona.
- [ ] Upload de Job Description funciona.
- [ ] RAG indexa chunks y embeddings.
- [ ] `/rag/search/{interview_id}` devuelve resultados.
- [ ] LangGraph genera primera pregunta.
- [ ] AssemblyAI transcribe audio.
- [ ] Cartesia genera audio.
- [ ] La entrevista guarda transcripciones.
- [ ] El reporte final aparece en `/reports/{interview_id}`.
- [ ] Dashboard muestra historial.

