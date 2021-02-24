/*
Keyrt með:
node 04.passport.js

Keyrir upp express vefjón sem notar passport fyrir notendaumsjón.

Í users.js eru hjálparföll fyrir notendaumsjón
*/
import express from 'express';
import passport from 'passport';
import { Strategy } from 'passport-local';

import { comparePasswords, findByUsername, findById } from './users.js';

export const router = express.Router();
/**
 * Athugar hvort username og password sé til í notandakerfi.
 * Callback tekur við villu sem fyrsta argument, annað argument er
 * - `false` ef notandi ekki til eða lykilorð vitlaust
 * - Notandahlutur ef rétt
 *
 * @param {string} username Notandanafn til að athuga
 * @param {string} password Lykilorð til að athuga
 * @param {function} done Fall sem kallað er í með niðurstöðu
 */
async function strat(username, password, done) {
  try {
    const user = await findByUsername(username);

    if (!user) {
      return done(null, false);
    }

    // Verður annað hvort notanda hlutur ef lykilorð rétt, eða false
    const result = await comparePasswords(password, user.password);

    return done(null, result ? user : false);
  } catch (err) {
    console.error(err);
    return done(err);
  }
}

passport.use(new Strategy(strat));

// Notum local strategy með „strattinu“ okkar til að leita að notanda

// getum stillt með því að senda options hlut með
// passport.use(new Strategy({ usernameField: 'email' }, strat));

// Geymum id á notanda í session, það er nóg til að vita hvaða notandi þetta er
passport.serializeUser((user, done) => {
  console.log(user.id);
  done(null, user.id);
});

// Sækir notanda út frá id
passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await findById(id);
//    // console.log(user, id);
//     done(null, user);
//   } catch (err) {
//     done(err);
//   }
//
try {
  const user = await findById(id);
  return done(null, user);
} catch (error) {
  return done(error);
}
});
// Látum express nota passport með session


// Gott að skilgreina eitthvað svona til að gera user hlut aðgengilegan í
// viewum ef við erum að nota þannig
router.use((req, res, next) => {
  if (req.isAuthenticated()) {
    // getum núna notað user í viewum
    res.locals.user = req.user;
  }

  next();
});

// Hjálpar middleware sem athugar hvort notandi sé innskráður og hleypir okkur
// þá áfram, annars sendir á /login
function ensureLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.redirect('/admin/login');
}

router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
     // req.user kemur beint úr users.js
     console.log("er authenticated");
     return res.send(`
       <p>Innskráður notandi er ${req.user.username}</p>
       <p>Þú ert ${req.user.admin ? 'admin.' : 'ekki admin.'}</p>
       <p><a href="/logout">Útskráning</a></p>
       <p><a href="/admin/admin">Skoða leyndarmál</a></p>
     `);
     //res.render('admin', {//form data úr registration þarf að vera errors: validation.errors, registrations })
   }
   console.log('ekki authenticated');
   return res.redirect('admin/login');
 });

router.get('/login', (req, res) => {
    console.log("utan");
  if (req.isAuthenticated()) {
    console.log("autenticated");
    return res.redirect('/admin');
  }

  let message = '';

  // Athugum hvort einhver skilaboð séu til í session, ef svo er birtum þau
  // og hreinsum skilaboð
  if (req.session.messages && req.session.messages.length > 0) {
    message = req.session.messages.join(', ');
    console.log(message);
    req.session.messages = [];
  }

  // Ef við breytum name á öðrum hvorum reitnum að neðan mun ekkert virka
  // nema við höfum stillt í samræmi, sjá línu 64
  return res.send(`
    <form method="post" action="/admin/login" autocomplete="off">
      <label>Notendanafn: <input type="text" name="username"></label>
      <label>Lykilorð: <input type="password" name="password"></label>
      <button>Innskrá</button>
    </form>
    <p>${message}</p>
  `);
});

router.post(
  '/login',
  // Þetta notar strat að ofan til að skrá notanda inn
  passport.authenticate('local', {
    failureMessage: 'Notandanafn eða lykilorð vitlaust.',
    failureRedirect: '/admin/login',
  }),
  // Ef við komumst hingað var notandi skráður inn, senda á /admin
  (req, res) => {
    console.log('kemst hingað')
    res.redirect('/admin');
  },
);

router.get('/logout', (req, res) => {
  // logout hendir session cookie og session
  req.logout();
  res.redirect('/');
});

// ensureLoggedIn middleware passar upp á að aðeins innskráðir notendur geti
// skoðað efnið, aðrir lenda í redirect á /login, stillt í línu 103
router.get('/admin', ensureLoggedIn, (req, res) => {
  res.send(`
    <p>Hér eru leyndarmál</p>
    <p><a href="/">Forsíða</a></p>
  `);
});

export default passport;