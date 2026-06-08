import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AdminProvider } from "./context/AdminContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AdminProvider>
        <RouterProvider router={router} />
      </AdminProvider>
    </ErrorBoundary>
  );
}
