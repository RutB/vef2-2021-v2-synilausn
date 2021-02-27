import express from 'express';
import passport from 'passport';
import { Strategy } from 'passport-local';
import { catchErrors, PAGE_SIZE } from './utils.js';

import { comparePasswords, findByUsername, findById } from './users.js';
import { list, deleteRow, getTotalOfRow } from './db.js';

export const router = express.Router();

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
    // console.error(err);
    return done(err);
  }
}

passport.use(new Strategy(strat));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await findById(id);
    return done(null, user);
  } catch (error) {
    return done(error);
  }
});

router.use((req, res, next) => {
  if (req.isAuthenticated()) {
    res.locals.user = req.user;
  }

  next();
});

router.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/admin');
  }

  let message = '';

  // Athugum hvort einhver skilaboð séu til í session, ef svo er birtum þau
  // og hreinsum skilaboð
  if (req.session.messages && req.session.messages.length > 0) {
    message = req.session.messages.join(', ');
    // console.log(message);
    req.session.messages = [];
  }

  // Ef við breytum name á öðrum hvorum reitnum að neðan mun ekkert virka
  // nema við höfum stillt í samræmi, sjá línu 64
  return res.render('login', { title: 'Innskráning', message });
});

router.post(
  '/login',
  passport.authenticate('local', {
    failureMessage: 'Notandanafn eða lykilorð vitlaust.',
    failureRedirect: '/admin/login',
  }),
  (req, res) => {
    res.redirect('/admin');
  },
);

router.get('admin/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

function ensureLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.redirect('/admin/login');
}

async function signatureDelete(req, res) {
  const { id } = req.body;

  await deleteRow([id]);
  return res.redirect('/admin');
}

async function admin(req, res) {
  let { page = 1 } = req.query;
  page = Number(page);

  const offset = (page - 1) * PAGE_SIZE;
  const registrations = await list(offset, PAGE_SIZE);

  const total = await getTotalOfRow();

  const paging = {
    links: {
      self: {
        href: `/admin/?page=${page}`,
      },
    },
    items: registrations,
  };

  if (offset > 0) {
    paging.links.prev = {
      href: `/admin/?page=${page - 1}`,
    };
  }

  if (registrations.length <= PAGE_SIZE) {
    paging.links.next = {
      href: `/admin/?page=${page + 1}`,
    };
  }
  const errors = [];
  const formData = {
    paging: paging.links,
    page,
    name: '',
    comment: '',
    nationalId: '',
    anonymous: false,
  };

  return res.render('admin', {
    errors, formData, total, registrations,
  });
}

router.get('/', ensureLoggedIn, catchErrors(admin));
router.get('/:data', catchErrors(admin));
router.post('/delete', ensureLoggedIn, catchErrors(signatureDelete));

export default passport;
