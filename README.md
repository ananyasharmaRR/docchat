# DocChat 📄

A simple AI-powered PDF question-answering application that I built using Python, FastAPI and RAG.

The idea behind this project was to make it easier to find information in PDF documents. Instead of reading an entire document to find something, users can upload a PDF and ask questions about its content in normal language.

🔗 **Live Demo:** https://docchat-ujro.onrender.com/

💻 **GitHub:** https://github.com/ananyasharmaRR/docchat

## What can it do?

- Upload PDF documents.
- Extract and process text from PDFs.
- Ask questions about uploaded documents.
- Find relevant information using semantic search and keyword search.
- Generate answers using Groq LLM.
- Show relevant source references with answers.
- Collect feedback on responses.

## Technologies Used

- **Python** – Main programming language
- **FastAPI** – Backend and API development
- **HTML, CSS, JavaScript** – Frontend
- **Groq API** – AI-generated answers
- **FastEmbed** – Text embeddings
- **BAAI/bge-small-en-v1.5** – Embedding model
- **BM25** – Keyword-based retrieval
- **PyPDF** – PDF text extraction
- **SQLAlchemy** – Database management
- **SQLite / PostgreSQL** – Data storage
- **Render** – Deployment

## How does it work?

I used a RAG (Retrieval-Augmented Generation) approach in this project.

The basic flow is:

1. The user uploads a PDF.
2. Text is extracted from the document.
3. The extracted text is divided into smaller chunks.
4. Each chunk is converted into embeddings.
5. When a user asks a question, the application searches for relevant chunks using semantic search and BM25.
6. Reciprocal Rank Fusion combines the search results.
7. The relevant information is sent to the Groq language model.
8. The generated answer is displayed along with source references.

## Project Structure

```text
docchat/
│
├── app/
│   ├── config.py
│   ├── database.py
│   ├── feedback.py
│   ├── main.py
│   └── rag.py
│
├── evaluation/
│   ├── questions.json
│   └── run_eval.py
│
├── static/
│   ├── css/
│   ├── js/
│   └── index.html
│
├── tests/
├── .github/
├── .env.example
├── Dockerfile
├── requirements.txt
└── README.md
```

## Run Locally

**1. Clone the repository**

```bash
git clone https://github.com/ananyasharmaRR/docchat.git
cd docchat
```

**2. Create and activate a virtual environment**

```bash
python -m venv .venv
```

For Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

**3. Install the required packages**

```bash
pip install -r requirements.txt
```

**4. Create a `.env` file**

Use `.env.example` as a reference and add your own credentials.

```env
LLM_API_KEY=your_groq_api_key
DATABASE_URL=sqlite:///./docchat.db
ADMIN_TOKEN=your_admin_token
```

**5. Run the application**

```bash
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000` in your browser.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/documents` | Get uploaded documents |
| POST | `/api/upload` | Upload a PDF |
| POST | `/api/ask` | Ask questions |
| POST | `/api/feedback` | Submit feedback |

API documentation: `http://127.0.0.1:8000/docs`

## Testing

I have also included basic tests and an evaluation question set in the project.

Run the tests using:

```bash
pytest -v
```

## Limitations

- Currently supports text-based PDFs. Scanned PDFs requiring OCR are not supported.
- The quality of answers depends on the content of the uploaded document and the retrieved information.
- A valid Groq API key is required.
- The free deployment may take a little time to respond after inactivity.

## Future Improvements

Some things I would like to work on next:

- Add OCR support for scanned PDFs.
- Improve document search and retrieval.
- Add conversation history.
- Improve document management and user authentication.

---

**Built by Ananya Sharma**

B.Tech CSE | [GitHub](https://github.com/ananyasharmaRR)