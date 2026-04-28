import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const employee = await prisma.employee.upsert({
    where: {
      hcmEmployeeId: 'EMP001',
    },
    update: {},
    create: {
      name: 'Jesus',
      hcmEmployeeId: 'EMP001',
    },
  });

  await prisma.leaveBalance.upsert({
    where: {
      employeeId_leaveType: {
        employeeId: employee.id,
        leaveType: 'vacation',
      },
    },
    update: {},
    create: {
      employeeId: employee.id,
      leaveType: 'vacation',
      hcmBalance: 10,
    },
  });

  console.log('Employee id 1:', employee.id);

  const employee2 = await prisma.employee.upsert({
    where: {
      hcmEmployeeId: 'EMP002',
    },
    update: {},
    create: {
      name: 'Maria',
      hcmEmployeeId: 'EMP002',
    },
  });

  await prisma.leaveBalance.upsert({
    where: {
      employeeId_leaveType: {
        employeeId: employee2.id,
        leaveType: 'vacation',
      },
    },
    update: {},
    create: {
      employeeId: employee2.id,
      leaveType: 'vacation',
      hcmBalance: 10,
    },
  });

  console.log('Employee id 2:', employee2.id);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
