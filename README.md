# AI Technical Interviewer Voice System

Plataforma universitaria full stack para entrevistas tecnicas asistidas por IA, con flujo por plantillas, analisis de CV, evaluacion por preguntas y entrevista por voz.

## Objetivo universitario

Demostrar una arquitectura moderna de IA aplicada a reclutamiento tecnico:
- definicion de entrevistas por plantilla,
- evaluacion automatizada de habilidades,
- transcripcion de voz a texto en tiempo real,
- scoring estructurado y reporte final profesional.

## Stack tecnologico

- Frontend: Next.js 15, TypeScript, TailwindCSS, shadcn/ui, Framer Motion, Zustand
- Backend: FastAPI, Python 3.12, SQLAlchemy, Pydantic, LangChain, LangGraph
- Base de datos: PostgreSQL + pgvector
- IA: OpenAI
- STT: AssemblyAI
- TTS: Cartesia
- Infraestructura: Docker, Docker Compose

## Arquitectura general

- `frontend/`: UI del reclutador y UI del entrevistado.
- `backend/app/api`: rutas REST.
- `backend/app/services`: logica de negocio.
- `backend/app/repositories`: acceso a datos.
- `backend/app/models`: modelos SQLAlchemy.
- `backend/app/rag`: pipeline de embeddings y retrieval en pgvector.
- `backend/app/audio`: STT (AssemblyAI) y TTS (Cartesia).
- `backend/app/langgraph` + `backend/app/agents`: workflow de entrevista y evaluacion.

## Flujo basado en plantillas

1. Reclutador crea plantilla (`title`, `description`, `role_name`).
2. Agrega requisitos (skills) y preguntas con puntos/dificultad.
3. Crea entrevista desde plantilla.
4. Sube CV del candidato.
5. Ejecuta analisis de CV contra requisitos.
6. Inicia entrevista (texto o voz).
7. El sistema evalua cada respuesta y acumula score.
8. Finaliza entrevista y genera reporte estructurado.

## Sistema de puntos

- CV score inicial: `+0.5` por cada requisito detectado en CV.
- Preguntas:
  - `correct`: puntos completos
  - `partially_correct`: mitad de puntos
  - `incorrect` y `unknown`: 0
- Bonus: `+0.5` si una skill no detectada en CV se demuestra correctamente en respuesta.

## Analisis de CV

- Se extrae texto del CV (PDF).
- Se compara contra requisitos con salida estructurada.
- Se guarda evidencia en `candidate_skill_matches`.
- Se actualiza `initial_cv_score` en `interviews`.

## Evaluacion por preguntas

- Orden por `order_index`.
- Sin repetir preguntas contestadas.
- Persistencia en `interview_answers`.
- Scoring incremental (`question_score`, `bonus_score`, `final_score`).

## Flujo voz a texto

1. Frontend graba audio temporal.
2. Backend recibe `multipart/form-data`.
3. AssemblyAI transcribe a texto.
4. El texto se evalua (dato principal).
5. Se devuelve evaluacion + siguiente pregunta.

Nota: la evaluacion se basa en texto transcrito, no en audio crudo.

## UI del reclutador

- Templates: crear/editar/eliminar plantilla, requisitos y preguntas.
- Interviews: crear entrevista, subir CV, analizar CV, monitorear score.
- Reports: score final, porcentaje, skills detectadas/faltantes, feedback por pregunta.

## UI del entrevistado

Ruta:
- `/candidate/interview/[interviewId]`

Incluye:
- bienvenida e instrucciones,
- pregunta actual,
- grabacion por microfono,
- estados visuales (escuchando/transcribiendo/analizando),
- timeline y progreso,
- pantalla final al terminar.

## Reporte final

Incluye:
- candidate_name, role_name, template_title
- detected_cv_skills, missing_cv_skills
- questions_answered, answer_evaluations
- initial_cv_score, question_score, bonus_score, final_score, max_score, percentage
- strengths, weaknesses, recommendation, final_summary

Recomendacion:
- `highly_recommended`
- `recommended`
- `needs_review`
- `not_recommended`

## Variables de entorno

Definir en `.env` (usar `.env.example` como base):

- `OPENAI_API_KEY`
- `ASSEMBLYAI_API_KEY`
- `CARTESIA_API_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_API_URL`
- `ASSEMBLYAI_SPEECH_MODEL`
- `ASSEMBLYAI_LANGUAGE_CODE`
- `ASSEMBLYAI_LANGUAGE_DETECTION`
- `ASSEMBLYAI_SAMPLE_RATE`

Variables adicionales recomendadas:
- `BACKEND_CORS_ORIGINS`
- `PUBLIC_BACKEND_URL`
- `CARTESIA_VOICE_ID`
- `FRONTEND_PORT`

## Instalacion y ejecucion con Docker

1. Copiar variables:
```bash
cp .env.example .env
```

2. Levantar servicios:
```bash
docker compose up --build
```

Servicios esperados:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

## Endpoints principales

### Plantillas
- `GET /templates`
- `POST /templates`
- `GET /templates/{template_id}`
- `PUT /templates/{template_id}`
- `DELETE /templates/{template_id}`
- `POST /templates/{template_id}/requirements`
- `PUT /templates/requirements/{requirement_id}`
- `DELETE /templates/requirements/{requirement_id}`
- `POST /templates/{template_id}/questions`
- `PUT /templates/questions/{question_id}`
- `DELETE /templates/questions/{question_id}`

### Entrevistas
- `POST /interviews`
- `POST /interviews/{interview_id}/upload-cv`
- `POST /interviews/{interview_id}/analyze-cv`
- `POST /interviews/{interview_id}/start`
- `POST /interviews/{interview_id}/answer`
- `POST /interviews/{interview_id}/audio-answer`
- `GET /interviews/{interview_id}/score`
- `POST /interviews/{interview_id}/finalize`
- `GET /interviews/{interview_id}/report`

### Salud
- `GET /health`

## Estructura del proyecto

```text
/frontend
/backend
  /app
    /api
    /core
    /db
    /models
    /schemas
    /services
    /rag
    /agents
    /langgraph
    /tools
    /audio
    /prompts
    /utils
/docker-compose.yml
/.env.example
```

## Como hacer demo (flujo)

1. Abrir frontend en `http://localhost:3000`.
2. Ir a templates y crear plantilla.
3. Agregar requisitos y preguntas.
4. Crear entrevista desde plantilla.
5. Subir CV del candidato.
6. Ejecutar analisis de CV.
7. Abrir UI del entrevistado con el link de entrevista.
8. Iniciar entrevista.
9. Responder por voz (microfono habilitado).
10. Mostrar transcripcion y avance de score.
11. Finalizar entrevista.
12. Mostrar reporte final en dashboard.

## Guion para demo universitaria

1. Problema:
   - entrevistas tecnicas manuales consumen tiempo y tienen sesgos de evaluacion.
2. Arquitectura:
   - frontend Next.js + backend FastAPI + PostgreSQL/pgvector + OpenAI + AssemblyAI + Cartesia.
3. Plantillas:
   - crear plantilla del puesto, requisitos y preguntas con puntaje.
4. CV:
   - subir CV y ejecutar analisis automatico de skills.
5. Entrevista:
   - abrir vista del entrevistado e iniciar.
6. Voz:
   - responder por microfono, transcripcion en tiempo real, evaluacion estructurada.
7. Scoring:
   - mostrar score por CV, score por preguntas y bonus.
8. Cierre:
   - finalizar entrevista y revisar reporte profesional.
9. Valor tecnico:
   - pipeline modular, persistencia completa y trazabilidad de evaluacion.

## Problemas comunes y soluciones

1. `Cartesia ... Invalid credentials`:
   - revisar `CARTESIA_API_KEY` en `.env` y recrear contenedores.

2. `No se pudo iniciar entrevista`:
   - validar que la entrevista tenga plantilla y preguntas.

3. Puerto `3000` ocupado:
   - cambiar `FRONTEND_PORT` en `.env` (ejemplo `3001`) y reiniciar.

4. CORS:
   - agregar origen en `BACKEND_CORS_ORIGINS`.

5. Base de datos sucia para demo desde cero:
```bash
docker compose down -v
docker compose up --build
```

6. Lint con miles de errores en `.next`:
   - ya corregido ignorando build artifacts en ESLint.

## Capturas / screenshots

Agregar aqui antes de la entrega final:
- Dashboard templates
- Creacion de entrevista
- UI entrevistado en voz
- Reporte final

## Checklist final

- [ ] Docker levanta
- [ ] Frontend abre
- [ ] Backend responde (`/health`)
- [ ] Base de datos conecta
- [ ] Plantillas funcionan
- [ ] CV se analiza
- [ ] Sistema de puntos funciona
- [ ] Audio se transcribe (AssemblyAI)
- [ ] Agente evalua respuestas
- [ ] Reporte final aparece

