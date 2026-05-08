// utils/response.js - 统一响应格式

/**
 * 成功响应
 * @param {object} res - Express response 对象
 * @param {*} data - 响应数据
 * @param {string} message - 成功消息
 * @param {number} statusCode - HTTP 状态码（默认 200）
 */
function success(res, data = null, message = '操作成功', statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data,
        message,
        timestamp: new Date().toISOString(),
    });
}

/**
 * 错误响应
 * @param {object} res - Express response 对象
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP 状态码（默认 400）
 * @param {*} errors - 详细错误信息（可选）
 */
function error(res, message = '服务器错误', statusCode = 500, errors = null) {
    const body = {
        success: false,
        data: null,
        message,
        timestamp: new Date().toISOString(),
    };
    if (errors !== null) {
        body.errors = errors;
    }
    return res.status(statusCode).json(body);
}

/**
 * 分页响应
 * @param {object} res - Express response 对象
 * @param {Array} data - 当前页数据列表
 * @param {number} page - 当前页码
 * @param {number} total - 总记录数
 * @param {number} pageSize - 每页大小（默认 20）
 */
function paginated(res, data = [], page = 1, total = 0, pageSize = 20) {
    const totalPages = Math.ceil(total / pageSize) || 1;
    return res.status(200).json({
        success: true,
        data,
        message: '获取成功',
        timestamp: new Date().toISOString(),
        pagination: {
            page,
            pageSize,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    });
}

/**
 * 已创建响应（201）
 * @param {object} res
 * @param {*} data
 * @param {string} message
 */
function created(res, data = null, message = '创建成功') {
    return success(res, data, message, 201);
}

/**
 * 无内容响应（204）
 * @param {object} res
 */
function noContent(res) {
    return res.status(204).send();
}

module.exports = {
    success,
    error,
    paginated,
    created,
    noContent,
};
