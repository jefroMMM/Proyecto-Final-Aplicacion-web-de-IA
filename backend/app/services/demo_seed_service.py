from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.repositories import templates as template_repository
from app.utils.generate_demo_assets import SEEDS

logger = logging.getLogger(__name__)


async def seed_demo_templates_if_enabled() -> None:
    if not settings.SEED_DEMO_TEMPLATES:
        logger.info("Demo template seeding disabled by configuration")
        return

    async with AsyncSessionLocal() as session:
        await _seed_templates(session)


async def _seed_templates(session: AsyncSession) -> None:
    existing = await template_repository.list_templates(session)
    existing_titles = {item.title.strip().lower() for item in existing}

    created_count = 0
    for seed in SEEDS:
        if seed.title.strip().lower() in existing_titles:
            continue

        template = await template_repository.create_template(
            session,
            title=seed.title,
            description=seed.description,
            role_name=seed.role_name,
        )
        requirement_map = {}
        for requirement in seed.requirements:
            created_requirement = await template_repository.create_requirement(
                session,
                template_id=template.id,
                skill_name=requirement.skill_name,
                description=requirement.description,
                weight=requirement.weight,
            )
            requirement_map[requirement.skill_name.lower()] = created_requirement.id

        for question in seed.questions:
            requirement_id = requirement_map.get(question.requirement_skill.lower())
            await template_repository.create_question(
                session,
                template_id=template.id,
                requirement_id=requirement_id,
                question_text=question.question_text,
                expected_answer=question.expected_answer,
                difficulty=question.difficulty,
                points=question.points,
                is_required=question.is_required,
                order_index=question.order_index,
            )

        created_count += 1

    if created_count > 0:
        await session.commit()
        logger.info("Seeded %s demo templates", created_count)
    else:
        logger.info("Demo templates already present; no seeding needed")
