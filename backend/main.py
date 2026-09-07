import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from langchain_openai import ChatOpenAI
from langchain_postgres import PGVector
from pydantic import BaseModel, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/thaioml"
    openrouter_api_key_rag: str = ""
    openrouter_model_rag: str = "qwen/qwen-2.5-72b-instruct:free"
    huggingface_api_key_embedding: str = ""

    # SNOMED Lookup Feature
    openrouter_api_key_lookup: str = ""
    openrouter_model_lookup: str = "qwen/qwen-2.5-72b-instruct:free"

    model_config = SettingsConfigDict(
        env_file="../.env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
app = FastAPI(title="ThaiOML RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Setup components lazily to handle missing keys gracefully in health checks
embeddings = None
vector_store = None
llm = None
rag_chain = None


def init_rag():
    global embeddings, vector_store, llm, rag_chain
    if rag_chain is not None:
        return

    if (
        not settings.huggingface_api_key_embedding
        or not settings.openrouter_api_key_rag
    ):
        print("Warning: Missing API keys. RAG query endpoint will fail.")
        return

    embeddings = HuggingFaceEndpointEmbeddings(
        model="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        huggingfacehub_api_token=settings.huggingface_api_key_embedding,
    )

    vector_store = PGVector(
        connection=settings.database_url,
        embeddings=embeddings,
        collection_name="thaioml_docs",
        use_jsonb=True,
    )
    retriever = vector_store.as_retriever(search_kwargs={"k": 4})

    llm = ChatOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=SecretStr(settings.openrouter_api_key_rag),
        model=settings.openrouter_model_rag,
    )

    template = """Answer the question based only on the following context. Do not make up any information that is not in the context. Answer in Thai when the user ask in Thai, explicitly state so, or based on the context where appropriate, such as specific mnemonics:
{context}

Question: {question}
"""
    prompt = PromptTemplate.from_template(template)

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )


@app.on_event("startup")
def startup_event():
    init_rag()


class QueryRequest(BaseModel):
    query: str


class QueryResponse(BaseModel):
    answer: str


@app.get("/")
def read_root():
    return {"message": "Welcome to ThaiOML RAG API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
def query_system(request: QueryRequest):
    if not rag_chain:
        raise HTTPException(
            status_code=500,
            detail="RAG system not initialized properly. Check API keys.",
        )
    try:
        answer = rag_chain.invoke(request.query)
        return QueryResponse(answer=answer)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e))


class SnomedSuggestRequest(BaseModel):
    query: str


class SnomedSuggestResponse(BaseModel):
    id: str
    term: str


@app.post("/snomed-suggest", response_model=SnomedSuggestResponse)
def snomed_suggest(request: SnomedSuggestRequest):
    if not settings.openrouter_api_key_lookup:
        raise HTTPException(
            status_code=500,
            detail="OpenRouter API key missing.",
        )
    try:
        snomed_llm = ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=SecretStr(settings.openrouter_api_key_lookup),
            model=settings.openrouter_model_lookup,
        )

        prompt_text = f"""You are a medical terminology translator. Translate the following user query into the exact, canonical English SNOMED CT term name.
Query: '{request.query}'
Respond ONLY with the exact English term, nothing else. Do not use quotes or markdown."""

        response = snomed_llm.invoke(prompt_text)
        canonical_term = response.content.strip()

        # Strip quotes if the LLM adds them
        if canonical_term.startswith('"') and canonical_term.endswith('"'):
            canonical_term = canonical_term[1:-1]
        if canonical_term.startswith("'") and canonical_term.endswith("'"):
            canonical_term = canonical_term[1:-1]

        import urllib.parse
        import urllib.request

        encoded_term = urllib.parse.quote(canonical_term)
        url = f"https://tx.ontoserver.csiro.au/fhir/ValueSet/$expand?url=http://snomed.info/sct?fhir_vs&filter={encoded_term}&count=5"

        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        expansion = data.get("expansion", {})
        contains = expansion.get("contains", [])

        valid_concept = None
        for concept in contains:
            # Skip inactive concepts
            if concept.get("inactive") is True:
                continue
            valid_concept = concept
            break

        if not valid_concept:
            raise HTTPException(
                status_code=404,
                detail=f"No active SNOMED concept found for term: {canonical_term}",
            )

        return SnomedSuggestResponse(
            id=str(valid_concept["code"]), term=valid_concept["display"]
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e))
