// Revenue tools for commission tracking and payouts
// LOG: REVENUE-INIT-1 - Initialize revenue management system

export interface CommissionTransaction {
  id: string;
  user_id: string;
  content_id?: string;
  match_id: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripe_transfer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface EarningsOverview {
  user_id: string;
  total_earned: number;
  pending_amount: number;
  completed_amount: number;
  total_transactions: number;
  avg_commission_rate: number;
  last_payout: string | null;
  next_payout_eligible: boolean;
}

export interface RevenueMetrics {
  total_revenue: number;
  total_commissions_paid: number;
  pending_commissions: number;
  active_influencers: number;
  avg_commission_rate: number;
  top_earners: Array<{
    user_id: string;
    username: string;
    total_earned: number;
    transactions: number;
  }>;
}

export class RevenueService {
  private defaultCommissionRate: number = 0.15; // 15%
  private minimumPayoutAmount: number = 50; // $50 minimum

  constructor() {
    console.log('LOG: REVENUE-SERVICE-1 - Initializing revenue service');
  }

  async recordCommission(
    userId: string, 
    matchId: string, 
    campaignAmount: number, 
    customRate?: number,
    contentId?: string
  ): Promise<CommissionTransaction> {
    console.log('LOG: REVENUE-RECORD-1 - Recording commission for user:', userId, 'Amount:', campaignAmount);
    
    try {
      const commissionRate = customRate || this.defaultCommissionRate;
      const commissionAmount = campaignAmount * commissionRate;
      
      const transaction: CommissionTransaction = {
        id: this.generateTransactionId(),
        user_id: userId,
        content_id: contentId,
        match_id: matchId,
        amount: campaignAmount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // In production, this would insert into commission_transactions table
      await this.saveTransaction(transaction);
      
      console.log('LOG: REVENUE-RECORD-2 - Commission recorded:', transaction.id, 'Amount:', commissionAmount);
      return transaction;
    } catch (error) {
      console.error('LOG: REVENUE-RECORD-ERROR-1 - Failed to record commission:', error);
      throw new Error('Failed to record commission transaction');
    }
  }

  async getUserEarnings(userId: string): Promise<EarningsOverview> {
    console.log('LOG: REVENUE-EARNINGS-1 - Getting user earnings:', userId);
    
    try {
      // In production, this would query commission_transactions table
      const transactions = await this.getUserTransactions(userId);
      
      const totalEarned = transactions.reduce((sum, t) => sum + t.commission_amount, 0);
      const pendingAmount = transactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.commission_amount, 0);
      const completedAmount = transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.commission_amount, 0);
      
      const avgRate = transactions.length > 0 
        ? transactions.reduce((sum, t) => sum + t.commission_rate, 0) / transactions.length
        : this.defaultCommissionRate;

      const lastPayout = transactions
        .filter(t => t.status === 'completed')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

      const overview: EarningsOverview = {
        user_id: userId,
        total_earned: totalEarned,
        pending_amount: pendingAmount,
        completed_amount: completedAmount,
        total_transactions: transactions.length,
        avg_commission_rate: avgRate,
        last_payout: lastPayout?.updated_at || null,
        next_payout_eligible: pendingAmount >= this.minimumPayoutAmount
      };

      console.log('LOG: REVENUE-EARNINGS-2 - Earnings calculated:', totalEarned);
      return overview;
    } catch (error) {
      console.error('LOG: REVENUE-EARNINGS-ERROR-1 - Failed to get earnings:', error);
      throw new Error('Failed to retrieve user earnings');
    }
  }

  async getRevenueMetrics(): Promise<RevenueMetrics> {
    console.log('LOG: REVENUE-METRICS-1 - Getting revenue metrics');
    
    try {
      // Mock data for now (in production, would aggregate from commission_transactions)
      const mockMetrics: RevenueMetrics = {
        total_revenue: 125000,
        total_commissions_paid: 18750,
        pending_commissions: 3420,
        active_influencers: 47,
        avg_commission_rate: 0.15,
        top_earners: [
          { user_id: 'user1', username: 'tech_sarah', total_earned: 2340, transactions: 12 },
          { user_id: 'user2', username: 'content_mike', total_earned: 1890, transactions: 9 },
          { user_id: 'user3', username: 'viral_queen', total_earned: 1650, transactions: 8 },
          { user_id: 'user4', username: 'ai_creator', total_earned: 1420, transactions: 7 },
          { user_id: 'user5', username: 'trend_setter', total_earned: 1180, transactions: 6 }
        ]
      };

      console.log('LOG: REVENUE-METRICS-2 - Revenue metrics generated');
      return mockMetrics;
    } catch (error) {
      console.error('LOG: REVENUE-METRICS-ERROR-1 - Failed to get metrics:', error);
      throw new Error('Failed to retrieve revenue metrics');
    }
  }

  async updateTransactionStatus(transactionId: string, status: CommissionTransaction['status'], stripeTransferId?: string): Promise<void> {
    console.log('LOG: REVENUE-UPDATE-1 - Updating transaction status:', transactionId, status);
    
    try {
      // In production, this would update the commission_transactions table
      const transaction = await this.getTransaction(transactionId);
      if (transaction) {
        transaction.status = status;
        transaction.updated_at = new Date().toISOString();
        if (stripeTransferId) {
          transaction.stripe_transfer_id = stripeTransferId;
        }
        
        await this.saveTransaction(transaction);
        console.log('LOG: REVENUE-UPDATE-2 - Transaction status updated successfully');
      }
    } catch (error) {
      console.error('LOG: REVENUE-UPDATE-ERROR-1 - Failed to update transaction:', error);
      throw new Error('Failed to update transaction status');
    }
  }

  calculateCommission(amount: number, rate?: number): number {
    const commissionRate = rate || this.defaultCommissionRate;
    return amount * commissionRate;
  }

  isPayoutEligible(pendingAmount: number): boolean {
    return pendingAmount >= this.minimumPayoutAmount;
  }

  private async getUserTransactions(userId: string): Promise<CommissionTransaction[]> {
    console.log('LOG: REVENUE-TRANSACTIONS-1 - Getting user transactions:', userId);
    
    // Mock data for demo (in production, would query database)
    const mockTransactions: CommissionTransaction[] = [
      {
        id: 'txn_1',
        user_id: userId,
        match_id: 'match_1',
        amount: 1000,
        commission_rate: 0.15,
        commission_amount: 150,
        status: 'completed',
        created_at: '2025-01-20T10:00:00Z',
        updated_at: '2025-01-22T10:00:00Z'
      },
      {
        id: 'txn_2',
        user_id: userId,
        match_id: 'match_2',
        amount: 800,
        commission_rate: 0.15,
        commission_amount: 120,
        status: 'pending',
        created_at: '2025-01-25T14:00:00Z',
        updated_at: '2025-01-25T14:00:00Z'
      }
    ];

    return userId === 'demo-user' ? mockTransactions : [];
  }

  private async getTransaction(transactionId: string): Promise<CommissionTransaction | null> {
    // Mock implementation
    return {
      id: transactionId,
      user_id: 'demo-user',
      match_id: 'match_1',
      amount: 1000,
      commission_rate: 0.15,
      commission_amount: 150,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private async saveTransaction(transaction: CommissionTransaction): Promise<void> {
    console.log('LOG: REVENUE-SAVE-1 - Saving transaction:', transaction.id);
    
    try {
      // In production, this would use DatabaseService to insert/update commission_transactions
      // For now, store in memory for demo
      if (typeof global !== 'undefined') {
        global.commissionTransactions = global.commissionTransactions || new Map();
        global.commissionTransactions.set(transaction.id, transaction);
      }
      
      console.log('LOG: REVENUE-SAVE-2 - Transaction saved successfully');
    } catch (error) {
      console.error('LOG: REVENUE-SAVE-ERROR-1 - Failed to save transaction:', error);
      throw error;
    }
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

// Export singleton instance
export const revenueService = new RevenueService();