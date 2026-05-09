// tests/__mocks__/uuid.js - Mock uuid 模块（避免 ESM 解析问题）
const v4 = jest.fn(() => '00000000-0000-4000-8000-000000000000');
module.exports = { v4 };
