from io import BytesIO
import re

import numpy as np
from fastembed import TextEmbedding
from pypdf import PdfReader
from rank_bm25 import BM25Okapi

from app.database import Document, Chunk


EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"

_embedding_model = None


def get_embedding_model():
    global _embedding_model

    if _embedding_model is None:
        _embedding_model = TextEmbedding(
            model_name=EMBEDDING_MODEL
        )

    return _embedding_model


def embed_texts(texts):
    model = get_embedding_model()
    vectors = list(model.embed(texts))
    return [vector.tolist() for vector in vectors]


def tokenize(text):
    return re.findall(r"\b\w+\b", text.lower())


def split_into_chunks(text, chunk_size=180, overlap=35):
    words = text.split()

    if not words:
        return []

    chunks = []
    start = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])

        if chunk.strip():
            chunks.append(chunk)

        if end == len(words):
            break

        start = end - overlap

    return chunks


def index_pdf(db, filename, pdf_bytes):
    reader = PdfReader(BytesIO(pdf_bytes))

    document = Document(filename=filename)
    db.add(document)
    db.flush()

    all_chunks = []

    for page_number, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""

        for chunk_text in split_into_chunks(page_text):
            all_chunks.append({
                "page_number": page_number,
                "content": chunk_text,
            })

    if not all_chunks:
        db.rollback()
        raise ValueError(
            "No readable text found in this PDF. "
            "Scanned PDFs requiring OCR are not supported yet."
        )

    texts = [item["content"] for item in all_chunks]
    embeddings = embed_texts(texts)

    for item, embedding in zip(all_chunks, embeddings):
        db.add(
            Chunk(
                document_id=document.id,
                page_number=item["page_number"],
                content=item["content"],
                embedding=embedding,
            )
        )

    db.commit()

    return {
        "document_id": document.id,
        "filename": filename,
        "pages": len(reader.pages),
        "chunks": len(all_chunks),
    }


def cosine_similarity(a, b):
    a = np.asarray(a, dtype=np.float32)
    b = np.asarray(b, dtype=np.float32)

    denominator = np.linalg.norm(a) * np.linalg.norm(b)

    if denominator == 0:
        return 0.0

    return float(np.dot(a, b) / denominator)


def retrieve_chunks(db, question, top_k=5):
    chunks = db.query(Chunk).all()

    if not chunks:
        return []

    query_embedding = embed_texts([question])[0]

    # Dense semantic ranking
    dense_scores = []

    for chunk in chunks:
        score = cosine_similarity(
            query_embedding,
            chunk.embedding,
        )
        dense_scores.append((chunk, score))

    dense_scores.sort(key=lambda item: item[1], reverse=True)

    # BM25 keyword ranking
    corpus = [tokenize(chunk.content) for chunk in chunks]
    query_tokens = tokenize(question)

    bm25_scores = BM25Okapi(corpus).get_scores(query_tokens)

    sparse_scores = list(zip(chunks, bm25_scores))
    sparse_scores.sort(key=lambda item: item[1], reverse=True)

    # Reciprocal Rank Fusion
    rrf_scores = {}

    for rank, (chunk, _) in enumerate(dense_scores, start=1):
        rrf_scores[chunk.id] = 1 / (60 + rank)

    for rank, (chunk, _) in enumerate(sparse_scores, start=1):
        rrf_scores[chunk.id] = (
            rrf_scores.get(chunk.id, 0) + 1 / (60 + rank)
        )

    ranked_chunks = sorted(
        chunks,
        key=lambda chunk: rrf_scores.get(chunk.id, 0),
        reverse=True,
    )

    results = []

    for chunk in ranked_chunks[:top_k]:
        results.append({
            "filename": chunk.document.filename,
            "page_number": chunk.page_number,
            "content": chunk.content,
            "score": rrf_scores.get(chunk.id, 0),
        })

    return results