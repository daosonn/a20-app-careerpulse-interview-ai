import os
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

# Explicitly load .env from the project root
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv(dotenv_path=env_path)

class LLMFactory:
    @staticmethod
    def get_llm(model_name: str = "gpt-4o", temperature: float = 0.7):
        return ChatOpenAI(
            model=model_name, 
            temperature=temperature, 
            api_key=os.getenv("OPENAI_API_KEY")
        )

interviewer_llm = LLMFactory.get_llm("gpt-4o", 0.7)
evaluator_llm = LLMFactory.get_llm("gpt-4o", 0.2)