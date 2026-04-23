// controllers/statsController.js - 统计控制器
const db = require('../db/db');

// 搜索文章
function search(req, res) {
    const keyword = req.query.q;
    
    if (!keyword || keyword.trim() === '') {
        res.status(400).json({ error: '搜索关键词不能为空' });
        return;
    }
    
    const searchTerm = `%${keyword.trim()}%`;
    const sql = `
        SELECT articles.*, users.username as author_name 
        FROM articles 
        LEFT JOIN users ON articles.user_id = users.id 
        WHERE articles.title LIKE ? OR articles.content LIKE ? OR articles.summary LIKE ?
        ORDER BY articles.is_pinned DESC, articles.created_at DESC
    `;
    
    db.all(sql, [searchTerm, searchTerm, searchTerm], (err, rows) => {
        if (err) {
            console.error('搜索失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        res.json(rows);
    });
}

// 获取热门文章
function getPopular(req, res) {
    const limit = parseInt(req.query.limit) || 5;
    
    const sql = `
        SELECT articles.id, articles.title, articles.summary, articles.views, 
               articles.created_at, users.username as author_name
        FROM articles 
        LEFT JOIN users ON articles.user_id = users.id 
        WHERE articles.views > 0
        ORDER BY articles.views DESC
        LIMIT ?
    `;
    
    db.all(sql, [limit], (err, rows) => {
        if (err) {
            console.error('获取排行榜失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        res.json(rows);
    });
}

// 获取文章归档
function getArchive(req, res) {
    const sql = `
        SELECT 
            strftime('%Y', created_at) as year,
            strftime('%m', created_at) as month,
            strftime('%Y-%m', created_at) as year_month,
            COUNT(*) as count
        FROM articles 
        GROUP BY year_month
        ORDER BY year_month DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('获取归档失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        res.json(rows);
    });
}

// 获取指定月份的文章
function getArchiveByMonth(req, res) {
    const { yearMonth } = req.params;
    
    const sql = `
        SELECT articles.*, users.username as author_name 
        FROM articles 
        LEFT JOIN users ON articles.user_id = users.id 
        WHERE strftime('%Y-%m', articles.created_at) = ?
        ORDER BY articles.created_at DESC
    `;
    
    db.all(sql, [yearMonth], (err, rows) => {
        if (err) {
            console.error('获取归档文章失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        res.json(rows);
    });
}

// 获取博客统计数据
function getStats(req, res) {
    const stats = {};
    
    // 1. 总文章数
    const sql1 = `SELECT COUNT(*) as total FROM articles`;
    db.get(sql1, [], (err, row) => {
        if (err) {
            console.error('统计失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        stats.totalArticles = row.total;

        // 2. 草稿数量
        const sqlDraft = `SELECT COUNT(*) as total FROM articles WHERE status = 'draft'`;
        db.get(sqlDraft, [], (err, row) => {
            if (err) {
                console.error('统计失败:', err.message);
                res.status(500).json({ error: '服务器错误' });
                return;
            }
            stats.draftCount = row.total || 0;
            
            // 3. 总阅读量
            const sql2 = `SELECT SUM(views) as total FROM articles`;
            db.get(sql2, [], (err, row) => {
                if (err) {
                    console.error('统计失败:', err.message);
                    res.status(500).json({ error: '服务器错误' });
                    return;
                }
                stats.totalViews = row.total || 0;
                
                // 4. 总评论数
                const sql3 = `SELECT COUNT(*) as total FROM comments`;
                db.get(sql3, [], (err, row) => {
                    if (err) {
                        console.error('统计失败:', err.message);
                        res.status(500).json({ error: '服务器错误' });
                        return;
                    }
                    stats.totalComments = row.total || 0;
                    
                    // 5. 总用户数
                    const sql4 = `SELECT COUNT(*) as total FROM users`;
                    db.get(sql4, [], (err, row) => {
                        if (err) {
                            console.error('统计失败:', err.message);
                            res.status(500).json({ error: '服务器错误' });
                            return;
                        }
                        stats.totalUsers = row.total || 0;
                        
                        // 6. 今日新增文章
                        const sql5 = `SELECT COUNT(*) as total FROM articles WHERE date(created_at) = date('now')`;
                        db.get(sql5, [], (err, row) => {
                            if (err) {
                                console.error('统计失败:', err.message);
                                res.status(500).json({ error: '服务器错误' });
                                return;
                            }
                            stats.todayArticles = row.total || 0;
                            
                            // 7. 热门文章 TOP5
                            const sql6 = `SELECT id, title, views FROM articles WHERE status = 'published' ORDER BY views DESC LIMIT 5`;
                            db.all(sql6, [], (err, rows) => {
                                if (err) {
                                    console.error('统计失败:', err.message);
                                    res.status(500).json({ error: '服务器错误' });
                                    return;
                                }
                                stats.popularArticles = rows || [];
                                
                                // 8. 最近7天文章趋势
                                const sql7 = `
                                    SELECT date(created_at) as date, COUNT(*) as count 
                                    FROM articles 
                                    WHERE created_at >= date('now', '-7 days') AND status = 'published'
                                    GROUP BY date(created_at)
                                    ORDER BY date ASC
                                `;
                                db.all(sql7, [], (err, rows) => {
                                    if (err) {
                                        console.error('统计失败:', err.message);
                                        res.status(500).json({ error: '服务器错误' });
                                        return;
                                    }
                                    stats.trend = rows || [];
                                    res.json(stats);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

module.exports = {
    search,
    getPopular,
    getArchive,
    getArchiveByMonth,
    getStats
};
