from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from textwrap import wrap


@dataclass(frozen=True)
class RequirementSeed:
    skill_name: str
    description: str
    weight: float = 1.0


@dataclass(frozen=True)
class QuestionSeed:
    question_text: str
    expected_answer: str
    requirement_skill: str
    difficulty: str
    points: float
    is_required: bool
    order_index: int


@dataclass(frozen=True)
class TemplateSeed:
    title: str
    description: str
    role_name: str
    requirements: list[RequirementSeed]
    questions: list[QuestionSeed]
    cv_match_text: str
    cv_non_match_text: str


SEEDS: list[TemplateSeed] = [
    TemplateSeed(
        title="Entrevista Backend Developer Junior",
        description="Evaluacion tecnica para desarrollo backend con Python, APIs y bases de datos.",
        role_name="Backend Developer Junior",
        requirements=[
            RequirementSeed("Python", "Fundamentos del lenguaje y buenas practicas."),
            RequirementSeed("FastAPI", "Creacion de APIs y validacion con Pydantic."),
            RequirementSeed("PostgreSQL", "Modelado basico, queries, joins e indices."),
            RequirementSeed("Docker", "Contenerizacion y despliegue local."),
            RequirementSeed("Git", "Flujo colaborativo con ramas y PRs."),
            RequirementSeed("REST APIs", "Diseno de endpoints y metodos HTTP."),
        ],
        questions=[
            QuestionSeed("Explica que es Python y como lo usaste en backend.", "Debe mencionar APIs o servicios backend.", "Python", "easy", 1, True, 0),
            QuestionSeed("Como conectar FastAPI con PostgreSQL usando SQLAlchemy?", "Sesion, modelos y manejo de transacciones.", "PostgreSQL", "medium", 1.5, True, 1),
            QuestionSeed("Que diferencia hay entre GET y POST en REST?", "GET consulta, POST crea recurso.", "REST APIs", "easy", 1, True, 2),
            QuestionSeed("Para que sirve Docker en un proyecto backend?", "Entorno reproducible y despliegue consistente.", "Docker", "easy", 1, True, 3),
            QuestionSeed("Como usar Git para trabajo en equipo?", "Ramas, commits claros y pull requests.", "Git", "easy", 1, True, 4),
        ],
        cv_match_text="""Juan Perez
Backend Developer Junior
Resumen de skills alineadas al puesto:
Python: desarrollo backend y buenas practicas.
FastAPI: creacion de APIs y validacion con Pydantic.
PostgreSQL: modelado basico, queries, joins e indices.
Docker: contenerizacion y despliegue local.
Git: flujo colaborativo con ramas y PRs.
REST APIs: diseno de endpoints y metodos HTTP.
""",
        cv_non_match_text="""Carlos Lopez
Soporte Tecnico
Experiencia: instalacion de sistemas operativos, soporte a usuarios y mantenimiento de equipos.
Conocimientos basicos de ofimatica y redes.
No ha trabajado con APIs backend ni bases de datos relacionales.
""",
    ),
    TemplateSeed(
        title="Entrevista Frontend React Developer",
        description="Evaluacion tecnica para frontend moderno con React y TypeScript.",
        role_name="Frontend React Developer",
        requirements=[
            RequirementSeed("JavaScript", "Fundamentos del lenguaje y asincronia."),
            RequirementSeed("TypeScript", "Tipos, interfaces y seguridad de tipos."),
            RequirementSeed("React", "Componentes, hooks y estado."),
            RequirementSeed("Next.js", "Ruteo, renderizado y estructura de proyecto."),
            RequirementSeed("CSS/Tailwind", "Estilos responsivos y buenas practicas."),
            RequirementSeed("Testing", "Pruebas unitarias y de interfaz."),
        ],
        questions=[
            QuestionSeed("Que ventajas te da TypeScript en un frontend grande?", "Seguridad de tipos y mantenibilidad.", "TypeScript", "medium", 1.5, True, 0),
            QuestionSeed("Como manejas estado global en React?", "Context, Zustand, Redux segun caso.", "React", "medium", 1.5, True, 1),
            QuestionSeed("Cuando usar SSR o SSG en Next.js?", "Decidir por SEO, performance y frescura de datos.", "Next.js", "hard", 2, True, 2),
            QuestionSeed("Como aseguras UI responsive con Tailwind?", "Breakpoints y layout adaptativo.", "CSS/Tailwind", "easy", 1, True, 3),
            QuestionSeed("Que pruebas harias para un formulario critico?", "Unitarias, integracion y edge cases.", "Testing", "medium", 1, True, 4),
        ],
        cv_match_text="""Maria Rodriguez
Frontend React Developer
Resumen de skills alineadas al puesto:
JavaScript: fundamentos del lenguaje y asincronia.
TypeScript: tipos, interfaces y seguridad de tipos.
React: componentes, hooks y estado.
Next.js: ruteo, renderizado y estructura de proyecto.
CSS/Tailwind: estilos responsivos y buenas practicas.
Testing: pruebas unitarias y de interfaz.
""",
        cv_non_match_text="""Luis Herrera
Disenador Grafico
Experiencia principal en Adobe Illustrator y Photoshop.
Diseno de piezas visuales para redes sociales.
No tiene experiencia desarrollando aplicaciones con React ni TypeScript.
""",
    ),
    TemplateSeed(
        title="Entrevista Data Analyst Junior",
        description="Evaluacion para analisis de datos con SQL, Python y visualizacion.",
        role_name="Data Analyst Junior",
        requirements=[
            RequirementSeed("SQL", "Consultas, joins, agregaciones y limpieza."),
            RequirementSeed("Python", "Pandas para transformacion de datos."),
            RequirementSeed("Power BI", "Dashboards y KPIs."),
            RequirementSeed("Excel", "Formulas, tablas dinamicas y analisis."),
            RequirementSeed("Estadistica", "Medidas descriptivas e inferencia basica."),
        ],
        questions=[
            QuestionSeed("Como limpiarias un dataset con valores nulos?", "Estrategia de imputacion o descarte justificado.", "Python", "medium", 1.5, True, 0),
            QuestionSeed("Cuando usar INNER JOIN vs LEFT JOIN?", "Definir comportamiento por necesidad de filas.", "SQL", "medium", 1.5, True, 1),
            QuestionSeed("Que KPIs pondrias en un dashboard comercial?", "Ventas, conversion, ticket promedio.", "Power BI", "easy", 1, True, 2),
            QuestionSeed("Como validarias conclusiones estadisticas basicas?", "Revisar distribucion, sesgo y tamano muestral.", "Estadistica", "medium", 1, True, 3),
        ],
        cv_match_text="""Ana Morales
Data Analyst Junior
Resumen de skills alineadas al puesto:
SQL: consultas, joins, agregaciones y limpieza.
Python: pandas para transformacion de datos.
Power BI: dashboards y KPIs.
Excel: formulas, tablas dinamicas y analisis.
Estadistica: medidas descriptivas e inferencia basica.
""",
        cv_non_match_text="""Pedro Castillo
Asistente Administrativo
Manejo de agenda, redaccion de correos y seguimiento de compras.
Uso de Excel basico para listas y control interno.
No experiencia en SQL, Python ni dashboards de BI.
""",
    ),
    TemplateSeed(
        title="Entrevista DevOps Junior",
        description="Evaluacion para perfil DevOps con CI/CD, contenedores y cloud basico.",
        role_name="DevOps Junior",
        requirements=[
            RequirementSeed("Linux", "Comandos, procesos y permisos."),
            RequirementSeed("Docker", "Imagenes, contenedores y redes."),
            RequirementSeed("CI/CD", "Pipelines de build, test y deploy."),
            RequirementSeed("Cloud", "Servicios basicos de AWS/Azure/GCP."),
            RequirementSeed("Monitoring", "Observabilidad y alertas."),
        ],
        questions=[
            QuestionSeed("Que comandos Linux usas para diagnosticar un servicio caido?", "ps, journalctl, netstat/ss, logs.", "Linux", "medium", 1.5, True, 0),
            QuestionSeed("Como optimizarias un Dockerfile?", "Capas, imagen base ligera, cache.", "Docker", "medium", 1.5, True, 1),
            QuestionSeed("Que etapas incluirias en un pipeline CI/CD?", "build, test, quality gates, deploy.", "CI/CD", "medium", 1.5, True, 2),
            QuestionSeed("Que monitorearias en produccion?", "latencia, errores, CPU, memoria y alertas.", "Monitoring", "easy", 1, True, 3),
        ],
        cv_match_text="""Sofia Ramirez
DevOps Junior
Resumen de skills alineadas al puesto:
Linux: comandos, procesos y permisos.
Docker: imagenes, contenedores y redes.
CI/CD: pipelines de build, test y deploy.
Cloud: servicios basicos de AWS, Azure y GCP.
Monitoring: observabilidad y alertas.
""",
        cv_non_match_text="""Miguel Ortega
Tester Manual
Ejecucion de casos de prueba funcionales y reporte de bugs.
Manejo de herramientas de seguimiento (Jira).
No tiene experiencia con Linux administracion, Docker ni pipelines CI/CD.
""",
    ),
]


def slugify(value: str) -> str:
    return (
        value.lower()
        .replace(" ", "-")
        .replace("/", "-")
        .replace(".", "")
        .replace(",", "")
    )


def escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def generate_simple_pdf(path: Path, lines: list[str]) -> None:
    wrapped: list[str] = []
    for line in lines:
        wrapped.extend(wrap(line, width=92) if line else [""])

    content_lines = ["BT", "/F1 11 Tf", "72 790 Td", "14 TL"]
    for idx, line in enumerate(wrapped):
        escaped = escape_pdf_text(line)
        if idx == 0:
            content_lines.append(f"({escaped}) Tj")
        else:
            content_lines.append(f"T* ({escaped}) Tj")
    content_lines.append("ET")
    content_stream = "\n".join(content_lines).encode("latin-1", errors="replace")

    objects = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
        b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
        f"5 0 obj << /Length {len(content_stream)} >> stream\n".encode("latin-1")
        + content_stream
        + b"\nendstream endobj\n",
    ]

    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    offsets: list[int] = []
    body = b""
    current = len(header)
    for obj in objects:
        offsets.append(current)
        body += obj
        current += len(obj)

    xref_start = len(header) + len(body)
    xref = [b"xref\n", f"0 {len(objects) + 1}\n".encode("latin-1"), b"0000000000 65535 f \n"]
    xref.extend(f"{offset:010d} 00000 n \n".encode("latin-1") for offset in offsets)

    trailer = (
        b"trailer\n"
        + f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n".encode("latin-1")
        + b"startxref\n"
        + f"{xref_start}\n".encode("latin-1")
        + b"%%EOF\n"
    )

    path.write_bytes(header + body + b"".join(xref) + trailer)


def build_template_payload(seed: TemplateSeed) -> dict:
    requirement_items = [
        {
            "skill_name": req.skill_name,
            "description": req.description,
            "weight": req.weight,
        }
        for req in seed.requirements
    ]
    requirement_map = {req.skill_name: f"__REQ__{idx}" for idx, req in enumerate(seed.requirements)}

    question_items = [
        {
            "question_text": q.question_text,
            "expected_answer": q.expected_answer,
            "difficulty": q.difficulty,
            "points": q.points,
            "is_required": q.is_required,
            "order_index": q.order_index,
            "requirement_ref": requirement_map[q.requirement_skill],
        }
        for q in seed.questions
    ]

    return {
        "title": seed.title,
        "description": seed.description,
        "role_name": seed.role_name,
        "requirements": requirement_items,
        "questions": question_items,
    }


def generate_assets(output_dir: Path) -> None:
    templates_dir = output_dir / "templates"
    cvs_dir = output_dir / "cvs"
    templates_dir.mkdir(parents=True, exist_ok=True)
    cvs_dir.mkdir(parents=True, exist_ok=True)

    template_payloads: list[dict] = []

    for idx, seed in enumerate(SEEDS, start=1):
        slug = slugify(seed.role_name)
        template_payloads.append(build_template_payload(seed))

        match_pdf = cvs_dir / f"{idx:02d}-{slug}-cv-match.pdf"
        non_match_pdf = cvs_dir / f"{idx:02d}-{slug}-cv-non-match.pdf"

        generate_simple_pdf(
            match_pdf,
            [
                f"CV Demo - {seed.role_name} (MATCH)",
                "",
                *seed.cv_match_text.strip().splitlines(),
            ],
        )
        generate_simple_pdf(
            non_match_pdf,
            [
                f"CV Demo - {seed.role_name} (NON MATCH)",
                "",
                *seed.cv_non_match_text.strip().splitlines(),
            ],
        )

    templates_path = templates_dir / "template-seeds.json"
    templates_path.write_text(
        json.dumps({"templates": template_payloads}, ensure_ascii=True, indent=2),
        encoding="utf-8",
    )

    usage_path = output_dir / "README-DEMO-ASSETS.md"
    usage_path.write_text(
        "\n".join(
            [
                "# Demo Assets",
                "",
                "Este paquete fue generado automaticamente para pruebas del sistema.",
                "",
                "## Contenido",
                "- templates/template-seeds.json",
                "- cvs/*.pdf (2 CVs por plantilla: match y non-match)",
                "",
                "## Flujo sugerido",
                "1. Crear plantilla desde frontend con cada objeto de templates/template-seeds.json.",
                "2. Crear entrevista desde cada plantilla.",
                "3. Subir un CV '*-match.pdf' para validar puntaje inicial alto.",
                "4. Subir un CV '*-non-match.pdf' para validar puntaje inicial bajo.",
                "5. Continuar con entrevista por voz y reporte final.",
            ]
        ),
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Genera plantillas demo y CVs PDF (match/no-match) para AI Technical Interviewer Voice System."
    )
    parser.add_argument(
        "--output",
        default="demo-assets",
        help="Directorio de salida (por defecto: demo-assets).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output).resolve()
    generate_assets(output_dir)
    print(f"Demo assets generados en: {output_dir}")


if __name__ == "__main__":
    main()
