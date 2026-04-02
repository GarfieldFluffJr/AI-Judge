import { useState, useMemo } from "react";
import { BarChart3, Filter } from "lucide-react";
import { DonutChart } from "@/components/charts/DonutChart";
import { BarChart } from "@/components/charts/BarChart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useJudges } from "@/hooks/useJudges";
import { useQueues } from "@/hooks/useQueues";
import { VERDICT_COLORS } from "@/lib/constants";
import { format } from "date-fns";
import type { Verdict, EvaluationFilters } from "@/types/evaluation";

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Filter className="mr-2 h-3 w-3" />
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-muted"
            >
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={(checked: boolean | "indeterminate") => {
                  if (checked) {
                    onChange([...selected, opt.value]);
                  } else {
                    onChange(selected.filter((v) => v !== opt.value));
                  }
                }}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 w-full"
              onClick={() => onChange([])}
            >
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function ResultsPage() {
  const [filters, setFilters] = useState<EvaluationFilters>({});
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { data: evaluations, isLoading } = useEvaluations(filters);
  const { data: judges } = useJudges();
  const { data: queues } = useQueues();

  const stats = useMemo(() => {
    if (!evaluations) return null;
    const completed = evaluations.filter((e) => e.status === "completed");
    return {
      total: evaluations.length,
      pass: completed.filter((e) => e.verdict === "pass").length,
      fail: completed.filter((e) => e.verdict === "fail").length,
      inconclusive: completed.filter((e) => e.verdict === "inconclusive").length,
      passRate:
        completed.length > 0
          ? Math.round(
              (completed.filter((e) => e.verdict === "pass").length /
                completed.length) *
                100
            )
          : 0,
    };
  }, [evaluations]);

  // Unique questions from evaluations for filter
  const questionOptions = useMemo(() => {
    if (!evaluations) return [];
    const seen = new Map<string, string>();
    for (const e of evaluations) {
      if (!seen.has(e.questionId)) {
        seen.set(
          e.questionId,
          e.questionText.length > 50
            ? e.questionText.substring(0, 50) + "..."
            : e.questionText
        );
      }
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [evaluations]);

  const judgeOptions = useMemo(
    () =>
      judges?.map((j) => ({ value: j.id, label: j.name })) ?? [],
    [judges]
  );

  const verdictOptions: Array<{ value: string; label: string }> = [
    { value: "pass", label: "Pass" },
    { value: "fail", label: "Fail" },
    { value: "inconclusive", label: "Inconclusive" },
  ];

  // Chart data
  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Pass", value: stats.pass, color: "#22c55e" },
      { label: "Fail", value: stats.fail, color: "#ef4444" },
      { label: "Inconclusive", value: stats.inconclusive, color: "#eab308" },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const judgeBarData = useMemo(() => {
    if (!evaluations) return [];
    const byJudge = new Map<string, { name: string; pass: number; fail: number; inconclusive: number; total: number }>();
    for (const e of evaluations) {
      if (e.status !== "completed") continue;
      if (!byJudge.has(e.judgeId)) {
        byJudge.set(e.judgeId, { name: e.judgeName, pass: 0, fail: 0, inconclusive: 0, total: 0 });
      }
      const entry = byJudge.get(e.judgeId)!;
      entry[e.verdict]++;
      entry.total++;
    }
    return Array.from(byJudge.values()).map((j) => ({
      name: j.name,
      "Pass Rate": j.total > 0 ? Math.round((j.pass / j.total) * 100) : 0,
      Pass: j.pass,
      Fail: j.fail,
      Inconclusive: j.inconclusive,
    }));
  }, [evaluations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Results</h1>
        <p className="text-muted-foreground">
          View and filter AI judge evaluation results.
        </p>
      </div>

      {/* Aggregate Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Evaluations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pass Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {stats.passRate}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">
                Pass
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.pass}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">
                Fail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.fail}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">
                Inconclusive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.inconclusive}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {stats && stats.total > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Verdict Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <DonutChart data={pieData} />
            </CardContent>
          </Card>

          {judgeBarData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pass Rate by Judge</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={judgeBarData.map((j) => ({
                    label: j.name,
                    value: j["Pass Rate"],
                  }))}
                  maxValue={100}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.queueId ?? "all"}
          onValueChange={(v: string) =>
            setFilters((f) => ({
              ...f,
              queueId: v === "all" ? undefined : v,
            }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All queues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Queues</SelectItem>
            {queues?.map((q) => (
              <SelectItem key={q.id} value={q.id}>
                {q.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <MultiSelect
          label="Judge"
          options={judgeOptions}
          selected={filters.judgeIds ?? []}
          onChange={(v) => setFilters((f) => ({ ...f, judgeIds: v }))}
        />

        <MultiSelect
          label="Question"
          options={questionOptions}
          selected={filters.questionIds ?? []}
          onChange={(v) => setFilters((f) => ({ ...f, questionIds: v }))}
        />

        <MultiSelect
          label="Verdict"
          options={verdictOptions}
          selected={filters.verdicts ?? []}
          onChange={(v) =>
            setFilters((f) => ({ ...f, verdicts: v as Verdict[] }))
          }
        />

        {(filters.queueId ||
          filters.judgeIds?.length ||
          filters.questionIds?.length ||
          filters.verdicts?.length) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => setFilters({})}
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <BarChart3 className="h-6 w-6 animate-pulse text-muted-foreground" />
            </div>
          ) : evaluations && evaluations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submission</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Judge</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead>Reasoning</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((ev) => (
                  <>
                    <TableRow
                      key={ev.id}
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedRow(
                          expandedRow === ev.id ? null : ev.id
                        )
                      }
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        {ev.submissionId}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {ev.questionText}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{ev.judgeName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            VERDICT_COLORS[
                              ev.verdict as keyof typeof VERDICT_COLORS
                            ] ?? ""
                          }
                        >
                          {ev.verdict}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                        {ev.reasoning}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ev.status === "completed"
                              ? "default"
                              : ev.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {ev.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(ev.createdAt, "MMM d, HH:mm")}
                      </TableCell>
                    </TableRow>
                    {expandedRow === ev.id && (
                      <TableRow key={`${ev.id}-detail`}>
                        <TableCell colSpan={7} className="bg-muted/50">
                          <div className="space-y-2 p-2">
                            <div>
                              <span className="text-xs font-medium">
                                Full Question:
                              </span>
                              <p className="text-sm">{ev.questionText}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium">
                                Full Reasoning:
                              </span>
                              <p className="text-sm">{ev.reasoning}</p>
                            </div>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>Model: {ev.targetModel}</span>
                              {ev.durationMs && (
                                <span>Duration: {ev.durationMs}ms</span>
                              )}
                              {ev.errorMessage && (
                                <span className="text-destructive">
                                  Error: {ev.errorMessage}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No evaluations found.</p>
              <p className="text-sm text-muted-foreground">
                Run AI judges on a queue to see results here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
