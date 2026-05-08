// middleware/subscription.js - 订阅权限中间件
const prisma = require('../db/index');

// 检查用户是否有有效订阅
async function requireSubscription(req, res, next) {
    // 跳过未登录用户
    if (!req.user) {
        return res.status(401).json({ error: '请先登录' });
    }
    
    const userId = req.user.userId;
    
    try {
        const subscription = await prisma.userSubscription.findFirst({
            where: {
                userId,
                status: 'active'
            },
            include: {
                plan: true
            },
            orderBy: {
                endDate: 'desc'
            }
        });
        
        // 检查订阅是否过期
        if (subscription) {
            const isExpired = new Date() > new Date(subscription.endDate);
            if (isExpired) {
                // 更新状态
                await prisma.userSubscription.update({
                    where: { id: subscription.id },
                    data: { status: 'expired' }
                });
                subscription.status = 'expired';
            }
        }
        
        if (!subscription || subscription.status === 'expired') {
            return res.status(403).json({
                error: '需要订阅会员才能访问此功能',
                requireSubscription: true
            });
        }
        
        // 将订阅信息附加到请求对象
        req.subscription = {
            id: subscription.id,
            planId: subscription.planId,
            planName: subscription.plan.name,
            features: subscription.plan.features,
            endDate: subscription.endDate
        };
        
        next();
    } catch (error) {
        console.error('订阅验证失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 检查用户是否有指定功能权限
async function requireFeature(feature) {
    return async (req, res, next) => {
        // 跳过未登录用户
        if (!req.user) {
            return res.status(401).json({ error: '请先登录' });
        }
        
        const userId = req.user.userId;
        
        try {
            const subscription = await prisma.userSubscription.findFirst({
                where: {
                    userId,
                    status: 'active'
                },
                include: {
                    plan: true
                },
                orderBy: {
                    endDate: 'desc'
                }
            });
            
            // 检查订阅是否过期
            if (subscription) {
                const isExpired = new Date() > new Date(subscription.endDate);
                if (isExpired) {
                    await prisma.userSubscription.update({
                        where: { id: subscription.id },
                        data: { status: 'expired' }
                    });
                    subscription.status = 'expired';
                }
            }
            
            if (!subscription || subscription.status === 'expired') {
                return res.status(403).json({
                    error: `需要订阅会员才能使用「${feature}」功能`,
                    requireSubscription: true,
                    requiredFeature: feature
                });
            }
            
            // 检查功能权限
            const features = subscription.plan.features || [];
            if (!features.includes(feature)) {
                return res.status(403).json({
                    error: `当前订阅不支持「${feature}」功能`,
                    requireFeature: feature,
                    availableFeatures: features
                });
            }
            
            // 将订阅信息附加到请求对象
            req.subscription = {
                id: subscription.id,
                planId: subscription.planId,
                planName: subscription.plan.name,
                features: features,
                endDate: subscription.endDate
            };
            
            next();
        } catch (error) {
            console.error('功能权限验证失败:', error.message);
            res.status(500).json({ error: '服务器错误' });
        }
    };
}

// 获取用户订阅信息（不拦截请求）
async function getSubscriptionInfo(userId) {
    try {
        const subscription = await prisma.userSubscription.findFirst({
            where: {
                userId,
                status: 'active'
            },
            include: {
                plan: true
            },
            orderBy: {
                endDate: 'desc'
            }
        });
        
        if (!subscription) {
            return null;
        }
        
        // 检查是否过期
        const isExpired = new Date() > new Date(subscription.endDate);
        if (isExpired) {
            await prisma.userSubscription.update({
                where: { id: subscription.id },
                data: { status: 'expired' }
            });
            return null;
        }
        
        return {
            id: subscription.id,
            planId: subscription.planId,
            planName: subscription.plan.name,
            features: subscription.plan.features,
            endDate: subscription.endDate
        };
    } catch (error) {
        console.error('获取订阅信息失败:', error.message);
        return null;
    }
}

module.exports = {
    requireSubscription,
    requireFeature,
    getSubscriptionInfo
};
