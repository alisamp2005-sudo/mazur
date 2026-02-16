/**
 * Make Single Call Page
 * UI for making individual outbound calls
 */

import React, { useState } from 'react';
import { trpc } from '../../lib/trpc';

export default function MakeCall() {
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callerId, setCallerId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch applications
  const { data: accounts } = trpc.voximplant.getAccounts.useQuery();
  const firstAccount = accounts?.[0];
  
  const { data: applications } = trpc.voximplant.getApplications.useQuery(
    { voximplantAccountId: firstAccount?.id || 0 },
    { enabled: !!firstAccount }
  );

  // Make call mutation
  const makeCallMutation = trpc.campaigns.makeSingleCall.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      setPhoneNumber('');
    },
    onError: (err) => {
      setError(err.message);
      setResult(null);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!applicationId || !phoneNumber || !callerId) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    makeCallMutation.mutate({
      applicationId,
      phoneNumber,
      callerId,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6">Сделать звонок</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Application Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Приложение
            </label>
            <select
              value={applicationId || ''}
              onChange={(e) => setApplicationId(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Номер телефона
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+79854619523"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Формат: +7XXXXXXXXXX
            </p>
          </div>

          {/* Caller ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Номер отправителя (Caller ID)
            </label>
            <input
              type="tel"
              value={callerId}
              onChange={(e) => setCallerId(e.target.value)}
              placeholder="+79011478030"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Ваш VoximPlant номер
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Звоним...' : '📞 Позвонить'}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 font-medium">❌ Ошибка</p>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 font-medium">✅ Звонок запущен!</p>
            <div className="mt-2 text-sm text-gray-700">
              <p><strong>Call ID:</strong> {result.callId}</p>
              <p><strong>Session ID:</strong> {result.callSessionHistoryId}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">ℹ️ Как это работает</h2>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Выберите приложение с настроенным AI агентом</li>
          <li>• Укажите номер телефона в международном формате</li>
          <li>• Укажите ваш VoximPlant номер как Caller ID</li>
          <li>• После звонка AI агент автоматически начнет разговор</li>
          <li>• Все звонки сохраняются в истории с транскриптами</li>
        </ul>
      </div>
    </div>
  );
}
