const express = require('express');
const app = express();
const PORT = 8080;

// We will pass these from the Jenkinsfile!
const version = process.env.APP_VERSION || '1.0 (Blue)';
const backgroundColor = process.env.BACKGROUND_COLOR || 'lightblue';

app.get('/', (req, res) => {
  res.send(`
    <body style="background-color: ${backgroundColor}; color: black; text-align: center; font-family: sans-serif;">
      <h1>Hello from the ${version} deployment!</h1>
    </body>
  `);
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});