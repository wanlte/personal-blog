const express = require('express');
//app = 路由 + 服务器 + 中间件 + 配置
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});