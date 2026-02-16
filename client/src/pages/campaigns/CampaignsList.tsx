/**
 * Campaigns List Page
 * View all campaigns with stats
 */

import React from 'react';
import { trpc } from '../../lib/trpc';
import { Link } from 'react-router-dom';

export default function CampaignsList() {
  // Fetch applications
  const { data: accounts } = trpc.voximplant.getAccounts.useQuery();
  const firstAccount = accounts?.[0];
  
  const { data: applications } = trpc.voximplant.getApplications.useQuery(
    { voximplantAccountId: firstAccount?.id || 0 },
    { enabled: !!firstAccount }
  );

  const firstApp = applications?.[0];

  // Fetch campaigns
  const { data: campaigns, isLoading } = trpc.campaigns.getCampaigns.useQuery(
    { applicationId: firstApp?.id || 0 },
    { enabled: !!firstApp }
  );

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      running: 'bg-blue-100 text-blue-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    
    const labels: Record<string, string> = {
      draft: 'Черновик',
      running: 'Выполняется',
      paused: 'Приостановлена',
      completed: 'Завершена',
      failed: 'Ошибка',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badges[status] || badges.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка кампаний...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Кампании</h1>
        <Link
          to="/campaigns/new"
          className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors"
        >
          + Новая кампания
        </Link>
      </div>

      {!campaigns || campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Нет кампаний
          </h2>
          <p className="text-gray-500 mb-6">
            Создайте первую массовую кампанию для обзвона клиентов
          </p>
          <Link
            to="/campaigns/new"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors"
          >
            Создать кампанию
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Прогресс
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Успешно
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ошибок
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Создана
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((campaign) => {
                const progress = campaign.totalNumbers > 0
                  ? Math.round((campaign.completedCalls / campaign.totalNumbers) * 100)
                  : 0;

                return (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {campaign.campaignName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(campaign.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {campaign.completedCalls}/{campaign.totalNumbers}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-green-600 font-semibold">
                        {campaign.successfulCalls}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-red-600 font-semibold">
                        {campaign.failedCalls}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(campaign.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Подробнее →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
