import { test, expect } from '@playwright/test';
import path from 'node:path';

/**
 * brAInwav Cortex-OS Document Processing E2E Tests
 *
 * Comprehensive testing of document processing workflows:
 * - File upload for various formats (PDF, images, audio, text)
 * - RAG query and citation validation
 * - Multimodal content processing
 * - Search and retrieval workflows
 * - Document metadata extraction
 * - Batch processing capabilities
 * - Error handling and recovery
 */
test.describe('brAInwav Cortex-OS Document Processing', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'testuser@brainwav.ai');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-submit-button"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test.describe('File Upload Workflows', () => {
    test('should upload PDF document successfully', async ({ page }) => {
      await page.click('[data-testid="documents-nav"]');
      await expect(page).toHaveURL(/\/documents/);

      // Click upload button
      await page.click('[data-testid="upload-document-button"]');
      await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();

      // Verify brAInwav branding
      await expect(page.locator('text=brAInwav Document Processing')).toBeVisible();

      // Select PDF file
      const filePath = path.join(__dirname, '..', 'fixtures', 'sample-document.pdf');

      // Create mock file if it doesn't exist
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'sample-document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Mock PDF content for brAInwav testing')
      });

      // Should show file preview
      await expect(page.locator('[data-testid="file-preview"]')).toBeVisible();
      await expect(page.locator('text=sample-document.pdf')).toBeVisible();

      // Add metadata
      await page.fill('[data-testid="document-title"]', 'brAInwav Architecture Guide');
      await page.fill('[data-testid="document-description"]', 'Comprehensive guide to brAInwav Cortex-OS architecture');
      await page.fill('[data-testid="document-tags"]', 'architecture, brainwav, cortex-os');

      // Submit upload
      await page.click('[data-testid="upload-submit-button"]');

      // Should show processing indicator
      await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible();
      await expect(page.locator('text=Processing document...')).toBeVisible();

      // Should complete processing and redirect to document view
      await page.waitForSelector('[data-testid="processing-complete"]', { timeout: 30000 });
      await expect(page).toHaveURL(/\/documents\/[\w-]+/);

      // Verify document details
      await expect(page.locator('text=brAInwav Architecture Guide')).toBeVisible();
      await expect(page.locator('text=Document processed successfully')).toBeVisible();
      await expect(page.locator('[data-testid="document-content"]')).toBeVisible();
    });

    test('should upload and process image files', async ({ page }) => {
      await page.goto('/documents');
      await page.click('[data-testid="upload-document-button"]');

      // Upload image file
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'brainwav-screenshot.png',
        mimeType: 'image/png',
        buffer: Buffer.from('Mock PNG image content for brAInwav testing')
      });

      await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();

      await page.fill('[data-testid="document-title"]', 'brAInwav Screenshot');
      await page.click('[data-testid="upload-submit-button"]');

      // Should show image processing
      await expect(page.locator('text=Extracting text from image...')).toBeVisible();
      await expect(page.locator('text=Analyzing image content...')).toBeVisible();

      // Complete processing
      await page.waitForSelector('[data-testid="processing-complete"]', { timeout: 30000 });

      // Verify extracted text
      await expect(page.locator('[data-testid="extracted-text"]')).toBeVisible();
      await expect(page.locator('[data-testid="image-analysis"]')).toBeVisible();
    });

    test('should upload and process audio files', async ({ page }) => {
      await page.goto('/documents');
      await page.click('[data-testid="upload-document-button"]');

      // Upload audio file
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'brainwav-audio.mp3',
        mimeType: 'audio/mpeg',
        buffer: Buffer.from('Mock MP3 audio content for brAInwav testing')
      });

      await expect(page.locator('[data-testid="audio-preview"]')).toBeVisible();

      await page.fill('[data-testid="document-title"]', 'brAInwav Team Meeting');
      await page.click('[data-testid="upload-submit-button"]');

      // Should show transcription process
      await expect(page.locator('text=Transcribing audio...')).toBeVisible();
      await expect(page.locator('text=Processing speech-to-text...')).toBeVisible();

      // Complete processing
      await page.waitForSelector('[data-testid="processing-complete"]', { timeout: 45000 });

      // Verify transcription
      await expect(page.locator('[data-testid="transcription-text"]')).toBeVisible();
      await expect(page.locator('[data-testid="audio-duration"]')).toBeVisible();
    });

    test('should handle multiple file uploads', async ({ page }) => {
      await page.goto('/documents');
      await page.click('[data-testid="upload-document-button"]');

      // Enable batch upload
      await page.check('[data-testid="batch-upload-checkbox"]');

      // Upload multiple files
      const files = [
        {
          name: 'doc1.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('Document 1 content for brAInwav')
        },
        {
          name: 'doc2.md',
          mimeType: 'text/markdown',
          buffer: Buffer.from('# Document 2\n\nContent for brAInwav Cortex-OS')
        },
        {
          name: 'doc3.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Plain text document for brAInwav testing')
        }
      ];

      await page.setInputFiles('[data-testid="file-input"]', files);

      // Should show batch upload progress
      await expect(page.locator('[data-testid="batch-upload-progress"]')).toBeVisible();
      await expect(page.locator('text=Processing 3 files...')).toBeVisible();

      // Wait for all files to complete
      await page.waitForSelector('[data-testid="batch-complete"]', { timeout: 60000 });

      // Verify all files uploaded
      await expect(page.locator('[data-testid="uploaded-files"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-item"]')).toHaveCount(3);
    });

    test('should validate file types and sizes', async ({ page }) => {
      await page.goto('/documents');
      await page.click('[data-testid="upload-document-button"]');

      // Try to upload unsupported file type
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'malicious.exe',
        mimeType: 'application/x-executable',
        buffer: Buffer.from('Malicious content')
      });

      // Should show error
      await expect(page.locator('text=File type not supported')).toBeVisible();
      await expect(page.locator('text=Please upload PDF, image, audio, or text files')).toBeVisible();

      // Try to upload oversized file
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'huge-file.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(100 * 1024 * 1024) // 100MB
      });

      await expect(page.locator('text=File size exceeds limit')).toBeVisible();
      await expect(page.locator('text=Maximum file size is 50MB')).toBeVisible();
    });
  });

  test.describe('RAG Query and Citation Validation', () => {
    test.beforeEach(async ({ page }) => {
      // Ensure we have documents for RAG testing
      await page.goto('/documents');

      // Check if documents exist, if not create mock documents
      const documentCount = await page.locator('[data-testid="document-item"]').count();
      if (documentCount === 0) {
        // Create mock documents via API
        await page.request.post('/api/documents', {
          data: {
            title: 'brAInwav Cortex-OS Guide',
            content: 'Comprehensive guide to brAInwav Cortex-OS architecture and implementation...',
            tags: ['brainwav', 'cortex-os', 'architecture']
          }
        });

        await page.request.post('/api/documents', {
          data: {
            title: 'ASBR Runtime Documentation',
            content: 'Detailed documentation for Autonomous Software Behavior Reasoning runtime...',
            tags: ['asbr', 'runtime', 'brainwav']
          }
        });

        await page.reload();
      }
    });

    test('should perform RAG query successfully', async ({ page }) => {
      await page.click('[data-testid="chat-nav"]');
      await expect(page).toHaveURL(/\/chat/);

      // Enable document search
      await page.check('[data-testid="search-documents-checkbox"]');
      await expect(page.locator('[data-testid="document-search-enabled"]')).toBeVisible();

      // Enter query
      await page.fill('[data-testid="message-input"]', 'What is brAInwav Cortex-OS architecture?');
      await page.click('[data-testid="send-message-button"]');

      // Should show search progress
      await expect(page.locator('[data-testid="searching-documents"]')).toBeVisible();
      await expect(page.locator('text=Searching brAInwav knowledge base...')).toBeVisible();

      // Should show response with citations
      await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });
      await expect(page.locator('[data-testid="citations"]')).toBeVisible();
      await expect(page.locator('[data-testid="citation-item"]')).toHaveCount.toBeGreaterThan(0);

      // Verify citation sources
      await expect(page.locator('text=brAInwav Cortex-OS Guide')).toBeVisible();

      // Click on citation to view source
      await page.click('[data-testid="citation-item"]:first-child');
      await expect(page.locator('[data-testid="citation-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="source-content"]')).toBeVisible();
    });

    test('should handle multi-document queries', async ({ page }) => {
      await page.goto('/chat');
      await page.check('[data-testid="search-documents-checkbox"]');

      // Complex query requiring multiple sources
      await page.fill('[data-testid="message-input"]', 'Compare brAInwav Cortex-OS with traditional AI systems and explain ASBR benefits');
      await page.click('[data-testid="send-message-button"]');

      await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });

      // Should cite multiple documents
      await expect(page.locator('[data-testid="citation-item"]')).toHaveCount.toBeGreaterThan(1);

      // Should show source comparison
      await expect(page.locator('[data-testid="source-comparison"]')).toBeVisible();
      await expect(page.locator('text=brAInwav Cortex-OS Guide')).toBeVisible();
      await expect(page.locator('text=ASBR Runtime Documentation')).toBeVisible();
    });

    test('should handle follow-up questions with context', async ({ page }) => {
      await page.goto('/chat');
      await page.check('[data-testid="search-documents-checkbox"]');

      // Initial query
      await page.fill('[data-testid="message-input"]', 'Explain ASBR runtime');
      await page.click('[data-testid="send-message-button"]');
      await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });

      // Follow-up question
      await page.fill('[data-testid="message-input"]', 'What are the main components?');
      await page.click('[data-testid="send-message-button"]');
      await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });

      // Should maintain context from previous query
      await expect(page.locator('text=Based on the previous discussion')).toBeVisible();
      await expect(page.locator('[data-testid="context-indicator"]')).toBeVisible();
    });

    test('should validate citation accuracy', async ({ page }) => {
      await page.goto('/chat');
      await page.check('[data-testid="search-documents-checkbox"]');

      await page.fill('[data-testid="message-input"]', 'What are the key features of brAInwav?');
      await page.click('[data-testid="send-message-button"]');
      await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });

      // Verify citations are accurate
      const citations = await page.locator('[data-testid="citation-item"]').all();
      for (const citation of citations) {
        await citation.click();
        await expect(page.locator('[data-testid="citation-modal"]')).toBeVisible();

        // Verify cited text exists in source
        const citedText = await page.locator('[data-testid="cited-text"]').textContent();
        const sourceText = await page.locator('[data-testid="source-content"]').textContent();
        expect(sourceText).toContain(citedText?.trim() || '');

        await page.click('[data-testid="close-citation-modal"]');
      }
    });
  });

  test.describe('Search and Retrieval Workflows', () => {
    test('should perform document search', async ({ page }) => {
      await page.goto('/documents');

      // Use search bar
      await page.fill('[data-testid="search-input"]', 'brAInwav');
      await page.click('[data-testid="search-button"]');

      // Should show search results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="document-item"]')).toHaveCount.toBeGreaterThan(0);

      // Verify search highlights
      await expect(page.locator('[data-testid="search-highlight"]')).toBeVisible();
    });

    test('should filter documents by tags', async ({ page }) => {
      await page.goto('/documents');

      // Click on tag filter
      await page.click('[data-testid="tag-filter"]:has-text("brainwav")');

      // Should filter documents
      await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();

      // Verify all results have the tag
      const documentItems = await page.locator('[data-testid="document-item"]').all();
      for (const item of documentItems) {
        await expect(item.locator('[data-testid="document-tags"]')).toContainText('brainwav');
      }
    });

    test('should perform advanced search', async ({ page }) => {
      await page.goto('/documents');

      // Open advanced search
      await page.click('[data-testid="advanced-search-button"]');
      await expect(page.locator('[data-testid="advanced-search-modal"]')).toBeVisible();

      // Set search criteria
      await page.fill('[data-testid="search-title"]', 'brAInwav');
      await page.selectOption('[data-testid="search-file-type"]', 'application/pdf');
      await page.fill('[data-testid="search-date-from"]', '2024-01-01');
      await page.click('[data-testid="apply-filters"]');

      // Should show filtered results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

      // Verify filters applied
      await expect(page.locator('[data-testid="active-filters"]')).toBeVisible();
      await expect(page.locator('text=PDF only')).toBeVisible();
    });

    test('should sort documents', async ({ page }) => {
      await page.goto('/documents');

      // Sort by date
      await page.selectOption('[data-testid="sort-select"]', 'date-desc');

      // Verify sort order
      const firstDate = await page.locator('[data-testid="document-item"]:first-child [data-testid="document-date"]').textContent();
      const secondDate = await page.locator('[data-testid="document-item"]:nth-child(2) [data-testid="document-date"]').textContent();

      expect(new Date(firstDate || '')).toBeGreaterThan(new Date(secondDate || ''));

      // Sort by relevance
      await page.selectOption('[data-testid="sort-select"]', 'relevance');
      await expect(page.locator('[data-testid="sorted-by-relevance"]')).toBeVisible();
    });
  });

  test.describe('Document Management', () => {
    test('should edit document metadata', async ({ page }) => {
      await page.goto('/documents');
      await page.click('[data-testid="document-item"]:first-child');
      await expect(page).toHaveURL(/\/documents\/[\w-]+/);

      // Click edit button
      await page.click('[data-testid="edit-document-button"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // Update metadata
      await page.fill('[data-testid="document-title"]', 'Updated brAInwav Document');
      await page.fill('[data-testid="document-tags"]', 'brainwav, updated, cortex-os');
      await page.click('[data-testid="save-changes-button"]');

      // Should show success message
      await expect(page.locator('text=Document updated successfully')).toBeVisible();
      await expect(page.locator('text=Updated brAInwav Document')).toBeVisible();
    });

    test('should delete document', async ({ page }) => {
      await page.goto('/documents');

      // Count documents before deletion
      const initialCount = await page.locator('[data-testid="document-item"]').count();

      // Delete first document
      await page.hover('[data-testid="document-item"]:first-child');
      await page.click('[data-testid="delete-document-button"]');
      await expect(page.locator('[data-testid="delete-modal"]')).toBeVisible();

      // Confirm deletion
      await page.fill('[data-testid="confirm-text"]', 'DELETE');
      await page.click('[data-testid="confirm-delete-button"]');

      // Should show success message
      await expect(page.locator('text=Document deleted successfully')).toBeVisible();

      // Verify document count decreased
      const finalCount = await page.locator('[data-testid="document-item"]').count();
      expect(finalCount).toBe(initialCount - 1);
    });

    test('should export documents', async ({ page }) => {
      await page.goto('/documents');

      // Select documents for export
      await page.check('[data-testid="document-item"]:first-child [data-testid="select-document"]');
      await page.check('[data-testid="document-item"]:nth-child(2) [data-testid="select-document"]');

      // Click export button
      await page.click('[data-testid="export-button"]');
      await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();

      // Select export format
      await page.selectOption('[data-testid="export-format"]', 'pdf');
      await page.click('[data-testid="start-export-button"]');

      // Should show export progress
      await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
      await expect(page.locator('text=Exporting documents...')).toBeVisible();

      // Should complete and provide download
      await page.waitForSelector('[data-testid="export-complete"]', { timeout: 30000 });
      await expect(page.locator('[data-testid="download-export-button"]')).toBeVisible();
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle upload failures gracefully', async ({ page }) => {
      await page.goto('/documents');
      await page.click('[data-testid="upload-document-button"]');

      // Simulate upload failure
      await page.route('**/api/documents/upload', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Upload service temporarily unavailable' })
        });
      });

      // Attempt upload
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Test content')
      });
      await page.click('[data-testid="upload-submit-button"]');

      // Should show error message
      await expect(page.locator('text=Upload failed')).toBeVisible();
      await expect(page.locator('text=Please try again later')).toBeVisible();

      // Should provide retry option
      await expect(page.locator('[data-testid="retry-upload-button"]')).toBeVisible();
    });

    test('should handle processing interruptions', async ({ page }) => {
      await page.goto('/documents');
      await page.click('[data-testid="upload-document-button"]');

      // Start upload
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'large-document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(10 * 1024 * 1024) // 10MB
      });
      await page.click('[data-testid="upload-submit-button"]');

      // Cancel processing
      await page.click('[data-testid="cancel-processing-button"]');

      // Should show cancellation message
      await expect(page.locator('text=Processing cancelled')).toBeVisible();
      await expect(page.locator('[data-testid="cleanup-message"]')).toBeVisible();
    });
  });
});