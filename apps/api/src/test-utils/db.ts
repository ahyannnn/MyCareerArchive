import { prisma } from "../prisma.js";

// Integration tests run against the real database (Neon dev project).
// Each suite creates its own throwaway users and removes them in afterAll;
// User relations are onDelete:Cascade so all child rows disappear too.
export async function createTestUser(suite: string) {
  const rand = Math.floor(Math.random() * 1e6);
  return prisma.user.create({
    data: { email: `phase3-${suite}-${Date.now()}-${rand}@example.com`, name: `Phase3 ${suite}` },
  });
}

export async function deleteTestUser(id: string) {
  await prisma.user.deleteMany({ where: { id } });
}

// Dev stand-in for Phase 4 auth: routes read the user from this header.
export function authHeader(userId: string) {
  return { "x-user-id": userId };
}
