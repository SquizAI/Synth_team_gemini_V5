import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import multer from 'multer';
import { mkdir, rm } from 'fs/promises';
import path from 'path';

const app = express();
const UPLOAD_DIR = './test-uploads';
const CHUNK_DIR = path.join(UPLOAD_DIR, 'chunks');

// Mock file data
const mockFile = {
  buffer: Buffer.from('test video content'),
  originalname: 'test.mp4',
  mimetype: 'video/mp4'
};

// Setup test environment
beforeAll(async () => {
  await mkdir(UPLOAD_DIR, { recursive: true });
  await mkdir(CHUNK_DIR, { recursive: true });
});

// Cleanup after tests
afterAll(async () => {
  await rm(UPLOAD_DIR, { recursive: true, force: true });
});

describe('Upload Routes', () => {
  it('should initialize upload', async () => {
    const res = await request(app)
      .post('/api/upload/init')
      .send({
        fileName: 'test.mp4',
        fileType: 'video/mp4',
        fileSize: 1000
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('fileId');
  });

  it('should handle chunk upload', async () => {
    const fileId = Date.now().toString();
    const chunkData = {
      fileId,
      index: 0,
      offset: 0,
      size: mockFile.buffer.length
    };

    const res = await request(app)
      .post('/api/upload/chunk')
      .attach('chunk', mockFile.buffer, 'chunk.0')
      .field('metadata', JSON.stringify(chunkData));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should complete upload', async () => {
    const fileId = Date.now().toString();
    
    const res = await request(app)
      .get(`/api/upload/complete/${fileId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });
});

describe('Progress Route', () => {
  it('should check progress', async () => {
    const res = await request(app)
      .post('/api/progress')
      .send({ fileId: 'test-file-id' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('progress');
  });
});

describe('Prompt Route', () => {
  it('should handle video prompts', async () => {
    const mockUploadResult = {
      mimeType: 'video/mp4',
      uri: 'test-uri'
    };

    const res = await request(app)
      .post('/api/prompt')
      .send({
        uploadResult: mockUploadResult,
        prompt: 'Describe this video',
        model: 'gemini-pro-vision'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('text');
  });
});