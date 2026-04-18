import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getById', () => {
    it('should call prisma.user.findUnique with id', async () => {
      const user = { id: 1, phone: '+998901234567' };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      const result = await service.getById(1);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(user);
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.getById(999);
      expect(result).toBeNull();
    });
  });

  describe('getByPhone', () => {
    it('should call prisma.user.findUnique with phone', async () => {
      const user = { id: 1, phone: '+998901234567' };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      const result = await service.getByPhone('+998901234567');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { phone: '+998901234567' } });
      expect(result).toEqual(user);
    });
  });
});
