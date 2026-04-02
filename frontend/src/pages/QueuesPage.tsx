import { Link } from "react-router";
import { ListChecks, Upload, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQueues, useDeleteQueue } from "@/hooks/useQueues";
import { toast } from "sonner";
import { format } from "date-fns";

export default function QueuesPage() {
  const { data: queues, isLoading } = useQueues();
  const deleteQueue = useDeleteQueue();

  const handleDelete = (e: React.MouseEvent, queueId: string) => {
    e.preventDefault(); // prevent navigating into the queue
    e.stopPropagation();
    deleteQueue.mutate(queueId, {
      onSuccess: () => toast.success("Queue deleted"),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Failed to delete"),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Queues</h1>
          <p className="text-muted-foreground">
            Manage uploaded submission queues.
          </p>
        </div>
        <Button asChild>
          <Link to="/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Data
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 w-32 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-48 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {queues && queues.length === 0 && (
        <Card className="flex flex-col items-center py-12">
          <ListChecks className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">No queues yet.</p>
          <Button asChild>
            <Link to="/upload">Upload your first dataset</Link>
          </Button>
        </Card>
      )}

      {queues && queues.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {queues.map((queue) => (
            <Link key={queue.id} to={`/queues/${queue.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    {queue.name}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDelete(e, queue.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Uploaded {format(queue.uploadedAt, "MMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <Badge variant="secondary">
                    {queue.submissionCount} submissions
                  </Badge>
                  <Badge variant="secondary">
                    {queue.questionCount} questions
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
