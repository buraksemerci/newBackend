import { prisma } from '../src/config/index.js';

// Global setup before all tests
beforeAll(async () => {
    console.log('🧪 Test suite starting...');
});

// Global cleanup after all tests
afterAll(async () => {
    await prisma.$disconnect();
    console.log('🧪 Test suite completed');
});
