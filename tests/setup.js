require('dotenv').config({ path: '.env.test' });

// Mock WebSocket server
jest.mock('ws', () => {
  const WebSocket = require('ws');
  return jest.fn().mockImplementation(() => {
    const ws = new WebSocket();
    ws.send = jest.fn();
    ws.on = jest.fn();
    ws.emit = jest.fn();
    return ws;
  });
});

// Mock MySQL connection
jest.mock('mysql2', () => {
  const mysql = require('mysql2');
  return {
    createConnection: jest.fn().mockImplementation(() => ({
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn()
    })),
    createPool: jest.fn().mockImplementation(() => ({
      getConnection: jest.fn(),
      query: jest.fn(),
      end: jest.fn()
    }))
  };
});

// Mock Winston logger
jest.mock('winston', () => {
  const winston = require('winston');
  return {
    createLogger: jest.fn().mockImplementation(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }))
  };
}); 