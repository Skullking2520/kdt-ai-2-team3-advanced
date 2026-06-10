import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AdminProvider } from "./context/AdminContext";
import { SeniorProvider } from "./context/SeniorContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AdminProvider>
        <SeniorProvider>
          <RouterProvider router={router} />
        </SeniorProvider>
      </AdminProvider>
    </ErrorBoundary>
  );
}
