"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createFieldJob } from "@/server/actions/accounting.actions";
import {
  createCustomerContact,
  createCustomerFromBrreg,
  listCustomerContacts,
  searchBrregCompanies,
} from "@/server/actions/customer.actions";
import { searchTimesheetCustomers } from "@/server/actions/timesheet.actions";

type Customer = { externalId: string; name: string; organizationNumber: string | null };
type Contact = { externalId: string; firstName: string | null; lastName: string | null };
type BrregHit = { organisasjonsnummer: string; navn: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function NewFieldJobDialog({
  isEmployee = false,
  triggerLabel,
  parentProject = null,
  onCreated,
}: {
  isEmployee?: boolean;
  triggerLabel: string;
  /** Valgt hovedprosjekt i timeregistreringen — gir valget «opprett som underprosjekt». */
  parentProject?: { id: string; name: string } | null;
  onCreated: (project: { id: string }) => void;
}) {
  const t = useTranslations("timesheet");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerHits, setCustomerHits] = useState<Customer[]>([]);
  const [asSubproject, setAsSubproject] = useState(false);
  const [location, setLocation] = useState("");
  const [reference, setReference] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [hms, setHms] = useState(false);
  const [contactId, setContactId] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContactFirst, setNewContactFirst] = useState("");
  const [brregQuery, setBrregQuery] = useState("");
  const [brregHits, setBrregHits] = useState<BrregHit[]>([]);

  useEffect(() => {
    if (!open) return;
    setStartDate(todayIso());
  }, [open]);

  useEffect(() => {
    if (!open || customerId) return;
    const handle = setTimeout(() => {
      searchTimesheetCustomers(customerQuery).then(setCustomerHits);
    }, 200);
    return () => clearTimeout(handle);
  }, [customerQuery, customerId, open]);

  useEffect(() => {
    if (!customerId) {
      setContacts([]);
      setContactId("");
      return;
    }
    listCustomerContacts(customerId).then(setContacts);
  }, [customerId]);

  function reset() {
    setName("");
    setCustomerId("");
    setCustomerName("");
    setCustomerQuery("");
    setCustomerHits([]);
    setAsSubproject(false);
    setLocation("");
    setReference("");
    setStartDate(todayIso());
    setHms(false);
    setContactId("");
    setContacts([]);
    setNewContactFirst("");
    setBrregQuery("");
    setBrregHits([]);
  }

  async function onCreateCustomer(org: string, companyName: string) {
    const res = await createCustomerFromBrreg({ organizationNumber: org, name: companyName });
    if (!res.success) {
      toast({ title: t("error"), description: res.error, variant: "destructive" });
      if ("duplicateExternalId" in res && res.duplicateExternalId) {
        setCustomerId(res.duplicateExternalId);
        setCustomerName(companyName);
      }
      return;
    }
    setCustomerId(res.data.externalId);
    setCustomerName(companyName);
    setBrregQuery("");
    setBrregHits([]);
    toast({ title: t("customerCreated") });
  }

  async function onAddContact() {
    if (!customerId || !newContactFirst.trim()) return;
    const res = await createCustomerContact({
      customerExternalId: customerId,
      firstName: newContactFirst.trim(),
    });
    if (!res.success) {
      toast({ title: t("error"), description: res.error, variant: "destructive" });
      return;
    }
    setContactId(res.data.externalId);
    setNewContactFirst("");
    setContacts(await listCustomerContacts(customerId));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    setLoading(true);
    const res = await createFieldJob({
      name: trimmed,
      customerExternalId: customerId || undefined,
      location: location.trim() || undefined,
      reference: reference.trim() || undefined,
      startDate: startDate || undefined,
      contactExternalId: contactId || undefined,
      jobKind: hms ? "HMS" : "SERVICE",
      parentId: asSubproject && parentProject ? parentProject.id : undefined,
    });
    setLoading(false);
    if (!res.success) {
      toast({ title: t("error"), description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: t("projectCreatedLocal") });
    reset();
    setOpen(false);
    onCreated({ id: res.data.id });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="bg-transparent"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-1 h-4 w-4" />
        {triggerLabel}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newProject")}</DialogTitle>
          <DialogDescription>{t("newProjectHelp")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="field-job-name">{t("projectName")}</Label>
            <Input
              id="field-job-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("projectName")}
              required
              minLength={2}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="field-job-ref">{t("projectReference")}</Label>
              <Input
                id="field-job-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="field-job-start">{t("projectStart")}</Label>
              <Input
                id="field-job-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
          {parentProject && (
            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={asSubproject}
                onChange={(e) => setAsSubproject(e.target.checked)}
              />
              {t("createAsSubproject", { name: parentProject.name })}
            </label>
          )}
          <div className="space-y-1">
            <Label htmlFor="field-job-customer">
              {isEmployee ? t("projectCustomerEmployee") : t("projectCustomer")}
            </Label>
            {customerId ? (
              <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <span className="truncate font-medium">{customerName || customerId}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-transparent"
                  onClick={() => {
                    setCustomerId("");
                    setCustomerName("");
                  }}
                >
                  {t("changeCustomer")}
                </Button>
              </div>
            ) : (
              <>
                <Input
                  id="field-job-customer"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder={
                    asSubproject ? t("customerFromMainProject") : t("customerSearch")
                  }
                  autoComplete="off"
                />
                {customerHits.length > 0 && (
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {customerHits.map((c) => (
                      <button
                        key={c.externalId}
                        type="button"
                        className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setCustomerId(c.externalId);
                          setCustomerName(c.name);
                          setCustomerQuery("");
                        }}
                      >
                        {c.name}
                        {c.organizationNumber ? ` (${c.organizationNumber})` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="space-y-1">
            <Label>{t("newCustomerBrreg")}</Label>
            <Input
              value={brregQuery}
              onChange={(e) => {
                const value = e.target.value;
                setBrregQuery(value);
                if (value.trim().length < 2) {
                  setBrregHits([]);
                  return;
                }
                searchBrregCompanies(value).then((hits) =>
                  setBrregHits(
                    hits.map((h) => ({
                      organisasjonsnummer: h.organisasjonsnummer,
                      navn: h.navn,
                    }))
                  )
                );
              }}
              placeholder={t("brregPlaceholder")}
            />
            {brregHits.map((hit) => (
              <Button
                key={hit.organisasjonsnummer}
                type="button"
                variant="outline"
                className="bg-transparent w-full justify-start"
                onClick={() => onCreateCustomer(hit.organisasjonsnummer, hit.navn)}
              >
                {hit.navn} ({hit.organisasjonsnummer})
              </Button>
            ))}
          </div>
          {customerId && (
            <div className="space-y-1">
              <Label>{t("contact")}</Label>
              <select
                className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              >
                <option value="">{t("noContact")}</option>
                {contacts.map((c) => (
                  <option key={c.externalId} value={c.externalId}>
                    {[c.firstName, c.lastName].filter(Boolean).join(" ")}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Input
                  value={newContactFirst}
                  onChange={(e) => setNewContactFirst(e.target.value)}
                  placeholder={t("newContact")}
                />
                <Button type="button" variant="outline" className="bg-transparent" onClick={onAddContact}>
                  {t("addContact")}
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="field-job-location">{t("projectLocation")}</Label>
            <Input
              id="field-job-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hms} onChange={(e) => setHms(e.target.checked)} />
            {t("hmsProject")}
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" className="bg-transparent" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={loading || name.trim().length < 2}>
              {loading ? t("creatingProject") : t("createProject")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
