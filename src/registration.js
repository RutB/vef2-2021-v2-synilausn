import express from 'express';
import { body, validationResult } from 'express-validator';
import xss from 'xss';

import { list, insert, getTotalOfRow } from './db.js'; // bæta við total
import { catchErrors, PAGE_SIZE } from './utils.js'; // pagingInfo

export const router = express.Router();

const selfPage = 0;
/**
 * Higher-order fall sem umlykur async middleware með villumeðhöndlun.
//  *
//  * @param {function} fn Middleware sem grípa á villur fyrir
//  * @returns {function} Middleware með villumeðhöndlun
//  */
// function catchErrors(fn) {
//   return (req, res, next) => fn(req, res, next).catch(next);
// }

async function index(req, res) {
  let { page = 1 } = req.query;
  page = Number(page);

  const offset = (page - 1) * PAGE_SIZE;
  const registrations = await list(offset, PAGE_SIZE);
  const total = await getTotalOfRow();
  const errors = [];
  const paging = {
    links: {
      self: {
        href: `/?page=${page}`,
      },
    },
    items: registrations,
  };

  if (offset > 0) {
    paging.links.prev = {
      href: `/?page=${page - 1}`,
    };
  }

  if (registrations.length <= PAGE_SIZE) {
    paging.links.next = {
      href: `/?page=${page + 1}`,
    };
  }
  const formData = {
    paging: paging.links,
    page,
    name: '',
    nationalId: '',
    anonymous: false,
    comment: '',
  };

  return res.render('index', {
    errors, formData, registrations, total,
  });
}

const nationalIdPattern = '^[0-9]{6}-?[0-9]{4}$';

const validationMiddleware = [
  body('name')
    .isLength({ min: 1 })
    .withMessage('Nafn má ekki vera tómt'),
  body('name')
    .isLength({ max: 128 })
    .withMessage('Nafn má að hámarki vera 128 stafir'),
  body('nationalId')
    .isLength({ min: 1 })
    .withMessage('Kennitala má ekki vera tóm'),
  body('nationalId')
    .matches(new RegExp(nationalIdPattern))
    .withMessage('Kennitala verður að vera á formi 000000-0000 eða 0000000000'),
  body('comment')
    .isLength({ max: 400 })
    .withMessage('Athugasemd má að hámarki vera 400 stafir'),
];

// Viljum keyra sér og með validation, ver gegn „self XSS“
const xssSanitizationMiddleware = [
  body('name').customSanitizer((v) => xss(v)),
  body('nationalId').customSanitizer((v) => xss(v)),
  body('comment').customSanitizer((v) => xss(v)),
  body('anonymous').customSanitizer((v) => xss(v)),
];

const sanitizationMiddleware = [
  body('name').trim().escape(),
  body('nationalId').blacklist('-'),
];

async function validationCheck(req, res, next) {
  const {
    name, nationalId, comment, anonymous,
  } = req.body;

  const formData = {
    name, nationalId, comment, anonymous,
  };
  const total = await getTotalOfRow();

  const registrations = await list(0, 50);

  const validation = validationResult(req);

  if (!validation.isEmpty()) {
    return res.render('index', {
      formData, errors: validation.errors, registrations, total, selfPage,
    });
  }

  return next();
}

async function register(req, res) {
  const {
    name, nationalId, comment, anonymous,
  } = req.body;

  let success = true;

  try {
    success = await insert({
      name, nationalId, comment, anonymous,
    });
  } catch (e) {
    console.error(e);
  }

  if (success) {
    return res.redirect('/');
  }

  return res.render('error', { title: 'Gat ekki skráð!', text: 'Hafðir þú skrifað undir áður?' });
}

router.get('/', catchErrors(index));

router.post(
  '/',
  validationMiddleware,
  xssSanitizationMiddleware,
  catchErrors(validationCheck),
  sanitizationMiddleware,
  catchErrors(register),
);
