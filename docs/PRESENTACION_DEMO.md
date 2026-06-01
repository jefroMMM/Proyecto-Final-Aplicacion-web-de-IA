# Presentacion y Demo

## 1. Problema

- Las entrevistas tecnicas manuales son lentas y poco consistentes.
- Los entrevistadores deben leer CV, comparar requisitos, hacer preguntas y resumir resultados.
- El proyecto automatiza ese flujo con IA, voz y evaluacion estructurada.

## 2. Objetivo

- Crear una plataforma web para entrevistas tecnicas asistidas por IA.
- Usar CV y descripcion del puesto para generar preguntas relevantes.
- Ejecutar entrevista por voz y producir un reporte final validado.

## 3. Arquitectura

- Frontend: Next.js para entrevistador y candidato.
- Backend: FastAPI con servicios separados.
- Base de datos: PostgreSQL + pgvector.
- IA: OpenAI para LLM y embeddings.
- Voz: AssemblyAI para STT y Cartesia/Web Speech para TTS.
- Orquestacion: LangGraph con estado persistido.

## 4. Componentes del Curso

- LLM: generacion de preguntas, evaluacion y reporte.
- Structured output: modelos Pydantic para perfil, pregunta, evaluacion, decision y reporte.
- Tool calling: tools para detectar skills, calcular score, seniority y feedback.
- RAG: recuperacion de contexto desde CV y vacante.
- Embeddings y vector search: OpenAI embeddings + pgvector.
- Agentes/workflows con estado: LangGraph + `workflow_states`.
- STT/TTS: transcripcion y voz para entrevista.

## 5. Demo

1. Abrir `http://localhost:3000`.
2. Crear o seleccionar una entrevista.
3. Cargar CV en PDF.
4. Cargar descripcion de puesto en PDF o TXT.
5. Confirmar que el sistema indexa documentos.
6. Iniciar entrevista.
7. Responder por microfono.
8. Mostrar transcripcion y siguiente pregunta.
9. Finalizar entrevista.
10. Abrir reporte final con score, fortalezas, debilidades y recomendacion.

## 6. Retos

- Coordinar audio, transcripcion, LLM y persistencia en un flujo estable.
- Mantener respuestas del LLM en esquemas validados.
- Hacer retrieval separado para CV y vacante.
- Evitar que el agente pierda contexto durante la entrevista.

## 7. Aprendizajes

- LangGraph ayuda a dividir procesos agenticos en nodos verificables.
- RAG mejora la relevancia de preguntas y evaluaciones.
- Structured outputs reducen errores al generar reportes.
- La persistencia del estado es clave para entrevistas largas o recuperables.

## 8. Cierre

El proyecto integra frontend, backend, voz, LLM, structured output, tool calling, RAG, embeddings, vector search y workflow con estado para resolver un caso realista de entrevistas tecnicas.
