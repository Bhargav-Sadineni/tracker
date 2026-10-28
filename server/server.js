require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./lib/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/activities', require('./routes/activities'));
app.use('/api/entries', require('./routes/entries'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/daily-logs', require('./routes/dailyLogs'));

app.use(errorHandler);

const port = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(port, () => console.log('API running on port', port));
}

start();
