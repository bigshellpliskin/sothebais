const express = require('express');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 4000;

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Shape L2 service listening on port ${PORT}`);
}); 