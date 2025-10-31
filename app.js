const express = require('express');
const app = express();
const PORT = 8080;

// This will be set by our Jenkinsfile
const version = process.env.APP_VERSION || 'local dev'; 
const backgroundColor = process.env.BACKGROUND_COLOR || 'grey';

app.get('/', (req, res) => {
  res.send(`
    <body style="background-color: ${backgroundColor}; color: white; text-align: center; font-family: sans-serif; padding-top: 50px;">
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
