// controllers/subscriptionController.js - 订阅控制器
const prisma = require('../db/index');
const { clearArticleCache } = require('../middleware/cache');

// 获取所有订阅方案
async function getPlans(req, res) {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' }
        });
        res.json(plans);
    } catch (error) {
        console.error('获取订阅方案失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取当前用户订阅状态
async function getStatus(req, res) {
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
        
        if (!subscription) {
            return res.json({
                hasSubscription: false,
                subscription: null
            });
        }
        
        const isExpired = new Date() > new Date(subscription.endDate);
        
        // 如果已过期，更新状态
        if (isExpired && subscription.status === 'active') {
            await prisma.userSubscription.update({
                where: { id: subscription.id },
                data: { status: 'expired' }
            });
            return res.json({
                hasSubscription: false,
                subscription: {
                    ...subscription,
                    status: 'expired'
                }
            });
        }
        
        res.json({
            hasSubscription: true,
            subscription: {
                id: subscription.id,
                planName: subscription.plan.name,
                status: subscription.status,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                features: subscription.plan.features
            }
        });
    } catch (error) {
        console.error('获取订阅状态失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 创建订阅
async function subscribe(req, res) {
    const userId = req.user.userId;
    const { planId, paymentMethod = 'alipay' } = req.body;
    
    if (!planId) {
        return res.status(400).json({ error: '请选择订阅方案' });
    }
    
    try {
        // 获取订阅方案
        const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: parseInt(planId) }
        });
        
        if (!plan || !plan.isActive) {
            return res.status(404).json({ error: '订阅方案不存在或已下架' });
        }
        
        // 检查是否已有有效订阅
        const existingSubscription = await prisma.userSubscription.findFirst({
            where: {
                userId,
                status: 'active'
            },
            orderBy: {
                endDate: 'desc'
            }
        });
        
        // 计算订阅日期
        const now = new Date();
        let startDate = now;
        let endDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
        
        // 如果已有订阅，在其基础上续期
        if (existingSubscription && new Date(existingSubscription.endDate) > now) {
            startDate = new Date(existingSubscription.endDate);
            endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
            
            // 更新现有订阅
            await prisma.userSubscription.update({
                where: { id: existingSubscription.id },
                data: { endDate }
            });
        } else {
            // 创建新订阅
            await prisma.userSubscription.create({
                data: {
                    userId,
                    planId: parseInt(planId),
                    status: 'active',
                    startDate: startDate,
                    endDate: endDate
                }
            });
        }
        
        // 创建支付记录
        const payment = await prisma.paymentRecord.create({
            data: {
                userId,
                amount: plan.price,
                paymentMethod,
                status: 'completed', // 模拟支付成功
                transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }
        });
        
        res.json({
            success: true,
            message: '订阅成功',
            subscription: {
                planName: plan.name,
                startDate,
                endDate,
                features: plan.features
            },
            payment: {
                id: payment.id,
                amount: plan.price,
                transactionId: payment.transactionId
            }
        });
    } catch (error) {
        console.error('创建订阅失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 取消订阅
async function cancel(req, res) {
    const userId = req.user.userId;
    
    try {
        const subscription = await prisma.userSubscription.findFirst({
            where: {
                userId,
                status: 'active'
            },
            orderBy: {
                endDate: 'desc'
            }
        });
        
        if (!subscription) {
            return res.status(404).json({ error: '没有找到有效订阅' });
        }
        
        await prisma.userSubscription.update({
            where: { id: subscription.id },
            data: { status: 'cancelled' }
        });
        
        res.json({
            success: true,
            message: '订阅已取消，到期后将不再享受会员权益'
        });
    } catch (error) {
        console.error('取消订阅失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取用户订阅历史
async function getHistory(req, res) {
    const userId = req.user.userId;
    
    try {
        const subscriptions = await prisma.userSubscription.findMany({
            where: { userId },
            include: {
                plan: {
                    select: { name: true, features: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        const payments = await prisma.paymentRecord.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json({
            subscriptions,
            payments
        });
    } catch (error) {
        console.error('获取订阅历史失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

module.exports = {
    getPlans,
    getStatus,
    subscribe,
    cancel,
    getHistory
};
