# Levantar Proyecto

## 1. Preparar variables de entorno

Desde la raiz del proyecto:

```powershell
cd C:\Users\JefroMM\tareasIA2026\Proyecto
Copy-Item .env.example .env
```

Edita `.env` y coloca tus claves reales:

```env
OPENAI_API_KEY=
ASSEMBLYAI_API_KEY=
CARTESIA_API_KEY=
CARTESIA_VOICE_ID=
```

Verifica tambien:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/interviewer
NEXT_PUBLIC_API_URL=http://localhost:8000
PUBLIC_BACKEND_URL=http://localhost:8000
BACKEND_CORS_ORIGINS=http://localhost:3000,http://frontend:3000
```

## 2. Levantar con Docker

Abre Docker Desktop y espera a que este corriendo.

Luego ejecuta:

```powershell
docker compose up --build
```

Cuando termine de levantar, abre:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:8000
Docs API: http://localhost:8000/docs
```

Para probar que el backend responde:

```powershell
curl http://localhost:8000/health
```

## 3. Flujo para que funcione

1. Entra a `http://localhost:3000`.
2. Haz clic en `Start Interview`.
3. Crea una nueva entrevista.
4. Ingresa:
   - nombre del candidato
   - puesto
   - nombre del entrevistador
   - email del entrevistador
5. Sube el CV del candidato en PDF.
6. Sube el Job Description en PDF o TXT.
7. Presiona `Create and index`.
8. Espera a que ambos archivos aparezcan como indexados.
9. Presiona `Start interview`.
10. En la pantalla de entrevista, presiona `Start interview`.
11. Escucha la primera pregunta generada por Cartesia.
12. Presiona `Record`.
13. Responde por microfono.
14. Presiona `Stop`.
15. Espera a que:
    - AssemblyAI transcriba tu audio
    - LangGraph genere la siguiente pregunta
    - Cartesia genere el audio de respuesta
16. Repite el proceso de grabar y responder.
17. Cuando quieras terminar, presiona `Finalize`.
18. Abre el reporte final en `/reports/{interview_id}`.

## 4. Si algo falla

Si Docker no levanta:

```powershell
docker compose down
docker compose up --build
```

Si la base de datos quedo con tablas antiguas:

```powershell
docker compose down -v
docker compose up --build
```

Si no se genera audio:

- revisa `CARTESIA_API_KEY`
- revisa `CARTESIA_VOICE_ID`

Si no transcribe audio:

- revisa `ASSEMBLYAI_API_KEY`
- permite el uso del microfono en el navegador
- usa Chrome o Edge

Si no genera preguntas o embeddings:

- revisa `OPENAI_API_KEY`
- verifica conexion a internet

