import 'dotenv/config';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('LostLink2026!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lostlink.edu' },
    update: {},
    create: { name: 'Campus Admin', email: 'admin@lostlink.edu', enrollment: 'ADMIN-001', passwordHash, role: 'ADMIN' }
  });
  const students = [];
  for (const [name, email, enrollment] of [
    ['Alex Morgan', 'alex@lostlink.edu', 'DEMO-1001'],
    ['Sam Rivera', 'sam@lostlink.edu', 'DEMO-1002']
  ]) {
    students.push(await prisma.user.upsert({
      where: { email }, update: {},
      create: { name, email, enrollment, passwordHash, role: 'STUDENT' }
    }));
  }
  await prisma.campusLocation.deleteMany({});

  const classLocations = [];
  for (const department of ['CSE', 'CIVIL', 'IT', 'MECHANICAL', 'ELECTRICAL']) {
    for (const year of ['1st', '2nd', '3rd', '4th']) {
      classLocations.push(`${department} - ${year} Year Class`);
    }
  }

  const campusLocations = [
    'CANTEEN',
    'HOSTEL BH-3',
    'HOSTEL BH-2',
    'HOSTEL BH-1',
    'HOSTEL GH-1',
    'LIBRARY',
    'DIGITAL LIBRARY',
    'CN LAB',
    'DS LAB',
    'COA LAB',
    'DBMS LAB',
    'ELECTRICAL LAB',
    'ELECTRONICS LAB',
    'PHYSICS LAB',
    'CHEMISTRY LAB',
    'LANGUAGE LAB',
    'WORKSHOP',
    ...classLocations
  ];

  for (const name of campusLocations) {
    await prisma.campusLocation.upsert({ where: { name }, update: {}, create: { name } });
  }

  const legacyLocationMap = {
    'Main Library': 'LIBRARY',
    'Engineering Hall': 'ELECTRONICS LAB',
    'Student Center': 'CANTEEN',
    'Campus Green': 'CANTEEN',
    'North Lecture Hall': 'CSE - 1st Year Class'
  };
  for (const [oldName, newName] of Object.entries(legacyLocationMap)) {
    const location = await prisma.campusLocation.findUnique({ where: { name: newName } });
    await prisma.itemReport.updateMany({
      where: { locationName: oldName },
      data: { locationName: newName, campusLocationId: location?.id }
    });
  }
  const samples = [
    { type: 'LOST', title: 'Student ID card', category: 'Cards & IDs', description: 'Blue college ID card with a clear protective sleeve.', color: 'Blue', brand: 'Campus ID', eventDate: new Date('2026-11-18'), locationName: 'LIBRARY', privateVerification: 'small star sticker\nblue lanyard' },
    { type: 'FOUND', title: 'Campus ID card', category: 'Cards & IDs', description: 'Blue ID card found beside the library study area.', color: 'Blue', brand: '', eventDate: new Date('2026-11-18'), locationName: 'LIBRARY', custodyStatus: 'Held at the library desk' },
    { type: 'LOST', title: 'Black scientific calculator', category: 'Electronics', description: 'Black scientific calculator with a scratched back cover.', color: 'Black', brand: 'Casio', eventDate: new Date('2026-11-16'), locationName: 'ELECTRONICS LAB', privateVerification: 'green tape on battery cover' },
    { type: 'FOUND', title: 'Scientific calculator', category: 'Electronics', description: 'Black calculator found after an afternoon lecture.', color: 'Black', brand: 'Casio', eventDate: new Date('2026-11-17'), locationName: 'ELECTRONICS LAB', custodyStatus: 'With the department office' },
    { type: 'LOST', title: 'Stainless water bottle', category: 'Drinkware', description: 'Silver insulated bottle with a small dent near the base.', color: 'Silver', brand: 'Hydro', eventDate: new Date('2026-11-19'), locationName: 'CANTEEN', privateVerification: 'orange mountain sticker' },
    { type: 'FOUND', title: 'Spiral notebook', category: 'Books & stationery', description: 'Dark blue spiral notebook left in a lecture room.', color: 'Navy', brand: '', eventDate: new Date('2026-11-19'), locationName: 'CSE - 1st Year Class', custodyStatus: 'With campus reception' },
    { type: 'LOST', title: 'Key ring', category: 'Keys', description: 'Three keys on a silver ring with a fabric loop.', color: 'Silver', brand: '', eventDate: new Date('2026-11-15'), locationName: 'CANTEEN', privateVerification: 'tiny red fabric loop' },
    { type: 'FOUND', title: 'Wireless earphones', category: 'Electronics', description: 'White wireless earbuds in a compact case.', color: 'White', brand: '', eventDate: new Date('2026-11-20'), locationName: 'CANTEEN', custodyStatus: 'Held by student services' }
  ];
  for (let index = 0; index < samples.length; index += 1) {
    const item = samples[index];
    const owner = item.type === 'LOST' ? students[0] : students[1];
    const reportCode = `LL-DEMO-${index + 1}`;
    const existing = await prisma.itemReport.findUnique({ where: { reportCode } });
    const location = await prisma.campusLocation.findUnique({ where: { name: item.locationName } });
    const normalized = [item.type, item.title, item.category, item.color, item.brand, item.locationName]
      .map((value) => String(value || '').toLowerCase().trim().replace(/\s+/g, ' ')).join('|');
    const fingerprint = crypto.createHash('sha256').update(normalized).digest('hex');
    if (existing) {
      await prisma.itemReport.update({
        where: { id: existing.id },
        data: { locationName: item.locationName, campusLocationId: location?.id }
      });
      continue;
    }
    await prisma.itemReport.create({
      data: {
        ...item, reportCode, userId: owner.id, campusLocationId: location?.id,
        fingerprint, history: { create: { status: 'REPORTED', note: 'Demo report added for evaluation.' } }
      }
    });
  }
  await prisma.notification.createMany({
    data: [
      { userId: students[0].id, type: 'WELCOME', message: 'Welcome to LostLink. Your campus recovery journey starts here.' },
      { userId: admin.id, type: 'SYSTEM', message: 'Demo data is ready for moderation.' }
    ]
  });
}

main()
  .then(() => console.log('Demo users, campus locations, and reports are ready.'))
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
