from typing import Literal


RubricLevel = Literal["junior", "mid", "senior"]


def rubric_for_level(level: RubricLevel) -> str:
    rubrics = {
        "junior": "Evaluate fundamentals, communication, and problem decomposition.",
        "mid": "Evaluate design tradeoffs, debugging, delivery judgment, and depth.",
        "senior": "Evaluate architecture, leadership, risk management, and mentoring.",
    }
    return rubrics[level]
