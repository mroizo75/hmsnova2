"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, Plus, Trash2, Copy, Check } from "lucide-react";
import { createApiKey, deactivateApiKey } from "@/server/actions/intelligence-api-keys.actions";

interface ApiKeyRow {
  id: string;
  name: string;
  isActive: boolean;
  rateLimit: number;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  requestCount: number;
}

interface ApiKeyManagerProps {
  initialKeys: ApiKeyRow[];
}

export function ApiKeyManager({ initialKeys }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState(initialKeys);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!newKeyName.trim()) return;

    startTransition(async () => {
      const result = await createApiKey(newKeyName.trim());
      if (result.success && result.rawKey) {
        setNewKeyRaw(result.rawKey);
        setNewKeyName("");
        setKeys((prev) => [
          {
            id: result.id!,
            name: newKeyName.trim(),
            isActive: true,
            rateLimit: 100,
            lastUsedAt: null,
            createdAt: new Date().toISOString(),
            expiresAt: null,
            requestCount: 0,
          },
          ...prev,
        ]);
      }
    });
  }

  function handleDeactivate(id: string) {
    startTransition(async () => {
      const result = await deactivateApiKey(id);
      if (result.success) {
        setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive: false } : k)));
      }
    });
  }

  function handleCopy() {
    if (newKeyRaw) {
      navigator.clipboard.writeText(newKeyRaw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Opprett ny API-nokkel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="key-name">Kundenavn</Label>
              <Input
                id="key-name"
                placeholder="f.eks. Gjensidige Forsikring"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} disabled={isPending || !newKeyName.trim()}>
                <Key className="h-4 w-4 mr-2" />
                Opprett
              </Button>
            </div>
          </div>

          {newKeyRaw && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800 mb-2">
                API-nokkel opprettet! Kopier den na — den vises bare en gang.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white px-3 py-2 text-xs font-mono border break-all">
                  {newKeyRaw}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eksisterende API-nokler</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Ingen API-nokler opprettet enda.</p>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      <Badge variant={key.isActive ? "default" : "secondary"}>
                        {key.isActive ? "Aktiv" : "Deaktivert"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-4">
                      <span>Opprettet: {new Date(key.createdAt).toLocaleDateString("nb-NO")}</span>
                      <span>Sist brukt: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString("nb-NO") : "Aldri"}</span>
                      <span>Foresporsler: {key.requestCount}</span>
                      <span>Rate limit: {key.rateLimit}/time</span>
                    </div>
                  </div>
                  {key.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeactivate(key.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
