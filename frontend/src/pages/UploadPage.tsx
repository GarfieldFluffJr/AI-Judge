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
import type { SubmissionInput } from "@/types/queue";

function summarize(submissions: SubmissionInput[]) {
  const byQueue = new Map<
    string,
    { submissionCount: number; questionCount: number }
  >();
  for (const sub of submissions) {
    const entry = byQueue.get(sub.queueId) ?? {
      submissionCount: 0,
      questionCount: 0,
    };
    entry.submissionCount++;
    entry.questionCount += sub.questions.length;
    byQueue.set(sub.queueId, entry);
  }
  return byQueue;
}

export default function UploadPage() {
  const [parsedData, setParsedData] = useState<SubmissionInput[] | null>(null);
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

        // Accept both top-level array and { submissions: [...] } or { queues: [...] }
        let submissions: SubmissionInput[];
        if (Array.isArray(json)) {
          submissions = json;
        } else if (Array.isArray(json.submissions)) {
          submissions = json.submissions;
        } else if (Array.isArray(json.queues)) {
          // Legacy format fallback
          submissions = json.queues;
        } else {
          setParseError(
            "Expected a JSON array of submissions, or an object with a submissions array."
          );
          return;
        }

        // Validate each submission has required fields
        for (const sub of submissions) {
          if (!sub.id || !sub.queueId || !Array.isArray(sub.questions)) {
            setParseError(
              "Invalid format: each submission must have id, queueId, and questions array."
            );
            return;
          }
        }

        setParsedData(submissions);
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

  const summary = parsedData ? summarize(parsedData) : null;
  const totalSubmissions = parsedData?.length ?? 0;
  const totalQuestions =
    parsedData?.reduce((acc, s) => acc + s.questions.length, 0) ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Data</h1>
        <p className="text-muted-foreground">
          Upload a JSON file containing submissions for evaluation.
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
            onDragOver={(e: React.DragEvent) => {
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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

      {parsedData && summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Preview
            </CardTitle>
            <CardDescription>
              {totalSubmissions} submission(s), {totalQuestions} question(s)
              across {summary.size} queue(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue ID</TableHead>
                  <TableHead className="text-right">Submissions</TableHead>
                  <TableHead className="text-right">Questions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(summary.entries()).map(([queueId, counts]) => (
                  <TableRow key={queueId}>
                    <TableCell className="font-medium">{queueId}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {counts.submissionCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {counts.questionCount}
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
