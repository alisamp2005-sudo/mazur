/**
 * Reports Dashboard
 * Comprehensive statistics and analytics for calls and campaigns
 */

import React, { useState } from 'react';
import { trpc } from '../../lib/trpc';

export default function ReportsDashboard() {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  // Fetch applications
  const { data: accounts } = trpc.voximplant.getAccounts.useQuery();
  const firstAccount = accounts?.[0];
  
  const { data: applications } = trpc.voximplant.getApplications.useQuery(
    { voximplantAccountId: firstAccount?.id || 0 },
    { enabled: !!firstAccount }
  );

  const firstApp = applications?.[0];

  // Calculate date range
  const getDateRange = () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    switch (dateRange) {
      case 'today':
        return { startDate: now - day, endDate: now };
      case 'week':
        return { startDate: now - 7 * day, endDate: now };
      case 'month':
        return { startDate: now - 30 * day, endDate: now };
      default:
        return {};
    }
  };

  const range = getDateRange();

  // Fetch statistics
  const { data: stats, isLoading } = trpc.voximplant.getStats.useQuery(
    {
      applicationId: firstApp?.id || 0,
      startDate: range.startDate ? Math.floor(range.startDate / 1000) : undefined,
      endDate: range.endDate ? Math.floor(range.endDate / 1000) : undefined,
    },
    { enabled: !!firstApp }
  );

  // Fetch recent calls
  const { data: recentCalls } = trpc.voximplant.getCalls.useQuery(
    {
      applicationId: firstApp?.id || 0,
      limit: 10,
      startDate: range.startDate ? Math.floor(range.startDate / 1000) : undefined,
      endDate: range.endDate ? Math.floor(range.endDate / 1000) : undefined,
    },
    { enabled: !!firstApp }
  );

  // Fetch campaigns
  const { data: campaigns } = trpc.campaigns.getCampaigns.useQuery(
    { applicationId: firstApp?.id || 0 },
    { enabled: !!firstApp }
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка отчетов...</p>
        </div>
      </div>
    );
  }

  const successRate = stats?.totalCalls
    ? Math.round((stats.successfulCalls / stats.totalCalls) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Отчеты и статистика</h1>
        
        {/* Date Range Selector */}
        <div className="flex gap-2">
          {(['today', 'week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === 'today' && 'Сегодня'}
              {range === 'week' && 'Неделя'}
              {range === 'month' && 'Месяц'}
              {range === 'all' && 'Все время'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Всего звонков</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalCalls || 0}</p>
            </div>
            <div className="text-4xl">📞</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Успешных</p>
              <p className="text-3xl font-bold text-green-600">{stats?.successfulCalls || 0}</p>
              <p className="text-xs text-gray-500 mt-1">{successRate}% успеха</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Средняя длительность</p>
              <p className="text-3xl font-bold text-blue-600">
                {formatDuration(stats?.averageDuration || 0)}
              </p>
            </div>
            <div className="text-4xl">⏱️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Общая стоимость</p>
              <p className="text-3xl font-bold text-purple-600">
                {formatCost(stats?.totalCost || 0)}
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success Rate Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Процент успешности</h2>
          <div className="flex items-center justify-center h-48">
            <div className="relative w-48 h-48">
              <svg className="transform -rotate-90 w-48 h-48">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#e5e7eb"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#10b981"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${successRate * 5.03} 503`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900">{successRate}%</div>
                  <div className="text-sm text-gray-500">успеха</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Stats */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Кампании</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">Всего кампаний</span>
              <span className="font-bold text-xl">{campaigns?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="text-gray-700">Завершено</span>
              <span className="font-bold text-xl text-green-600">
                {campaigns?.filter(c => c.status === 'completed').length || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
              <span className="text-gray-700">Выполняется</span>
              <span className="font-bold text-xl text-blue-600">
                {campaigns?.filter(c => c.status === 'running').length || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">Черновики</span>
              <span className="font-bold text-xl text-gray-600">
                {campaigns?.filter(c => c.status === 'draft').length || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Calls Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Последние звонки</h2>
        </div>
        
        {!recentCalls || recentCalls.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Нет звонков за выбранный период
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Номер
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Направление
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Длительность
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Стоимость
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentCalls.map((call) => (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(call.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    {call.phoneNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {call.direction === 'outbound' ? (
                      <span className="text-blue-600">📤 Исходящий</span>
                    ) : (
                      <span className="text-green-600">📥 Входящий</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {call.status === 'completed' && (
                      <span className="text-green-600 font-medium">Завершен</span>
                    )}
                    {call.status === 'failed' && (
                      <span className="text-red-600 font-medium">Ошибка</span>
                    )}
                    {call.status === 'pending' && (
                      <span className="text-gray-600">В ожидании</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    {call.duration ? formatDuration(call.duration) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    {call.cost ? formatCost(call.cost) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
