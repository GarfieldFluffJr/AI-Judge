import { createBrowserRouter } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import DashboardPage from "@/pages/DashboardPage";
import UploadPage from "@/pages/UploadPage";
import QueuesPage from "@/pages/QueuesPage";
import QueueDetailPage from "@/pages/QueueDetailPage";
import JudgesPage from "@/pages/JudgesPage";
import ResultsPage from "@/pages/ResultsPage";
import SettingsPage from "@/pages/SettingsPage";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "upload", element: <UploadPage /> },
      { path: "queues", element: <QueuesPage /> },
      { path: "queues/:queueId", element: <QueueDetailPage /> },
      { path: "judges", element: <JudgesPage /> },
      { path: "results", element: <ResultsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
