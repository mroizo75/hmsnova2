"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  correctTimeBank,
  listTimeBank,
  requestTimeBankTake,
  saveTimeBankRule,
} from "@/server/actions/timebank.actions";

type Bank = Awaited<ReturnType<typeof listTimeBank>>;

export function TimeBankPanel({ canManage }: { canManage: boolean }) {
  const t = useTranslations("timesheet");
  const [data, setData] = useState<Bank | null>(null);
  const [hours, setHours] = useState("1");
  const [reason, setReason] = useState("");
  const [factor, setFactor] = useState("1.5");

  async function reload() {
    setData(await listTimeBank());
  }

  useEffect(() => {
    reload();
  }, []);

  if (!data) return null;

  return (
    <div className="space-y-4">
      <p className="text-2xl font-bold">
        {data.balance} {t("hoursSuffix")}
      </p>
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
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>{t("factor")}</Label>
            <Input value={factor} onChange={(e) => setFactor(e.target.value)} />
          </div>
          <Button
            variant="outline"
            className="bg-transparent self-end"
            onClick={async () => {
              await saveTimeBankRule({ factor: Number(factor), timeType: "OVERTIME_50" });
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
      )}
      <div className="space-y-1">
        {data.ledgers.map((row) => (
          <p key={row.id} className="text-sm text-muted-foreground">
            {row.kind} · {row.hours} t · {row.reason}
          </p>
        ))}
      </div>
    </div>
  );
}
