import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { Upload, FileJson, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUploadData } from "@/hooks/useQueues";
import { toast } from "sonner";
import type { QueueInput } from "@/types/queue";

export default function UploadPage() {
  const [parsedData, setParsedData] = useState<QueueInput[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();
  const uploadMutation = useUploadData();

  const handleFile = useCallback((file: File) => {
    setParseError(null);
    setParsedData(null);

    if (!file.name.endsWith(".json")) {
      setParseError("Please upload a JSON file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);

        // Support both { queues: [...] } and [...] formats
        const queues: QueueInput[] = Array.isArray(json)
          ? json
          : json.queues ?? [json];

        // Basic validation
        for (const q of queues) {
          if (!q.id || !q.name || !Array.isArray(q.submissions)) {
            setParseError(
              "Invalid format: each queue must have id, name, and submissions array."
            );
            return;
          }
        }

        setParsedData(queues);
      } catch {
        setParseError("Failed to parse JSON. Please check the file format.");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleSubmit = async () => {
    if (!parsedData) return;
    try {
      await uploadMutation.mutateAsync(parsedData);
      toast.success("Data uploaded successfully!");
      navigate("/queues");
    } catch (err) {
      toast.error(
        `Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  const totalSubmissions =
    parsedData?.reduce((acc, q) => acc + q.submissions.length, 0) ?? 0;
  const totalQuestions =
    parsedData?.reduce(
      (acc, q) =>
        acc + q.submissions.reduce((a, s) => a + s.questions.length, 0),
      0
    ) ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Data</h1>
        <p className="text-muted-foreground">
          Upload a JSON file containing queues and submissions for evaluation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select File</CardTitle>
          <CardDescription>
            Drag and drop or click to select a JSON file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <FileJson className="mb-4 h-12 w-12 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Drop your JSON file here, or click to browse
            </span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>

          {parseError && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}
        </CardContent>
      </Card>

      {parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Preview
            </CardTitle>
            <CardDescription>
              {parsedData.length} queue(s), {totalSubmissions} submission(s),{" "}
              {totalQuestions} question(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue</TableHead>
                  <TableHead className="text-right">Submissions</TableHead>
                  <TableHead className="text-right">Questions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {q.submissions.length}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {q.submissions.reduce(
                          (a, s) => a + s.questions.length,
                          0
                        )}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Button
              onClick={handleSubmit}
              disabled={uploadMutation.isPending}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadMutation.isPending ? "Uploading..." : "Upload & Save"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
