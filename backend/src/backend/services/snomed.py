import json
import urllib.parse
import urllib.request

from backend.core.config import settings
from backend.models.snomed import SnomedDescription
from langchain_openai import ChatOpenAI
from pydantic import SecretStr
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session


def _strip_semantic_tag(text: str) -> str:
    import re
    return re.sub(r'\s*\([^)]*\)$', '', text).strip()

def _search_snomed_term(term: str, db: Session, exact: bool = False) -> tuple[str, str] | None:
    result = None
    db_error = False
    try:
        if exact:
            stmt = (
                select(SnomedDescription)
                .where(SnomedDescription.active == True)
                .where(
                    or_(
                        func.lower(SnomedDescription.term) == func.lower(term),
                        func.lower(SnomedDescription.term).like(func.lower(term) + " (%)")
                    )
                )
                .limit(1)
            )
        else:
            stmt = (
                select(SnomedDescription)
                .where(SnomedDescription.active == True)
                .where(SnomedDescription.term.op("<->")(term) < 0.3)
                .order_by(SnomedDescription.term.op("<->")(term))
                .limit(1)
            )
        result = db.execute(stmt).scalars().first()
    except Exception as e:  # noqa: BLE001
        print(f"Warning: Local DB query failed ({e}). Falling back to CSIRO API.")
        db_error = True

    if not db_error and result:
        return str(result.concept_id), _strip_semantic_tag(str(result.term))

    print(f"Local DB miss for '{term}'. Falling back to CSIRO API.")
    encoded_term = urllib.parse.quote(term)
    url = f"https://tx.ontoserver.csiro.au/fhir/ValueSet/$expand?url=http://snomed.info/sct?fhir_vs&filter={encoded_term}&count=10"

    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        expansion = data.get("expansion", {})
        contains = expansion.get("contains", [])

        for concept in contains:
            if concept.get("inactive") is True:
                continue
            
            display_clean = _strip_semantic_tag(concept["display"])
            
            if exact:
                if display_clean.lower() == term.lower():
                    return str(concept["code"]), display_clean
            else:
                return str(concept["code"]), display_clean
    except Exception as e:
        print(f"CSIRO API error for '{term}': {e}")
        
    return None


def suggest_snomed_term(query: str, db: Session) -> tuple[str, str]:
    # 1. Direct search (DB -> CSIRO)
    match = _search_snomed_term(query, db, exact=True)
    if match:
        return match

    # 2. AI Translation
    if not settings.openrouter_api_key_lookup:
        raise ValueError("OpenRouter API key missing.")

    snomed_llm = ChatOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=SecretStr(settings.openrouter_api_key_lookup),
        model=settings.openrouter_model_lookup,
        temperature=0.0,
    )

    prompt_text = f"""You are a medical terminology translator. Translate the following user query into the exact, canonical English SNOMED CT term name.
Query: '{query}'
Respond ONLY with the exact English term enclosed in <term> tags. For example: <term>Myocardial infarction</term>."""

    response = snomed_llm.invoke(prompt_text)
    content = str(response.content).strip()

    import re
    match_tag = re.search(r"<term>(.*?)</term>", content, re.IGNORECASE | re.DOTALL)
    if match_tag:
        canonical_term = match_tag.group(1).strip()
    else:
        # Fallback if tags are missing, take the last line which is usually the answer in reasoning models
        canonical_term = content.split('\n')[-1].strip()

    # Strip quotes if the LLM adds them
    if canonical_term.startswith('"') and canonical_term.endswith('"'):
        canonical_term = canonical_term[1:-1]
    if canonical_term.startswith("'") and canonical_term.endswith("'"):
        canonical_term = canonical_term[1:-1]

    # 3. AI Search (DB -> CSIRO)
    match = _search_snomed_term(canonical_term, db, exact=False)
    if match:
        return match

    raise ValueError(f"No active SNOMED concept found for term: {query} (AI canonical: {canonical_term})")


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

    import re
    json_match = re.search(r"```(?:json)?\s*(\[\s*{.*?}\s*\])\s*```", content, re.DOTALL | re.IGNORECASE)
    if json_match:
        content_to_parse = json_match.group(1)
    else:
        array_match = re.search(r"(\[\s*{.*?}\s*\])", content, re.DOTALL)
        content_to_parse = array_match.group(1) if array_match else content

    try:
        extracted_terms = json.loads(content_to_parse.strip())
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
            match = _search_snomed_term(canon, db, exact=False)
            if match:
                final_links[orig] = f"{match[0]} | {match[1]}"
        except Exception as e:  # noqa: BLE001
            print(f"Error resolving {canon}: {e}")

    return final_links
