import { useState } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft, Play, Loader2, Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueue, useSubmissions, useQuestions } from "@/hooks/useQueues";
import { useJudges } from "@/hooks/useJudges";
import {
  useAssignments,
  useCreateAssignment,
  useRemoveAssignment,
} from "@/hooks/useAssignments";
import { useRunBatchEvaluation } from "@/hooks/useEvaluations";
import { toast } from "sonner";

function formatAnswer(answer: Record<string, unknown>): string {
  if (answer.choice && answer.reasoning) {
    return `${answer.choice} — ${answer.reasoning}`;
  }
  if (answer.choice) return String(answer.choice);
  // Fallback: show all key-value pairs
  return Object.entries(answer)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

function SubmissionQuestions({
  queueId,
  submissionId,
  assignments,
}: {
  queueId: string;
  submissionId: string;
  assignments: Array<{
    id: string;
    judgeId: string;
    judgeName: string;
    questionId: string | null;
  }>;
}) {
  const { data: questions, isLoading } = useQuestions(queueId, submissionId);

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={4} className="text-center text-muted-foreground">
          Loading questions...
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {questions?.map((q) => {
        const questionAssignments = assignments.filter(
          (a) => a.questionId === q.id || a.questionId === null
        );
        return (
          <TableRow key={q.id}>
            <TableCell className="max-w-xs text-sm">
              <div className="truncate">{q.questionText}</div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {q.questionType.replace(/_/g, " ")}
              </Badge>
            </TableCell>
            <TableCell className="max-w-[250px] text-sm text-muted-foreground">
              <div className="truncate">{formatAnswer(q.answer)}</div>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {questionAssignments.map((a) => (
                  <Badge key={a.id} variant="secondary" className="text-xs">
                    {a.judgeName}
                    {a.questionId === null && " (queue)"}
                  </Badge>
                ))}
                {questionAssignments.length === 0 && (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

export default function QueueDetailPage() {
  const { queueId } = useParams<{ queueId: string }>();
  const { data: queue, isLoading: queueLoading } = useQueue(queueId!);
  const { data: submissions } = useSubmissions(queueId!);
  const { data: judges } = useJudges();
  const { data: assignments } = useAssignments(queueId!);
  const createAssignment = useCreateAssignment();
  const removeAssignment = useRemoveAssignment(queueId!);
  const runBatch = useRunBatchEvaluation();

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>("");
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(
    new Set()
  );

  const activeJudges = judges?.filter((j) => j.active) ?? [];

  const handleAssignJudge = async () => {
    const judge = judges?.find((j) => j.id === selectedJudgeId);
    if (!judge || !queueId) return;

    try {
      await createAssignment.mutateAsync({
        judgeId: judge.id,
        judgeName: judge.name,
        queueId,
        questionId: null,
        submissionId: null,
      });
      toast.success(`Assigned ${judge.name} to entire queue`);
      setAssignDialogOpen(false);
      setSelectedJudgeId("");
    } catch (err) {
      toast.error(
        `Failed to assign judge: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  const handleRunEvaluations = async () => {
    if (!queueId || !queue || !judges) return;
    try {
      const result = await runBatch.mutateAsync({
        queueId,
        queueName: queue.name,
        judges,
      });
      toast.success(
        `Evaluation complete: ${result.succeeded} succeeded, ${result.failed} failed out of ${result.total} total`
      );
    } catch (err) {
      toast.error(
        `Evaluation failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  const toggleSubmission = (id: string) => {
    setExpandedSubmissions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (queueLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!queue) {
    return <p className="text-muted-foreground">Queue not found.</p>;
  }

  const queueAssignments = assignments ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/queues">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{queue.name}</h1>
          <p className="text-muted-foreground">
            {queue.submissionCount} submissions, {queue.questionCount} questions
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Scale className="mr-2 h-4 w-4" />
                Assign Judge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Judge to Queue</DialogTitle>
                <DialogDescription>
                  Select a judge to assign to all questions in this queue.
                </DialogDescription>
              </DialogHeader>
              <Select
                value={selectedJudgeId}
                onValueChange={setSelectedJudgeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a judge..." />
                </SelectTrigger>
                <SelectContent>
                  {activeJudges.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.name} ({j.targetModel})
                    </SelectItem>
                  ))}
                  {activeJudges.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">
                      No active judges. Create one first.
                    </div>
                  )}
                </SelectContent>
              </Select>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAssignDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignJudge}
                  disabled={!selectedJudgeId || createAssignment.isPending}
                >
                  {createAssignment.isPending ? "Assigning..." : "Assign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            onClick={handleRunEvaluations}
            disabled={runBatch.isPending || queueAssignments.length === 0}
          >
            {runBatch.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {runBatch.isPending ? "Running..." : "Run AI Judges"}
          </Button>
        </div>
      </div>

      {/* Assigned Judges Summary */}
      {queueAssignments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assigned Judges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {queueAssignments.map((a) => (
                <Badge
                  key={a.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {a.judgeName}
                  {a.questionId === null ? " (all questions)" : ""}
                  <button
                    onClick={() => removeAssignment.mutate(a.id)}
                    className="ml-1 rounded-full hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>
            Click a submission to see its questions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissions?.map((sub) => {
            const isExpanded = expandedSubmissions.has(sub.id);

            return (
              <div key={sub.id} className="border-b last:border-b-0">
                <button
                  className="flex w-full items-center justify-between py-3 text-left hover:bg-muted/50"
                  onClick={() => toggleSubmission(sub.id)}
                >
                  <div>
                    <span className="font-medium">
                      Submission {sub.id}
                    </span>
                    {sub.labelingTaskId && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        (task: {sub.labelingTaskId})
                      </span>
                    )}
                  </div>
                  <Badge variant="outline">
                    {sub.questionCount} questions
                  </Badge>
                </button>

                {isExpanded && (
                  <div className="pb-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Question</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Answer</TableHead>
                          <TableHead>Judges</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <SubmissionQuestions
                          queueId={queueId!}
                          submissionId={sub.id}
                          assignments={queueAssignments}
                        />
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}

          {(!submissions || submissions.length === 0) && (
            <p className="py-4 text-center text-muted-foreground">
              No submissions found.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
