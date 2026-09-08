from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from langchain_openai import ChatOpenAI
from langchain_postgres import PGVector
from pydantic import SecretStr

from backend.core.config import settings


class RAGService:
    def __init__(self):
        self.embeddings = None
        self.vector_store = None
        self.llm = None
        self.rag_chain = None

    def initialize(self):
        if self.rag_chain is not None:
            return

        if (
            not settings.huggingface_api_key_embedding
            or not settings.openrouter_api_key_rag
        ):
            print("Warning: Missing API keys. RAG query endpoint will fail.")
            return

        self.embeddings = HuggingFaceEndpointEmbeddings(
            model="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            huggingfacehub_api_token=settings.huggingface_api_key_embedding,
        )

        try:
            self.vector_store = PGVector(
                connection=settings.database_url,
                embeddings=self.embeddings,
                collection_name="thaioml_docs",
                use_jsonb=True,
            )
            retriever = self.vector_store.as_retriever(search_kwargs={"k": 4})

            self.llm = ChatOpenAI(
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

            self.rag_chain = (
                {"context": retriever | format_docs, "question": RunnablePassthrough()}
                | prompt
                | self.llm
                | StrOutputParser()
            )
        except Exception as e:  # noqa: BLE001
            print(
                f"Warning: Failed to initialize RAG components (e.g., database connection error). RAG query endpoint will fail. Error: {e}"
            )
            self.rag_chain = None

    def query(self, query: str) -> str:
        if not self.rag_chain:
            raise RuntimeError("RAG system not initialized properly. Check API keys.")
        return self.rag_chain.invoke(query)


rag_service = RAGService()
