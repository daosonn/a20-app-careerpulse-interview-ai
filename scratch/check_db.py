import os
from app.services.rag_service.rag_service import rag_service

def check_db():
    os.chdir("backend")
    print(f"Collection count: {rag_service.vector_db._collection.count()}")
    print(f"Collection name: {rag_service.collection_name}")

if __name__ == "__main__":
    check_db()
