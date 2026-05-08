// utils/sanitize.js - 安全工具

// 转义 HTML 特殊字符（防 XSS）
function sanitizeHtml(text) {
    if (typeof text !== 'string') return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };
    return text.replace(/[&<>"'/]/g, (ch) => map[ch]);
}

// 转义正则表达式特殊字符
function escapeRegex(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 验证邮箱格式
function validateEmail(email) {
    if (typeof email !== 'string') return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
}

// 生成 URL 友好的 slug
function generateSlug(text, maxLength = 80) {
    if (typeof text !== 'string') return '';
    let slug = text
        .toLowerCase()
        .trim()
        // 替换中文为拼音首字母缩写（退化方案：直接移除）
        .replace(/[一-龥]/g, '')
        // 替换非字母数字字符为连字符
        .replace(/[^a-z0-9]+/g, '-')
        // 移除首尾连字符
        .replace(/^-+|-+$/g, '')
        // 限制长度
        .slice(0, maxLength)
        // 移除尾部连字符
        .replace(/-+$/, '');

    // 如果 slug 为空（纯中文标题），用短哈希替代
    if (!slug) {
        const hash = require('crypto')
            .createHash('md5')
            .update(text)
            .digest('hex')
            .slice(0, 8);
        slug = `post-${hash}`;
    }

    return slug;
}

module.exports = {
    sanitizeHtml,
    escapeRegex,
    validateEmail,
    generateSlug,
};
