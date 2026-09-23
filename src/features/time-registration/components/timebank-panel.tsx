"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  correctTimeBank,
  decideTimeBankTake,
  listTimeBank,
  payoutTimeBank,
  requestTimeBankTake,
  saveTimeBankLimits,
  saveTimeBankRule,
} from "@/server/actions/timebank.actions";

type Bank = Awaited<ReturnType<typeof listTimeBank>>;

export function TimeBankPanel({ canManage }: { canManage: boolean }) {
  const t = useTranslations("timesheet");
  const [data, setData] = useState<Bank | null>(null);
  const [hours, setHours] = useState("1");
  const [reason, setReason] = useState("");
  const [factor, setFactor] = useState("1.5");
  const [salaryTypeId, setSalaryTypeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [maxBalance, setMaxBalance] = useState("");
  const [minBalance, setMinBalance] = useState("");
  const [userId, setUserId] = useState("");
  const [ruleForSelectedUser, setRuleForSelectedUser] = useState(false);

  async function reload() {
    const next = await listTimeBank({
      userId: userId || undefined,
      from: from || undefined,
      to: to || undefined,
    });
    setData(next);
    if (!userId) setUserId(next.userId);
    setMaxBalance(next.maxBalance != null ? String(next.maxBalance) : "");
    setMinBalance(next.minBalance != null ? String(next.minBalance) : "");
  }

  useEffect(() => {
    reload();
  }, [from, to, userId]);

  if (!data) return null;

  return (
    <div className="space-y-4">
      {canManage && data.users.length > 0 && (
        <div className="space-y-1">
          <Label>{t("employee")}</Label>
          <select
            className="h-10 w-full rounded-md border bg-transparent px-2 text-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            {data.users.map((u: { userId: string; name: string | null; email: string }) => (
              <option key={u.userId} value={u.userId}>
                {u.name || u.email}
              </option>
            ))}
          </select>
        </div>
      )}
      <p className="text-2xl font-bold">
        {data.balance} {t("hoursSuffix")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} />
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("reason")} />
        <Button
          onClick={async () => {
            await requestTimeBankTake({ hours: Number(hours), reason });
            setReason("");
            reload();
          }}
        >
          {t("take")}
        </Button>
      </div>
      {canManage && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>{t("factor")}</Label>
              <Input value={factor} onChange={(e) => setFactor(e.target.value)} />
            </div>
            <select
              className="h-10 rounded-md border bg-transparent px-2 text-sm self-end"
              value={salaryTypeId}
              onChange={(e) => setSalaryTypeId(e.target.value)}
            >
              <option value="">{t("salaryType")}</option>
              {(data.salaryTypes ?? []).map((s: { externalId: string; name: string }) => (
                <option key={s.externalId} value={s.externalId}>
                  {s.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                checked={ruleForSelectedUser}
                onChange={(e) => setRuleForSelectedUser(e.target.checked)}
              />
              {t("ruleForSelectedUser")}
            </label>
            <Button
              variant="outline"
              className="bg-transparent self-end"
              onClick={async () => {
                await saveTimeBankRule({
                  factor: Number(factor),
                  timeType: salaryTypeId ? undefined : "OVERTIME_50",
                  salaryTypeId: salaryTypeId || null,
                  appliesToUserIds: ruleForSelectedUser && userId ? [userId] : [],
                });
                reload();
              }}
            >
              {t("saveRule")}
            </Button>
            <Button
              variant="outline"
              className="bg-transparent self-end"
              onClick={async () => {
                await correctTimeBank({
                  userId: data.userId,
                  hours: Number(hours),
                  reason,
                  kind: "CORRECTION",
                });
                reload();
              }}
            >
              {t("correct")}
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              type="number"
              value={maxBalance}
              onChange={(e) => setMaxBalance(e.target.value)}
              placeholder={t("maxBalance")}
            />
            <Input
              type="number"
              value={minBalance}
              onChange={(e) => setMinBalance(e.target.value)}
              placeholder={t("minBalance")}
            />
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={async () => {
                await saveTimeBankLimits({
                  maxBalance: maxBalance === "" ? null : Number(maxBalance),
                  minBalance: minBalance === "" ? null : Number(minBalance),
                });
                reload();
              }}
            >
              {t("saveLimits")}
            </Button>
          </div>
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={async () => {
              await payoutTimeBank({ userId: data.userId, hours: Number(hours), reason });
              reload();
            }}
          >
            {t("payout")}
          </Button>
          {data.pendingTakes.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium">{t("pendingTakes")}</p>
              {data.pendingTakes.map(
                (row: {
                  id: string;
                  hours: number;
                  reason: string;
                  user: { name: string | null; email: string };
                }) => (
                  <div key={row.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
                    <span>
                      {row.user.name || row.user.email} · {row.hours} t · {row.reason}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={async () => { await decideTimeBankTake(row.id, true); reload(); }}>
                        {t("approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent"
                        onClick={async () => { await decideTimeBankTake(row.id, false); reload(); }}
                      >
                        {t("reject")}
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
      <div className="space-y-1">
        {data.ledgers.map((row) => (
          <p key={row.id} className="text-sm text-muted-foreground">
            {t(`ledgerKind.${row.kind}`)} · {row.hours} t · {t(`ledgerStatus.${row.status}`)} · {row.reason}
          </p>
        ))}
      </div>
    </div>
  );
}
