// db/init.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, 'database.sqlite');//__dirname 当前文件所在目录的路径
const db = new sqlite3.Database(dbPath);

// 创建用户表
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('创建用户表失败:', err.message);
    } else {
        console.log('✅ 用户表创建成功');
    }
});


// 创建文章表
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            summary TEXT,
            user_id INTEGER, 
            views INTEGER DEFAULT 0,
            status TEXT DEFAULT 'published',
            is_pinned INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) {
            console.error('创建表失败:', err.message);
        } else {
            console.log('✅ 文章表创建成功');
        }
    });


        
    // 插入一条测试数据
    db.run(`
        INSERT INTO articles (title, content, summary)
        VALUES (?, ?, ?)
    `, ['我的第一篇文章', '这是正文内容，写点东西吧', '这是文章摘要'], function(err) {
        if (err) {
            console.error('插入测试数据失败:', err.message);
        } else {
            console.log(`✅ 插入测试数据成功，ID: ${this.lastID}`);
        }
    });
});

// 创建标签表
db.run(`
    CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('创建标签表失败:', err.message);
    } else {
        console.log('✅ 标签表创建成功');
    }
});

// 创建文章-标签关联表（多对多）
db.run(`
    CREATE TABLE IF NOT EXISTS article_tags (
        article_id INTEGER,
        tag_id INTEGER,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (article_id, tag_id)
    )
`, (err) => {
    if (err) {
        console.error('创建文章标签关联表失败:', err.message);
    } else {
        console.log('✅ 文章标签关联表创建成功');
    }
});

// 创建评论表
db.run(`
    CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        article_id INTEGER NOT NULL,
        user_id INTEGER,
        user_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
`, (err) => {
    if (err) {
        console.error('创建评论表失败:', err.message);
    } else {
        console.log('✅ 评论表创建成功');
    }
});

// 查询测试数据
db.get('SELECT * FROM articles', (err, row) => {
    if (err) {
        console.error('查询失败:', err.message);
    } else {
        console.log('📖 查询结果:', row);
    }
});

// 关闭数据库
db.close(() => {
    console.log('🔒 数据库连接已关闭');
});