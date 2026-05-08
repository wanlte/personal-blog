// utils/email.js - 邮件通知服务
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.qq.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_ADDRESS = process.env.SMTP_FROM || SMTP_USER;
const SITE_NAME = process.env.SITE_NAME || '个人博客';
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

// 创建传输器（lazy init）
let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });
    }
    return transporter;
}

// 通用发送邮件
async function sendEmail({ to, subject, html }) {
    if (!to) throw new Error('收件人地址不能为空');
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn('[Email] SMTP 未配置，跳过邮件发送');
        return { skipped: true };
    }

    try {
        const info = await getTransporter().sendMail({
            from: `"${SITE_NAME}" <${FROM_ADDRESS}>`,
            to,
            subject,
            html,
        });
        console.log(`[Email] 发送成功 -> ${to} (${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[Email] 发送失败:', error.message);
        throw error;
    }
}

// ===== 模板 =====

// 通用邮件模板包装
function wrapTemplate(title, bodyHtml) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body { margin:0; padding:0; background:#f5f5f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  .container { max-width:600px; margin:0 auto; padding:24px 16px; }
  .header { text-align:center; padding:24px 0; }
  .header h1 { margin:0; font-size:22px; color:#333; }
  .content { background:#fff; border-radius:8px; padding:32px; box-shadow:0 1px 3px rgba(0,0,0,.08); }
  .footer { text-align:center; padding:24px 0; font-size:12px; color:#999; }
  .btn { display:inline-block; padding:10px 24px; border-radius:6px; text-decoration:none; color:#fff; background:#667eea; font-size:14px; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>${SITE_NAME}</h1></div>
  <div class="content">
    <h2 style="margin-top:0;font-size:18px;color:#333;">${title}</h2>
    ${bodyHtml}
  </div>
  <div class="footer">
    <p><a href="${SITE_URL}" style="color:#667eea;text-decoration:none;">${SITE_URL}</a></p>
    <p>此邮件由系统自动发送，请勿回复</p>
  </div>
</div>
</body>
</html>`;
}

// 新评论通知
async function sendCommentNotification({ to, articleTitle, commentContent, commentAuthor, articleUrl }) {
    const body = `
<p>您的文章《${articleTitle}》收到了新的评论：</p>
<table style="width:100%;background:#f8f9fa;border-radius:6px;padding:16px;margin:16px 0;">
  <tr><td style="font-size:13px;color:#666;">${commentAuthor || '匿名用户'} 说：</td></tr>
  <tr><td style="padding:8px 0;font-size:15px;color:#333;">${commentContent}</td></tr>
</table>
<p style="text-align:center;margin:24px 0;">
  <a class="btn" href="${articleUrl}">查看评论</a>
</p>`;
    return sendEmail({ to, subject: `《${articleTitle}》收到新评论`, html: wrapTemplate('新评论通知', body) });
}

// 订阅到期提醒
async function sendSubscriptionExpiryNotice({ to, planName, endDate, renewUrl }) {
    const daysLeft = Math.ceil((new Date(endDate) - new Date()) / 86400000);
    const body = `
<p>您的 <strong>${planName}</strong> 将在 <strong>${daysLeft > 0 ? daysLeft + ' 天后' : '今天'}</strong> 到期。</p>
<p style="color:#e74c3c;font-size:14px;">到期时间：${new Date(endDate).toLocaleDateString('zh-CN')}</p>
<p>到期后部分会员功能将无法使用，如需续期请点击下方按钮：</p>
<p style="text-align:center;margin:24px 0;">
  <a class="btn" href="${renewUrl}">立即续费</a>
</p>`;
    return sendEmail({
        to,
        subject: `【${SITE_NAME}】${planName}即将到期`,
        html: wrapTemplate('订阅到期提醒', body),
    });
}

// 订阅成功通知
async function sendSubscriptionConfirm({ to, planName, endDate }) {
    const body = `
<p>恭喜您成功开通 <strong>${planName}</strong>！</p>
<p>有效期至：${new Date(endDate).toLocaleDateString('zh-CN')}</p>
<p>您现在可以享受全部会员权益。</p>`;
    return sendEmail({
        to,
        subject: `【${SITE_NAME}】订阅成功`,
        html: wrapTemplate('订阅确认', body),
    });
}

// 欢迎邮件
async function sendWelcomeEmail({ to, username }) {
    const body = `
<p>欢迎加入 ${SITE_NAME}，${username}！</p>
<p>在这里，您可以撰写文章、与读者互动、发现有趣的内容。</p>
<p style="text-align:center;margin:24px 0;">
  <a class="btn" href="${SITE_URL}">开始探索</a>
</p>`;
    return sendEmail({ to, subject: `欢迎加入 ${SITE_NAME}`, html: wrapTemplate('注册成功', body) });
}

module.exports = {
    sendEmail,
    sendCommentNotification,
    sendSubscriptionExpiryNotice,
    sendSubscriptionConfirm,
    sendWelcomeEmail,
};
