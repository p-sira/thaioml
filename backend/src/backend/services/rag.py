from backend.core.config import settings
from langchain_classic.chains import (
    create_history_aware_retriever,
    create_retrieval_chain,
)
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import (
    ChatPromptTemplate,
    MessagesPlaceholder,
    PromptTemplate,
)
from langchain_core.runnables import RunnablePassthrough
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from langchain_openai import ChatOpenAI
from langchain_postgres import PGVector
from pydantic import SecretStr


class RAGService:
    def __init__(self):
        self.embeddings = None
        self.vector_store = None
        self.llm = None
        self.rag_chain = None
        self.chat_chain = None

    def initialize(self):
        if self.rag_chain is not None and self.chat_chain is not None:
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

            # Original single-turn chain
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

            # Conversational Chain
            contextualize_q_system_prompt = (
                "Given a chat history and the latest user question "
                "which might reference context in the chat history, "
                "formulate a standalone question which can be understood "
                "without the chat history. Do NOT answer the question, "
                "just reformulate it if needed and otherwise return it as is."
            )
            contextualize_q_prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", contextualize_q_system_prompt),
                    MessagesPlaceholder("chat_history"),
                    ("human", "{input}"),
                ]
            )
            history_aware_retriever = create_history_aware_retriever(
                self.llm, retriever, contextualize_q_prompt
            )

            qa_system_prompt = (
                "Answer the question based only on the following context. "
                "Do not make up any information that is not in the context. "
                "Answer in Thai when the user asks in Thai, explicitly state so, "
                "or based on the context where appropriate:\n\n"
                "{context}"
            )
            qa_prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", qa_system_prompt),
                    MessagesPlaceholder("chat_history"),
                    ("human", "{input}"),
                ]
            )
            question_answer_chain = create_stuff_documents_chain(self.llm, qa_prompt)

            self.chat_chain = create_retrieval_chain(
                history_aware_retriever, question_answer_chain
            )

        except Exception as e:  # noqa: BLE001
            print(
                f"Warning: Failed to initialize RAG components (e.g., database connection error). RAG query endpoint will fail. Error: {e}"
            )
            self.rag_chain = None
            self.chat_chain = None

    def query(self, query: str) -> str:
        if not self.rag_chain:
            raise RuntimeError("RAG system not initialized properly. Check API keys.")
        return self.rag_chain.invoke(query)

    def chat(self, messages: list[dict]) -> str:
        if not self.chat_chain:
            raise RuntimeError("RAG system not initialized properly. Check API keys.")

        if not messages:
            return ""

        # Extract the latest query
        latest_query = messages[-1].get("content", "")

        # Format chat history
        chat_history = []
        for msg in messages[:-1]:
            if msg.get("role") == "user":
                chat_history.append(HumanMessage(content=msg.get("content", "")))
            elif msg.get("role") == "assistant":
                chat_history.append(AIMessage(content=msg.get("content", "")))

        response = self.chat_chain.invoke(
            {"chat_history": chat_history, "input": latest_query}
        )
        return response.get("answer", "")


rag_service = RAGService()
