// Copyright 2024 MATTY"s Crazy Ideas

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import express from 'express'
import ViteExpress from 'vite-express'
import multer from 'multer'
import {mkdir, writeFile, readFile, rm, access} from 'fs/promises'
import {createReadStream} from 'fs'
import {join} from 'path'
import {checkProgress, promptVideo, uploadVideo} from './upload.mjs'

// Load environment variables
import * as dotenv from 'dotenv'
dotenv.config({path: '.env'})

// Ensure environment variables are available
if (!process.env.VITE_GEMINI_API_KEY) {
  console.error('Missing required environment variable: VITE_GEMINI_API_KEY')
  process.exit(1)
}

const app = express()
app.use(express.json())

const UPLOAD_DIR = './uploads'
const CHUNK_DIR = join(UPLOAD_DIR, 'chunks')
const MAX_CHUNK_SIZE = 50 * 1024 * 1024 // 50MB chunks for better memory handling

// Ensure upload directories exist
try {
  await access(UPLOAD_DIR)
} catch {
  await mkdir(UPLOAD_DIR, {recursive: true})
}

try {
  await access(CHUNK_DIR)
} catch {
  await mkdir(CHUNK_DIR, {recursive: true})
}

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_CHUNK_SIZE
  }
})

// Initialize upload
app.post('/api/upload/init', async (req, res) => {
  try {
    const {fileName, fileType, fileSize} = req.body
    console.log('Initializing upload:', {fileName, fileType, fileSize})
    
    const fileId = Date.now().toString()
    const uploadDir = join(CHUNK_DIR, fileId)
    await mkdir(uploadDir, {recursive: true})
    
    await writeFile(join(uploadDir, 'metadata.json'), JSON.stringify({
      fileName,
      fileType,
      fileSize,
      chunks: []
    }))
    
    res.json({fileId})
  } catch (error) {
    console.error('Upload init error:', error)
    res.status(500).json({error: error.message})
  }
})

// Handle chunk upload
app.post('/api/upload/chunk', upload.single('chunk'), async (req, res) => {
  try {
    const metadata = JSON.parse(req.body.metadata)
    console.log('Received chunk:', {
      fileId: metadata.fileId,
      index: metadata.index,
      size: metadata.size
    })

    const chunkPath = join(CHUNK_DIR, metadata.fileId, `chunk.${metadata.index}`)
    await writeFile(chunkPath, req.file.buffer)

    // Update metadata
    const metadataPath = join(CHUNK_DIR, metadata.fileId, 'metadata.json')
    const fileMetadata = JSON.parse(await readFile(metadataPath, 'utf8'))
    fileMetadata.chunks.push(metadata.index)
    await writeFile(metadataPath, JSON.stringify(fileMetadata))

    res.json({success: true})
  } catch (error) {
    console.error('Chunk upload error:', error)
    res.status(500).json({error: error.message})
  }
})

// Complete upload
app.get('/api/upload/complete/:fileId', async (req, res) => {
  try {
    const {fileId} = req.params
    console.log('Completing upload:', fileId)

    const uploadDir = join(CHUNK_DIR, fileId)
    const metadataPath = join(uploadDir, 'metadata.json')
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))

    // Create a temporary file for the complete video
    const tempFilePath = join(uploadDir, `${metadata.fileName}_complete`)
    
    // Process chunks in sequence to avoid memory issues
    for (const index of metadata.chunks.sort((a, b) => a - b)) {
      const chunkPath = join(uploadDir, `chunk.${index}`)
      const chunkData = await readFile(chunkPath)
      await writeFile(tempFilePath, chunkData, {flag: 'a'})
    }

    // Upload the complete file
    const fileStream = createReadStream(tempFilePath)
    const resp = await uploadVideo({
      stream: fileStream,
      originalname: metadata.fileName,
      mimetype: metadata.fileType
    })

    // Cleanup temporary file
    await rm(tempFilePath, {force: true})

    res.json({data: resp})
  } catch (error) {
    console.error('Upload completion error:', error)
    res.status(500).json({error: error.message})
  }
})

app.post('/api/progress', async (req, res) => {
  try {
    console.log('Progress check request:', {fileId: req.body.fileId})
    const progress = await checkProgress(req.body.fileId)
    console.log('Progress check response:', progress)
    res.json({progress})
  } catch (error) {
    console.error('Progress endpoint error:', {
      message: error.message,
      stack: error.stack,
      details: error
    })
    res.status(500).json({error})
  }
})

app.post('/api/prompt', async (req, res) => {
  try {
    const reqData = req.body
    const videoResponse = await promptVideo(
      reqData.uploadResult,
      reqData.prompt,
      reqData.model
    )
    res.json(videoResponse)
  } catch (error) {
    res.json({error}, {status: 400})
  }
})

const port = process.env.NODE_ENV === 'production' ? 8080 : 8000

ViteExpress.listen(app, port, () => console.log('Server is listening...'))