import { api } from '../helpers.js';

describe('Public Endpoints', () => {
    describe('GET /api/public/fitness-goals', () => {
        it('should return fitness goals list', async () => {
            const response = await api.get('/api/public/fitness-goals');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0]).toHaveProperty('id');
            expect(response.body.data[0]).toHaveProperty('key');
            expect(response.body.data[0]).toHaveProperty('name');
        });
    });

    describe('GET /api/public/languages', () => {
        it('should return languages list', async () => {
            const response = await api.get('/api/public/languages');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/public/body-targets', () => {
        it('should return body targets for MALE', async () => {
            const response = await api.get('/api/public/body-targets?gender=MALE');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });

        it('should return error without gender param', async () => {
            const response = await api.get('/api/public/body-targets');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/public/equipment', () => {
        it('should return equipment list', async () => {
            const response = await api.get('/api/public/equipment');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });
    });

    describe('GET /api/public/health-limitations', () => {
        it('should return health limitations list', async () => {
            const response = await api.get('/api/public/health-limitations');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });
    });

    describe('GET /api/public/workout-locations', () => {
        it('should return workout locations list', async () => {
            const response = await api.get('/api/public/workout-locations');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });
    });
});
