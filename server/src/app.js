import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { readFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from './utils/prisma.js';
import { authenticate, allowRoles } from './middleware/auth.js';
import { matchReport, textSimilarity } from './services/matching.js';

const app = express();
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(currentDir, '../uploads');
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, done) => {
      const extension = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype] || '';
      done(null, `${crypto.randomUUID()}${extension}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, done) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return done(new Error('Images must be JPG, PNG, or WebP.'));
    }
    return done(null, true);
  }
});

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to at least 32 characters.');
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDir, { maxAge: '1d', immutable: true }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
const sensitiveLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const emailSchema = z.string().email().max(254).transform((value) => value.trim().toLowerCase());
const reportFields = z.object({
  title: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(60),
  description: z.string().trim().min(8).max(1000),
  color: z.string().trim().min(2).max(60),
  brand: z.string().trim().max(80).optional().default(''),
  eventDate: z.coerce.date().refine((date) => date <= new Date(), 'The report date cannot be in the future.'),
  eventTime: z.string().trim().max(30).optional().default(''),
  locationName: z.string().trim().min(2).max(100),
  privateVerification: z.string().trim().max(500).optional().default(''),
  custodyStatus: z.string().trim().max(80).optional().default('')
});

function validationError(error) {
  return error.issues?.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) || [];
}

function fingerprint(data) {
  const normalized = [data.type, data.title, data.category, data.color, data.brand, data.locationName]
    .map((value) => String(value || '').toLowerCase().trim().replace(/\s+/g, ' '))
    .join('|');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function detectImageMime(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function publicReport(report) {
  const { privateVerification, fingerprint: _fingerprint, ...safe } = report;
  return safe;
}

async function notify(userId, type, message) {
  if (!userId) return;
  await prisma.notification.create({ data: { userId, type, message } });
}

async function recordStatus(reportId, status, note) {
  await prisma.reportStatusHistory.create({ data: { reportId, status, note } });
  await prisma.itemReport.update({ where: { id: reportId }, data: { status } });
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/register', authLimiter, asyncRoute(async (req, res) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    email: emailSchema,
    enrollment: z.string().trim().min(3).max(40),
    password: z.string().min(10).max(72)
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please check the highlighted fields.', details: validationError(parsed.error) });
  const { name, email, enrollment, password } = parsed.data;
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { enrollment }] } });
  if (existing) return res.status(409).json({ error: 'An account with that email or enrollment number already exists.' });
  const user = await prisma.user.create({
    data: { name, email, enrollment, passwordHash: await bcrypt.hash(password, 12) },
    select: { id: true, name: true, email: true, role: true, contribution: true, enrollment: true }
  });
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user });
}));

app.post('/api/auth/login', authLimiter, asyncRoute(async (req, res) => {
  const parsed = z.object({ email: emailSchema, password: z.string().min(1).max(72) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password.' });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  const { passwordHash: _passwordHash, ...safeUser } = user;
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: safeUser });
}));

app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: req.user }));

app.put('/api/auth/profile', authenticate, asyncRoute(async (req, res) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    enrollment: z.string().trim().min(3).max(40)
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please enter a valid name and enrollment number.', details: validationError(parsed.error) });
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, contribution: true, enrollment: true }
  });
  res.json({ user });
}));

app.get('/api/locations', asyncRoute(async (_req, res) => {
  res.json(await prisma.campusLocation.findMany({ orderBy: { name: 'asc' } }));
}));

app.get('/api/reports', asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const locationSearch = typeof req.query.location === 'string' ? req.query.location.trim().slice(0, 100) : '';
  const eventDate = typeof req.query.date === 'string' ? new Date(req.query.date) : null;
  const where = {
    status: { notIn: ['REMOVED', 'CLOSED'] },
    ...(req.query.type && ['LOST', 'FOUND'].includes(req.query.type) ? { type: req.query.type } : {}),
    ...(req.query.category ? { category: String(req.query.category).slice(0, 60) } : {}),
    ...(search ? { OR: ['title', 'description', 'color', 'brand'].map((field) => ({ [field]: { contains: search } })) } : {}),
    ...(locationSearch ? { locationName: { contains: locationSearch } } : {}),
    ...(eventDate && !Number.isNaN(eventDate.getTime()) ? {
      eventDate: {
        gte: new Date(eventDate.getTime() - 7 * 86400000),
        lte: new Date(eventDate.getTime() + 7 * 86400000)
      }
    } : {})
  };
  const [reports, total] = await prisma.$transaction([
    prisma.itemReport.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { images: true, user: { select: { id: true, name: true } } }
    }),
    prisma.itemReport.count({ where })
  ]);
  res.json({ reports: reports.map(publicReport), page, limit, total, pages: Math.ceil(total / limit) });
}));

app.get('/api/reports/mine', authenticate, asyncRoute(async (req, res) => {
  const reports = await prisma.itemReport.findMany({
    where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, include: { images: true, history: { orderBy: { createdAt: 'asc' } } }
  });
  res.json({ reports: reports.map(publicReport) });
}));

app.post('/api/reports/:type', authenticate, (req, res, next) => {
  if (!['lost', 'found'].includes(req.params.type.toLowerCase())) return res.status(404).json({ error: 'Report type not found.' });
  return next();
}, imageUpload.single('image'), asyncRoute(async (req, res) => {
  const type = req.params.type.toUpperCase();
  const parsed = reportFields.safeParse(req.body);
  if (!parsed.success) {
    if (req.file) await unlink(req.file.path);
    return res.status(400).json({ error: 'Please check the report details.', details: validationError(parsed.error) });
  }
  const data = parsed.data;
  const imageMimeType = req.file ? detectImageMime(await readFile(req.file.path)) : null;
  if (req.file && imageMimeType !== req.file.mimetype) {
    await unlink(req.file.path);
    return res.status(400).json({ error: 'The image contents do not match a supported image format.' });
  }
  if (type === 'LOST' && !data.privateVerification.trim()) {
    if (req.file) await unlink(req.file.path);
    return res.status(400).json({ error: 'Add at least one private ownership clue so a future claim can be verified.' });
  }
  const reportFingerprint = fingerprint({ ...data, type });
  const similar = await prisma.itemReport.findMany({
    where: {
      type,
      status: { notIn: ['REMOVED', 'CLOSED'] },
      OR: [{ category: data.category, color: data.color }, { title: data.title }, { fingerprint: reportFingerprint }]
    },
    select: { id: true, reportCode: true, title: true, category: true, color: true, locationName: true, fingerprint: true },
    take: 20
  });
  const duplicates = similar.filter((item) =>
    item.fingerprint === reportFingerprint ||
    textSimilarity(item.title, data.title) >= 0.55 ||
    (item.category.toLowerCase() === data.category.toLowerCase() && item.color.toLowerCase() === data.color.toLowerCase())
  ).slice(0, 3);
  if (duplicates.length && req.body.confirmDuplicates !== 'true') {
    if (req.file) await unlink(req.file.path);
    return res.status(409).json({ error: 'Some existing reports look similar. Review them before continuing.', duplicates });
  }
  const location = await prisma.campusLocation.findUnique({ where: { name: data.locationName } });
  const report = await prisma.itemReport.create({
    data: {
      ...data,
      privateVerification: type === 'LOST' ? data.privateVerification : null,
      custodyStatus: type === 'FOUND' ? data.custodyStatus : null,
      type, userId: req.user.id, reportCode: `LL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      campusLocationId: location?.id || null, fingerprint: reportFingerprint, duplicateFlag: duplicates.length > 0,
      images: req.file ? { create: { path: `/uploads/${path.basename(req.file.path)}`, mimeType: imageMimeType } } : undefined,
      history: { create: { status: 'REPORTED', note: `${type === 'LOST' ? 'Lost' : 'Found'} report submitted.` } }
    },
    include: { images: true }
  });
  await matchReport(report);
  res.status(201).json({ report: publicReport(report) });
}));

app.get('/api/reports/:id', asyncRoute(async (req, res) => {
  const report = await prisma.itemReport.findUnique({
    where: { id: req.params.id },
    include: { images: true, user: { select: { id: true, name: true } }, history: { orderBy: { createdAt: 'asc' } } }
  });
  if (!report || report.status === 'REMOVED') return res.status(404).json({ error: 'Report not found.' });
  res.json({ report: publicReport(report) });
}));

app.put('/api/reports/:id', authenticate, asyncRoute(async (req, res) => {
  const report = await prisma.itemReport.findUnique({ where: { id: req.params.id } });
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  if (report.userId !== req.user.id && req.user.role === 'STUDENT') return res.status(403).json({ error: 'You can only edit your own reports.' });
  const parsed = z.object({ status: z.literal('CLOSED').optional(), title: z.string().trim().min(2).max(100).optional() })
    .refine((value) => Object.keys(value).length > 0, 'Provide a report update.')
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid report update.', details: validationError(parsed.error) });
  if (report.status === 'RECOVERED' && parsed.data.status === 'CLOSED') return res.status(409).json({ error: 'A recovered report cannot be closed again.' });
  const updated = await prisma.itemReport.update({ where: { id: report.id }, data: parsed.data });
  await prisma.reportStatusHistory.create({ data: { reportId: report.id, status: updated.status, note: 'Report updated by its owner.' } });
  res.json({ report: publicReport(updated) });
}));

app.delete('/api/reports/:id', authenticate, asyncRoute(async (req, res) => {
  const report = await prisma.itemReport.findUnique({ where: { id: req.params.id } });
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  if (report.userId !== req.user.id && !['ADMIN', 'MODERATOR'].includes(req.user.role)) return res.status(403).json({ error: 'You cannot remove this report.' });
  await recordStatus(report.id, 'CLOSED', 'Report closed by its owner or a moderator.');
  res.json({ success: true });
}));

app.get('/api/matches', authenticate, asyncRoute(async (req, res) => {
  const matches = await prisma.match.findMany({
    where: { OR: [{ lostReport: { userId: req.user.id } }, { foundReport: { userId: req.user.id } }] },
    include: {
      lostReport: { include: { images: true, user: { select: { name: true } } } },
      foundReport: { include: { images: true, user: { select: { name: true } } } }
    },
    orderBy: { score: 'desc' }
  });
  res.json({ matches: matches.map((match) => ({
    ...match,
    characteristics: JSON.parse(match.characteristics),
    lostReport: publicReport(match.lostReport),
    foundReport: publicReport(match.foundReport)
  })) });
}));

app.post('/api/matches/recalculate', authenticate, asyncRoute(async (req, res) => {
  const reports = await prisma.itemReport.findMany({ where: { userId: req.user.id } });
  let count = 0;
  for (const report of reports) count += (await matchReport(report)).length;
  res.json({ recalculated: count });
}));

app.post('/api/claims', authenticate, sensitiveLimiter, asyncRoute(async (req, res) => {
  const parsed = z.object({
    lostReportId: z.string().min(1), foundReportId: z.string().min(1),
    answers: z.array(z.string().trim().min(1).max(200)).min(1).max(5)
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Provide the report pair and answers to the private ownership questions.' });
  const [lost, found] = await Promise.all([
    prisma.itemReport.findUnique({ where: { id: parsed.data.lostReportId } }),
    prisma.itemReport.findUnique({ where: { id: parsed.data.foundReportId } })
  ]);
  if (!lost || !found || lost.type !== 'LOST' || found.type !== 'FOUND') return res.status(404).json({ error: 'The selected report pair could not be found.' });
  if (lost.userId !== req.user.id) return res.status(403).json({ error: 'Only the owner of the lost-item report can submit this claim.' });
  if (lost.id === found.id) return res.status(400).json({ error: 'Choose two different reports.' });
  const existingClaim = await prisma.ownershipClaim.findFirst({
    where: { claimantId: req.user.id, lostReportId: lost.id, foundReportId: found.id },
    select: { id: true }
  });
  if (existingClaim) return res.status(409).json({ error: 'You have already submitted a claim for these reports.' });
  const clues = (lost.privateVerification || '').split('\n').map((answer) => answer.trim().toLowerCase()).filter(Boolean);
  const passed = clues.length > 0 && parsed.data.answers.length === clues.length &&
    parsed.data.answers.every((answer, index) => answer.trim().toLowerCase() === clues[index]);
  const claim = await prisma.ownershipClaim.create({
    data: {
      claimantId: req.user.id, lostReportId: lost.id, foundReportId: found.id, answersPassed: passed,
      attempts: { create: { passed } },
      disputes: passed ? undefined : { create: { reportId: found.id, reason: 'Private ownership verification did not match.' } }
    },
    select: { id: true, status: true, createdAt: true }
  });
  await recordStatus(lost.id, 'CLAIM_REQUESTED', 'An ownership claim was submitted.');
  await recordStatus(lost.id, 'VERIFICATION_PENDING', 'Private ownership answers are awaiting review.');
  await notify(found.userId, 'CLAIM', `A student submitted an ownership claim for ${found.title}. Please review it.`);
  if (!passed) await notify(req.user.id, 'CLAIM', 'Your ownership answers did not match. The claim was sent for moderator review.');
  res.status(201).json({ claim, verificationPassed: passed });
}));

app.get('/api/claims', authenticate, asyncRoute(async (req, res) => {
  const claims = await prisma.ownershipClaim.findMany({
    where: req.user.role === 'ADMIN' || req.user.role === 'MODERATOR'
      ? {}
      : { OR: [{ claimantId: req.user.id }, { foundReport: { userId: req.user.id } }] },
    include: {
      claimant: { select: { id: true, name: true } },
      lostReport: { select: { id: true, reportCode: true, title: true, userId: true } },
      foundReport: { select: { id: true, reportCode: true, title: true, userId: true } },
      attempts: { select: { passed: true, createdAt: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ claims });
}));

app.put('/api/claims/:id/verify', authenticate, asyncRoute(async (req, res) => {
  const parsed = z.object({ decision: z.enum(['approve', 'reject', 'dispute']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Choose approve, reject, or dispute.' });
  const claim = await prisma.ownershipClaim.findUnique({ where: { id: req.params.id }, include: { foundReport: true, lostReport: true } });
  if (!claim) return res.status(404).json({ error: 'Claim not found.' });
  const canReview = ['ADMIN', 'MODERATOR'].includes(req.user.role) || claim.foundReport.userId === req.user.id;
  if (!canReview) return res.status(403).json({ error: 'Only the finder or a moderator can review this claim.' });
  if (claim.status !== 'PENDING_VERIFICATION') return res.status(409).json({ error: 'This claim has already been reviewed.' });
  const status = parsed.data.decision === 'approve' && claim.answersPassed ? 'VERIFIED'
    : parsed.data.decision === 'dispute' || !claim.answersPassed ? 'DISPUTED' : 'REJECTED';
  const updated = await prisma.ownershipClaim.update({ where: { id: claim.id }, data: { status } });
  await recordStatus(claim.lostReportId, status === 'VERIFIED' ? 'VERIFIED' : status, `Ownership claim ${status.toLowerCase()}.`);
  await notify(claim.claimantId, 'CLAIM', `Your ownership claim was ${status.toLowerCase()}.`);
  if (status === 'DISPUTED') {
    await prisma.dispute.create({ data: { claimId: claim.id, reportId: claim.foundReportId, reason: 'Ownership claim requires moderator review.' } });
    await notify(claim.foundReport.userId, 'DISPUTE', `A dispute was opened for ${claim.foundReport.title}.`);
  }
  res.json({ claim: { id: updated.id, status: updated.status } });
}));

app.post('/api/handover/create', authenticate, sensitiveLimiter, asyncRoute(async (req, res) => {
  const parsed = z.object({ claimId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A verified claim is required.' });
  const claim = await prisma.ownershipClaim.findUnique({
    where: { id: parsed.data.claimId }, include: { lostReport: true, foundReport: true, handover: true }
  });
  if (!claim) return res.status(404).json({ error: 'Claim not found.' });
  if (![claim.claimantId, claim.foundReport.userId].includes(req.user.id)) return res.status(403).json({ error: 'Only the claimant or finder can create a handover.' });
  if (claim.status !== 'VERIFIED') return res.status(409).json({ error: 'Ownership must be verified before a handover can be created.' });
  if (['RECOVERED', 'CLOSED', 'REMOVED'].includes(claim.lostReport.status) ||
      ['RECOVERED', 'CLOSED', 'REMOVED'].includes(claim.foundReport.status)) {
    return res.status(409).json({ error: 'This report is no longer available for a handover.' });
  }
  if (claim.handover && !claim.handover.usedAt && claim.handover.expiresAt > new Date()) return res.status(409).json({ error: 'An active handover code already exists. Use or wait for it to expire.' });
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const handover = await prisma.handover.upsert({
    where: { claimId: claim.id },
    update: { tokenHash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt, usedAt: null, createdBy: req.user.id },
    create: { claimId: claim.id, tokenHash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt, createdBy: req.user.id }
  });
  await Promise.all([
    recordStatus(claim.lostReportId, 'HANDOVER_SCHEDULED', 'A SafeReturn handover code was created.'),
    recordStatus(claim.foundReportId, 'HANDOVER_SCHEDULED', 'A SafeReturn handover code was created.'),
    notify(claim.claimantId, 'HANDOVER', `A SafeReturn handover was scheduled for ${claim.lostReport.title}.`),
    notify(claim.foundReport.userId, 'HANDOVER', `A SafeReturn handover was scheduled for ${claim.foundReport.title}.`)
  ]);
  res.status(201).json({ handoverId: handover.id, token, qrCode: await QRCode.toDataURL(token), expiresAt });
}));

app.post('/api/handover/:id/complete', authenticate, sensitiveLimiter, asyncRoute(async (req, res) => {
  const parsed = z.object({ token: z.string().min(20).max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter the handover verification code.' });
  const handover = await prisma.handover.findUnique({
    where: { id: req.params.id },
    include: { claim: { include: { lostReport: true, foundReport: true } } }
  });
  if (!handover) return res.status(404).json({ error: 'Handover not found.' });
  if (![handover.claim.claimantId, handover.claim.foundReport.userId].includes(req.user.id)) return res.status(403).json({ error: 'You are not part of this handover.' });
  if (handover.usedAt) return res.status(409).json({ error: 'This one-time code has already been used.' });
  if (handover.expiresAt < new Date()) return res.status(410).json({ error: 'This code has expired. Create a new handover code.' });
  const supplied = crypto.createHash('sha256').update(parsed.data.token).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(handover.tokenHash))) return res.status(400).json({ error: 'That handover code is not valid.' });
  const now = new Date();
  await prisma.$transaction([
    prisma.handover.update({ where: { id: handover.id }, data: { usedAt: now } }),
    prisma.ownershipClaim.update({ where: { id: handover.claimId }, data: { status: 'COMPLETED' } }),
    prisma.itemReport.updateMany({
      where: { id: { in: [handover.claim.lostReportId, handover.claim.foundReportId] } },
      data: { status: 'RECOVERED' }
    }),
    prisma.reportStatusHistory.createMany({
      data: [handover.claim.lostReportId, handover.claim.foundReportId].map((reportId) => ({ reportId, status: 'RECOVERED', note: `SafeReturn handover completed at ${now.toISOString()}.` }))
    }),
    prisma.userContribution.create({ data: { userId: handover.claim.foundReport.userId, points: 25, reason: 'Verified item return' } }),
    prisma.user.update({ where: { id: handover.claim.foundReport.userId }, data: { contribution: { increment: 25 } } })
  ]);
  await notify(handover.claim.claimantId, 'HANDOVER', 'SafeReturn complete. Your item has been marked recovered.');
  await notify(handover.claim.foundReport.userId, 'HANDOVER', 'Thank you for returning an item! Your trust score increased by 25 points.');
  res.json({ success: true, completedAt: now });
}));

app.get('/api/notifications', authenticate, asyncRoute(async (req, res) => {
  const notifications = await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json({ notifications });
}));

app.put('/api/notifications/:id/read', authenticate, asyncRoute(async (req, res) => {
  const result = await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { readAt: new Date() } });
  if (!result.count) return res.status(404).json({ error: 'Notification not found.' });
  res.json({ success: true });
}));

app.get('/api/analytics/student', authenticate, asyncRoute(async (req, res) => {
  const [lost, found, recovered, matches, recent, reports] = await Promise.all([
    prisma.itemReport.count({ where: { userId: req.user.id, type: 'LOST' } }),
    prisma.itemReport.count({ where: { userId: req.user.id, type: 'FOUND' } }),
    prisma.itemReport.count({ where: { userId: req.user.id, status: 'RECOVERED' } }),
    prisma.match.count({ where: { OR: [{ lostReport: { userId: req.user.id } }, { foundReport: { userId: req.user.id } }] } }),
    prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 4 }),
    prisma.itemReport.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 5 })
  ]);
  res.json({ stats: { lost, found, recovered, matches }, notifications: recent, reports: reports.map(publicReport) });
}));

app.get('/api/analytics/admin', authenticate, allowRoles('ADMIN', 'MODERATOR'), asyncRoute(async (_req, res) => {
  const [students, lost, found, claims, recovered, pendingReports, categoryRows, locationRows] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.itemReport.count({ where: { type: 'LOST' } }),
    prisma.itemReport.count({ where: { type: 'FOUND' } }),
    prisma.ownershipClaim.count({ where: { status: 'PENDING_VERIFICATION' } }),
    prisma.itemReport.count({ where: { status: 'RECOVERED' } }),
    prisma.itemReport.count({ where: { status: { in: ['REPORTED', 'DISPUTED'] } } }),
    prisma.itemReport.groupBy({ by: ['category'], _count: { _all: true } }),
    prisma.itemReport.groupBy({ by: ['locationName', 'type'], _count: { _all: true } })
  ]);
  res.json({
    stats: { students, lost, found, claims, recovered, pendingReports, recoveryRate: lost ? Math.round((recovered / lost) * 100) : 0 },
    categories: categoryRows.map((row) => ({ name: row.category, value: row._count._all })),
    locations: locationRows.map((row) => ({ name: row.locationName, type: row.type, count: row._count._all }))
  });
}));

app.get('/api/analytics/heatmap', asyncRoute(async (req, res) => {
  const reports = await prisma.itemReport.groupBy({
    by: ['locationName', 'type', 'category'], where: { status: { notIn: ['REMOVED', 'CLOSED'] } }, _count: { _all: true }
  });
  res.json({ locations: reports.map((row) => ({ name: row.locationName, type: row.type, category: row.category, count: row._count._all })) });
}));

app.get('/api/admin/users', authenticate, allowRoles('ADMIN'), asyncRoute(async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, enrollment: true, role: true, contribution: true, createdAt: true },
    orderBy: { createdAt: 'desc' }, take: 200
  });
  res.json({ users });
}));

app.put('/api/admin/users/:id/role', authenticate, allowRoles('ADMIN'), asyncRoute(async (req, res) => {
  const parsed = z.object({ role: z.enum(['STUDENT', 'MODERATOR', 'ADMIN']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Choose a valid user role.' });
  if (req.params.id === req.user.id && parsed.data.role !== 'ADMIN') return res.status(409).json({ error: 'You cannot remove your own administrator access.' });
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } });
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.role === 'ADMIN' && parsed.data.role !== 'ADMIN' &&
      await prisma.user.count({ where: { role: 'ADMIN' } }) <= 1) {
    return res.status(409).json({ error: 'Promote another administrator before changing the last admin account.' });
  }
  const user = await prisma.user.update({
    where: { id: req.params.id }, data: { role: parsed.data.role },
    select: { id: true, name: true, email: true, role: true }
  });
  res.json({ user });
}));

app.get('/api/admin/reports', authenticate, allowRoles('ADMIN', 'MODERATOR'), asyncRoute(async (_req, res) => {
  const reports = await prisma.itemReport.findMany({
    include: { user: { select: { id: true, name: true, email: true } }, images: true },
    orderBy: { createdAt: 'desc' }, take: 200
  });
  res.json({ reports: reports.map((report) => ({ ...publicReport(report), duplicateFlag: report.duplicateFlag })) });
}));

app.put('/api/admin/reports/:id', authenticate, allowRoles('ADMIN', 'MODERATOR'), asyncRoute(async (req, res) => {
  const parsed = z.object({ status: z.enum(['REPORTED', 'DISPUTED', 'CLOSED', 'REMOVED']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Choose a valid moderation status.' });
  const report = await prisma.itemReport.findUnique({ where: { id: req.params.id } });
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  await recordStatus(report.id, parsed.data.status, `Status changed by ${req.user.role.toLowerCase()}.`);
  await notify(report.userId, 'STATUS', `Your report ${report.reportCode} was marked ${parsed.data.status.toLowerCase()}.`);
  res.json({ success: true });
}));

app.get('/api/admin/claims', authenticate, allowRoles('ADMIN', 'MODERATOR'), asyncRoute(async (_req, res) => {
  const claims = await prisma.ownershipClaim.findMany({
    where: { status: { in: ['PENDING_VERIFICATION', 'DISPUTED'] } },
    include: { claimant: { select: { id: true, name: true, email: true } }, lostReport: true, foundReport: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ claims: claims.map((claim) => ({
    id: claim.id, status: claim.status, createdAt: claim.createdAt,
    answersPassed: claim.answersPassed, claimant: claim.claimant,
    lostReport: publicReport(claim.lostReport), foundReport: publicReport(claim.foundReport)
  })) });
}));

app.post('/api/admin/locations', authenticate, allowRoles('ADMIN'), asyncRoute(async (req, res) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional()
  }).refine((value) => (value.latitude === undefined) === (value.longitude === undefined), 'Provide both coordinates or neither.').safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a location name and optional coordinate pair.', details: validationError(parsed.error) });
  const location = await prisma.campusLocation.create({ data: parsed.data });
  res.status(201).json({ location });
}));

app.delete('/api/admin/locations/:id', authenticate, allowRoles('ADMIN'), asyncRoute(async (req, res) => {
  const location = await prisma.campusLocation.findUnique({ where: { id: req.params.id } });
  if (!location) return res.status(404).json({ error: 'Campus location not found.' });
  await prisma.campusLocation.delete({ where: { id: location.id } });
  res.json({ success: true });
}));

app.get('/api/leaderboard', asyncRoute(async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, name: true, contribution: true },
    orderBy: { contribution: 'desc' }, take: 20
  });
  res.json({ users });
}));

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller.' : 'Image upload failed.' });
  if (error.code === 'P2002') return res.status(409).json({ error: 'That value is already in use.' });
  if (error.code === 'P2025') return res.status(404).json({ error: 'The requested record was not found.' });
  if (error.message?.startsWith('Images must')) return res.status(400).json({ error: error.message });
  console.error(error);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

export default app;
