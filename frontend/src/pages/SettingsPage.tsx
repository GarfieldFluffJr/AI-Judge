import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useApiKeys, useSaveApiKey } from "@/hooks/useApiKeys";
import { toast } from "sonner";
import type { Provider } from "@/types/api-keys";

const providers: Array<{
  key: Provider;
  label: string;
  placeholder: string;
}> = [
  { key: "openai", label: "OpenAI", placeholder: "sk-..." },
  { key: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
  { key: "google", label: "Google (Gemini)", placeholder: "AI..." },
];

function ApiKeyInput({
  provider,
  label,
  placeholder,
  savedKey,
}: {
  provider: Provider;
  label: string;
  placeholder: string;
  savedKey: string;
}) {
  const [value, setValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const saveKey = useSaveApiKey();

  useEffect(() => {
    setValue(savedKey);
  }, [savedKey]);

  const hasChanged = value !== savedKey;
  const isSet = savedKey.length > 0;

  const handleSave = async () => {
    try {
      await saveKey.mutateAsync({ provider, key: value });
      toast.success(`${label} API key saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save key");
    }
  };

  const maskedValue =
    isSet && !showKey && !hasChanged
      ? `${"*".repeat(Math.max(0, savedKey.length - 4))}${savedKey.slice(-4)}`
      : value;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Badge variant={isSet ? "default" : "secondary"}>
          {isSet ? "Configured" : "Not Set"}
        </Badge>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey || hasChanged ? "text" : "password"}
            placeholder={placeholder}
            value={hasChanged ? value : maskedValue}
            onChange={(e) => setValue(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanged || saveKey.isPending}
          size="sm"
        >
          {saveKey.isPending ? (
            "..."
          ) : (
            <>
              <Check className="mr-1 h-3 w-3" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: apiKeys, isLoading } = useApiKeys();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your LLM provider API keys.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Enter your API keys for each LLM provider you want to use. Keys are
            stored securely in your backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-10 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : (
            providers.map((p) => (
              <ApiKeyInput
                key={p.key}
                provider={p.key}
                label={p.label}
                placeholder={p.placeholder}
                savedKey={apiKeys?.[p.key] ?? ""}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
