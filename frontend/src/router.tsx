import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Loader2 } from "lucide-react";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const UploadPage = lazy(() => import("@/pages/UploadPage"));
const QueuesPage = lazy(() => import("@/pages/QueuesPage"));
const QueueDetailPage = lazy(() => import("@/pages/QueueDetailPage"));
const JudgesPage = lazy(() => import("@/pages/JudgesPage"));
const ResultsPage = lazy(() => import("@/pages/ResultsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function lazify(Component: React.LazyExoticComponent<() => React.JSX.Element>) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: lazify(DashboardPage) },
      { path: "upload", element: lazify(UploadPage) },
      { path: "queues", element: lazify(QueuesPage) },
      { path: "queues/:queueId", element: lazify(QueueDetailPage) },
      { path: "judges", element: lazify(JudgesPage) },
      { path: "results", element: lazify(ResultsPage) },
      { path: "settings", element: lazify(SettingsPage) },
    ],
  },
]);
