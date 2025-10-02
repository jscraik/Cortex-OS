const http = require('http');
const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

/**
 * Mock File Processing Service for brAInwav Testing
 *
 * Provides mock file processing capabilities during testing:
 * - File upload and processing
 * - Text extraction from documents
 * - Image processing and analysis
 * - Audio transcription
 * - Format conversion
 */

const PORT = process.env.PORT || 3031;
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/brainwav-test-uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Supported file types
const SUPPORTED_TYPES = {
  'application/pdf': 'PDF Document',
  'text/plain': 'Plain Text',
  'text/markdown': 'Markdown',
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image',
  'image/webp': 'WebP Image',
  'audio/mpeg': 'MP3 Audio',
  'audio/wav': 'WAV Audio',
  'audio/ogg': 'OGG Audio'
};

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Test-Client');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url;
  const method = req.method;

  console.log(`${method} ${url}`);

  try {
    if (url === '/health' && method === 'GET') {
      handleHealth(req, res);
    } else if (url === '/api/v1/process' && method === 'POST') {
      handleFileProcessing(req, res);
    } else if (url === '/api/v1/upload' && method === 'POST') {
      handleFileUpload(req, res);
    } else if (url === '/api/v1/extract-text' && method === 'POST') {
      handleTextExtraction(req, res);
    } else if (url === '/api/v1/analyze-image' && method === 'POST') {
      handleImageAnalysis(req, res);
    } else if (url === '/api/v1/transcribe-audio' && method === 'POST') {
      handleAudioTranscription(req, res);
    } else if (url.startsWith('/api/v1/files/') && method === 'GET') {
      handleFileRetrieval(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Not Found',
        message: `Endpoint ${method} ${url} not found`,
        service: 'brAInwav Mock File Service'
      }));
    }
  } catch (error) {
    console.error('Error handling request:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message,
      service: 'brAInwav Mock File Service'
    }));
  }
});

function handleHealth(req, res) {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'brAInwav Mock File Service',
    version: '1.0.0',
    upload_dir: UPLOAD_DIR,
    supported_types: Object.keys(SUPPORTED_TYPES),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    disk_usage: getDiskUsage()
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(healthData));
}

function handleFileProcessing(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const request = JSON.parse(body);
      const { file_id, file_name, file_type, processing_options } = request;

      const processingResult = {
        id: faker.string.uuid(),
        file_id,
        file_name,
        file_type,
        status: 'completed',
        processed_at: new Date().toISOString(),
        results: processFile(file_type, processing_options),
        metadata: {
          processing_time: faker.number.int({ min: 1000, max: 5000 }),
          file_size: faker.number.int({ min: 1000, max: 10000000 }),
          service: 'brAInwav Mock File Service'
        }
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(processingResult));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Invalid JSON',
        message: error.message
      }));
    }
  });
}

function handleFileUpload(req, res) {
  // Handle multipart form data for file uploads
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.startsWith('multipart/form-data')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Content-Type must be multipart/form-data'
    }));
    return;
  }

  let fileData = Buffer.alloc(0);
  let fileName = '';
  let fileType = '';

  req.on('data', chunk => {
    fileData = Buffer.concat([fileData, chunk]);
  });

  req.on('end', () => {
    try {
      // Parse multipart data (simplified)
      const boundary = contentType.split(';')[1].split('=')[1];
      const parts = fileData.toString().split(`--${boundary}`);

      for (const part of parts) {
        if (part.includes('Content-Disposition') && part.includes('filename=')) {
          const lines = part.split('\r\n');
          for (const line of lines) {
            if (line.includes('filename=')) {
              fileName = line.split('filename=')[1].replace(/"/g, '');
            }
          }
          // Extract file data (simplified)
          const dataStart = part.indexOf('\r\n\r\n') + 4;
          const dataEnd = part.lastIndexOf('\r\n');
          if (dataStart > 3 && dataEnd > dataStart) {
            fileData = Buffer.from(part.slice(dataStart, dataEnd));
          }
        }
      }

      // Determine file type
      if (fileName.endsWith('.pdf')) fileType = 'application/pdf';
      else if (fileName.endsWith('.txt')) fileType = 'text/plain';
      else if (fileName.endsWith('.md')) fileType = 'text/markdown';
      else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) fileType = 'image/jpeg';
      else if (fileName.endsWith('.png')) fileType = 'image/png';
      else if (fileName.endsWith('.mp3')) fileType = 'audio/mpeg';

      // Validate file type
      if (!SUPPORTED_TYPES[fileType]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Unsupported file type',
          message: `File type ${fileType} is not supported`,
          supported_types: Object.keys(SUPPORTED_TYPES)
        }));
        return;
      }

      // Save file
      const fileId = faker.string.uuid();
      const filePath = path.join(UPLOAD_DIR, `${fileId}_${fileName}`);
      fs.writeFileSync(filePath, fileData);

      const uploadResult = {
        id: fileId,
        file_name: fileName,
        file_type: fileType,
        file_size: fileData.length,
        uploaded_at: new Date().toISOString(),
        file_path: filePath,
        processing_status: 'pending',
        service: 'brAInwav Mock File Service'
      };

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(uploadResult));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Upload failed',
        message: error.message
      }));
    }
  });
}

function handleTextExtraction(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const request = JSON.parse(body);
      const { file_id, extract_options } = request;

      const extractionResult = {
        file_id,
        extracted_text: generateMockExtractedText(),
        metadata: {
          pages: faker.number.int({ min: 1, max: 10 }),
          words: faker.number.int({ min: 200, max: 5000 }),
          characters: faker.number.int({ min: 1000, max: 25000 }),
          language: 'en',
          confidence: faker.number.float({ min: 0.85, max: 0.98, precision: 0.01 }),
          processing_time: faker.number.int({ min: 500, max: 3000 })
        },
        brAInwav_metadata: {
          service: 'brAInwav Mock File Service',
          extraction_method: 'ocr_nlp_hybrid',
          quality_score: faker.number.float({ min: 0.9, max: 0.99, precision: 0.01 })
        }
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(extractionResult));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Invalid JSON',
        message: error.message
      }));
    }
  });
}

function handleImageAnalysis(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const request = JSON.parse(body);
      const { file_id, analysis_options } = request;

      const analysisResult = {
        file_id,
        analysis: {
          objects: generateMockObjects(),
          text_recognized: generateMockRecognizedText(),
          colors: generateMockColors(),
          features: generateMockImageFeatures(),
          quality_score: faker.number.float({ min: 0.7, max: 0.95, precision: 0.01 })
        },
        metadata: {
          dimensions: {
            width: faker.number.int({ min: 800, max: 4000 }),
            height: faker.number.int({ min: 600, max: 3000 })
          },
          format: faker.helpers.arrayElement(['JPEG', 'PNG', 'WebP']),
          size_bytes: faker.number.int({ min: 50000, max: 5000000 }),
          processing_time: faker.number.int({ min: 1000, max: 4000 })
        },
        brAInwav_metadata: {
          service: 'brAInwav Mock File Service',
          analysis_model: 'vision_transformer_v2',
          confidence_threshold: 0.8
        }
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(analysisResult));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Invalid JSON',
        message: error.message
      }));
    }
  });
}

function handleAudioTranscription(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const request = JSON.parse(body);
      const { file_id, transcription_options } = request;

      const transcriptionResult = {
        file_id,
        transcription: {
          text: generateMockTranscription(),
          language: 'en',
          confidence: faker.number.float({ min: 0.85, max: 0.98, precision: 0.01 }),
          duration: faker.number.float({ min: 30, max: 300, precision: 0.1 }),
          speakers: faker.number.int({ min: 1, max: 3 })
        },
        metadata: {
          format: faker.helpers.arrayElement(['MP3', 'WAV', 'OGG']),
          sample_rate: 44100,
          channels: faker.helpers.arrayElement([1, 2]),
          bit_rate: faker.number.int({ min: 128, max: 320 }),
          processing_time: faker.number.int({ min: 2000, max: 8000 })
        },
        brAInwav_metadata: {
          service: 'brAInwav Mock File Service',
          transcription_model: 'whisper_large_v3',
          speaker_diarization: true
        }
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(transcriptionResult));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Invalid JSON',
        message: error.message
      }));
    }
  });
}

function handleFileRetrieval(req, res) {
  const fileId = req.url.split('/').pop();
  const filePath = path.join(UPLOAD_DIR, `${fileId}*`);

  // Find file (simplified)
  try {
    const files = fs.readdirSync(UPLOAD_DIR).filter(file => file.startsWith(fileId));
    if (files.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'File not found',
        file_id: fileId
      }));
      return;
    }

    const file = files[0];
    const fullPath = path.join(UPLOAD_DIR, file);
    const fileData = fs.readFileSync(fullPath);

    // Determine content type
    let contentType = 'application/octet-stream';
    if (file.endsWith('.pdf')) contentType = 'application/pdf';
    else if (file.endsWith('.txt')) contentType = 'text/plain';
    else if (file.endsWith('.md')) contentType = 'text/markdown';
    else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (file.endsWith('.png')) contentType = 'image/png';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fileData.length,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(fileData);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'File retrieval failed',
      message: error.message
    }));
  }
}

// Helper functions
function processFile(fileType, options = {}) {
  switch (fileType) {
    case 'application/pdf':
      return processPDF(options);
    case 'text/plain':
    case 'text/markdown':
      return processTextDocument(options);
    case 'image/jpeg':
    case 'image/png':
    case 'image/webp':
      return processImage(options);
    case 'audio/mpeg':
    case 'audio/wav':
    case 'audio/ogg':
      return processAudio(options);
    default:
      return { error: 'Unsupported file type' };
  }
}

function processPDF(options) {
  return {
    text_extracted: true,
    pages_processed: faker.number.int({ min: 1, max: 10 }),
    images_extracted: options.extract_images ? faker.number.int({ min: 0, max: 5 }) : 0,
    tables_detected: options.detect_tables ? faker.number.int({ min: 0, max: 3 }) : 0,
    forms_detected: options.detect_forms ? faker.number.int({ min: 0, max: 2 }) : 0
  };
}

function processTextDocument(options) {
  return {
    text_extracted: true,
    word_count: faker.number.int({ min: 200, max: 5000 }),
    paragraphs: faker.number.int({ min: 5, max: 50 }),
    readability_score: faker.number.int({ min: 60, max: 90 }),
    summary_generated: options.generate_summary
  };
}

function processImage(options) {
  return {
    text_recognized: options.ocr_text ? true : false,
    objects_detected: options.detect_objects ? faker.number.int({ min: 1, max: 10 }) : 0,
    faces_detected: options.detect_faces ? faker.number.int({ min: 0, max: 5 }) : 0,
    quality_score: faker.number.float({ min: 0.7, max: 0.95, precision: 0.01 })
  };
}

function processAudio(options) {
  return {
    transcribed: true,
    duration_seconds: faker.number.float({ min: 30, max: 300, precision: 0.1 }),
    speakers_detected: options.speaker_diarization ? faker.number.int({ min: 1, max: 3 }) : 1,
    language_detected: 'en',
    confidence_score: faker.number.float({ min: 0.85, max: 0.98, precision: 0.01 })
  };
}

function generateMockExtractedText() {
  const sentences = [
    'brAInwav Cortex-OS provides comprehensive autonomous software behavior reasoning capabilities.',
    'The system features advanced AI workflow orchestration with production-grade reliability.',
    'Comprehensive testing ensures consistent performance across all supported platforms.',
    'The architecture supports real-time communication between multiple AI agents.',
    'Document processing capabilities include text extraction, image analysis, and audio transcription.'
  ];

  return sentences.join(' ') + ' ' + sentences.join(' ');
}

function generateMockObjects() {
  return [
    { class: 'document', confidence: 0.95, bbox: [100, 100, 400, 300] },
    { class: 'chart', confidence: 0.87, bbox: [450, 200, 300, 200] },
    { class: 'logo', confidence: 0.92, bbox: [50, 50, 80, 30] }
  ];
}

function generateMockRecognizedText() {
  return 'brAInwav Cortex-OS - Autonomous Software Behavior Reasoning';
}

function generateMockColors() {
  return [
    { color: '#2E3A87', percentage: 35.2, name: 'brAInwav Blue' },
    { color: '#FFFFFF', percentage: 40.1, name: 'White' },
    { color: '#1A1A1A', percentage: 24.7, name: 'Dark Gray' }
  ];
}

function generateMockImageFeatures() {
  return {
    sharpness: faker.number.float({ min: 0.7, max: 0.95, precision: 0.01 }),
    brightness: faker.number.float({ min: 0.3, max: 0.8, precision: 0.01 }),
    contrast: faker.number.float({ min: 0.4, max: 0.9, precision: 0.01 }),
    has_transparency: faker.datatype.boolean()
  };
}

function generateMockTranscription() {
  return `Welcome to the brAInwav Cortex-OS presentation. Today we'll discuss the autonomous software behavior reasoning capabilities and how they enable sophisticated AI workflows. The system features comprehensive testing across all major browsers and platforms, ensuring production-grade reliability for enterprise deployments.`;
}

function getDiskUsage() {
  try {
    const stats = fs.statSync(UPLOAD_DIR);
    return {
      upload_dir: UPLOAD_DIR,
      available: true
    };
  } catch (error) {
    return {
      upload_dir: UPLOAD_DIR,
      available: false,
      error: error.message
    };
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`📁 brAInwav Mock File Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Upload directory: ${UPLOAD_DIR}`);
  console.log(`Supported types: ${Object.keys(SUPPORTED_TYPES).join(', ')}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📁 brAInwav Mock File Service shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = server;