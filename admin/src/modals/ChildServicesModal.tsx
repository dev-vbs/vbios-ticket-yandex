import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Service {
  service_id: number;
  name: string;
}

interface ChildService {
  service_id: number;
  name: string;
  qnt: number;
}

interface ChildServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: number;
  serviceName: string;
  availableServices: Service[];
}

export const ChildServicesModal: React.FC<ChildServicesModalProps> = ({
  isOpen,
  onClose,
  serviceId,
  serviceName,
  availableServices,
}) => {
  const [childServices, setChildServices] = useState<ChildService[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [editingQnt, setEditingQnt] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    if (isOpen && serviceId) {
      loadChildServices();
    }
  }, [isOpen, serviceId]);

  const loadChildServices = async () => {
    try {
      setLoading(true);
      const response = await shm_request(`shm/v1/admin/service/children?service_id=${serviceId}`);
      const normalized = normalizeListResponse(response);
      setChildServices(normalized.data || []);
    } catch (error) {
      toast.error('Ошибка загрузки дочерних услуг');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!selectedService) return;

    const service = availableServices.find(s => s.service_id === Number(selectedService));
    if (!service) return;

    if (childServices.some(cs => cs.service_id === service.service_id)) {
      toast.error('Эта услуга уже добавлена');
      return;
    }

    setChildServices([
      ...childServices,
      {
        service_id: service.service_id,
        name: service.name,
        qnt: 1,
      },
    ]);
    setSelectedService('');
  };

  const handleRemove = (serviceIdToRemove: number) => {
    setChildServices(childServices.filter(cs => cs.service_id !== serviceIdToRemove));
  };

  const handleQntChange = (serviceId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditingQnt({ ...editingQnt, [serviceId]: numValue });
  };

  const handleQntBlur = (serviceId: number) => {
    const newQnt = editingQnt[serviceId];
    if (newQnt !== undefined) {
      setChildServices(
        childServices.map(cs =>
          cs.service_id === serviceId ? { ...cs, qnt: newQnt } : cs
        )
      );
      const newEditing = { ...editingQnt };
      delete newEditing[serviceId];
      setEditingQnt(newEditing);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await shm_request('shm/v1/admin/service/children', {
        method: 'POST',
        body: JSON.stringify({
          service_id: serviceId,
          children: childServices,
        }),
      });
      toast.success('Дочерние услуги сохранены');
      onClose();
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  const labelStyles = {
    color: 'var(--theme-content-text-muted)',
  };

  const renderFooter = () => (
    <div className="flex justify-end gap-2">
      <button
        onClick={onClose}
        disabled={loading}
        className="px-4 py-2 rounded"
        style={{
          backgroundColor: 'var(--theme-button-secondary-bg)',
          color: 'var(--theme-button-secondary-text)',
          border: '1px solid var(--theme-button-secondary-border)',
        }}
      >
        Отмена
      </button>
      <button
        onClick={handleSave}
        disabled={loading}
        className="px-4 py-2 rounded disabled:opacity-50"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--accent-text)',
        }}
      >
        {loading ? 'Сохранение...' : 'Сохранить'}
      </button>
    </div>
  );

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Управление дочерними услугами: ${serviceName}`}
      footer={renderFooter()}
      size="lg"
    >
      <div className="space-y-6">
        {}
        <div>
          <label className="block text-sm font-medium mb-2" style={labelStyles}>
            Услуги
          </label>
          <div className="flex gap-2">
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value as any)}
              className="flex-1 px-3 py-2 rounded border"
              style={inputStyles}
            >
              <option value="">Выберите услугу...</option>
              {availableServices
                .filter(s => s.service_id !== serviceId)
                .map(service => (
                  <option key={service.service_id} value={service.service_id}>
                    {service.service_id} - {service.name}
                  </option>
                ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!selectedService || loading}
              className="px-4 py-2 rounded disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-text)',
              }}
            >
              Добавить
            </button>
          </div>
        </div>

        {}
        <div>
          <label className="block text-sm font-medium mb-2" style={labelStyles}>
            Дочерние услуги
          </label>
          <div
            className="border rounded-lg overflow-hidden"
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-card-border)',
            }}
          >
            {childServices.length === 0 ? (
              <div className="p-8 text-center" style={{ color: 'var(--theme-content-text-muted)' }}>
                Нет дочерних услуг
              </div>
            ) : (
              <table className="w-full">
                <thead style={{ backgroundColor: 'var(--theme-table-header-bg)' }}>
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      style={{ color: 'var(--theme-content-text-muted)' }}
                    >
                      ID
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      style={{ color: 'var(--theme-content-text-muted)' }}
                    >
                      Название
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-32"
                      style={{ color: 'var(--theme-content-text-muted)' }}
                    >
                      Кол-во
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider w-20"
                      style={{ color: 'var(--theme-content-text-muted)' }}
                    >
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {childServices.map((child, index) => (
                    <tr
                      key={child.service_id}
                      style={{
                        borderTopWidth: index > 0 ? '1px' : '0',
                        borderColor: 'var(--theme-card-border)',
                      }}
                    >
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--theme-content-text)' }}>
                        {child.service_id}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--theme-content-text)' }}>
                        {child.name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <input
                          type="number"
                          value={editingQnt[child.service_id] ?? child.qnt}
                          onChange={(e) => handleQntChange(child.service_id, e.target.value)}
                          onBlur={() => handleQntBlur(child.service_id)}
                          min="0"
                          className="w-20 px-2 py-1 rounded border"
                          style={inputStyles}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          onClick={() => handleRemove(child.service_id)}
                          className="text-red-500 hover:text-red-700"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};