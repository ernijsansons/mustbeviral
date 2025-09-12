import express from 'express';
import { db } from '../db.mjs';
import { verifyToken } from './auth.mjs';

const router = express.Router();

// Raw SQL queries for content operations
const createContentQuery = `
  INSERT INTO content (user_id, title, body, image_url, status, type, generated_by_ai, ai_model_used, ethics_check_status, metadata)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  RETURNING *
`;
const getUserContentQuery = 'SELECT * FROM content WHERE user_id = $1 ORDER BY created_at DESC';
const getPublishedContentQuery = 'SELECT * FROM content WHERE status = $1 ORDER BY created_at DESC';
const getContentByIdQuery = 'SELECT * FROM content WHERE id = $1';
const updateContentQuery = `
  UPDATE content 
  SET title = $1, body = $2, image_url = $3, status = $4, type = $5, generated_by_ai = $6, 
      ai_model_used = $7, ethics_check_status = $8, metadata = $9, updated_at = NOW()
  WHERE id = $10
  RETURNING *
`;

// Create new content
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, body, imageUrl, status, type, generatedByAi, aiModelUsed, ethicsCheckStatus, metadata } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }
    
    const newContent = await db.execute({
      sql: createContentQuery,
      args: [
        req.user.id,
        title,
        body,
        imageUrl || null,
        status || 'draft',
        type || 'news_article',
        generatedByAi || 0,
        aiModelUsed || null,
        ethicsCheckStatus || 'pending',
        metadata || '{}'
      ]
    });
    
    res.status(201).json(newContent.rows[0]);
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's content
router.get('/my', verifyToken, async (req, res) => {
  try {
    const userContent = await db.execute({
      sql: getUserContentQuery,
      args: [req.user.id]
    });
    
    res.json(userContent.rows);
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all published content
router.get('/published', async (req, res) => {
  try {
    const publishedContent = await db.execute({
      sql: getPublishedContentQuery,
      args: ['published']
    });
    
    res.json(publishedContent.rows);
  } catch (error) {
    console.error('Get published content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update content
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const contentId = req.params.id;
    const { title, body, imageUrl, status, type, generatedByAi, aiModelUsed, ethicsCheckStatus, metadata } = req.body;
    
    // Check if content exists and belongs to user
    const existingContent = await db.execute({
      sql: getContentByIdQuery,
      args: [contentId]
    });
    
    if (existingContent.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    if (existingContent.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const updatedContent = await db.execute({
      sql: updateContentQuery,
      args: [
        title || existingContent.rows[0].title,
        body || existingContent.rows[0].body,
        imageUrl !== undefined ? imageUrl : existingContent.rows[0].image_url,
        status || existingContent.rows[0].status,
        type || existingContent.rows[0].type,
        generatedByAi !== undefined ? generatedByAi : existingContent.rows[0].generated_by_ai,
        aiModelUsed !== undefined ? aiModelUsed : existingContent.rows[0].ai_model_used,
        ethicsCheckStatus || existingContent.rows[0].ethics_check_status,
        metadata || existingContent.rows[0].metadata,
        contentId
      ]
    });
    
    res.json(updatedContent.rows[0]);
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;