// Mock for @op-engineering/op-sqlite in Jest tests
module.exports = {
  open: jest.fn(() => ({
    execute: jest.fn(),
    close: jest.fn(),
  })),
};
