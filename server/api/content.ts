import express from 'express';
import { db } from '../db.js';
import { content, users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { verifyToken } from './auth.js';

const router = express.Router();

// Create new content
router.post('/', verifyToken, async (req: any, res: any) => {
  try {
    const { title, body, imageUrl, status, type, generatedByAi, aiModelUsed, ethicsCheckStatus, metadata } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }
    
    const newContent = await db.insert(content).values({
      userId: req.user.id,
      title,
      body,
      imageUrl: imageUrl || null,
      status: status || 'draft',
      type: type || 'news_article',
      generatedByAi: generatedByAi || 0,
      aiModelUsed: aiModelUsed || null,
      ethicsCheckStatus: ethicsCheckStatus || 'pending',
      metadata: metadata || '{}'
    }).returning();
    
    res.status(201).json(newContent[0]);
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's content
router.get('/my', verifyToken, async (req: any, res: any) => {
  try {
    const userContent = await db.select().from(content).where(eq(content.userId, req.user.id));
    res.json(userContent);
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all published content
router.get('/published', async (req, res) => {
  try {
    const publishedContent = await db.select().from(content).where(eq(content.status, 'published'));
    res.json(publishedContent);
  } catch (error) {
    console.error('Get published content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update content
router.put('/:id', verifyToken, async (req: any, res: any) => {
  try {
    const contentId = req.params.id;
    const updates = req.body;
    
    // Check if content belongs to user
    const existingContent = await db.select().from(content).where(eq(content.id, contentId));
    if (existingContent.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    if (existingContent[0].userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const updatedContent = await db.update(content)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(content.id, contentId))
      .returning();
    
    res.json(updatedContent[0]);
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;