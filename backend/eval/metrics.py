"""
RAGAS-based metric adapters for CareerPulse interview question evaluation.
Supports ragas 0.4.x.

Two adapted metrics:
  - cv_faithfulness   : generated question references only CV facts (no hallucination)
  - jd_relevancy      : generated question probes JD requirements

RAGAS field mapping:
  RAGAS field          | Our meaning
  -------------------- | ------------------------------------------
  user_input           | JD requirements summary (what to probe)
  retrieved_contexts   | [cv_content]  (grounding source for faithfulness)
  response             | generated interview question (agent output)
"""
from __future__ import annotations

import os
from typing import List


def _build_ragas_metrics():
    """Return (faithfulness_metric, relevancy_metric) wired to gpt-4o-mini."""
    from ragas.llms import LangchainLLMWrapper
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from ragas.metrics.collections import Faithfulness, AnswerRelevancy
    from langchain_openai import ChatOpenAI, OpenAIEmbeddings

    api_key = os.getenv("OPENAI_API_KEY")
    llm = LangchainLLMWrapper(ChatOpenAI(model="gpt-4o-mini", api_key=api_key))
    emb = LangchainEmbeddingsWrapper(OpenAIEmbeddings(model="text-embedding-3-small", api_key=api_key))
    return Faithfulness(llm=llm), AnswerRelevancy(llm=llm, embeddings=emb)


def _make_user_input(jd_content: str, phase: str, interview_type: str) -> str:
    """Convert JD + phase to a natural RAGAS user_input."""
    return (
        f"Generate a {interview_type} interview question for the '{phase}' phase "
        f"that probes the requirements in this job description:\n\n{jd_content[:1500]}"
    )


async def score_faithfulness(
    generated_questions: List[str],
    cv_content: str,
    jd_content: str,
    phase: str,
    interview_type: str,
) -> float:
    """
    CV Faithfulness: fraction of claims in generated questions supported by the CV.
    Returns 0.0–1.0 (average across questions).
    """
    if not generated_questions:
        return 0.0

    faithfulness_metric, _ = _build_ragas_metrics()
    user_input = _make_user_input(jd_content, phase, interview_type)

    scores = []
    for question in generated_questions:
        result = await faithfulness_metric.ascore(
            user_input=user_input,
            response=question,
            retrieved_contexts=[cv_content],
        )
        scores.append(float(result.value))

    return round(sum(scores) / len(scores), 4)


async def score_jd_relevancy(
    generated_questions: List[str],
    cv_content: str,
    jd_content: str,
    phase: str,
    interview_type: str,
) -> float:
    """
    JD Relevancy: whether generated questions probe JD requirements.
    Returns 0.0–1.0 (average across questions).
    """
    if not generated_questions:
        return 0.0

    _, relevancy_metric = _build_ragas_metrics()
    user_input = _make_user_input(jd_content, phase, interview_type)

    scores = []
    for question in generated_questions:
        result = await relevancy_metric.ascore(
            user_input=user_input,
            response=question,
        )
        scores.append(float(result.value))

    return round(sum(scores) / len(scores), 4)


async def score_sample(
    generated_questions: List[str],
    cv_content: str,
    jd_content: str,
    phase: str,
    interview_type: str,
) -> dict:
    """Run both metrics on a single golden dataset sample. Returns score dict."""
    faithfulness = await score_faithfulness(
        generated_questions, cv_content, jd_content, phase, interview_type
    )
    relevancy = await score_jd_relevancy(
        generated_questions, cv_content, jd_content, phase, interview_type
    )
    return {
        "cv_faithfulness": faithfulness,
        "jd_relevancy": relevancy,
        "avg": round((faithfulness + relevancy) / 2, 4),
    }
