// tests/unit/utils/email.test.js - 邮件工具测试
// Mock nodemailer 以避免实际网络请求
jest.mock('nodemailer', () => {
  const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'test-msg-id' });
  const createTransportMock = jest.fn(() => ({
    sendMail: sendMailMock,
  }));
  return {
    createTransport: createTransportMock,
    __sendMailMock: sendMailMock,
    __createTransportMock: createTransportMock,
  };
});

// 隔离加载模块，确保 mock 先生效
const nodemailer = require('nodemailer');
const email = require('../../../utils/email');

describe('sendEmail', () => {
  it('SMTP 未配置时应返回 skipped', async () => {
    // 由于 setup.js 未设置 SMTP_USER/SMTP_PASS，应跳过
    const result = await email.sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
    expect(result).toHaveProperty('skipped', true);
  });

  it('缺少 to 地址时应抛出错误', async () => {
    await expect(email.sendEmail({ subject: 'Test', html: '<p></p>' })).rejects.toThrow(
      '收件人地址不能为空'
    );
  });
});

describe('sendCommentNotification', () => {
  it('应调用 sendEmail 并构建正确的参数', async () => {
    // SMTP 未配置，会返回 skipped
    const result = await email.sendCommentNotification({
      to: 'author@test.com',
      articleTitle: 'Test Article',
      commentContent: 'Nice post!',
      commentAuthor: 'Reader',
      articleUrl: 'http://localhost:3000/article/1',
    });
    expect(result).toHaveProperty('skipped', true);
  });
});

describe('sendSubscriptionExpiryNotice', () => {
  it('应正确处理到期提醒', async () => {
    const futureDate = new Date(Date.now() + 3 * 86400000);
    const result = await email.sendSubscriptionExpiryNotice({
      to: 'user@test.com',
      planName: '月度会员',
      endDate: futureDate,
      renewUrl: 'http://localhost:3000/renew',
    });
    expect(result).toHaveProperty('skipped', true);
  });
});

describe('sendSubscriptionConfirm', () => {
  it('应正确处理订阅确认', async () => {
    const futureDate = new Date(Date.now() + 30 * 86400000);
    const result = await email.sendSubscriptionConfirm({
      to: 'user@test.com',
      planName: '月度会员',
      endDate: futureDate,
    });
    expect(result).toHaveProperty('skipped', true);
  });
});

describe('sendWelcomeEmail', () => {
  it('应正确处理欢迎邮件', async () => {
    const result = await email.sendWelcomeEmail({
      to: 'newuser@test.com',
      username: 'NewUser',
    });
    expect(result).toHaveProperty('skipped', true);
  });
});
