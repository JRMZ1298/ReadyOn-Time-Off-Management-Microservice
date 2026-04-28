/*
  Warnings:

  - Added the required column `updatedAt` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `LeaveBalance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TimeOffRequest` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hcmEmployeeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Employee" ("hcmEmployeeId", "id", "name") SELECT "hcmEmployeeId", "id", "name" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_hcmEmployeeId_key" ON "Employee"("hcmEmployeeId");
CREATE TABLE "new_LeaveBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "hcmBalance" REAL NOT NULL,
    "reservedDays" REAL NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastSyncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LeaveBalance" ("employeeId", "hcmBalance", "id", "lastSyncedAt", "leaveType", "reservedDays", "version") SELECT "employeeId", "hcmBalance", "id", "lastSyncedAt", "leaveType", "reservedDays", "version" FROM "LeaveBalance";
DROP TABLE "LeaveBalance";
ALTER TABLE "new_LeaveBalance" RENAME TO "LeaveBalance";
CREATE UNIQUE INDEX "LeaveBalance_employeeId_leaveType_key" ON "LeaveBalance"("employeeId", "leaveType");
CREATE TABLE "new_Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "daysHeld" REAL NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reservation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TimeOffRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reservation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Reservation" ("daysHeld", "employeeId", "expiresAt", "id", "requestId") SELECT "daysHeld", "employeeId", "expiresAt", "id", "requestId" FROM "Reservation";
DROP TABLE "Reservation";
ALTER TABLE "new_Reservation" RENAME TO "Reservation";
CREATE UNIQUE INDEX "Reservation_requestId_key" ON "Reservation"("requestId");
CREATE TABLE "new_TimeOffRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "requestedDays" REAL NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeOffRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TimeOffRequest" ("employeeId", "endDate", "id", "requestedDays", "startDate", "status") SELECT "employeeId", "endDate", "id", "requestedDays", "startDate", "status" FROM "TimeOffRequest";
DROP TABLE "TimeOffRequest";
ALTER TABLE "new_TimeOffRequest" RENAME TO "TimeOffRequest";
CREATE INDEX "TimeOffRequest_employeeId_idx" ON "TimeOffRequest"("employeeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
