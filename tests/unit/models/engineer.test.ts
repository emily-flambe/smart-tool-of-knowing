import { Engineer } from '../../../src/types/dashboard.types';

describe('Engineer Model', () => {
  describe('Engineer creation', () => {
    it('should create a valid engineer object', () => {
      const engineer: Engineer = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        linearUserId: 'linear-123',
        githubUsername: 'johndoe',
        isActive: true
      };

      expect(engineer.id).toBe('123');
      expect(engineer.name).toBe('John Doe');
      expect(engineer.email).toBe('john@example.com');
      expect(engineer.isActive).toBe(true);
    });

    it('should allow optional fields', () => {
      const engineer: Engineer = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        isActive: true
      };

      expect(engineer.linearUserId).toBeUndefined();
      expect(engineer.githubUsername).toBeUndefined();
      expect(engineer.team).toBeUndefined();
    });
  });
});