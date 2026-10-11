import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from backend.services.snomed import auto_link_terms


def run_extraction(body, terms, lookup=None, **kwargs):
    with (
        patch("backend.services.snomed.settings") as settings,
        patch("backend.services.snomed.ChatOpenAI") as model,
        patch("backend.services.snomed._search_snomed_term") as search,
    ):
        settings.openrouter_api_key_lookup = "test-key"
        settings.openrouter_model_lookup = "test-model"
        model.return_value.invoke.return_value = SimpleNamespace(content=json.dumps(terms))
        search.side_effect = lookup or (lambda term, db, exact: ("123", term))
        result = auto_link_terms(body, MagicMock(), **kwargs)
        prompt = model.return_value.invoke.call_args.args[0]
        assert model.return_value.invoke.call_count == 1
        return result, prompt, search.call_count


def test_full_article_single_pass_preserves_markdown_and_deduplicates_lookup():
    body = "x" * 5000 + '\nDrug **Medicine** `Drug` [Drug](https://example.org)'
    terms = [
        {"original_text": "Drug", "canonical_snomed_term": "Medicine"},
        {"original_text": "Medicine", "canonical_snomed_term": "Medicine"},
    ]
    (returned_body, links), prompt, calls = run_extraction(body, terms)
    assert body in prompt
    assert returned_body == body
    assert links == {"Drug": "123 | Medicine", "Medicine": "123 | Medicine"}
    assert calls == 1


def test_self_links_unknown_and_ambiguous_terms_are_excluded():
    terms = [
        {"original_text": "DM", "canonical_snomed_term": "Diabetes mellitus"},
        {"original_text": "DM", "canonical_snomed_term": "Dermatomyositis"},
        {"original_text": "Self", "canonical_snomed_term": "Self"},
        {"original_text": "Unknown", "canonical_snomed_term": "Unknown"},
    ]
    matches = {"Diabetes mellitus": ("123", "Diabetes mellitus"), "Dermatomyositis": ("456", "Dermatomyositis"), "Self": ("789", "Self")}
    (body, links), _, _ = run_extraction("DM Self Unknown", terms, lambda term, db, exact: matches.get(term), snomed_id="789")
    assert body == "DM Self Unknown"
    assert links == {}


@pytest.mark.parametrize("content", ['invalid', '{}', '[null]', '[{"original_text": 3}]'])
def test_invalid_model_output_fails_explicitly(content):
    with patch("backend.services.snomed.settings") as settings, patch("backend.services.snomed.ChatOpenAI") as model:
        settings.openrouter_api_key_lookup = "test-key"
        model.return_value.invoke.return_value = SimpleNamespace(content=content)
        with pytest.raises(ValueError):
            auto_link_terms("Article", MagicMock())
