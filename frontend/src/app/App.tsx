import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AdminProvider } from "./context/AdminContext";
import { SeniorProvider } from "./context/SeniorContext";

export default function App() {
  return (
    <AdminProvider>
      <SeniorProvider>
        <RouterProvider router={router} />
      </SeniorProvider>
    </AdminProvider>
  );
}