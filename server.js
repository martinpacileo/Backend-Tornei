require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server avviato su porta ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
