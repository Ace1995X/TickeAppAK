require('dotenv').config();
const express = require('express');
const QRCode = require('qrcode');
const { auth } = require('express-oauth2-jwt-bearer');
const Ticket = require('./models/ticket');
const session = require('express-session');
const passport = require('passport');
const Auth0Strategy = require('passport-auth0');

const app = express();
app.use(express.json());

// Session
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
}));

// Passport configuration
passport.use(new Auth0Strategy({
  domain: process.env.AUTH0_DOMAIN,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  callbackURL: '/callback'
}, (accessToken, refreshToken, extraParams, profile, done) => {
  return done(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

// Auth0 middleware
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
});

// Routes
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

// Auth0 routes
app.get('/login', (req, res, next) => {
  console.log('Login route hit');
  next();
}, passport.authenticate('auth0', {
  scope: 'openid email profile'
}), (req, res) => {
  res.redirect('/');
});

app.get('/callback', (req, res, next) => {
  console.log('Callback route hit');
  next();
}, passport.authenticate('auth0', {
  failureRedirect: '/'
}), (req, res) => {
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect(`https://${process.env.AUTH0_DOMAIN}/v2/logout?client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=http://localhost:3000`);
  });
});

// Catch-all route for 404
app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});