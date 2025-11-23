//  PrismaClient를 생성하고 프로젝트 전역에 공유
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
