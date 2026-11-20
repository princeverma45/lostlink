import { prisma } from '../utils/prisma.js';

function normalize(value = '') {
  return value.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function textSimilarity(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));
  const overlap = [...wordsA].filter((word) => wordsB.has(word)).length;
  const tokenScore = (2 * overlap) / (wordsA.size + wordsB.size);
  if (a.length < 2 || b.length < 2) return tokenScore;
  const bigrams = (value) => {
    const pairs = new Map();
    for (let i = 0; i < value.length - 1; i += 1) {
      const pair = value.slice(i, i + 2);
      pairs.set(pair, (pairs.get(pair) || 0) + 1);
    }
    return pairs;
  };
  const pairsA = bigrams(a);
  const pairsB = bigrams(b);
  let shared = 0;
  for (const [pair, count] of pairsA) shared += Math.min(count, pairsB.get(pair) || 0);
  const diceScore = (2 * shared) / (a.length + b.length - 2);
  return Math.max(tokenScore, diceScore);
}

export function calculateMatch(lost, found) {
  const name = textSimilarity(lost.title, found.title);
  const category = normalize(lost.category) === normalize(found.category) ? 1 : textSimilarity(lost.category, found.category) * 0.6;
  const color = textSimilarity(lost.color, found.color);
  const location = textSimilarity(lost.locationName, found.locationName);
  const days = Math.abs(new Date(lost.eventDate) - new Date(found.eventDate)) / 86400000;
  const date = Math.max(0, 1 - days / 30);
  const description = textSimilarity(lost.description, found.description);
  const score = Math.round((name * 25 + category * 20 + color * 15 + location * 20 + date * 10 + description * 10));
  const characteristics = [
    ['Item name', name],
    ['Category', category],
    ['Colour', color],
    ['Location', location],
    ['Date', date],
    ['Description', description]
  ].filter(([, value]) => value >= 0.55).map(([label]) => label);
  return { score, characteristics };
}

export async function matchReport(report) {
  const otherType = report.type === 'LOST' ? 'FOUND' : 'LOST';
  const candidates = await prisma.itemReport.findMany({
    where: { type: otherType, status: { notIn: ['RECOVERED', 'CLOSED', 'REMOVED'] } },
    include: { user: { select: { id: true } } }
  });
  const links = [];
  for (const candidate of candidates) {
    const lost = report.type === 'LOST' ? report : candidate;
    const found = report.type === 'FOUND' ? report : candidate;
    const result = calculateMatch(lost, found);
    if (result.score < 30) continue;
    const previous = await prisma.match.findUnique({
      where: { lostReportId_foundReportId: { lostReportId: lost.id, foundReportId: found.id } },
      select: { id: true }
    });
    const match = await prisma.match.upsert({
      where: { lostReportId_foundReportId: { lostReportId: lost.id, foundReportId: found.id } },
      update: { score: result.score, characteristics: JSON.stringify(result.characteristics) },
      create: { lostReportId: lost.id, foundReportId: found.id, score: result.score, characteristics: JSON.stringify(result.characteristics) }
    });
    links.push(match);
    if (!previous) {
      await prisma.notification.createMany({
        data: [
          { userId: lost.userId, type: 'MATCH', message: `A possible match was found for ${lost.title} (${result.score}% estimate).` },
          { userId: found.userId, type: 'MATCH', message: `A possible match was found for ${found.title} (${result.score}% estimate).` }
        ]
      });
      await prisma.$transaction([
        prisma.itemReport.updateMany({ where: { id: { in: [lost.id, found.id] }, status: 'REPORTED' }, data: { status: 'POSSIBLE_MATCH' } }),
        prisma.reportStatusHistory.createMany({
          data: [lost, found].map((item) => ({ reportId: item.id, status: 'POSSIBLE_MATCH', note: 'A possible match was found. The score is an estimate, not proof of ownership.' }))
        })
      ]);
    }
  }
  return links;
}

export { textSimilarity };
