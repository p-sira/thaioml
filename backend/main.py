from fastapi import FastAPI, HTTPException
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
    openrouter_api_key: str = ""
    openrouter_model: str = "qwen/qwen-2.5-72b-instruct:free"
    huggingface_api_key: str = ""

    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8")


settings = Settings()
app = FastAPI(title="ThaiOML RAG API")

# Setup components lazily to handle missing keys gracefully in health checks
embeddings = None
vector_store = None
llm = None
rag_chain = None


def init_rag():
    global embeddings, vector_store, llm, rag_chain
    if rag_chain is not None:
        return

    if not settings.huggingface_api_key or not settings.openrouter_api_key:
        print("Warning: Missing API keys. RAG query endpoint will fail.")
        return

    embeddings = HuggingFaceEndpointEmbeddings(
        model="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        huggingfacehub_api_token=settings.huggingface_api_key,
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
        api_key=SecretStr(settings.openrouter_api_key),
        model=settings.openrouter_model,
    )

    template = """Answer the question based only on the following context (answer in Thai where appropriate for medical context):
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
