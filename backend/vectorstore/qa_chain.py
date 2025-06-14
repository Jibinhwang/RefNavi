import os
import sys
from typing import List, Tuple, Union

# ✅ tokenizer warning 제거
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# ✅ RefNavi 루트 경로 추가 (상대 경로 문제 방지용)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

# ✅ LangChain 최신 모듈
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory

# ✅ 사용자 정의 모듈
from dotenv import load_dotenv

# ✅ .env 파일 명시적으로 로딩
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
load_dotenv(dotenv_path)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("❌ OPENAI_API_KEY가 .env에서 불러와지지 않았습니다!")

# ✅ 설정
base_dir = os.path.join(os.path.dirname(__file__), "..")
VECTOR_DB_DIR = os.path.join(base_dir, "utils/metadata/chroma_db")
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# ✅ 전역 embedding + vector DB 인스턴스
embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

memory = ConversationBufferMemory(
    memory_key = 'chat_history',
    return_messages = True,
    output_key='answer'
)

def run_qa_chain(
    query: str,
    k: int = 3,
    VECTOR_DB_DIR = VECTOR_DB_DIR,
    return_sources: bool = False,

) -> Union[str, Tuple[str, List[Document]]]:
    print(f"\n🔍 질의: '{query}' → 유사 문서 검색 중...")

    llm = ChatOpenAI(model_name="gpt-4", temperature=0, openai_api_key=OPENAI_API_KEY)
    db = Chroma(persist_directory=VECTOR_DB_DIR, embedding_function=embeddings)

    qa_chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=db.as_retriever(search_kwargs={"k": k}),
        memory=memory,
        return_source_documents=True,
        combine_docs_chain_kwargs={"output_key": "answer"} 
    )

    result = qa_chain.invoke({"question": query})
    answer = result["answer"]
    sources: List[Document] = result.get("source_documents", [])

    if sources:
        print("\n📚 참조 문서:")
        for i, doc in enumerate(sources, 1):
            print(f"\n--- Source {i} ---")
            print(f"제목: {doc.metadata.get('title')}")
            print(f"구분: {doc.metadata.get('source')}")
            print(f"연도: {doc.metadata.get('year')}")
            print(f"저자: {doc.metadata.get('authors')}")
            print(f"요약: {doc.page_content[:300]}...")
    else:
        print("\n📚 참조 문서가 없습니다.")

    print(answer)
    return (answer, sources) if return_sources else (answer, [])

# ✅ 단독 실행용
if __name__ == "__main__":
    run_qa_chain("What is the contribution of the Transformer paper?", k=5)
    #run_qa_chain("안녕")