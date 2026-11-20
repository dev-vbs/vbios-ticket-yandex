import TrafficChart from "./TrafficChart";
import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconExchange, IconShieldExclamation } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import ConfirmModal from "./ConfirmModal";
import "./RemnawaveFeatures.css";

type RecordItem = { at: string; client?: string; type?: string };
type Diagnostics = {
  billing_status?: string;
  billing_expires_at?: string;
  status?: string;
  expires_at?: string;
  used_bytes?: number;
  limit_bytes?: number;
  reset_strategy?: string;
  last_reset_at?: string;
  notices?: { kind: string; text: string }[];
  devices_unavailable?: boolean;
};
type Addon = { key: string; title: string; cost: number; service_id: number; unavailable_reason?: string };
type Section = "diagnostics" | "traffic" | "history" | "addons";
type Data = Diagnostics & {
  days?: string[];
  bytes?: number[];
  records?: RecordItem[];
  addons?: Addon[];
  setup_issues?: string[];
};
export function remnaPayload(
  body: unknown,
): Data & { ok?: boolean; url?: string; order_id?: number; paid?: number } {
  let v: any = body;
  for (let i = 0; i < 5; i++) {
    if (Array.isArray(v)) v = v[0];
    if (!v || typeof v !== "object") throw new Error("Пустой ответ сервера");
    if (
      ["nodes", "days", "records", "notices", "addons", "ok"].some(
        (k) => k in v,
      )
    )
      return v;
    v = v.data ?? v.response;
  }
  throw new Error("Не удалось прочитать ответ сервера");
}
function apiMessage(error: unknown, fallback: string): string {
  const body = (error as { response?: { data?: { error?: unknown; errors?: unknown } } })?.response?.data;
  const value = body?.error ?? body?.errors;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter(x => typeof x === 'string').join(' ') || fallback;
  return fallback;
}
const date = (s?: string) =>
  s && Number.isFinite(Date.parse(s))
    ? new Date(s).toLocaleString("ru-RU")
    : "Нет данных";
const gb = (n?: number) =>
  n == null
    ? "Нет данных"
    : `${(n / 1073741824).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ГБ`;
const accountStatus: Record<string, string> = {
  ACTIVE: "Подписка активна",
  DISABLED: "Доступ отключён",
  LIMITED: "Лимит исчерпан",
  EXPIRED: "Срок истёк",
};
const reset: Record<string, string> = {
  NO_RESET: "Без сброса",
  DAY: "Ежедневно",
  WEEK: "Еженедельно",
  MONTH: "Ежемесячно",
  MONTH_ROLLING: "Каждые 30 дней",
};
function SectionBody({
  section,
  serviceId,
  revision,
}: {
  section: Section;
  serviceId: number;
  revision: number;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buy, setBuy] = useState<Addon | null>(null);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<number>();
  const [purchaseError, setPurchaseError] = useState("");
  const [orderPaid, setOrderPaid] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const url =
      section === "addons"
        ? "/user/service/remnawave/addons"
        : "/user/service/remnawave";
    void api
      .get(url, {
        params: {
          user_service_id: serviceId,
          ...(section === "addons" ? {} : { section }),
        },
        signal: controller.signal,
      })
      .then((r) => {
        if (!controller.signal.aborted) setData(remnaPayload(r.data));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [section, serviceId, revision]);
  const purchase = async () => {
    if (!buy || busy) return;
    setBusy(true);
    setPurchaseError("");
    try {
      const r = remnaPayload(
        (
          await api.put("/user/service/remnawave/addons", {
            user_service_id: serviceId,
            addon: buy.key,
          })
        ).data,
      );
      if (!r.ok || !r.order_id) throw new Error();
      setOrder(r.order_id);
      setOrderPaid(!!r.paid);
      setBuy(null);
    } catch (error) {
      setBuy(null);
      setPurchaseError(
        apiMessage(error, "Не удалось подтвердить заказ. Проверьте «Мои услуги» перед повторной покупкой."),
      );
    } finally {
      setBusy(false);
    }
  };
  if (loading && !data)
    return (
      <Group p="md">
        <Loader size="sm" />
        <Text size="sm">Обновляем данные…</Text>
      </Group>
    );
  if (error || !data)
    return (
      <Alert color="orange">
        Раздел временно недоступен. Остальные функции кабинета продолжают
        работать. Нажмите «Обновить», чтобы повторить.
      </Alert>
    );
  if (section === "traffic") {
    const values = (data.bytes || []).map((n) => Math.max(0, Number(n) || 0));
    return <TrafficChart values={values} days={data.days || []} />;
  }

  if (section === "history")
    return (
      <Stack>
        <Text size="sm" c="dimmed">
          Последние запросы приложения на обновление подписки. Это не история
          посещения сайтов и не список VPN-сеансов.
        </Text>
        {!data.records?.length ? (
          <Text>Приложение ещё не запрашивало подписку.</Text>
        ) : (
          <div className="remna-table-wrap">
            <table className="remna-table">
              <thead>
                <tr>
                  <th>Когда</th>
                  <th>Приложение</th>
                  <th>Формат</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((r, i) => (
                  <tr key={i}>
                    <td>{date(r.at)}</td>
                    <td>{r.client || "Не определено"}</td>
                    <td>{r.type || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Stack>
    );
  if (section === "addons")
    return (
      <Stack>
        <Text size="sm" c="dimmed">
          Расширение применяется после оплаты отдельной услуги в SHM. Условия и
          стоимость проверьте перед подтверждением.
        </Text>
        {order && (
          <Alert color="teal">
            {orderPaid ? "Заказ оплачен в SHM. Расширение применяется обработчиком услуги; обновите данные после завершения." : "Заказ создан в SHM. Откройте услугу и оплатите её."}{" "}
            <Link to={`/services/${order}`}>Открыть заказ →</Link>
          </Alert>
        )}
        {purchaseError && <Alert color="orange">{purchaseError}</Alert>}
        {data.setup_issues?.map(issue => <Alert color="orange" key={issue}>{issue}</Alert>)}
        {!data.addons?.length && (
          <Text c="dimmed">Для этого тарифа расширения пока не настроены.</Text>
        )}
        <div className="remna-node-grid">
          {data.addons?.map((a) => (
            <Paper withBorder p="md" radius="md" key={a.key}>
              <Stack>
                <Text fw={650}>{a.title}</Text>
                <Text>{Number(a.cost).toLocaleString("ru-RU")} ₽</Text>
                {a.unavailable_reason && <Text size="sm" c="dimmed">{a.unavailable_reason}</Text>}
                <Button
                  variant="light"
                  onClick={() => setBuy(a)}
                  disabled={busy || !!a.unavailable_reason}
                >
                  Добавить
                </Button>
              </Stack>
            </Paper>
          ))}
        </div>
        <ConfirmModal
          opened={!!buy}
          onClose={() => !busy && setBuy(null)}
          onConfirm={() => void purchase()}
          loading={busy}
          title="Оформить расширение?"
          confirmLabel="Создать заказ"
          confirmColor="blue"
          message={`${buy?.title || ""} · ${buy?.cost || 0} ₽. При достаточном балансе SHM может списать оплату сразу. Повторный заказ оплачивается отдельно.`}
        />
      </Stack>
    );
  const used = data.used_bytes || 0;
  const limit = data.limit_bytes || 0;
  return (
    <Stack>
      <Group>
        <Badge color={data.status === "ACTIVE" ? "teal" : "orange"}>
          {accountStatus[data.status || ""] || "Нет данных"}
        </Badge>
        <Text size="sm">Действует до {date(data.expires_at)}</Text>
      </Group>
      {data.billing_status && data.billing_status !== "ACTIVE" && (
        <Alert color="orange">
          Услуга в SHM не активна. Проверьте оплату и состояние услуги перед
          подключением.
        </Alert>
      )}
      {data.notices?.map((n, i) => (
        <Alert color="orange" key={`${n.kind}-${i}`}>
          {n.text}
        </Alert>
      ))}
      <div className="remna-node-grid">
        <div>
          <Text size="xs" c="dimmed">
            Использовано
          </Text>
          <Text fw={650}>{gb(data.used_bytes)}</Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            Осталось
          </Text>
          <Text fw={650}>
            {data.limit_bytes === 0
              ? "Без ограничений"
              : data.limit_bytes == null
                ? "Нет данных"
                : gb(Math.max(0, limit - used))}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            Сброс лимита
          </Text>
          <Text>{reset[data.reset_strategy || ""] || "Нет данных"}</Text>
          <Text size="xs" c="dimmed">
            Последний: {date(data.last_reset_at)}
          </Text>
        </div>
      </div>
      {limit > 0 && (
        <Progress
          value={Math.min(100, (used / limit) * 100)}
          aria-label="Использование лимита"
          color={used / limit >= 0.8 ? "orange" : "teal"}
          size="lg"
          radius="xl"
        />
      )}
      <Text size="sm" c="dimmed">
        Если подписка активна и лимит не исчерпан, обновите подписку в приложении и убедитесь, что устройство
        имеет доступ к интернету.
      </Text>
      {data.devices_unavailable && (
        <Alert color="gray">
          Проверка новых устройств временно недоступна.
        </Alert>
      )}
    </Stack>
  );
}
export default function RemnawaveFeatures({
  serviceId,
  onRotated,
  onChangeTariff,
}: {
  serviceId: number;
  onRotated: (url: string) => void;
  onChangeTariff?: () => void;
}) {
  const [opened, setOpened] = useState(false);
  const [section, setSection] = useState<Section>("diagnostics");
  const [revision, setRevision] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const action = async () => {
    if (busy || !confirm) return;
    setBusy(true);
    setMessage("");
    try {
      const r = remnaPayload(
        (
          await api.post(
            "/user/service/remnawave/revoke",
            { user_service_id: serviceId },
          )
        ).data,
      );
      if (!r.ok || !r.url) throw new Error();
      if (r.url) onRotated(r.url);
      setMessage(
        "Старая ссылка отозвана. Добавьте новую подписку на своих устройствах.",
      );
      window.dispatchEvent(
        new CustomEvent("remna-devices-changed", { detail: serviceId }),
      );
      setConfirm(false);
      setRevision((v) => v + 1);
    } catch {
      setConfirm(false);
      setMessage(
        "Сервер не подтвердил действие. Обновите данные перед повторной попыткой.",
      );
      {
        try {
          const current = remnaPayload(
            (
              await api.get("/user/service/remnawave/access", {
                params: { user_service_id: serviceId },
              })
            ).data,
          );
          if (current.url) {
            onRotated(current.url);
            setMessage(
              "Ответ на замену ссылки не получен. Текущая ссылка повторно загружена из панели — используйте её для подключения.",
            );
          }
        } catch {
          /* Keep the uncertain-action message; do not retry a mutation. */
        }
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <Paper withBorder p="lg" radius="md" className="remna-features">
      <Stack>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <div>
            <Title order={3}>Ваша подписка под контролем</Title>
            <Text size="sm" c="dimmed">
              Трафик, расширения и безопасность подписки
            </Text>
          </div>
          <Button
            size="xs"
            variant="light"
            leftSection={opened ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
            aria-controls={`remna-details-${serviceId}`}
            onClick={() => setOpened((v) => !v)}
            aria-expanded={opened}
          >
            {opened ? "Свернуть" : "Раскрыть"}
          </Button>
        </Group>
        {opened && (
          <div id={`remna-details-${serviceId}`} className="remna-features__body">
            <Group gap="xs" className="remna-tabs">
              {(
                [
                  ["diagnostics", "Диагностика"],
                  ["traffic", "Трафик"],
                  ["history", "Обновления"],
                  ["addons", "Расширения"],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  size="xs"
                  variant={section === key ? "filled" : "subtle"}
                  aria-pressed={section === key}
                  onClick={() => setSection(key)}
                >
                  {label}
                </Button>
              ))}
              {onChangeTariff && <Button size="xs" variant="light" leftSection={<IconExchange size={15} />} onClick={onChangeTariff}>Сменить тариф</Button>}
              <Button
                size="xs"
                variant="default"
                onClick={() => setRevision((v) => v + 1)}
              >
                Обновить
              </Button>
            </Group>
            <SectionBody
              key={`${serviceId}-${section}`}
              section={section}
              serviceId={serviceId}
              revision={revision}
            />
            <Group mt="sm">
              <Button
                className="remna-revoke-button"
                color="red"
                variant="filled"
                size="sm"
                leftSection={<IconShieldExclamation size={17} />}
                disabled={busy}
                onClick={() => setConfirm(true)}
              >
                Ссылка попала посторонним
              </Button>

            </Group>
          </div>
        )}
        {message && <Alert>{message}</Alert>}
      </Stack>
      <ConfirmModal
        opened={!!confirm}
        onClose={() => !busy && setConfirm(false)}
        onConfirm={() => void action()}
        loading={busy}
        title="Заменить ссылку доступа?"
        confirmLabel="Заменить ссылку"
        confirmColor="red"
        message="Старая ссылка перестанет работать. Новую подписку потребуется добавить в приложения на всех ваших устройствах. Не передавайте её посторонним."
      />
    </Paper>
  );
}
