// Earnings dashboard for influencers to view commissions
// LOG: COMPONENT-EARNINGS-1 - Initialize earnings dashboard

'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, Calendar, Download} from 'lucide-react';

interface EarningsOverview {
  user_id: string;
  total_earned: number;
  pending_amount: number;
  completed_amount: number;
  total_transactions: number;
  avg_commission_rate: number;
  last_payout: string | null;
  next_payout_eligible: boolean;
}

interface CommissionTransaction {
  id: string;
  user_id: string;
  content_id?: string;
  match_id: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
}

export function EarningsDashboard({ userId = 'demo-user' }: { userId?: string }) {
  const [overview, setOverview] = useState<EarningsOverview | null>(null);
  const [transactions, setTransactions] = useState<CommissionTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'payouts'>('overview');

  console.log('LOG: COMPONENT-EARNINGS-2 - EarningsDashboard rendered for user:', userId);

  useEffect_(() => {
    loadEarningsData();
  }, [userId]);

    console.log('LOG: COMPONENT-EARNINGS-3 - Loading earnings data');
    setLoading(true);

    try {
      const response = await fetch(`/api/revenue?type=earnings&userid=${userId}`);
      const result = await response.json();

      if (result.success) {
        setOverview(result.data);
        console.log('LOG: COMPONENT-EARNINGS-4 - Earnings data loaded');
      }
    } catch (error) {
      console.error('LOG: COMPONENT-EARNINGS-ERROR-1 - Failed to load earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestPayout = async () => {
    console.log('LOG: COMPONENT-EARNINGS-5 - Requesting payout');
    
    try {
      // In Phase 3, this would integrate with Stripe Connect
      alert('Payout functionality will be available in Phase 3 with Stripe Connect integration');
    } catch (error) {
      console.error('LOG: COMPONENT-EARNINGS-ERROR-2 - Payout request failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" aria-hidden="true"></div>
          <span className="ml-2 text-gray-600">Loading earnings...</span>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8 text-gray-500">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No earnings data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <DollarSign className="w-6 h-6 mr-2 text-indigo-600" />
            Earnings Dashboard
          </h2>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(overview.totalearned)}</p>
              <p className="text-sm text-gray-500">Total Earned</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'transactions', label: 'Transactions', icon: Calendar },
            { id: 'payouts', label: 'Payouts', icon: Download }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earned</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(overview.totalearned)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(overview.pendingamount)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(overview.completedamount)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercentage(overview.avgcommissionrate)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Commission Transactions</h3>
            <span className="text-sm text-gray-500">{overview.totaltransactions} total</span>
          </div>
          
          <div className="space-y-4">
            {transactions.length > 0 ? transactions.map((transaction) => (
              <div key={transaction.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(transaction.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(transaction.commissionamount)}</p>
                    <p className="text-xs text-gray-500">
                      {formatPercentage(transaction.commissionrate)} of {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Match ID: {transaction.matchid}</p>
                  <p>Created: {new Date(transaction.createdat).toLocaleDateString()}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No commission transactions yet</p>
                <p className="text-sm">Complete influencer matches to start earning commissions</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Payout Management</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Payout Eligibility</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pending Amount:</span>
                    <span className="font-semibold">{formatCurrency(overview.pendingamount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minimum Required:</span>
                    <span className="font-semibold">{formatCurrency(50)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-semibold ${
                      overview.next_payout_eligible ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {overview.next_payout_eligible ? 'Eligible' : 'Not Eligible'}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={requestPayout}
                disabled={!overview.nextpayouteligible}
                className="w-full bg-indigo-600 text-white px-4 py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Request Payout
              </button>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">💡 Payout Information</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Minimum payout amount: $50</li>
                <li>• Payouts processed weekly on Fridays</li>
                <li>• Funds typically arrive in 2-3 business days</li>
                <li>• Stripe Connect integration coming in Phase 3</li>
              </ul>
            </div>
          </div>

          {overview.last_payout && (
            <div className="mt-6 bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Last Payout</h4>
              <p className="text-sm text-green-800">
                {new Date(overview.lastpayout).toLocaleDateString()} - Check your connected account for details
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Hook for using earnings data in other components
export function useEarnings(userId: string) {
  const [overview, setOverview] = useState<EarningsOverview | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEarnings = async () => {
    console.log('LOG: COMPONENT-EARNINGS-6 - Fetching earnings via hook');
    setLoading(true);
    
    try {
      const response = await fetch(`/api/revenue?type=earnings&userid=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        setOverview(result.data);
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('LOG: COMPONENT-EARNINGS-ERROR-3 - Hook fetch failed:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const recordCommission = async (matchId: string, amount: number, commissionRate?: number) => {
    console.log('LOG: COMPONENT-EARNINGS-7 - Recording commission via hook');
    
    try {
      const response = await fetch('/api/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_commission',
          user_id: userId,
          match_id: matchId,
          amount,
          commission_rate: commissionRate
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchEarnings(); // Refresh data
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('LOG: COMPONENT-EARNINGS-ERROR-4 - Record commission failed:', error);
      return null;
    }
  };

  return { overview, loading, fetchEarnings, recordCommission };
}