import json
import urllib.parse
import urllib.request

from backend.core.config import settings
from backend.models.snomed import SnomedDescription
from langchain_openai import ChatOpenAI
from pydantic import SecretStr
from sqlalchemy import select
from sqlalchemy.orm import Session


def suggest_snomed_term(query: str, db: Session) -> tuple[str, str]:
    if not settings.openrouter_api_key_lookup:
        raise ValueError("OpenRouter API key missing.")

    snomed_llm = ChatOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=SecretStr(settings.openrouter_api_key_lookup),
        model=settings.openrouter_model_lookup,
    )

    prompt_text = f"""You are a medical terminology translator. Translate the following user query into the exact, canonical English SNOMED CT term name.
Query: '{query}'
Respond ONLY with the exact English term, nothing else. Do not use quotes or markdown."""

    response = snomed_llm.invoke(prompt_text)
    canonical_term = str(response.content).strip()

    # Strip quotes if the LLM adds them
    if canonical_term.startswith('"') and canonical_term.endswith('"'):
        canonical_term = canonical_term[1:-1]
    if canonical_term.startswith("'") and canonical_term.endswith("'"):
        canonical_term = canonical_term[1:-1]

    # Query the local database using pg_trgm similarity
    result = None
    db_error = False
    try:
        stmt = (
            select(SnomedDescription)
            .where(SnomedDescription.active == True)
            .order_by(SnomedDescription.term.op("<->")(canonical_term))
            .limit(1)
        )
        result = db.execute(stmt).scalars().first()
    except Exception as e:
        print(f"Warning: Local DB query failed ({e}). Falling back to CSIRO API.")
        db_error = True

    if db_error:
        print(f"Local DB miss for '{canonical_term}'. Falling back to CSIRO API.")
        encoded_term = urllib.parse.quote(canonical_term)
        url = f"https://tx.ontoserver.csiro.au/fhir/ValueSet/$expand?url=http://snomed.info/sct?fhir_vs&filter={encoded_term}&count=1"

        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        expansion = data.get("expansion", {})
        contains = expansion.get("contains", [])

        valid_concept = None
        for concept in contains:
            if concept.get("inactive") is True:
                continue
            valid_concept = concept
            break

        if not valid_concept:
            raise ValueError(
                f"No active SNOMED concept found for term: {canonical_term}"
            )

        return str(valid_concept["code"]), valid_concept["display"]
    else:
        if not result:
            raise ValueError(
                f"No active SNOMED concept found for term: {canonical_term}"
            )
        return str(result.concept_id), result.term


def auto_link_terms(body: str, db: Session) -> dict[str, str]:
    if not settings.openrouter_api_key_lookup:
        raise ValueError("OpenRouter API key missing.")

    snomed_llm = ChatOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=SecretStr(settings.openrouter_api_key_lookup),
        model=settings.openrouter_model_lookup,
        temperature=0.0,
    )

    prompt_text = f"""You are a medical terminology extraction system. 
Analyze the following markdown text and extract clinically significant terms (abbreviations, diseases, drugs, procedures). 
For each extracted term, predict the exact, canonical English SNOMED CT term name.
Limit to at most 10 key terms.
Output ONLY a valid JSON array of objects with keys "original_text" and "canonical_snomed_term".
Do not wrap in markdown blocks, just return raw JSON.

Text:
{body[:4000]}
"""

    response = snomed_llm.invoke(prompt_text)
    content = str(response.content).strip()

    try:
        if content.startswith("```json"):
            content = content[7:-3]
        elif content.startswith("```"):
            content = content[3:-3]
        extracted_terms = json.loads(content.strip())
    except json.JSONDecodeError:
        print(f"Failed to parse LLM output: {content}")
        extracted_terms = []

    final_links = {}
    for item in extracted_terms:
        orig = item.get("original_text")
        canon = item.get("canonical_snomed_term")
        if not orig or not canon:
            continue

        try:
            result = None
            db_error = False
            try:
                stmt = (
                    select(SnomedDescription)
                    .where(SnomedDescription.active == True)
                    .order_by(SnomedDescription.term.op("<->")(canon))
                    .limit(1)
                )
                result = db.execute(stmt).scalars().first()
            except Exception as db_e:
                print(f"Local DB query failed for {canon}: {db_e}")
                db_error = True

            if db_error:
                # Fallback to CSIRO API
                encoded_term = urllib.parse.quote(canon)
                url = f"https://tx.ontoserver.csiro.au/fhir/ValueSet/$expand?url=http://snomed.info/sct?fhir_vs&filter={encoded_term}&count=1"
                req = urllib.request.Request(
                    url, headers={"Accept": "application/json"}
                )
                with urllib.request.urlopen(req) as resp:
                    data = json.loads(resp.read().decode("utf-8"))

                expansion = data.get("expansion", {})
                contains = expansion.get("contains", [])

                for concept in contains:
                    if concept.get("inactive") is not True:
                        final_links[orig] = f"{concept['code']} | {concept['display']}"
                        break
            else:
                if result:
                    final_links[orig] = f"{result.concept_id} | {result.term}"
        except Exception as e:  # noqa: BLE001
            print(f"Error resolving {canon}: {e}")

    return final_links
