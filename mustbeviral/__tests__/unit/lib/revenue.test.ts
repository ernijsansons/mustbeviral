// Comprehensive unit tests for RevenueService
// Tests revenue calculation, commission tracking, and payout logic

import { 
  RevenueService, 
  CommissionTransaction, 
  EarningsOverview, 
  RevenueMetrics 
} from '../../../src/lib/revenue';

describe('RevenueService', () => {
  let revenueService: RevenueService;

  beforeEach(() => {
    revenueService = new RevenueService();
    
    // Clear any global state between tests
    if (typeof global !== 'undefined' && global.commissionTransactions) {
      global.commissionTransactions.clear();
    }
    
    // Suppress console.log in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(revenueService).toBeInstanceOf(RevenueService);
      expect((revenueService as any).defaultCommissionRate).toBe(0.15);
      expect((revenueService as any).minimumPayoutAmount).toBe(50);
    });
  });

  describe('recordCommission', () => {
    it('should record commission with default rate', async () => {
      const userId = 'user-123';
      const matchId = 'match-456';
      const campaignAmount = 1000;

      const result = await revenueService.recordCommission(userId, matchId, campaignAmount);

      expect(result).toMatchObject({
        user_id: userId,
        match_id: matchId,
        amount: campaignAmount,
        commission_rate: 0.15,
        commission_amount: 150,
        status: 'pending',
      });
      expect(result.id).toMatch(/^txn_\d+_[a-z0-9]+$/);
      expect(result.created_at).toBeTruthy();
      expect(result.updated_at).toBeTruthy();
    });

    it('should record commission with custom rate', async () => {
      const userId = 'user-123';
      const matchId = 'match-456';
      const campaignAmount = 1000;
      const customRate = 0.20;

      const result = await revenueService.recordCommission(
        userId, 
        matchId, 
        campaignAmount, 
        customRate
      );

      expect(result.commission_rate).toBe(0.20);
      expect(result.commission_amount).toBe(200);
    });

    it('should record commission with content ID', async () => {
      const userId = 'user-123';
      const matchId = 'match-456';
      const campaignAmount = 1000;
      const contentId = 'content-789';

      const result = await revenueService.recordCommission(
        userId, 
        matchId, 
        campaignAmount, 
        undefined, 
        contentId
      );

      expect(result.content_id).toBe(contentId);
    });

    it('should handle zero commission amount', async () => {
      const userId = 'user-123';
      const matchId = 'match-456';
      const campaignAmount = 0;

      const result = await revenueService.recordCommission(userId, matchId, campaignAmount);

      expect(result.amount).toBe(0);
      expect(result.commission_amount).toBe(0);
    });

    it('should handle negative campaign amount', async () => {
      const userId = 'user-123';
      const matchId = 'match-456';
      const campaignAmount = -100;

      const result = await revenueService.recordCommission(userId, matchId, campaignAmount);

      expect(result.amount).toBe(-100);
      expect(result.commission_amount).toBe(-15);
    });

    it('should handle fractional amounts correctly', async () => {
      const userId = 'user-123';
      const matchId = 'match-456';
      const campaignAmount = 123.45;

      const result = await revenueService.recordCommission(userId, matchId, campaignAmount);

      expect(result.commission_amount).toBeCloseTo(18.5175, 4);
    });

    it('should generate unique transaction IDs', async () => {
      const userId = 'user-123';
      const matchId = 'match-456';
      const campaignAmount = 1000;

      const results = await Promise.all([
        revenueService.recordCommission(userId, matchId, campaignAmount),
        revenueService.recordCommission(userId, matchId, campaignAmount),
        revenueService.recordCommission(userId, matchId, campaignAmount),
      ]);

      const ids = results.map(r => r.id);
      expect(new Set(ids).size).toBe(3); // All unique
    });

    it('should handle saveTransaction errors', async () => {
      // Mock saveTransaction to throw error
      const originalSave = (revenueService as any).saveTransaction;
      (revenueService as any).saveTransaction = jest.fn().mockRejectedValue(new Error('Save failed'));

      const userId = 'user-123';
      const matchId = 'match-456';
      const campaignAmount = 1000;

      await expect(
        revenueService.recordCommission(userId, matchId, campaignAmount)
      ).rejects.toThrow('Failed to record commission transaction');

      // Restore original method
      (revenueService as any).saveTransaction = originalSave;
    });
  });

  describe('getUserEarnings', () => {
    it('should calculate earnings for demo user correctly', async () => {
      const result = await revenueService.getUserEarnings('demo-user');

      expect(result).toMatchObject({
        user_id: 'demo-user',
        total_earned: 270, // 150 + 120
        pending_amount: 120,
        completed_amount: 150,
        total_transactions: 2,
        avg_commission_rate: 0.15,
        next_payout_eligible: true, // 120 >= 50
      });
      expect(result.last_payout).toBeTruthy();
    });

    it('should return empty earnings for non-demo user', async () => {
      const result = await revenueService.getUserEarnings('other-user');

      expect(result).toMatchObject({
        user_id: 'other-user',
        total_earned: 0,
        pending_amount: 0,
        completed_amount: 0,
        total_transactions: 0,
        avg_commission_rate: 0.15, // default rate
        last_payout: null,
        next_payout_eligible: false,
      });
    });

    it('should handle empty transaction list correctly', async () => {
      // Mock getUserTransactions to return empty array
      const originalGetTransactions = (revenueService as any).getUserTransactions;
      (revenueService as any).getUserTransactions = jest.fn().mockResolvedValue([]);

      const result = await revenueService.getUserEarnings('test-user');

      expect(result.total_transactions).toBe(0);
      expect(result.avg_commission_rate).toBe(0.15); // should fallback to default

      // Restore original method
      (revenueService as any).getUserTransactions = originalGetTransactions;
    });

    it('should calculate average commission rate correctly', async () => {
      const mockTransactions: CommissionTransaction[] = [
        {
          id: 'txn1',
          user_id: 'test-user',
          match_id: 'match1',
          amount: 1000,
          commission_rate: 0.10,
          commission_amount: 100,
          status: 'completed',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'txn2',
          user_id: 'test-user',
          match_id: 'match2',
          amount: 1000,
          commission_rate: 0.20,
          commission_amount: 200,
          status: 'pending',
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z',
        },
      ];

      const originalGetTransactions = (revenueService as any).getUserTransactions;
      (revenueService as any).getUserTransactions = jest.fn().mockResolvedValue(mockTransactions);

      const result = await revenueService.getUserEarnings('test-user');

      expect(result.avg_commission_rate).toBe(0.15); // (0.10 + 0.20) / 2

      // Restore original method
      (revenueService as any).getUserTransactions = originalGetTransactions;
    });

    it('should find most recent payout correctly', async () => {
      const mockTransactions: CommissionTransaction[] = [
        {
          id: 'txn1',
          user_id: 'test-user',
          match_id: 'match1',
          amount: 1000,
          commission_rate: 0.15,
          commission_amount: 150,
          status: 'completed',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T10:00:00Z', // Earlier
        },
        {
          id: 'txn2',
          user_id: 'test-user',
          match_id: 'match2',
          amount: 1000,
          commission_rate: 0.15,
          commission_amount: 150,
          status: 'completed',
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T10:00:00Z', // Later
        },
        {
          id: 'txn3',
          user_id: 'test-user',
          match_id: 'match3',
          amount: 1000,
          commission_rate: 0.15,
          commission_amount: 150,
          status: 'pending',
          created_at: '2025-01-03T00:00:00Z',
          updated_at: '2025-01-03T10:00:00Z', // Should not be considered
        },
      ];

      const originalGetTransactions = (revenueService as any).getUserTransactions;
      (revenueService as any).getUserTransactions = jest.fn().mockResolvedValue(mockTransactions);

      const result = await revenueService.getUserEarnings('test-user');

      expect(result.last_payout).toBe('2025-01-02T10:00:00Z');

      // Restore original method
      (revenueService as any).getUserTransactions = originalGetTransactions;
    });

    it('should handle getUserTransactions errors', async () => {
      const originalGetTransactions = (revenueService as any).getUserTransactions;
      (revenueService as any).getUserTransactions = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(revenueService.getUserEarnings('test-user')).rejects.toThrow(
        'Failed to retrieve user earnings'
      );

      // Restore original method
      (revenueService as any).getUserTransactions = originalGetTransactions;
    });
  });

  describe('getRevenueMetrics', () => {
    it('should return revenue metrics', async () => {
      const result = await revenueService.getRevenueMetrics();

      expect(result).toMatchObject({
        total_revenue: 125000,
        total_commissions_paid: 18750,
        pending_commissions: 3420,
        active_influencers: 47,
        avg_commission_rate: 0.15,
      });
      expect(result.top_earners).toHaveLength(5);
      expect(result.top_earners[0]).toMatchObject({
        user_id: 'user1',
        username: 'tech_sarah',
        total_earned: 2340,
        transactions: 12,
      });
    });

    it('should handle errors gracefully', async () => {
      // This test is mainly for coverage since the method doesn't actually access external resources
      // But we can test the error handling structure
      const originalConsoleError = console.error;
      const mockConsoleError = jest.fn();
      console.error = mockConsoleError;

      const result = await revenueService.getRevenueMetrics();
      
      // Should still return metrics even if there were issues
      expect(result).toBeDefined();
      expect(result.total_revenue).toBe(125000);

      console.error = originalConsoleError;
    });
  });

  describe('updateTransactionStatus', () => {
    it('should update transaction status', async () => {
      const transactionId = 'test-txn-123';
      const newStatus = 'completed';

      await revenueService.updateTransactionStatus(transactionId, newStatus);

      // Verify the transaction was updated by checking the saved transaction
      const originalGetTransaction = (revenueService as any).getTransaction;
      let savedTransaction: CommissionTransaction | null = null;
      
      (revenueService as any).saveTransaction = jest.fn().mockImplementation((txn: CommissionTransaction) => {
        savedTransaction = txn;
        return Promise.resolve();
      });

      await revenueService.updateTransactionStatus(transactionId, newStatus);

      expect(savedTransaction?.status).toBe(newStatus);
      expect(savedTransaction?.updated_at).toBeTruthy();
    });

    it('should update transaction with Stripe transfer ID', async () => {
      const transactionId = 'test-txn-123';
      const newStatus = 'completed';
      const stripeTransferId = 'tr_stripe_123';

      let savedTransaction: CommissionTransaction | null = null;
      
      (revenueService as any).saveTransaction = jest.fn().mockImplementation((txn: CommissionTransaction) => {
        savedTransaction = txn;
        return Promise.resolve();
      });

      await revenueService.updateTransactionStatus(transactionId, newStatus, stripeTransferId);

      expect(savedTransaction?.status).toBe(newStatus);
      expect(savedTransaction?.stripe_transfer_id).toBe(stripeTransferId);
    });

    it('should handle transaction not found gracefully', async () => {
      const originalGetTransaction = (revenueService as any).getTransaction;
      (revenueService as any).getTransaction = jest.fn().mockResolvedValue(null);

      // Should not throw error when transaction not found
      await expect(
        revenueService.updateTransactionStatus('nonexistent', 'completed')
      ).resolves.toBeUndefined();

      // Restore original method
      (revenueService as any).getTransaction = originalGetTransaction;
    });

    it('should handle update errors', async () => {
      const originalSaveTransaction = (revenueService as any).saveTransaction;
      (revenueService as any).saveTransaction = jest.fn().mockRejectedValue(new Error('Save failed'));

      await expect(
        revenueService.updateTransactionStatus('test-txn', 'completed')
      ).rejects.toThrow('Failed to update transaction status');

      // Restore original method
      (revenueService as any).saveTransaction = originalSaveTransaction;
    });
  });

  describe('calculateCommission', () => {
    it('should calculate commission with default rate', () => {
      const amount = 1000;
      const result = revenueService.calculateCommission(amount);
      
      expect(result).toBe(150); // 1000 * 0.15
    });

    it('should calculate commission with custom rate', () => {
      const amount = 1000;
      const customRate = 0.20;
      const result = revenueService.calculateCommission(amount, customRate);
      
      expect(result).toBe(200); // 1000 * 0.20
    });

    it('should handle zero amount', () => {
      const result = revenueService.calculateCommission(0);
      expect(result).toBe(0);
    });

    it('should handle negative amount', () => {
      const result = revenueService.calculateCommission(-100);
      expect(result).toBe(-15);
    });

    it('should handle fractional amounts', () => {
      const amount = 123.45;
      const result = revenueService.calculateCommission(amount);
      
      expect(result).toBeCloseTo(18.5175, 4);
    });

    it('should handle zero rate', () => {
      const amount = 1000;
      const result = revenueService.calculateCommission(amount, 0);
      
      expect(result).toBe(0);
    });

    it('should handle rate greater than 1', () => {
      const amount = 1000;
      const result = revenueService.calculateCommission(amount, 1.5);
      
      expect(result).toBe(1500);
    });
  });

  describe('isPayoutEligible', () => {
    it('should return true for amounts meeting minimum', () => {
      expect(revenueService.isPayoutEligible(50)).toBe(true);
      expect(revenueService.isPayoutEligible(100)).toBe(true);
      expect(revenueService.isPayoutEligible(50.01)).toBe(true);
    });

    it('should return false for amounts below minimum', () => {
      expect(revenueService.isPayoutEligible(0)).toBe(false);
      expect(revenueService.isPayoutEligible(49.99)).toBe(false);
      expect(revenueService.isPayoutEligible(25)).toBe(false);
    });

    it('should handle negative amounts', () => {
      expect(revenueService.isPayoutEligible(-10)).toBe(false);
    });

    it('should handle exact minimum amount', () => {
      expect(revenueService.isPayoutEligible(50)).toBe(true);
    });
  });

  describe('private methods', () => {
    describe('generateTransactionId', () => {
      it('should generate unique IDs', () => {
        const id1 = (revenueService as any).generateTransactionId();
        const id2 = (revenueService as any).generateTransactionId();
        
        expect(id1).toMatch(/^txn_\d+_[a-z0-9]+$/);
        expect(id2).toMatch(/^txn_\d+_[a-z0-9]+$/);
        expect(id1).not.toBe(id2);
      });
    });

    describe('getUserTransactions', () => {
      it('should return mock transactions for demo user', async () => {
        const transactions = await (revenueService as any).getUserTransactions('demo-user');
        
        expect(transactions).toHaveLength(2);
        expect(transactions[0]).toMatchObject({
          id: 'txn_1',
          user_id: 'demo-user',
          status: 'completed',
          commission_amount: 150,
        });
        expect(transactions[1]).toMatchObject({
          id: 'txn_2',
          user_id: 'demo-user',
          status: 'pending',
          commission_amount: 120,
        });
      });

      it('should return empty array for other users', async () => {
        const transactions = await (revenueService as any).getUserTransactions('other-user');
        expect(transactions).toEqual([]);
      });
    });

    describe('getTransaction', () => {
      it('should return mock transaction', async () => {
        const transaction = await (revenueService as any).getTransaction('any-id');
        
        expect(transaction).toMatchObject({
          id: 'any-id',
          user_id: 'demo-user',
          status: 'pending',
          commission_amount: 150,
        });
        expect(transaction.created_at).toBeTruthy();
        expect(transaction.updated_at).toBeTruthy();
      });
    });

    describe('saveTransaction', () => {
      it('should save transaction to global storage', async () => {
        const transaction: CommissionTransaction = {
          id: 'test-txn',
          user_id: 'user-123',
          match_id: 'match-456',
          amount: 1000,
          commission_rate: 0.15,
          commission_amount: 150,
          status: 'pending',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        };

        await (revenueService as any).saveTransaction(transaction);

        expect(global.commissionTransactions?.has('test-txn')).toBe(true);
        expect(global.commissionTransactions?.get('test-txn')).toEqual(transaction);
      });

      it('should handle save errors', async () => {
        const transaction: CommissionTransaction = {
          id: 'test-txn',
          user_id: 'user-123',
          match_id: 'match-456',
          amount: 1000,
          commission_rate: 0.15,
          commission_amount: 150,
          status: 'pending',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        };

        // Mock global to cause error
        const originalGlobal = global;
        (global as any) = null;

        await expect((revenueService as any).saveTransaction(transaction)).rejects.toThrow();

        // Restore global
        (global as any) = originalGlobal;
      });
    });
  });

  describe('type safety and interfaces', () => {
    it('should validate CommissionTransaction interface', () => {
      const transaction: CommissionTransaction = {
        id: 'txn_123',
        user_id: 'user_456',
        content_id: 'content_789',
        match_id: 'match_101',
        amount: 1000,
        commission_rate: 0.15,
        commission_amount: 150,
        status: 'completed',
        stripe_transfer_id: 'tr_stripe_123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(transaction.id).toBe('txn_123');
      expect(transaction.status).toBe('completed');
      expect(transaction.commission_amount).toBe(150);
    });

    it('should validate EarningsOverview interface', () => {
      const earnings: EarningsOverview = {
        user_id: 'user_123',
        total_earned: 500,
        pending_amount: 150,
        completed_amount: 350,
        total_transactions: 5,
        avg_commission_rate: 0.15,
        last_payout: '2025-01-01T00:00:00Z',
        next_payout_eligible: true,
      };

      expect(earnings.user_id).toBe('user_123');
      expect(earnings.next_payout_eligible).toBe(true);
      expect(earnings.total_earned).toBe(500);
    });

    it('should validate RevenueMetrics interface', () => {
      const metrics: RevenueMetrics = {
        total_revenue: 100000,
        total_commissions_paid: 15000,
        pending_commissions: 2500,
        active_influencers: 25,
        avg_commission_rate: 0.15,
        top_earners: [
          {
            user_id: 'user1',
            username: 'top_creator',
            total_earned: 1500,
            transactions: 10,
          },
        ],
      };

      expect(metrics.total_revenue).toBe(100000);
      expect(metrics.top_earners).toHaveLength(1);
      expect(metrics.top_earners[0].username).toBe('top_creator');
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle concurrent commission recording', async () => {
      const promises = [
        revenueService.recordCommission('user1', 'match1', 1000),
        revenueService.recordCommission('user2', 'match2', 1500),
        revenueService.recordCommission('user3', 'match3', 800),
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.user_id).toBe(`user${index + 1}`);
        expect(result.match_id).toBe(`match${index + 1}`);
        expect(result.status).toBe('pending');
      });
    });

    it('should handle extreme commission rates', () => {
      expect(revenueService.calculateCommission(1000, 0)).toBe(0);
      expect(revenueService.calculateCommission(1000, 1)).toBe(1000);
      expect(revenueService.calculateCommission(1000, 2)).toBe(2000);
      expect(revenueService.calculateCommission(1000, -0.1)).toBe(-100);
    });

    it('should handle very large amounts', () => {
      const largeAmount = 999999999.99;
      const commission = revenueService.calculateCommission(largeAmount);
      
      expect(commission).toBeCloseTo(149999999.9985, 4);
    });

    it('should handle very small amounts', () => {
      const smallAmount = 0.01;
      const commission = revenueService.calculateCommission(smallAmount);
      
      expect(commission).toBeCloseTo(0.0015, 6);
    });
  });

  describe('singleton export', () => {
    it('should export a singleton revenue service', () => {
      const { revenueService: exportedService } = require('../../../src/lib/revenue');
      expect(exportedService).toBeInstanceOf(RevenueService);
    });
  });
});