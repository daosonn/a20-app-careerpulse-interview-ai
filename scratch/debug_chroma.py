import os
import chromadb
from app.core.config import embedding_model

def debug_chroma():
    os.chdir("backend")
    client = chromadb.PersistentClient(path="./chroma_db")
    print(f"Collections: {client.list_collections()}")
    try:
        col = client.get_collection("jobs_collection")
        print(f"Collection 'jobs_collection' exists. Count: {col.count()}")
        # Check metadata of the first item to see if there's any hint about embeddings
        if col.count() > 0:
            sample = col.get(limit=1)
            print(f"Sample: {sample}")
    except Exception as e:
        print(f"Error getting collection: {e}")

if __name__ == "__main__":
    debug_chroma()
