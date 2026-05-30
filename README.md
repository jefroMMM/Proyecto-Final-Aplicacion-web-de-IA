# AI Technical Interviewer Voice System

Plataforma universitaria full stack para entrevistas tecnicas por voz con IA.  
El flujo principal evalua respuestas a partir de texto transcrito (STT), no de audio almacenado.

## Objetivo

- Crear plantillas de entrevista por rol.
- Analizar CV contra requisitos y asignar puntaje inicial automatico.
- Ejecutar entrevista por voz (AssemblyAI -> texto -> evaluacion IA).
- Generar reporte final estructurado con puntajes y recomendacion.

## Stack

- Frontend: Next.js 15, TypeScript, TailwindCSS, shadcn/ui, Framer Motion.
- Backend: FastAPI, SQLAlchemy, Pydantic, PostgreSQL.
- IA: OpenAI (evaluacion y analisis).
- STT: AssemblyAI.
- TTS: Cartesia (opcional para voz del entrevistador).
- Vector DB: pgvector en PostgreSQL.
- Contenedores: Docker + Docker Compose.

## Arquitectura

- `frontend`: dashboard admin + UI de candidato.
- `backend/app/api`: rutas HTTP.
- `backend/app/services`: logica de negocio.
- `backend/app/repositories`: acceso a datos SQLAlchemy.
- `backend/app/models`: modelos de persistencia.
- `backend/app/audio`: STT/TTS y flujo de audio.
- `backend/app/rag`: indexacion y retrieval de documentos.
- `backend/app/prompts`: prompts para evaluacion IA.

## Flujo nuevo por plantillas

1. Admin crea plantilla (`title`, `description`, `role_name`).
2. Admin agrega requisitos (`skill_name`, `weight`) y preguntas (`points`, `difficulty`, `is_required`).
3. Admin crea entrevista usando `template_id`.
4. Admin sube CV.
5. Backend analiza CV contra requisitos y suma `0.5` por skill detectada.
6. Candidato abre `/candidate/interview/{interviewId}`.
7. Candidato responde por voz.
8. Backend transcribe con AssemblyAI.
9. Agente IA evalua texto y asigna score por pregunta:
   - `correct`: puntos completos
   - `partially_correct`: mitad
   - `incorrect` / `unknown`: 0
10. Si skill no aparecia en CV y responde correcto: `+0.5` bonus.
11. Se genera reporte final con score total y recomendacion.

## Sistema de puntaje

- `initial_cv_score`: 0.5 por requisito detectado en CV.
- `question_score`: acumulado por evaluacion de preguntas.
- `bonus_score`: 0.5 por skill demostrada en entrevista pero no detectada en CV.
- `final_score = initial_cv_score + question_score + bonus_score`.
- `max_score`: total esperado segun plantilla.

## Modelos principales nuevos

- `interview_templates`
- `template_requirements`
- `template_questions`
- `candidate_skill_matches`
- `interview_answers`

Se extendieron:
- `interviews` (template, email, puntajes, max score, cv_document_id)
- `reports` (final_score, max_score, percentage)

## Endpoints nuevos

### Plantillas
- `GET /templates`
- `POST /templates`
- `GET /templates/{template_id}`
- `PUT /templates/{template_id}`
- `DELETE /templates/{template_id}`

### Requisitos
- `POST /templates/{template_id}/requirements`
- `PUT /templates/requirements/{requirement_id}`
- `DELETE /templates/requirements/{requirement_id}`

### Preguntas
- `POST /templates/{template_id}/questions`
- `PUT /templates/questions/{question_id}`
- `DELETE /templates/questions/{question_id}`

### Entrevistas por plantilla
- `POST /interviews` (con `template_id`)
- `POST /interviews/{interview_id}/upload-cv`
- `POST /interviews/{interview_id}/analyze-cv`
- `POST /interviews/{interview_id}/start`
- `POST /interviews/{interview_id}/answer`
- `POST /interviews/{interview_id}/audio-answer`
- `POST /interviews/{interview_id}/finalize`
- `GET /interviews/{interview_id}/score`
- `GET /interviews/{interview_id}/report`

## UI nuevas

- Admin plantillas: `/dashboard/templates`
- Entrevistado: `/candidate/interview/[interviewId]`

## Variables de entorno

Usa `.env` (nunca subir claves reales):

- `OPENAI_API_KEY`
- `ASSEMBLYAI_API_KEY`
- `CARTESIA_API_KEY`
- `CARTESIA_VOICE_ID`
- `DATABASE_URL`
- `NEXT_PUBLIC_API_URL`
- `BACKEND_CORS_ORIGINS`

Referencia completa: `.env.example`.

## Levantar con Docker

```bash
docker compose up --build
```

Backend:
- [http://localhost:8000/health](http://localhost:8000/health)
- [http://localhost:8000/docs](http://localhost:8000/docs)

Frontend:
- [http://localhost:3000](http://localhost:3000)

Si `3000` esta ocupado:

```bash
# en .env
FRONTEND_PORT=3001
docker compose up --build
```

## Demo paso a paso

1. Abrir `/dashboard/templates`.
2. Crear plantilla, requisitos y preguntas.
3. Ir a `/interviews/new`.
4. Crear entrevista desde plantilla y subir CV.
5. Verificar analisis de CV.
6. Abrir enlace de candidato `/candidate/interview/{id}`.
7. Iniciar entrevista y responder por voz.
8. Finalizar y abrir reporte en `/reports/{id}`.

## Guion corto para exposicion

1. Problema: entrevistas subjetivas y sin estructura.
2. Arquitectura: Next.js + FastAPI + PostgreSQL + OpenAI + AssemblyAI.
3. Plantillas: estandarizacion por rol.
4. CV scoring: puntaje inicial con evidencia.
5. Voz a texto: evaluacion real sobre transcripcion.
6. Bonus: reconoce conocimiento no declarado en CV.
7. Reporte final: score total, fortalezas, debilidades, recomendacion.

## Troubleshooting rapido

- `502 Cartesia Unauthorized`: revisar `CARTESIA_API_KEY`.
- `404 /`: usar `/health` o `/docs`.
- `port 3000 in use`: cambiar `FRONTEND_PORT` o detener proceso local.
- sin score CV: verificar que la plantilla tenga requisitos y que el CV se haya subido/analisado.
