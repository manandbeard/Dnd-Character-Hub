import { useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AIPanelInput {
  key: string;
  label: string;
  placeholder?: string;
  rows?: number;
}

interface AIPanelProps {
  title: string;
  description?: string;
  buttonLabel?: string;
  inputs?: AIPanelInput[];
  result: string | null;
  isPending: boolean;
  error: string | null;
  onGenerate: (values: Record<string, string>) => void;
  onAccept?: (result: string) => void;
  acceptLabel?: string;
  className?: string;
  icon?: ReactNode;
  testId?: string;
}

export default function AIPanel({
  title,
  description,
  buttonLabel = "Generate",
  inputs = [],
  result,
  isPending,
  error,
  onGenerate,
  onAccept,
  acceptLabel = "Save to character",
  className,
  icon,
  testId,
}: AIPanelProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <Card className={cn("border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-stone-950/40", className)} data-testid={testId}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-serif">
          {icon ?? <Sparkles className="h-4 w-4 text-amber-400" />}
          {title}
        </CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        {inputs.map((input) => (
          <div key={input.key} className="space-y-1">
            <Label htmlFor={`ai-${input.key}`} className="text-xs">{input.label}</Label>
            <Textarea
              id={`ai-${input.key}`}
              data-testid={`input-ai-${input.key}`}
              rows={input.rows ?? 2}
              placeholder={input.placeholder}
              value={values[input.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [input.key]: e.target.value }))}
              disabled={isPending}
              className="text-sm resize-none"
            />
          </div>
        ))}

        <Button
          onClick={() => onGenerate(values)}
          disabled={isPending}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          data-testid={testId ? `${testId}-generate` : undefined}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Conjuring…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {buttonLabel}
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="rounded-md border border-amber-500/20 bg-stone-950/60 p-3">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{result}</p>
            </div>
            {onAccept && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAccept(result)}
                className="w-full"
                data-testid={testId ? `${testId}-accept` : undefined}
              >
                {acceptLabel}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
