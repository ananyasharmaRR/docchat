const API = "";

const uploadInput = document.getElementById("pdf-upload");
const documentList = document.getElementById("document-list");
const documentCount = document.getElementById("document-count");
const welcomeScreen = document.getElementById("welcome-screen");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const questionInput = document.getElementById("question-input");
const sendButton = document.getElementById("send-btn");
const uploadStatus = document.getElementById("upload-status");
const newChatButton = document.getElementById("new-chat-btn");

let currentQuestion = "";
let isBusy = false;


// Safely create text elements without injecting HTML.
function createTextElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
}


// Show a status message.
function showStatus(message, isError = false) {
    uploadStatus.textContent = message;
    uploadStatus.classList.remove("hidden");
    uploadStatus.style.color = isError ? "#d14b4b" : "#6857e8";
}


// Hide the status message.
function hideStatus() {
    uploadStatus.classList.add("hidden");
}


// Switch from welcome screen to chat.
function showChat() {
    welcomeScreen.classList.add("hidden");
    chatMessages.classList.remove("hidden");
}


// Load uploaded documents.
async function loadDocuments() {
    try {
        const response = await fetch(`${API}/api/documents`);

        if (!response.ok) {
            throw new Error("Could not load documents.");
        }

        const documents = await response.json();

        documentList.replaceChildren();
        documentCount.textContent = documents.length;

        if (documents.length === 0) {
            documentList.append(
                createTextElement(
                    "p",
                    "empty-documents",
                    "No documents uploaded yet."
                )
            );
            return;
        }

        documents.forEach((document) => {
            const item = document.createElement("div");
            item.className = "document-item";

            item.append(
                createTextElement(
                    "strong",
                    "",
                    `📄 ${document.filename}`
                ),
                createTextElement(
                    "small",
                    "",
                    `${document.chunks} text chunks`
                )
            );

            documentList.append(item);
        });

    } catch (error) {
        console.error("Document loading error:", error);
    }
}


// Upload PDF.
uploadInput.addEventListener("change", async () => {
    const file = uploadInput.files[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
        showStatus("Please select a PDF file.", true);
        uploadInput.value = "";
        return;
    }

    if (file.size > 20 * 1024 * 1024) {
        showStatus("File must be smaller than 20 MB.", true);
        uploadInput.value = "";
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    showStatus(`Uploading ${file.name}...`);

    try {
        const response = await fetch(`${API}/api/upload`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Upload failed.");
        }

        showStatus(
            `Successfully processed ${data.filename}: ${data.chunks} chunks created.`
        );

        await loadDocuments();

    } catch (error) {
        showStatus(error.message, true);
    } finally {
        uploadInput.value = "";
    }
});


// Add a chat message.
function addMessage(role, text) {
    showChat();

    const message = document.createElement("div");
    message.className = `message ${role}`;

    message.append(
        createTextElement(
            "span",
            "message-label",
            role === "user" ? "YOU" : "DOCCHAT AI"
        )
    );

    message.append(
        createTextElement("div", "message-content", text)
    );

    chatMessages.append(message);

    message.scrollIntoView({
        behavior: "smooth",
        block: "end"
    });

    return message;
}


// Add source references to an AI answer.
function addSources(message, sources) {
    if (!sources || sources.length === 0) return;

    const sourceBox = document.createElement("div");
    sourceBox.className = "sources";

    sourceBox.append(
        createTextElement("strong", "", "📚 Sources")
    );

    sources.forEach((source) => {
        sourceBox.append(
            createTextElement(
                "div",
                "source-item",
                `${source.filename} — Page ${source.page}`
            )
        );
    });

    message.append(sourceBox);
}


// Add feedback buttons.
function addFeedbackButtons(message, question) {
    const actions = document.createElement("div");
    actions.className = "feedback-actions";

    const helpfulButton = createTextElement(
        "button",
        "",
        "👍 Helpful"
    );

    const notHelpfulButton = createTextElement(
        "button",
        "",
        "👎 Not helpful"
    );

    async function sendFeedback(rating) {
        helpfulButton.disabled = true;
        notHelpfulButton.disabled = true;

        try {
            const response = await fetch(`${API}/api/feedback`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question,
                    rating
                })
            });

            if (!response.ok) {
                throw new Error("Feedback could not be saved.");
            }

            actions.replaceChildren(
                createTextElement(
                    "span",
                    "",
                    "Thank you for your feedback!"
                )
            );

        } catch (error) {
            helpfulButton.disabled = false;
            notHelpfulButton.disabled = false;
            alert(error.message);
        }
    }

    helpfulButton.addEventListener("click", () => {
        sendFeedback("helpful");
    });

    notHelpfulButton.addEventListener("click", () => {
        sendFeedback("not_helpful");
    });

    actions.append(helpfulButton, notHelpfulButton);
    message.append(actions);
}


// Ask a question.
chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const question = questionInput.value.trim();

    if (!question || isBusy) return;

    currentQuestion = question;
    isBusy = true;
    sendButton.disabled = true;

    addMessage("user", question);

    questionInput.value = "";
    questionInput.style.height = "auto";

    const loadingMessage = addMessage(
        "assistant",
        "Searching your documents and preparing an answer..."
    );

    try {
        const response = await fetch(`${API}/api/ask`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ question })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Something went wrong.");
        }

        loadingMessage.querySelector(".message-content").textContent =
            data.answer;

        addSources(loadingMessage, data.sources);

        addFeedbackButtons(loadingMessage, question);

    } catch (error) {
        loadingMessage.querySelector(".message-content").textContent =
            `Sorry, something went wrong: ${error.message}`;
    } finally {
        isBusy = false;
        sendButton.disabled = false;
        questionInput.focus();
    }
});


// Automatically increase textarea height.
questionInput.addEventListener("input", () => {
    questionInput.style.height = "auto";

    questionInput.style.height =
        `${Math.min(questionInput.scrollHeight, 120)}px`;
});


// Enter sends; Shift + Enter adds a new line.
questionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatForm.requestSubmit();
    }
});


// Start a fresh conversation.
newChatButton.addEventListener("click", () => {
    chatMessages.replaceChildren();
    chatMessages.classList.add("hidden");
    welcomeScreen.classList.remove("hidden");
    questionInput.value = "";
    hideStatus();
});


// Load existing documents when the page opens.
loadDocuments();