---
title: Multimodal Api Documentation
sidebar_label: Multimodal Api Documentation
---

# Multimodal API Documentation - brAInwav Cortex-OS

## Overview

The Multimodal API enables comprehensive processing and search across different content types including images, audio, PDFs with images, and text. This system provides unified semantic search capabilities that can understand and retrieve information from various media formats.

## Features

- **Image Processing**: OCR, vision analysis, metadata extraction
- **Audio Transcription**: Speech-to-text with speaker diarization
- **PDF with Images**: Enhanced parsing with layout preservation and image extraction
- **Unified Search**: Cross-modal semantic search with citations
- **Scalable Architecture**: Designed for enterprise workloads

## Authentication

All API endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer &lt;your-jwt-token&gt;
```

## API Endpoints

### Upload Multimodal Document

Upload and process documents of various modalities.

**Endpoint**: `POST /api/multimodal/upload`

**Content-Type**: `multipart/form-data`

**Request Parameters**:
- `file` (required): The file to upload
- `options` (optional): JSON string with processing options

**Processing Options**:
```json
{
  "chunkSize": 1000,
  "chunkOverlap": 200,
  "enableOCR": true,
  "enableVisionAnalysis": true,
  "enableTranscription": true,
  "enableSpeakerDiarization": true,
  "language": "en",
  "visionModel": "gpt-4-vision-preview",
  "transcriptionModel": "whisper-large"
}
```

**Supported File Formats**:
- **Images**: PNG, JPG, JPEG, WebP, GIF (max 50MB)
- **Audio**: MP3, WAV, M4A, OGG, FLAC (max 500MB, max 4 hours)
- **PDFs**: PDF (max 200MB, max 200 pages)

**Response**:
```json
{
  "documentId": "uuid-string",
  "filename": "example.jpg",
  "modality": "image",
  "status": "success",
  "chunksCreated": 3,
  "processingTime": 2500,
  "summary": {
    "imageCount": 1,
    "textLength": 156,
    "objectsDetected": 5
  },
  "brand": "brAInwav"
}
```

**Example Request**:
```bash
curl -X POST \
  https://your-domain.com/api/multimodal/upload \
  -H 'Authorization: Bearer your-token' \
  -F 'file=@example.jpg' \
  -F 'options={"enableOCR": true, "enableVisionAnalysis": true}'
```

### List Multimodal Documents

Retrieve all uploaded multimodal documents for the authenticated user.

**Endpoint**: `GET /api/multimodal/documents`

**Response**:
```json
{
  "documents": [
    {
      "id": "uuid-string",
      "filename": "example.jpg",
      "mimeType": "image/jpeg",
      "modality": "image",
      "size": 2048576,
      "totalChunks": 3,
      "processed": true,
      "processingStatus": "completed",
      "metadata": {
        "width": 1920,
        "height": 1080,
        "format": "JPEG"
      },
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:32:30.000Z"
    }
  ],
  "total": 1
}
```

### Get Multimodal Document Details

Retrieve detailed information about a specific document including all chunks.

**Endpoint**: `GET /api/multimodal/documents/{id}`

**Response**:
```json
{
  "id": "uuid-string",
  "filename": "example.jpg",
  "modality": "image",
  "processed": true,
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "JPEG",
    "ocrText": "Extracted text from image",
    "visionAnalysis": {
      "description": "Image contains a landscape with mountains",
      "objects": [
        {
          "label": "mountain",
          "confidence": 0.95,
          "boundingBox": { "x": 100, "y": 50, "width": 300, "height": 200 }
        }
      ],
      "confidence": 0.92,
      "analysisModel": "gpt-4-vision-preview",
      "processedAt": "2025-01-15T10:32:00.000Z"
    }
  },
  "chunks": [
    {
      "id": "chunk-uuid",
      "content": "OCR text and vision analysis description",
      "chunkIndex": 0,
      "modality": "text",
      "tokenCount": 45,
      "metadata": {
        "imageWidth": 1920,
        "imageHeight": 1080
      }
    }
  ]
}
```

### Delete Multimodal Document

Delete a document and all its associated chunks from the system.

**Endpoint**: `DELETE /api/multimodal/documents/{id}`

**Response**:
```json
{
  "message": "Document deleted successfully",
  "documentId": "uuid-string"
}
```

### Search Multimodal Content

Perform semantic search across all or specific modalities with advanced filtering.

**Endpoint**: `POST /api/multimodal/search`

**Request Body**:
```json
{
  "query": "mountain landscape photography",
  "modalities": ["text", "image", "audio_transcript"],
  "limit": 20,
  "minScore": 0.7,
  "documentIds": ["uuid-1", "uuid-2"],
  "includeContent": true,
  "filters": {
    "mimeType": ["image/jpeg", "image/png"],
    "minDuration": 30,
    "maxDuration": 300,
    "minWidth": 800,
    "maxWidth": 1920,
    "language": "en",
    "speakerCount": 2,
    "dateRange": {
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-01-31T23:59:59.999Z"
    }
  }
}
```

**Response**:
```json
{
  "results": [
    {
      "id": "chunk-uuid",
      "documentId": "doc-uuid",
      "filename": "landscape.jpg",
      "modality": "image",
      "content": "Mountain landscape with forest in foreground...",
      "score": 0.89,
      "chunkIndex": 0,
      "startPage": 1,
      "citations": [
        {
          "documentId": "doc-uuid",
          "documentName": "landscape.jpg",
          "filename": "landscape.jpg",
          "modality": "image",
          "page": 1,
          "text": "Mountain landscape with forest in foreground...",
          "score": 0.89
        }
      ],
      "preview": {
        "type": "image",
        "content": "Mountain landscape with forest..."
      }
    }
  ],
  "total": 15,
  "query": "mountain landscape photography",
  "processingTime": 145,
  "filters": { ... },
  "modalities": ["text", "image", "audio_transcript"]
}
```

### Get Multimodal Statistics

Retrieve comprehensive statistics about multimodal content usage and processing.

**Endpoint**: `GET /api/multimodal/stats`

**Response**:
```json
{
  "documents": {
    "total": 156,
    "byModality": {
      "text": 45,
      "image": 67,
      "audio": 28,
      "pdf_with_images": 16
    },
    "totalSize": 2147483648,
    "totalDuration": 18720
  },
  "chunks": {
    "total": 1247,
    "withEmbeddings": 1198,
    "byModality": {
      "text": 412,
      "image": 523,
      "audio_transcript": 245,
      "pdf_page_image": 67
    }
  },
  "processing": {
    "completed": 152,
    "failed": 3,
    "pending": 1,
    "averageProcessingTime": 3200
  },
  "brand": "brAInwav"
}
```

## Processing Details

### Image Processing

**Features**:
- Automatic format detection and validation
- Metadata extraction (dimensions, format, EXIF data)
- OCR text extraction when enabled
- Vision analysis for object detection and scene understanding
- Thumbnail and resized image generation

**Output Modalities**:
- `text`: OCR and vision analysis results
- `image`: Image metadata and descriptions

### Audio Processing

**Features**:
- Format validation and duration checking
- Speech-to-text transcription
- Speaker diarization (identifying different speakers)
- Waveform generation for visualization
- Timestamp preservation for segments

**Output Modalities**:
- `audio_transcript`: Transcribed text with speaker information

### PDF with Images Processing

**Features**:
- Text and image extraction from PDF pages
- Layout preservation and structure analysis
- OCR on extracted images
- Vision analysis on images
- Page-by-page content organization

**Output Modalities**:
- `text`: Extracted text content
- `pdf_page_image`: Processed images with descriptions

## Error Handling

The API uses standard HTTP status codes and returns detailed error information:

```json
{
  "error": "Multimodal System Error",
  "message": "File size exceeds maximum limit",
  "details": { "maxSize": "50MB", "providedSize": "75MB" },
  "brand": "brAInwav",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Common Error Codes**:
- `400`: Bad Request (invalid parameters, file too large)
- `401`: Unauthorized (missing or invalid authentication)
- `404`: Not Found (document doesn't exist)
- `413`: Payload Too Large (file exceeds limits)
- `500`: Internal Server Error (processing failures)

## Rate Limits

- Upload endpoints: 10 requests per minute
- Search endpoints: 60 requests per minute
- Document management: 30 requests per minute

## Best Practices

1. **File Preparation**: Ensure files are in supported formats and within size limits
2. **Processing Options**: Use appropriate options to balance processing time and accuracy
3. **Search Queries**: Use specific, relevant terms for better search results
4. **Error Handling**: Implement proper error handling and retry logic
5. **Batch Operations**: For multiple files, consider implementing batch processing with delays

## Integration Examples

### JavaScript/TypeScript

```typescript
// Upload an image with OCR and vision analysis
const formData = new FormData();
formData.append('file', imageFile);
formData.append('options', JSON.stringify({
  enableOCR: true,
  enableVisionAnalysis: true
}));

const response = await fetch('/api/multimodal/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData
});

const result = await response.json();
console.log('Uploaded document:', result.documentId);
```

```typescript
// Search across all modalities
const searchResponse = await fetch('/api/multimodal/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    query: 'solar energy systems',
    modalities: ['text', 'image', 'audio_transcript'],
    limit: 10
  })
});

const searchResults = await searchResponse.json();
console.log('Found results:', searchResults.results.length);
```

### Python

```python
import requests

# Upload an audio file for transcription
with open('meeting.mp3', 'rb') as f:
    files = {'file': f}
    data = {
        'options': json.dumps({
            'enableTranscription': True,
            'enableSpeakerDiarization': True,
            'language': 'en'
        })
    }

    response = requests.post(
        'https://your-domain.com/api/multimodal/upload',
        headers={'Authorization': f'Bearer {token}'},
        files=files,
        data=data
    )

result = response.json()
print(f"Transcribed audio: {result['documentId']}")
```

## Support

For support and questions about the Multimodal API:
- Documentation: Check this guide and API references
- Issues: Report through your organization's support channels
- Status: Check system health at `/health` endpoint

---

**brAInwav Cortex-OS Multimodal API v1.0**
*Last updated: January 2025*