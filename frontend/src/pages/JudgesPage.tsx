import { useState } from "react";
import { Plus, Edit, Trash2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useJudges,
  useCreateJudge,
  useUpdateJudge,
  useDeleteJudge,
} from "@/hooks/useJudges";
import { LLM_PROVIDERS } from "@/lib/constants";
import { toast } from "sonner";
import type { Judge, JudgeFormData } from "@/types/judge";
import { format } from "date-fns";

const emptyForm: JudgeFormData = {
  name: "",
  systemPrompt: "",
  targetModel: "",
  active: true,
};

export default function JudgesPage() {
  const { data: judges, isLoading } = useJudges();
  const createJudge = useCreateJudge();
  const updateJudge = useUpdateJudge();
  const deleteJudge = useDeleteJudge();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
  const [form, setForm] = useState<JudgeFormData>(emptyForm);

  const openCreate = () => {
    setEditingJudge(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (judge: Judge) => {
    setEditingJudge(judge);
    setForm({
      name: judge.name,
      systemPrompt: judge.systemPrompt,
      targetModel: judge.targetModel,
      active: judge.active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.systemPrompt || !form.targetModel) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      if (editingJudge) {
        await updateJudge.mutateAsync({ id: editingJudge.id, data: form });
        toast.success("Judge updated");
      } else {
        await createJudge.mutateAsync(form);
        toast.success("Judge created");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save judge");
    }
  };

  const handleToggleActive = async (judge: Judge) => {
    await updateJudge.mutateAsync({
      id: judge.id,
      data: { active: !judge.active },
    });
    toast.success(`${judge.name} ${judge.active ? "deactivated" : "activated"}`);
  };

  const handleDelete = async (judge: Judge) => {
    await deleteJudge.mutateAsync(judge.id);
    toast.success(`${judge.name} deleted`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Judges</h1>
          <p className="text-muted-foreground">
            Create and manage AI judges with custom rubrics and target models.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Judge
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 w-32 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-2/3 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {judges && judges.length === 0 && (
        <Card className="flex flex-col items-center py-12">
          <Scale className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">No judges yet.</p>
          <Button onClick={openCreate}>Create your first judge</Button>
        </Card>
      )}

      {judges && judges.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {judges.map((judge) => (
            <Card
              key={judge.id}
              className={!judge.active ? "opacity-60" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{judge.name}</CardTitle>
                  <Switch
                    checked={judge.active}
                    onCheckedChange={() => handleToggleActive(judge)}
                  />
                </div>
                <CardDescription>
                  {judge.targetModel.split("/").pop()} &middot; Created{" "}
                  {format(judge.createdAt, "MMM d")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {judge.systemPrompt}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant={judge.active ? "default" : "secondary"}>
                    {judge.active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline">
                    {judge.targetModel.split("/")[0]}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(judge)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(judge)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingJudge ? "Edit Judge" : "Create Judge"}
            </DialogTitle>
            <DialogDescription>
              {editingJudge
                ? "Update the judge's configuration."
                : "Define a new AI judge with a rubric and target model."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Accuracy Judge"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Target Model</Label>
              <Select
                value={form.targetModel}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, targetModel: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model..." />
                </SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDERS.map((provider) => (
                    <SelectGroup key={provider.provider}>
                      <SelectLabel>{provider.label}</SelectLabel>
                      {provider.models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">System Prompt / Rubric</Label>
              <Textarea
                id="prompt"
                placeholder="Evaluate the answer for correctness. Pass if the answer is factually correct and complete..."
                rows={6}
                value={form.systemPrompt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, systemPrompt: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createJudge.isPending || updateJudge.isPending}
            >
              {createJudge.isPending || updateJudge.isPending
                ? "Saving..."
                : editingJudge
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
