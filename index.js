require('dotenv').config();
const express = require('express');
const QRCode = require('qrcode');
const { auth } = require('express-oauth2-jwt-bearer');
const Ticket = require('./models/ticket');

const app = express();
app.use(express.json());

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_DOMAIN,
});

app.get('/', async (req, res) => {
  const count = await Ticket.count();
  res.send(`Number of tickets generated: ${count}`);
});

app.post('/generate-ticket', checkJwt, async (req, res) => {
  const { vatin, firstName, lastName } = req.body;
  const ticketCount = await Ticket.count({ where: { vatin } });

  if (ticketCount >= 3) {
    return res.status(400).send('Maximum 3 tickets per VATIN');
  }

  const ticket = await Ticket.create({ vatin, firstName, lastName, createdAt: new Date() });
  const qrCodeUrl = await QRCode.toDataURL(`https://yourapp.com/ticket/${ticket.id}`);

  res.send(`<img src="${qrCodeUrl}" />`);
});

app.get('/ticket/:id', checkJwt, async (req, res) => {
  const ticket = await Ticket.findByPk(req.params.id);
  if (!ticket) {
    return res.status(404).send('Ticket not found');
  }

  res.send(`Ticket for ${ticket.firstName} ${ticket.lastName}, created at ${ticket.createdAt}`);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});