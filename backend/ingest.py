import os
import glob
import yaml
from langchain_core.documents import Document
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from langchain_postgres import PGVector
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from langchain_classic.indexes import SQLRecordManager, index
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/thaioml"
    huggingface_api_key: str = ""
    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()

def parse_frontmatter(content: str):
    """Parses YAML frontmatter and returns (metadata, markdown_content)"""
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            try:
                metadata = yaml.safe_load(parts[1])
                return metadata, parts[2].strip()
            except yaml.YAMLError:
                pass
    return {}, content

def load_documents(base_path: str):
    """Loads markdown files from articles and guidelines, splits them, and adds metadata."""
    headers_to_split_on = [
        ("#", "Header 1"),
        ("##", "Header 2"),
        ("###", "Header 3"),
    ]
    markdown_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
    
    # 500 token chunk size roughly corresponds to 2000 characters
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=2000, 
        chunk_overlap=200,
    )

    documents = []
    
    search_paths = [
        os.path.join(base_path, "articles", "*.md"),
        os.path.join(base_path, "guidelines", "*.md")
    ]
    
    for search_path in search_paths:
        for file_path in glob.glob(search_path):
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            metadata, md_content = parse_frontmatter(content)
            
            # The source id must be unique per document for RecordManager
            # We use the relative path as source
            rel_path = os.path.relpath(file_path, base_path)
            base_metadata = {
                "source": rel_path,
                "title": metadata.get("title", ""),
                "type": metadata.get("type", ""),
            }
            
            # Add specialty if it exists and is list
            if "specialty" in metadata and isinstance(metadata["specialty"], list):
                base_metadata["specialty"] = ", ".join(metadata["specialty"])
                
            md_header_splits = markdown_splitter.split_text(md_content)
            
            # Add base metadata to each split
            for split in md_header_splits:
                split.metadata.update(base_metadata)
                
            # Split further if sections are too large
            splits = text_splitter.split_documents(md_header_splits)
            documents.extend(splits)
            
    return documents

def main():
    if not settings.huggingface_api_key:
        print("Error: HUGGINGFACE_API_KEY is not set.")
        return

    print("Loading and splitting documents...")
    docs_base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../docs/docs"))
    docs = load_documents(docs_base_path)
    print(f"Loaded {len(docs)} chunks from markdown files.")

    print("Initializing embeddings and vector store...")
    embeddings = HuggingFaceEndpointEmbeddings(
        model="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        huggingfacehub_api_token=settings.huggingface_api_key,
    )

    collection_name = "thaioml_docs"
    vector_store = PGVector(
        connection=settings.database_url,
        embeddings=embeddings,
        collection_name=collection_name,
        use_jsonb=True,
    )

    print("Initializing SQLRecordManager for incremental sync...")
    record_manager = SQLRecordManager(
        f"pgvector/{collection_name}", db_url=settings.database_url
    )
    
    # Create the schema for record manager if it doesn't exist
    record_manager.create_schema()

    print("Indexing documents into PGVector...")
    # cleanup="incremental" requires documents to have a 'source' key in metadata
    # It will delete old chunks from the vector store if the source file changed
    result = index(
        docs,
        record_manager,
        vector_store,
        cleanup="incremental",
        source_id_key="source",
    )
    
    print("Indexing complete!")
    print(f"Result: {result}")

if __name__ == "__main__":
    main()
