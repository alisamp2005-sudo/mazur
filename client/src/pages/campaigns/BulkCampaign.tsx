/**
 * Bulk Campaign Page
 * UI for creating and managing bulk call campaigns
 */

import React, { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { useNavigate } from 'react-router-dom';

export default function BulkCampaign() {
  const navigate = useNavigate();
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [callerId, setCallerId] = useState('');
  const [delayBetweenCalls, setDelayBetweenCalls] = useState(2000);
  const [isCreating, setIsCreating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch applications
  const { data: accounts } = trpc.voximplant.getAccounts.useQuery();
  const firstAccount = accounts?.[0];
  
  const { data: applications } = trpc.voximplant.getApplications.useQuery(
    { voximplantAccountId: firstAccount?.id || 0 },
    { enabled: !!firstAccount }
  );

  // Create campaign mutation
  const createCampaignMutation = trpc.campaigns.createCampaign.useMutation({
    onSuccess: (data) => {
      setCreatedCampaignId(data.campaignId);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
    onSettled: () => {
      setIsCreating(false);
    },
  });

  // Start campaign mutation
  const startCampaignMutation = trpc.campaigns.startCampaign.useMutation({
    onSuccess: (data) => {
      alert(`Кампания завершена!\n\nВсего звонков: ${data.totalCalls}\nУспешно: ${data.successfulCalls}\nОшибок: ${data.failedCalls}`);
      navigate('/campaigns');
    },
    onError: (err) => {
      setError(err.message);
    },
    onSettled: () => {
      setIsStarting(false);
    },
  });

  const parsePhoneNumbers = (text: string): string[] => {
    return text
      .split(/[\n,;]/)
      .map(num => num.trim())
      .filter(num => num.length > 0);
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!applicationId || !campaignName || !phoneNumbers) {
      setError('Заполните все поля');
      return;
    }

    const numbers = parsePhoneNumbers(phoneNumbers);
    if (numbers.length === 0) {
      setError('Добавьте хотя бы один номер телефона');
      return;
    }

    setIsCreating(true);
    setError(null);

    createCampaignMutation.mutate({
      applicationId,
      campaignName,
      phoneNumbers: numbers,
    });
  };

  const handleStartCampaign = async () => {
    if (!createdCampaignId || !callerId) {
      setError('Укажите Caller ID');
      return;
    }

    const numbers = parsePhoneNumbers(phoneNumbers);
    
    setIsStarting(true);
    setError(null);

    startCampaignMutation.mutate({
      campaignId: createdCampaignId,
      phoneNumbers: numbers,
      callerId,
      delayBetweenCalls,
    });
  };

  const numberCount = parsePhoneNumbers(phoneNumbers).length;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6">Массовая кампания</h1>
        
        {!createdCampaignId ? (
          // Step 1: Create Campaign
          <form onSubmit={handleCreateCampaign} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Приложение
              </label>
              <select
                value={applicationId || ''}
                onChange={(e) => setApplicationId(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Выберите приложение</option>
                {applications?.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.applicationName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название кампании
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Например: Опрос клиентов март 2026"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Номера телефонов
              </label>
              <textarea
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
                placeholder="+79854619523&#10;+79123456789&#10;+79111111111"
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Каждый номер с новой строки. Всего: <strong>{numberCount}</strong> номеров
              </p>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isCreating ? 'Создаем...' : '📋 Создать кампанию'}
            </button>
          </form>
        ) : (
          // Step 2: Start Campaign
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-green-800 font-medium">✅ Кампания создана!</p>
              <p className="text-sm text-gray-700 mt-1">
                Название: <strong>{campaignName}</strong><br />
                Номеров: <strong>{numberCount}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Номер отправителя (Caller ID)
              </label>
              <input
                type="tel"
                value={callerId}
                onChange={(e) => setCallerId(e.target.value)}
                placeholder="+79011478030"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Задержка между звонками (мс)
              </label>
              <input
                type="number"
                value={delayBetweenCalls}
                onChange={(e) => setDelayBetweenCalls(Number(e.target.value))}
                min={1000}
                step={500}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Рекомендуется: 2000-5000 мс (2-5 секунд)
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-yellow-800 font-medium">⚠️ Внимание</p>
              <p className="text-sm text-gray-700 mt-1">
                Будет выполнено <strong>{numberCount}</strong> звонков.<br />
                Примерное время: <strong>{Math.ceil(numberCount * delayBetweenCalls / 1000 / 60)}</strong> минут
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleStartCampaign}
                disabled={isStarting || !callerId}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {isStarting ? 'Звоним...' : '🚀 Запустить кампанию'}
              </button>
              
              <button
                onClick={() => {
                  setCreatedCampaignId(null);
                  setCampaignName('');
                  setPhoneNumbers('');
                  setCallerId('');
                }}
                disabled={isStarting}
                className="px-6 py-3 border border-gray-300 rounded-md font-semibold hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 font-medium">❌ Ошибка</p>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">ℹ️ Как работает массовая кампания</h2>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Создайте кампанию с названием и списком номеров</li>
          <li>• Система автоматически обзвонит все номера по порядку</li>
          <li>• Между звонками будет задержка (настраивается)</li>
          <li>• Все звонки сохраняются в базе данных</li>
          <li>• После завершения вы получите полный отчет</li>
          <li>• Транскрипты разговоров доступны в истории звонков</li>
        </ul>
      </div>
    </div>
  );
}
