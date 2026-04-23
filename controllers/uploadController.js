// controllers/uploadController.js - 上传控制器
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保 uploads 目录存在
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 配置 multer 存储
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // 生成唯一文件名：时间戳 + 随机数 + 原扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

// 文件过滤器（只允许图片）
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('只允许上传图片文件'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 限制
    fileFilter: fileFilter
});

// 上传图片
function uploadImage(req, res) {
    if (!req.file) {
        res.status(400).json({ error: '请选择图片文件' });
        return;
    }
    
    // 返回图片访问 URL
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({
        success: true,
        url: imageUrl,
        message: '上传成功'
    });
}

// 错误处理中间件
function uploadErrorHandler(err, req, res, next) {
    if (err.message === '只允许上传图片文件') {
        res.status(400).json({ error: err.message });
    } else {
        res.status(500).json({ error: '上传失败' });
    }
}

module.exports = {
    upload,
    uploadImage,
    uploadErrorHandler
};
