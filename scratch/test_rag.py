import asyncio
import os
import traceback
from app.services.rag_service.rag_service import rag_service

async def test_rag():
    try:
        print("Testing RAG retrieval...")
        res = rag_service.retrieve_by_text("test", limit=1)
        print(f"Result: {res}")
    except Exception as e:
        print(f"Error caught: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    os.chdir("backend")
    asyncio.run(test_rag())
