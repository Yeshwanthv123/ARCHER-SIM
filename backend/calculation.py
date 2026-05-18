from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str

# Path to the knowledge base chunks
KNOWLEDGE_BASE_PATH = "knowledge_base/calculations/chunks/calculation_chunks.json"

knowledge_base = []
if os.path.exists(KNOWLEDGE_BASE_PATH):
    with open(KNOWLEDGE_BASE_PATH, 'r', encoding='utf-8') as f:
        knowledge_base = json.load(f)
else:
    print(f"Warning: Knowledge base not found at {KNOWLEDGE_BASE_PATH}")

def retrieve_context(query: str, top_k: int = 3):
    """
    Improved keyword-based retrieval. 
    Scores chunks based on the number of non-trivial keyword matches.
    """
    if not knowledge_base:
        return []
        
    query_lower = query.lower()
    # Filter out common stop words and very short words
    stop_words = {"a", "an", "the", "and", "or", "but", "if", "from", "to", "in", "on", "with", "is", "are", "of", "for", "it", "this", "that"}
    keywords = [w for w in query_lower.split() if w not in stop_words and len(w) > 1 and not w.isnumeric()]
    
    scored_chunks = []
    for chunk in knowledge_base:
        score = 0
        func_name = chunk.get("function_name", "").lower()
        content_text = (chunk.get("content", "") + " " + chunk.get("syntax", "")).lower()
        
        # Exact function name match gets huge boost
        if func_name and func_name in query_lower:
            score += 20
            
        # Add 1 point for EVERY keyword found in the chunk
        for kw in keywords:
            if kw in content_text:
                score += 2
            if kw in func_name:
                score += 5
                
        scored_chunks.append((score, chunk))
    
    # Sort by score descending
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    return [chunk for score, chunk in scored_chunks[:top_k] if score > 0]

@app.post("/api/calculation/generate")
def generate_calculation(req: QueryRequest):
    # Retrieve relevant context from the knowledge base
    contexts = retrieve_context(req.question)
    
    context_text = "\n\n".join([f"Function: {c.get('function_name', '')}\nContent: {c.get('content', '')}" for c in contexts])
    
    prompt = f"""You are an automated Archer formula code generator. 
Use the provided context to generate an Archer formula. DO NOT write conversational text.

Context from Knowledge Base:
{context_text}

User Question: {req.question}

Example Output:
FORMULA:
UPPER([Field_Name])

EXPLANATION:
Converts the specified field text to uppercase.

Instructions:
1. You MUST follow the exact format of the Example Output.
2. DO NOT output conversational text like "In the provided knowledge base..." or "I cannot find...".
3. If you are unsure, provide your best guess for the formula based on Archer syntax.
4. Output EXACTLY the FORMULA and EXPLANATION blocks, nothing else.

Your Output:
"""

    # Assuming the user is running Ollama locally with qwen2:7b-instruct
    OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
    try:
        response = requests.post(OLLAMA_URL, json={
            "model": "qwen2:0.5b-instruct",
            "prompt": prompt,
            "stream": False
        }, timeout=600)
        
        if response.status_code == 200:
            data = response.json()
            answer = data.get("response", "No response from model.")
            
            # Aggressive cleanup to remove any stubborn markdown code blocks
            answer = answer.replace("```kotlin", "").replace("```json", "").replace("```", "").replace("`", "")
            answer = answer.strip()
            
            return {"answer": answer}
        else:
            print(f"Ollama returned non-200 status code: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail="Error calling the local LLM model.")
    except Exception as e:
        print(f"OLLAMA ERROR: {str(e)}")
        # Fallback if Ollama is not running or another error occurs
        raise HTTPException(status_code=500, detail=f"Error connecting to the LLM model: {str(e)}")

# To run the server:
# pip install fastapi uvicorn requests pydantic
# cd backend
# uvicorn main:app --reload --port 8000
