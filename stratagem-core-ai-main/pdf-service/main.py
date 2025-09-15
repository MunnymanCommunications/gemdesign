from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import io
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    try:
        logger.info(f"Processing PDF: {file.filename}")
        contents = await file.read()
        
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
        
        if text.strip():
            logger.info(f"Successfully extracted text from {file.filename}")
            return {"success": True, "text": text}
        else:
            logger.warning(f"No text extracted from {file.filename} - possibly image-based PDF")
            return {"success": True, "text": f"PDF Document: {file.filename}\n\nFile Size: {len(contents)/1024:.2f}KB\n\nThis PDF appears to be image-based. Text extraction requires OCR processing."}
            
    except Exception as e:
        logger.error(f"Error processing PDF {file.filename}: {str(e)}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)