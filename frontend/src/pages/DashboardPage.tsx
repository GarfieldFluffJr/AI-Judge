import { Link } from "react-router";
import {
  Upload,
  Scale,
  BarChart3,
  ListChecks,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQueues } from "@/hooks/useQueues";
import { useJudges } from "@/hooks/useJudges";
import { useEvaluationStats, useEvaluations } from "@/hooks/useEvaluations";
import { VERDICT_COLORS } from "@/lib/constants";
import { format } from "date-fns";

export default function DashboardPage() {
  const { data: queues, isLoading: queuesLoading } = useQueues();
  const { data: judges, isLoading: judgesLoading } = useJudges();
  const { data: stats, isLoading: statsLoading } = useEvaluationStats();
  const { data: recentEvals } = useEvaluations();

  const isLoading = queuesLoading || judgesLoading || statsLoading;
  const activeJudges = judges?.filter((j) => j.active).length ?? 0;
  const recent = recentEvals?.slice(0, 5) ?? [];
  const isEmpty = !queues?.length && !judges?.length && !recentEvals?.length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Loading overview...</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-20 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-12 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your AI judging platform.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Queues
            </CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{queues?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Judges
            </CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeJudges}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Evaluations
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pass Rate
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {stats?.passRate ?? 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Button
          variant="outline"
          className="h-auto flex-col items-start gap-1 p-4"
          asChild
        >
          <Link to="/upload">
            <Upload className="h-5 w-5" />
            <span className="font-medium">Upload Data</span>
            <span className="text-xs text-muted-foreground">
              Import JSON submissions
            </span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col items-start gap-1 p-4"
          asChild
        >
          <Link to="/judges">
            <Scale className="h-5 w-5" />
            <span className="font-medium">Manage Judges</span>
            <span className="text-xs text-muted-foreground">
              Create or edit AI judges
            </span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col items-start gap-1 p-4"
          asChild
        >
          <Link to="/results">
            <BarChart3 className="h-5 w-5" />
            <span className="font-medium">View Results</span>
            <span className="text-xs text-muted-foreground">
              Filter and analyze evaluations
            </span>
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <Card className="flex flex-col items-center py-12">
          <Loader2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 font-medium">Get started</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Upload a dataset, create a judge, and run your first evaluation.
          </p>
          <Button asChild>
            <Link to="/upload">Upload Data</Link>
          </Button>
        </Card>
      )}

      {/* Recent Evaluations */}
      {recent.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Evaluations</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/results">
                  View all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
            <CardDescription>Latest evaluation results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {ev.questionText}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ev.judgeName} &middot;{" "}
                      {format(ev.createdAt, "MMM d, HH:mm")}
                    </p>
                  </div>
                  <Badge
                    className={
                      VERDICT_COLORS[
                        ev.verdict as keyof typeof VERDICT_COLORS
                      ] ?? ""
                    }
                  >
                    {ev.verdict}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
