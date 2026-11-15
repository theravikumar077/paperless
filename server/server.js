const app = require('./app');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Listen on all network interfaces (0.0.0.0) so physical Android devices on the LAN can connect
const server = app.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`[PaperlessDoc Server] Running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`- Local Access:   http://localhost:${PORT}/api`);
  console.log(`- Network Access: http://172.16.21.173:${PORT}/api`);
  console.log(`- Health Check:   http://172.16.21.173:${PORT}/api/health`);
  console.log(`====================================================`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`[Unhandled Rejection] Error: ${err.message}`);
});

module.exports = server;
