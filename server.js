const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// GET - 获取所有文章
app.get('/api/articles', (req, res) => {
    db.all('SELECT * FROM articles ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// GET - 获取单篇文章
app.get('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    
    const selectSql = `SELECT * FROM articles WHERE id = ?`;
    
    db.get(selectSql, [id], (err, row) => {
        if (err) {
            console.error('查询失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        
        if (!row) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }
        
        const updateSql = `UPDATE articles SET views = views + 1 WHERE id = ?`;
        db.run(updateSql, [id], (updateErr) => {
            if (updateErr) {
                console.error('更新浏览量失败:', updateErr.message);
            }
            res.json(row);
        });
    });
});

// POST - 创建新文章
app.post('/api/articles', (req, res) => {
    const { title, content, summary } = req.body;
    
    if (!title) {
        res.status(400).json({ error: '标题不能为空' });
        return;
    }
    
    const sql = `INSERT INTO articles (title, content, summary) VALUES (?, ?, ?)`;
    
    db.run(sql, [title, content || '', summary || ''], function(err) {
        if (err) {
            console.error('创建失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        
        res.json({
            id: this.lastID,
            title,
            content: content || '',
            summary: summary || '',
            views: 0,
            message: '文章创建成功'
        });
    });
});

// PUT - 更新文章
app.put('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    const { title, content, summary } = req.body;
    
    if (!title) {
        res.status(400).json({ error: '标题不能为空' });
        return;
    }
    
    const sql = `UPDATE articles 
                 SET title = ?, content = ?, summary = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`;
    
    db.run(sql, [title, content || '', summary || '', id], function(err) {
        if (err) {
            console.error('更新失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }
        
        res.json({ message: '文章更新成功', id: parseInt(id) });
    });
});

// DELETE - 删除文章
app.delete('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = `DELETE FROM articles WHERE id = ?`;
    
    db.run(sql, [id], function(err) {
        if (err) {
            console.error('删除失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }
        
        res.json({ message: '文章删除成功', id: parseInt(id) });
    });
});

// app.get('/', (req, res) => {
//     res.send('服务器运行正常！');
// });

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});