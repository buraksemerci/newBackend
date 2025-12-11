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

    describe('GET /api/public/exercise-categories', () => {
        it('should return exercise categories list', async () => {
            const response = await api.get('/api/public/exercise-categories');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0]).toHaveProperty('id');
            expect(response.body.data[0]).toHaveProperty('key');
            expect(response.body.data[0]).toHaveProperty('name');
        });
    });

    describe('GET /api/public/movement-patterns', () => {
        it('should return movement patterns list', async () => {
            const response = await api.get('/api/public/movement-patterns');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0]).toHaveProperty('id');
            expect(response.body.data[0]).toHaveProperty('key');
            expect(response.body.data[0]).toHaveProperty('name');
        });
    });

    describe('GET /api/public/muscles', () => {
        it('should return muscles list', async () => {
            const response = await api.get('/api/public/muscles');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0]).toHaveProperty('id');
            expect(response.body.data[0]).toHaveProperty('muscleGroup');
            expect(response.body.data[0]).toHaveProperty('muscleSubgroup');
        });
    });

    describe('GET /api/public/exercises', () => {
        it('should return exercises list with relations', async () => {
            const response = await api.get('/api/public/exercises');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);

            const exercise = response.body.data[0];
            expect(exercise).toHaveProperty('id');
            expect(exercise).toHaveProperty('key');
            expect(exercise).toHaveProperty('name');
            expect(exercise).toHaveProperty('category');
            expect(exercise).toHaveProperty('movementPattern');
            expect(exercise).toHaveProperty('targetMuscles');
            expect(exercise).toHaveProperty('equipment');
            expect(exercise.targetMuscles).toBeInstanceOf(Array);
            expect(exercise.equipment).toBeInstanceOf(Array);
        });

        it('should return exercises in Turkish when lang=tr', async () => {
            const response = await api.get('/api/public/exercises?lang=tr');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });
    });
});
