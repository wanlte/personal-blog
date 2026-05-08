// middleware/validator.js - 请求参数验证
const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

// 统一处理验证结果
function validate(req, _res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formatted = errors.array().map((e) => ({
            field: e.path,
            location: e.location,
            message: e.msg,
            value: e.value,
        }));
        return next(AppError.badRequest('请求参数验证失败', formatted));
    }
    next();
}

// ===== 认证规则 =====

const registerRules = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('用户名长度须为 3-20 个字符')
        .matches(/^[a-zA-Z0-9_一-龥]+$/)
        .withMessage('用户名只能包含字母、数字、下划线和中文'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('密码长度不能少于 8 个字符')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('密码须包含大小写字母和数字'),
    body('email')
        .optional({ values: 'falsy' })
        .isEmail()
        .withMessage('邮箱格式不正确')
        .normalizeEmail(),
    validate,
];

const loginRules = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('用户名不能为空'),
    body('password')
        .notEmpty()
        .withMessage('密码不能为空'),
    validate,
];

// ===== 文章规则 =====

const articleRules = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('文章标题不能为空')
        .isLength({ min: 1, max: 200 })
        .withMessage('文章标题长度须在 1-200 字符之间'),
    body('content')
        .notEmpty()
        .withMessage('文章内容不能为空'),
    body('summary')
        .optional({ values: 'falsy' })
        .isLength({ max: 500 })
        .withMessage('文章摘要不能超过 500 字符'),
    validate,
];

// ===== 评论规则 =====

const commentRules = [
    body('content')
        .trim()
        .notEmpty()
        .withMessage('评论内容不能为空')
        .isLength({ min: 1, max: 5000 })
        .withMessage('评论内容长度须在 1-5000 字符之间'),
    body('userName')
        .optional({ values: 'falsy' })
        .isLength({ min: 1, max: 50 })
        .withMessage('用户名长度不能超过 50 字符'),
    body('parentId')
        .optional({ values: 'falsy' })
        .isInt({ min: 1 })
        .withMessage('父评论 ID 格式不正确')
        .toInt(),
    validate,
];

// ===== ID 参数规则 =====

const idParamRule = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID 格式不正确')
        .toInt(),
    validate,
];

// ===== 分页查询规则 =====

const paginationRules = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('页码须为正整数')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('每页数量须在 1-100 之间')
        .toInt(),
    validate,
];

module.exports = {
    validate,
    registerRules,
    loginRules,
    articleRules,
    commentRules,
    idParamRule,
    paginationRules,
};
