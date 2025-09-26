-- Sample data for Must Be Viral
-- This file populates the database with test data for development

-- Sample users
INSERT OR IGNORE INTO users (id, email, username, password_hash, role, profile_data, ai_preference_level, onboarding_completed) VALUES
('user1', 'creator@example.com', 'content_creator', '$2b$10$example_hash_1', 'creator', '{"bio": "AI content creator", "social_links": {"twitter": "@creator"}}', 75, 1),
('user2', 'influencer@example.com', 'tech_influencer', '$2b$10$example_hash_2', 'influencer', '{"bio": "Tech influencer", "social_links": {"instagram": "@techinfluencer"}}', 25, 1),
('user3', 'admin@example.com', 'admin_user', '$2b$10$example_hash_3', 'admin', '{"bio": "Platform administrator"}', 50, 1);

-- Sample content
INSERT OR IGNORE INTO content (id, user_id, title, body, status, type, generated_by_ai, ai_model_used, ethics_check_status) VALUES
('content1', 'user1', 'AI Revolution in Content Creation', 'The landscape of content creation is rapidly evolving with AI...', 'published', 'news_article', 1, 'Llama-3.1', 'passed'),
('content2', 'user1', 'Future of Social Media Marketing', 'Social media platforms are integrating more AI features...', 'draft', 'blog_post', 1, 'Gemma', 'pending'),
('content3', 'user2', 'Tech Trends 2025', 'Here are the top technology trends to watch in 2025...', 'published', 'social_post', 0, NULL, 'passed');

-- Sample matches
INSERT OR IGNORE INTO matches (id, content_id, influencer_user_id, match_score, status, match_details) VALUES
('match1', 'content1', 'user2', 0.85, 'pending', '{"campaign_brief": "Promote AI content article", "estimated_reach": 10000}'),
('match2', 'content2', 'user2', 0.72, 'accepted', '{"campaign_brief": "Share blog post insights", "estimated_reach": 15000}');