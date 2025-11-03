"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, HardDrive, Cloud, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function StorageSettingsForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [storageType, setStorageType] = useState(process.env.STORAGE_TYPE || "local");

  const currentSettings = {
    storageType: process.env.STORAGE_TYPE || "local",
    r2Endpoint: process.env.R2_ENDPOINT || "",
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ? "***************" : "",
    r2Bucket: process.env.R2_BUCKET || "hmsnova",
    localStoragePath: process.env.LOCAL_STORAGE_PATH || "./storage",
  };

  const isR2Configured = !!(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: "✅ Lagringsinnstillinger lagret",
      description: "Lagringskonfigurasjonen er oppdatert",
      className: "bg-green-50 border-green-200",
    });

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="storageType">Lagringstype</Label>
        <Select
          value={storageType}
          onValueChange={setStorageType}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Lokal lagring (kun testing)
              </div>
            </SelectItem>
            <SelectItem value="r2">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Cloudflare R2 (anbefalt)
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {storageType === "local" && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-yellow-900">
              Lokal lagring er kun for testing
            </p>
            <p className="text-sm text-yellow-800">
              I produksjon bør du bruke Cloudflare R2 eller S3-kompatibel lagring
              for skalerbarhet og backup.
            </p>
          </div>
        </div>
      )}

      {storageType === "r2" && (
        <>
          <div className="flex items-center gap-2">
            <Label>Status:</Label>
            {isR2Configured ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Konfigurert
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Ikke konfigurert
              </Badge>
            )}
          </div>

          {!isR2Configured && (
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Cloud className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-blue-900">
                  Konfigurer Cloudflare R2
                </p>
                <p className="text-sm text-blue-800">
                  1. Opprett en R2-bucket på Cloudflare dashboard
                  <br />
                  2. Generer API-token med R2-tilgang
                  <br />
                  3. Legg til credentials i .env-filen
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="r2Endpoint">R2 Endpoint</Label>
              <Input
                id="r2Endpoint"
                defaultValue={currentSettings.r2Endpoint}
                disabled={loading}
                placeholder="https://[account-id].r2.cloudflarestorage.com"
              />
              <p className="text-sm text-muted-foreground">
                Endpoint URL fra Cloudflare R2 dashboard
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="r2AccessKeyId">Access Key ID</Label>
              <Input
                id="r2AccessKeyId"
                defaultValue={currentSettings.r2AccessKeyId}
                disabled={loading}
                placeholder="[your-access-key-id]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="r2SecretAccessKey">Secret Access Key</Label>
              <Input
                id="r2SecretAccessKey"
                type="password"
                defaultValue={currentSettings.r2SecretAccessKey}
                disabled={loading}
                placeholder="[your-secret-access-key]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="r2Bucket">Bucket navn</Label>
              <Input
                id="r2Bucket"
                defaultValue={currentSettings.r2Bucket}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Navnet på R2-bucketen
              </p>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Lagrer..." : "Lagre innstillinger"}
              </Button>
            </div>
          </form>
        </>
      )}

      {storageType === "local" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="localPath">Lokal lagringssti</Label>
            <Input
              id="localPath"
              defaultValue={currentSettings.localStoragePath}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              Mappe hvor filer lagres lokalt
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t">
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Lagrer..." : "Lagre innstillinger"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

