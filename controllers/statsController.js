// controllers/statsController.js - 统计控制器
const prisma = require('../db/index');

// 搜索文章
async function search(req, res) {
    const keyword = req.query.q;
    
    if (!keyword || keyword.trim() === '') {
        res.status(400).json({ error: '搜索关键词不能为空' });
        return;
    }
    
    try {
        const articles = await prisma.article.findMany({
            where: {
                OR: [
                    { title: { contains: keyword, mode: 'insensitive' } },
                    { content: { contains: keyword, mode: 'insensitive' } },
                    { summary: { contains: keyword, mode: 'insensitive' } }
                ]
            },
            include: {
                user: { select: { username: true } }
            },
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' }
            ]
        });
        res.json(articles);
    } catch (error) {
        console.error('搜索失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取热门文章
async function getPopular(req, res) {
    const limit = parseInt(req.query.limit) || 5;
    
    try {
        const articles = await prisma.article.findMany({
            where: { views: { gt: 0 } },
            select: {
                id: true,
                title: true,
                summary: true,
                views: true,
                createdAt: true,
                user: { select: { username: true } }
            },
            orderBy: { views: 'desc' },
            take: limit
        });
        
        const result = articles.map(a => ({
            ...a,
            author_name: a.user?.username
        }));
        
        res.json(result);
    } catch (error) {
        console.error('获取排行榜失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取文章归档
async function getArchive(req, res) {
    try {
        const articles = await prisma.article.groupBy({
            by: ['createdAt'],
            _count: { id: true }
        });
        
        // 按年月分组
        const archiveMap = new Map();
        articles.forEach(a => {
            const date = new Date(a.createdAt);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const key = `${year}-${month}`;
            
            if (archiveMap.has(key)) {
                archiveMap.get(key).count += a._count.id;
            } else {
                archiveMap.set(key, {
                    year: String(year),
                    month,
                    year_month: key,
                    count: a._count.id
                });
            }
        });
        
        const archive = Array.from(archiveMap.values())
            .sort((a, b) => b.year_month.localeCompare(a.year_month));
        
        res.json(archive);
    } catch (error) {
        console.error('获取归档失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取指定月份的文章
async function getArchiveByMonth(req, res) {
    const { yearMonth } = req.params;
    
    try {
        const [year, month] = yearMonth.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        
        const articles = await prisma.article.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                user: { select: { username: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json(articles);
    } catch (error) {
        console.error('获取归档文章失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取博客统计数据
async function getStats(req, res) {
    try {
        const [
            totalArticles,
            draftCount,
            totalViews,
            totalComments,
            totalUsers,
            todayArticles,
            popularArticles,
            trendData
        ] = await Promise.all([
            prisma.article.count(),
            prisma.article.count({ where: { status: 'draft' } }),
            prisma.article.aggregate({ _sum: { views: true } }),
            prisma.comment.count(),
            prisma.user.count(),
            prisma.article.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            prisma.article.findMany({
                where: { status: 'published' },
                select: { id: true, title: true, views: true },
                orderBy: { views: 'desc' },
                take: 5
            }),
            // 最近7天趋势
            prisma.$queryRaw`
                SELECT DATE(created_at) as date, COUNT(*) as count 
                FROM articles 
                WHERE created_at >= NOW() - INTERVAL '7 days' AND status = 'published'
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `
        ]);
        
        res.json({
            totalArticles,
            draftCount: draftCount || 0,
            totalViews: totalViews._sum.views || 0,
            totalComments: totalComments || 0,
            totalUsers: totalUsers || 0,
            todayArticles: todayArticles || 0,
            popularArticles: popularArticles || [],
            trend: trendData || []
        });
    } catch (error) {
        console.error('统计失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

module.exports = {
    search,
    getPopular,
    getArchive,
    getArchiveByMonth,
    getStats
};
